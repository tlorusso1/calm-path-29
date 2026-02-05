import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { ContaFluxo, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, addDays, differenceInDays, getDaysInMonth } from 'date-fns';

interface MetaMensalCardProps {
  contasFluxo: ContaFluxo[];
  custoFixoMensal: string;
  marketingEstrutural: string;
  adsBase: string;
  faturamentoCanais?: {
    b2b: string;
    ecomNuvem: string;
    ecomShopee: string;
    ecomAssinaturas: string;
  };
  faturamentoMes?: string; // NOVO: Fallback para quando canais não preenchidos
}

interface MetaMensalData {
  contasPagar30d: number;
  custoFixo: number;
  marketingEstrutural: number;
  adsBase: number;
  totalSaidas: number;
  faturamentoNecessario: number;
  faturadoAtual: number;
  progressoPercent: number;
  diasRestantes: number;
  metaDiariaRestante: number;
  pressao: 'baixa' | 'media' | 'alta';
}

export function MetaMensalCard({
  contasFluxo,
  custoFixoMensal,
  marketingEstrutural,
  adsBase,
  faturamentoCanais,
  faturamentoMes,
}: MetaMensalCardProps) {
  const data = useMemo<MetaMensalData>(() => {
    const hoje = new Date();
    const em30dias = addDays(hoje, 30);
    const hojeStr = hoje.toISOString().split('T')[0];
    const em30diasStr = em30dias.toISOString().split('T')[0];
    
    // 1. Contas a pagar nos próximos 30 dias (não pagas ainda)
    const contasPagar30d = contasFluxo
      .filter(c => {
        if (c.pago) return false;
        if (c.tipo !== 'pagar') return false;
        return c.dataVencimento >= hojeStr && c.dataVencimento <= em30diasStr;
      })
      .reduce((sum, c) => sum + parseValorFlexivel(c.valor), 0);
    
    // 2. Custos fixos mensais
    const custoFixo = parseValorFlexivel(custoFixoMensal);
    const mktEstrutural = parseValorFlexivel(marketingEstrutural);
    const ads = parseValorFlexivel(adsBase);
    
    // 3. Total de saídas previstas
    const totalSaidas = contasPagar30d + custoFixo + mktEstrutural + ads;
    
    // 4. Faturamento necessário (considerando margem 40%)
    const faturamentoNecessario = totalSaidas / MARGEM_OPERACIONAL;
    
    // 5. Faturamento atual (soma dos canais OU fallback para faturamentoMes)
    const faturadoCanais = faturamentoCanais
      ? parseValorFlexivel(faturamentoCanais.b2b) +
        parseValorFlexivel(faturamentoCanais.ecomNuvem) +
        parseValorFlexivel(faturamentoCanais.ecomShopee) +
        parseValorFlexivel(faturamentoCanais.ecomAssinaturas)
      : 0;
    
    // Usar canais se tiver valor, senão usar faturamentoMes como fallback
    const faturadoAtual = faturadoCanais > 0 ? faturadoCanais : parseValorFlexivel(faturamentoMes || '0');
    
    // 6. Progresso
    const progressoPercent = faturamentoNecessario > 0
      ? Math.min(100, (faturadoAtual / faturamentoNecessario) * 100)
      : 0;
    
    // 7. Dias restantes no mês
    const diasNoMes = getDaysInMonth(hoje);
    const diaAtual = hoje.getDate();
    const diasRestantes = diasNoMes - diaAtual;
    
    // 8. Meta diária restante
    const faltaFaturar = Math.max(0, faturamentoNecessario - faturadoAtual);
    const metaDiariaRestante = diasRestantes > 0 ? faltaFaturar / diasRestantes : faltaFaturar;
    
    // 9. Pressão
    let pressao: 'baixa' | 'media' | 'alta' = 'baixa';
    if (progressoPercent < 50) pressao = 'alta';
    else if (progressoPercent < 80) pressao = 'media';
    
    return {
      contasPagar30d,
      custoFixo,
      marketingEstrutural: mktEstrutural,
      adsBase: ads,
      totalSaidas,
      faturamentoNecessario,
      faturadoAtual,
      progressoPercent,
      diasRestantes,
      metaDiariaRestante,
      pressao,
    };
  }, [contasFluxo, custoFixoMensal, marketingEstrutural, adsBase, faturamentoCanais, faturamentoMes]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPressaoStyle = (pressao: 'baixa' | 'media' | 'alta') => {
    switch (pressao) {
      case 'alta':
        return { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Pressão Alta' };
      case 'media':
        return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600', label: 'Atenção' };
      case 'baixa':
        return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600', label: 'Saudável' };
    }
  };

  const pressaoStyle = getPressaoStyle(data.pressao);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta Mensal de Faturamento
          </span>
          <Badge variant="outline" className={`${pressaoStyle.bg} ${pressaoStyle.text} border-0`}>
            {data.pressao === 'alta' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {pressaoStyle.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saídas previstas */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saídas Previstas (próx. 30d)
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Contas a pagar</span>
              <span>{formatCurrency(data.contasPagar30d)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Custo fixo</span>
              <span>{formatCurrency(data.custoFixo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Marketing estrutural</span>
              <span>{formatCurrency(data.marketingEstrutural)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">└── Ads base</span>
              <span>{formatCurrency(data.adsBase)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t font-medium">
              <span>TOTAL SAÍDAS</span>
              <span>{formatCurrency(data.totalSaidas)}</span>
            </div>
          </div>
        </div>

        {/* Cálculo da meta */}
        <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Margem operacional</span>
            <span>÷ {(MARGEM_OPERACIONAL * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">FATURAMENTO NECESSÁRIO</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(data.faturamentoNecessario)}
            </span>
          </div>
        </div>

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Faturado até agora</span>
            <span className="font-medium">{formatCurrency(data.faturadoAtual)}</span>
          </div>
          <Progress value={data.progressoPercent} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {data.progressoPercent.toFixed(0)}% da meta
          </p>
        </div>

        {/* Meta diária */}
        {data.diasRestantes > 0 && data.metaDiariaRestante > 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Meta diária restante ({data.diasRestantes} dias)
              </span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(data.metaDiariaRestante)}/dia
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
