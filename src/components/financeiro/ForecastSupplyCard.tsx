import { SupplyForecast } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPO_LABELS } from '@/utils/supplyCalculator';

interface ForecastSupplyCardProps {
  forecast: SupplyForecast;
  receitaBruta?: number;
  cmvMensal?: number;
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ForecastSupplyCard({ forecast, receitaBruta, cmvMensal }: ForecastSupplyCardProps) {
  const temItens = forecast.itens.length > 0;

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
            <p className="text-[10px] text-muted-foreground">Receita proj. 30d</p>
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

        <p className="text-[10px] text-muted-foreground italic">
          Projeção baseada na velocidade real de saída das últimas 4 semanas.
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
