import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ContaFluxo, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseISO, addDays, startOfDay, isAfter, isBefore, format } from 'date-fns';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';

interface MetaVendasCardProps {
  contas: ContaFluxo[];
  vendasSemana?: number; // Opcional: vendas já realizadas na semana
}

interface MetaVendasData {
  contasPagar7d: number;
  contasReceber7d: number;
  saldoLiquido7d: number;
  faturamentoNecessario: number;
  metaDiaria: number;
  metaComFolga: number; // +20% para sobrar caixa
}

function calcularMetaVendas(contas: ContaFluxo[]): MetaVendasData {
  const hoje = startOfDay(new Date());
  const em7dias = addDays(hoje, 7);
  
  // Filtrar contas dos próximos 7 dias (não pagas)
  const contasProximas = contas.filter(c => {
    if (c.pago) return false;
    const data = parseISO(c.dataVencimento);
    return (isAfter(data, hoje) || format(data, 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd')) 
        && (isBefore(data, em7dias) || format(data, 'yyyy-MM-dd') === format(em7dias, 'yyyy-MM-dd'));
  });
  
  const aPagar = contasProximas
    .filter(c => c.tipo === 'pagar')
    .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  
  const aReceber = contasProximas
    .filter(c => c.tipo === 'receber')
    .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  
  const saldoLiquido = aReceber - aPagar;
  
  // Se saldo negativo, precisa vender para cobrir
  // Fórmula: Contas a Pagar ÷ Margem Operacional (40%)
  const faturamentoNecessario = aPagar > 0 
    ? aPagar / MARGEM_OPERACIONAL 
    : 0;
  
  return {
    contasPagar7d: aPagar,
    contasReceber7d: aReceber,
    saldoLiquido7d: saldoLiquido,
    faturamentoNecessario,
    metaDiaria: faturamentoNecessario / 7,
    metaComFolga: faturamentoNecessario * 1.2, // +20%
  };
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function MetaVendasCard({ contas, vendasSemana }: MetaVendasCardProps) {
  const meta = useMemo(() => calcularMetaVendas(contas), [contas]);
  
  // Calcular progresso se tiver vendas
  const progressoPercent = vendasSemana && meta.faturamentoNecessario > 0
    ? Math.min(100, (vendasSemana / meta.faturamentoNecessario) * 100)
    : 0;
  
  // Status visual
  const getStatus = () => {
    if (meta.faturamentoNecessario === 0) {
      return { 
        color: 'text-green-600', 
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-300',
        icon: CheckCircle2,
        label: 'Folga' 
      };
    }
    if (meta.contasPagar7d > 30000) {
      return { 
        color: 'text-destructive', 
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        icon: AlertTriangle,
        label: 'Pressão alta' 
      };
    }
    return { 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-300',
      icon: Target,
      label: 'Foco' 
    };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;

  // Se não tem contas cadastradas, mostrar mensagem
  if (contas.length === 0 || contas.filter(c => !c.pago).length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Meta de Vendas Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Cadastre contas a pagar para calcular a meta de vendas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${status.bgColor} ${status.borderColor} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Meta de Vendas Semanal
          </span>
          <Badge variant="outline" className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cálculo detalhado */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contas a pagar (próx. 7d)</span>
            <span className="font-medium text-destructive">
              {formatCurrency(meta.contasPagar7d)}
            </span>
          </div>
          
          {meta.contasReceber7d > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contas a receber (próx. 7d)</span>
              <span className="font-medium text-green-600">
                + {formatCurrency(meta.contasReceber7d)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Margem operacional</span>
            <span>÷ {(MARGEM_OPERACIONAL * 100).toFixed(0)}%</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Faturamento necessário</span>
              <span className={`text-lg font-bold ${status.color}`}>
                {formatCurrency(meta.faturamentoNecessario)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Barra de progresso (se tiver vendas) */}
        {vendasSemana !== undefined && meta.faturamentoNecessario > 0 && (
          <div className="space-y-2">
            <Progress value={progressoPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso: {formatCurrency(vendasSemana)}</span>
              <span>{progressoPercent.toFixed(0)}%</span>
            </div>
          </div>
        )}
        
        {/* Meta diária */}
        {meta.faturamentoNecessario > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta diária</span>
              <span className="font-medium">
                {formatCurrency(meta.metaDiaria)}
              </span>
            </div>
            
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Para sobrar caixa, venda 20% a mais: <strong className="text-foreground">{formatCurrency(meta.metaComFolga)}</strong>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
