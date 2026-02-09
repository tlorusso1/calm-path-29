import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  CartesianGrid,
  Legend
} from 'recharts';
import { parseISO, subDays, addDays, format, isWithinInterval, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FluxoCaixaDiarioChartProps {
  contasFluxo: ContaFluxo[];
  caixaAtual: number;
  caixaMinimo: number;
}

interface DiaProjecao {
  dia: string;
  data: Date;
  saldo: number;
  entradas: number;
  saidas: number;
  entradasAcumuladas: number;
  saidasAcumuladas: number;
  alertaMinimo: boolean;
  estimado: boolean;
}

// Tipos que afetam caixa como entrada
const TIPOS_ENTRADA = ['receber', 'resgate'];
// Tipos que afetam caixa como saída
const TIPOS_SAIDA = ['pagar', 'aplicacao'];

function calcularMediaDiaria90d(contasFluxo: ContaFluxo[]): { mediaEntrada: number; mediaSaida: number } {
  const hoje = new Date();
  const inicio90d = subDays(hoje, 90);
  
  // Filtrar apenas lançamentos pagos dos últimos 90 dias
  const lancamentos90d = contasFluxo.filter(c => {
    if (!c.pago) return false;
    try {
      const data = parseISO(c.dataVencimento);
      return isWithinInterval(data, { start: inicio90d, end: hoje });
    } catch {
      return false;
    }
  });
  
  let totalEntradas = 0;
  let totalSaidas = 0;
  
  for (const lanc of lancamentos90d) {
    const valor = parseValorFlexivel(lanc.valor);
    if (TIPOS_ENTRADA.includes(lanc.tipo)) {
      totalEntradas += valor;
    } else if (TIPOS_SAIDA.includes(lanc.tipo)) {
      totalSaidas += valor;
    }
  }
  
  // Calcular dias reais com dados
  const diasComDados = new Set(
    lancamentos90d.map(l => l.dataVencimento)
  ).size;
  
  const diasParaMedia = Math.max(diasComDados, 30); // Mínimo 30 dias
  
  return {
    mediaEntrada: totalEntradas / diasParaMedia,
    mediaSaida: totalSaidas / diasParaMedia,
  };
}

export function FluxoCaixaDiarioChart({
  contasFluxo,
  caixaAtual,
  caixaMinimo,
}: FluxoCaixaDiarioChartProps) {
  // Calcular média diária dos últimos 90 dias
  const { mediaEntrada, mediaSaida } = useMemo(
    () => calcularMediaDiaria90d(contasFluxo),
    [contasFluxo]
  );
  
  // Pegar contas futuras não pagas
  const contasFuturas = useMemo(() => {
    const hoje = startOfDay(new Date());
    return contasFluxo.filter(c => {
      if (c.pago) return false;
      try {
        const data = parseISO(c.dataVencimento);
        return !isBefore(data, hoje);
      } catch {
        return false;
      }
    });
  }, [contasFluxo]);
  
  // Gerar projeção para os próximos 30 dias
  const projecao = useMemo((): DiaProjecao[] => {
    const hoje = startOfDay(new Date());
    const dados: DiaProjecao[] = [];
    let saldoAcumulado = caixaAtual;
    let entradasAcumuladas = 0;
    let saidasAcumuladas = 0;
    
    for (let i = 0; i <= 30; i++) {
      const diaData = addDays(hoje, i);
      const diaStr = format(diaData, 'yyyy-MM-dd');
      
      // Encontrar contas conhecidas que vencem neste dia
      const contasDoDia = contasFuturas.filter(c => c.dataVencimento === diaStr);
      
      let entradasDia = 0;
      let saidasDia = 0;
      let estimado = false;
      
      // Somar contas conhecidas
      for (const conta of contasDoDia) {
        const valor = parseValorFlexivel(conta.valor);
        if (TIPOS_ENTRADA.includes(conta.tipo)) {
          entradasDia += valor;
        } else if (TIPOS_SAIDA.includes(conta.tipo)) {
          saidasDia += valor;
        }
      }
      
      // Se não tiver contas conhecidas, usar média
      if (contasDoDia.length === 0 && i > 0) {
        entradasDia = mediaEntrada;
        saidasDia = mediaSaida;
        estimado = true;
      }
      
      // Acumular
      entradasAcumuladas += entradasDia;
      saidasAcumuladas += saidasDia;
      
      // Calcular saldo do dia (dia 0 é o saldo atual)
      if (i > 0) {
        saldoAcumulado = saldoAcumulado + entradasDia - saidasDia;
      }
      
      dados.push({
        dia: i === 0 ? 'Hoje' : format(diaData, 'dd/MM', { locale: ptBR }),
        data: diaData,
        saldo: Math.round(saldoAcumulado),
        entradas: Math.round(entradasDia),
        saidas: Math.round(saidasDia),
        entradasAcumuladas: Math.round(entradasAcumuladas),
        saidasAcumuladas: Math.round(saidasAcumuladas),
        alertaMinimo: saldoAcumulado < caixaMinimo,
        estimado,
      });
    }
    
    return dados;
  }, [caixaAtual, caixaMinimo, contasFuturas, mediaEntrada, mediaSaida]);
  
  // Contar dias em alerta
  const diasEmAlerta = projecao.filter(d => d.alertaMinimo).length;
  const primeiroDiaAlerta = projecao.find(d => d.alertaMinimo);
  
  // Calcular variação esperada
  const saldoFinal = projecao[projecao.length - 1]?.saldo || caixaAtual;
  const variacaoEsperada = saldoFinal - caixaAtual;
  
  // Formatter para tooltip
  const formatCurrency = (valor: number) => 
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            📅 Projeção Diária (30 dias)
          </span>
          <div className="flex items-center gap-2">
            {diasEmAlerta > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {diasEmAlerta} dias abaixo do mínimo
              </Badge>
            )}
            <Badge 
              variant={variacaoEsperada >= 0 ? "default" : "destructive"}
              className="text-xs gap-1"
            >
              {variacaoEsperada >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatCurrency(variacaoEsperada)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          3 linhas: Entradas acumuladas (verde), Saídas acumuladas (vermelho), Saldo (azul). 
          <span className="ml-1 opacity-70">Dias estimados usam média 90d.</span>
        </p>
        
        {/* Gráfico com 3 linhas */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projecao}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="dia" 
                tick={{ fontSize: 10 }}
                interval={4}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    saldo: 'Saldo',
                    entradasAcumuladas: 'Entradas Acum.',
                    saidasAcumuladas: 'Saídas Acum.',
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload as DiaProjecao | undefined;
                  return `${label}${item?.estimado ? ' (estimado)' : ''}`;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    saldo: 'Saldo',
                    entradasAcumuladas: 'Entradas',
                    saidasAcumuladas: 'Saídas',
                  };
                  return labels[value] || value;
                }}
                wrapperStyle={{ fontSize: '11px' }}
              />
              <ReferenceLine 
                y={caixaMinimo} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{
                  value: 'Mínimo',
                  position: 'insideBottomRight',
                  fontSize: 10,
                  fill: 'hsl(var(--destructive))',
                }}
              />
              {/* Linha de Entradas Acumuladas */}
              <Line
                type="monotone"
                dataKey="entradasAcumuladas"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={false}
              />
              {/* Linha de Saídas Acumuladas */}
              <Line
                type="monotone"
                dataKey="saidasAcumuladas"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
              {/* Linha de Saldo */}
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Média entrada/dia</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-500">
              +{formatCurrency(mediaEntrada)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Média saída/dia</p>
            <p className="text-sm font-medium text-destructive">
              -{formatCurrency(mediaSaida)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Saldo em 30d</p>
            <p className={cn(
              "text-sm font-medium",
              saldoFinal >= caixaMinimo ? "text-green-600 dark:text-green-500" : "text-destructive"
            )}>
              {formatCurrency(saldoFinal)}
            </p>
          </div>
        </div>
        
        {/* Alerta de primeiro dia abaixo do mínimo */}
        {primeiroDiaAlerta && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Atenção: Saldo abaixo do mínimo a partir de{' '}
                <strong>{format(primeiroDiaAlerta.data, "dd 'de' MMMM", { locale: ptBR })}</strong>
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
