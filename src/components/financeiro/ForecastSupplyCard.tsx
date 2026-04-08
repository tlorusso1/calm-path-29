import { SupplyForecast } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Factory, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPO_LABELS } from '@/utils/supplyCalculator';
import { useState } from 'react';

interface ForecastSupplyCardProps {
  forecast: SupplyForecast;
  receitaBruta?: number;
  cmvMensal?: number;
  faturamentoHistorico?: { mes: string; valor: number }[];
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCompact = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(0);
};

export function ForecastSupplyCard({ forecast, receitaBruta, cmvMensal, faturamentoHistorico }: ForecastSupplyCardProps) {
  const temItens = forecast.itens.length > 0;
  const [showBreakdown, setShowBreakdown] = useState(false);

  const breakdown = forecast.breakdownSemanal ?? [];
  const mediaSemanalForecast = forecast.receitaProjetada30d / (30 / 7);

  // Calcular real histórico mensal (últimas 4 semanas do breakdown)
  const ultimas4semanas = breakdown.slice(-4);
  const receitaReal4sem = ultimas4semanas.reduce((s, w) => s + w.receitaReal, 0);

  return (
    <Card className="border-cyan-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          Forecast
          <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-600">SUPPLY</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projeção de Receita */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Proj 30d (média móvel 90d)</p>
            <p className="text-sm font-bold text-green-600">
              {formatCurrency(forecast.receitaProjetada30d)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">CMV proj. 30d</p>
            <p className="text-sm font-medium text-amber-600">
              {formatCurrency(forecast.cmvProjetado30d)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Margem Bruta</p>
            <p className={cn(
              "text-sm font-bold",
              forecast.margemProjetada >= 50 ? "text-green-600" :
              forecast.margemProjetada >= 30 ? "text-yellow-600" : "text-destructive"
            )}>
              {forecast.margemProjetada.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Forecast vs Real (últimas 4 semanas) */}
        {receitaReal4sem > 0 && (
          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground font-medium">Proj 30d vs Real últimas 4 sem (~28d)</span>
              <span className={cn(
                "font-bold",
                receitaReal4sem >= forecast.receitaProjetada30d * 0.9 ? "text-green-600" :
                receitaReal4sem >= forecast.receitaProjetada30d * 0.7 ? "text-yellow-600" : "text-destructive"
              )}>
                {((receitaReal4sem / forecast.receitaProjetada30d) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-muted-foreground">Real 4sem: </span>
                <span className="font-medium text-foreground">{formatCurrency(receitaReal4sem)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Proj 30d: </span>
                <span className="font-medium text-foreground">{formatCurrency(forecast.receitaProjetada30d)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Semanal toggle */}
        {breakdown.length > 0 && (
          <div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center gap-1.5 text-[11px] text-cyan-600 hover:text-cyan-500 font-medium"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {showBreakdown ? 'Ocultar' : 'Ver'} breakdown semanal ({breakdown.length} sem)
            </button>

            {showBreakdown && (
              <div className="mt-2 space-y-1">
                {/* Mini bar chart */}
                <div className="flex items-end gap-0.5 h-16 px-1">
                  {breakdown.map((sem, idx) => {
                    const maxVal = Math.max(...breakdown.map(s => s.receitaReal), 1);
                    const h = (sem.receitaReal / maxVal) * 100;
                    const isAboveAvg = sem.receitaReal > mediaSemanalForecast;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={cn(
                            "w-full rounded-t-sm min-h-[2px]",
                            isAboveAvg ? "bg-green-500/70" : "bg-rose-400/60"
                          )}
                          style={{ height: `${Math.max(h, 3)}%` }}
                          title={`${sem.semanaLabel}: ${formatCurrency(sem.receitaReal)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* Labels */}
                <div className="flex gap-0.5 px-1">
                  {breakdown.map((sem, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <span className="text-[7px] text-muted-foreground leading-none block">
                        {sem.semanaLabel.replace(' ', '\n').split('\n')[0]}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Linha de média */}
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-1 px-1">
                  <div className="w-3 h-[1px] bg-cyan-500" />
                  <span>Média forecast: {formatCurrency(mediaSemanalForecast)}/sem</span>
                </div>
                {/* Tabela detalhada */}
                <div className="mt-2 border rounded-md overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 text-[9px] font-medium bg-muted/50 px-2 py-1 border-b">
                    <span>Semana</span>
                    <span className="text-right">Receita</span>
                    <span className="text-right">CMV</span>
                    <span className="text-right">Margem</span>
                  </div>
                  {breakdown.map((sem, idx) => {
                    const margem = sem.receitaReal > 0 ? ((sem.receitaReal - sem.cmvReal) / sem.receitaReal * 100) : 0;
                    return (
                      <div key={idx} className="grid grid-cols-4 gap-0 text-[9px] px-2 py-0.5 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">{sem.semanaLabel}</span>
                        <span className={cn("text-right font-medium", sem.receitaReal > 0 ? "text-green-600" : "text-muted-foreground")}>
                          {formatCompact(sem.receitaReal)}
                        </span>
                        <span className="text-right text-amber-600">{formatCompact(sem.cmvReal)}</span>
                        <span className={cn(
                          "text-right font-medium",
                          margem >= 50 ? "text-green-600" : margem >= 30 ? "text-yellow-600" : "text-destructive"
                        )}>
                          {margem > 0 ? `${margem.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic">
          📦 Dados de movimentações de estoque. Projeção = média móvel de até 90d × (30/7).
        </p>

        {/* Investimento em Produção */}
        {forecast.investimentoProducao > 0 && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
            <div className="flex items-center gap-2 mb-2">
              <Factory className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Investimento necessário em produção
              </span>
            </div>
            <p className="text-lg font-bold text-amber-600">
              {formatCurrency(forecast.investimentoProducao)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Para atingir cobertura ideal em todos os itens deficitários
            </p>
          </div>
        )}

        {/* Itens que precisam produzir */}
        {temItens && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Produzir para giro ({forecast.itens.length} itens)
              </span>
            </div>
            <div className="space-y-1">
              {forecast.itens.slice(0, 8).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground">{item.nome}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({item.estoqueAtual} un • {item.coberturaDias}d)
                    </span>
                  </div>
                  <div className="text-right whitespace-nowrap ml-2">
                    <span className="font-medium text-destructive">+{item.precisaProduzir}</span>
                    {item.investimentoNecessario && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({formatCurrency(item.investimentoNecessario)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {forecast.itens.length > 8 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{forecast.itens.length - 8} itens...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
