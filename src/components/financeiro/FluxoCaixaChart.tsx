import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FluxoCaixaDataPoint {
  semana: string;
  saldo: number;
  cor: 'verde' | 'amarelo' | 'vermelho';
}

interface FluxoCaixaChartProps {
  dados: FluxoCaixaDataPoint[];
  caixaMinimo: number;
  modoProjecao: boolean;
  numContas: number;
  fonteHistorico?: boolean;
  semanasHistorico?: number;
  onAddConta: () => void;
}

const chartConfig = {
  saldo: {
    label: 'Saldo',
  },
};

const formatCurrencyShort = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const getBarColor = (cor: 'verde' | 'amarelo' | 'vermelho'): string => {
  switch (cor) {
    case 'verde': return 'hsl(var(--chart-2))';
    case 'amarelo': return 'hsl(45 93% 47%)';
    case 'vermelho': return 'hsl(var(--destructive))';
  }
};

export function FluxoCaixaChart({
  dados,
  caixaMinimo,
  modoProjecao,
  numContas,
  fonteHistorico = false,
  semanasHistorico = 0,
  onAddConta,
}: FluxoCaixaChartProps) {
  const temRiscoVermelho = dados.some(d => d.cor === 'vermelho');
  const temRiscoAmarelo = dados.some(d => d.cor === 'amarelo');

  // Determine badge text based on source
  const getBadgeInfo = () => {
    if (!modoProjecao) {
      return { text: `${numContas} conta${numContas > 1 ? 's' : ''}`, variant: 'secondary' as const };
    }
    if (fonteHistorico) {
      return { text: `Histórico (${semanasHistorico}sem)`, variant: 'default' as const };
    }
    return { text: 'Projeção estimada', variant: 'outline' as const };
  };

  const badgeInfo = getBadgeInfo();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fluxo de Caixa (30d)
            {modoProjecao ? (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded">PROJEÇÃO</span>
            ) : (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">REAL</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {temRiscoVermelho && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Alerta
              </Badge>
            )}
            {!temRiscoVermelho && temRiscoAmarelo && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                Atenção
              </Badge>
            )}
            <Badge variant={badgeInfo.variant} className="text-xs">
              {badgeInfo.text}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis 
                dataKey="semana" 
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrencyShort}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrencyShort(Number(value))}
                  />
                }
              />
              {caixaMinimo > 0 && (
                <ReferenceLine
                  y={caixaMinimo}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                >
                  <text
                    x="100%"
                    y={-5}
                    textAnchor="end"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={10}
                  >
                    Mínimo
                  </text>
                </ReferenceLine>
              )}
              <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
                {dados.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.cor)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="flex items-center justify-between pt-1 border-t">
          <p className="text-xs text-muted-foreground">
            {!modoProjecao 
              ? `Fluxo calculado com ${numContas} conta(s) lançada(s)`
              : fonteHistorico
                ? `Baseado nas últimas ${semanasHistorico} semanas de resultados`
                : 'Baseado em Faturamento Esperado × Margem 40% − Custos'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onAddConta}
          >
            <Plus className="h-3 w-3" />
            {modoProjecao ? 'Detalhar contas' : 'Add conta'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
