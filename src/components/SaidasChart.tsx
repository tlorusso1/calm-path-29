import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { MovimentacaoEstoque } from '@/types/focus-mode';

interface SaidasChartProps {
  movimentacoes: MovimentacaoEstoque[];
  className?: string;
}

// Mapa de cores fixas por produto (normalizado para lowercase match)
const PRODUCT_COLOR_MAP: Record<string, string> = {
  'castanha': 'bg-blue-800',
  'cheesy': 'bg-red-600',
  'aveia': 'bg-pink-400',
  'barista': 'bg-gray-500',
  'milk+': 'bg-red-500',
  'levedura': 'bg-yellow-400',
  'quatro queijos': 'bg-yellow-700',
  'carbonara': 'bg-red-700',
  'estrogonofe': 'bg-orange-500',
  'molho branco': 'bg-sky-400',
};

const FALLBACK_COLORS = [
  'bg-violet-500', 'bg-teal-500', 'bg-indigo-500', 'bg-lime-500',
  'bg-fuchsia-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500',
];

function getProductColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(PRODUCT_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash = ((hash << 5) - hash) + lower.charCodeAt(i);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getWeekLabel(weekKey: string): string {
  const match = weekKey.match(/\d{4}-W(\d{2})/);
  return match ? `Sem ${parseInt(match[1])}` : weekKey;
}

interface WeekData {
  weekKey: string;
  label: string;
  total: number;
  products: { name: string; qty: number }[];
}

interface ProductMix {
  name: string;
  qty: number;
  pct: number;
}

export function SaidasChart({ movimentacoes, className }: SaidasChartProps) {
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const saidas = useMemo(() => movimentacoes.filter(m => m.tipo === 'saida'), [movimentacoes]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of saidas) {
      map.set(s.produto, (map.get(s.produto) || 0) + s.quantidade);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [saidas]);

  const weeklyData = useMemo<WeekData[]>(() => {
    const dias = showAllWeeks ? 365 : 56;
    const corte = Date.now() - dias * 24 * 60 * 60 * 1000;
    const weekMap = new Map<string, Map<string, number>>();

    for (const s of saidas) {
      const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
      const ts = new Date(dataStr).getTime();
      if (isNaN(ts) || ts < corte) continue;

      const weekKey = getISOWeek(new Date(dataStr));
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
      const products = weekMap.get(weekKey)!;
      products.set(s.produto, (products.get(s.produto) || 0) + s.quantidade);
    }

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekKey, products]) => {
        const productList = Array.from(products.entries())
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty);
        return {
          weekKey,
          label: getWeekLabel(weekKey),
          total: productList.reduce((sum, p) => sum + p.qty, 0),
          products: productList,
        };
      });
  }, [saidas, showAllWeeks]);

  const productMix = useMemo<ProductMix[]>(() => {
    const corte = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, number>();

    for (const s of saidas) {
      const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
      const ts = new Date(dataStr).getTime();
      if (isNaN(ts) || ts < corte) continue;
      map.set(s.produto, (map.get(s.produto) || 0) + s.quantidade);
    }

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return Array.from(map.entries())
      .map(([name, qty]) => ({ name, qty, pct: (qty / total) * 100 }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [saidas]);

  const trend = useMemo(() => {
    if (weeklyData.length < 2) return null;
    const last = weeklyData[weeklyData.length - 1].total;
    const prev = weeklyData[weeklyData.length - 2].total;
    if (prev === 0) return null;
    const pctChange = ((last - prev) / prev) * 100;
    return { pctChange, direction: pctChange > 5 ? 'up' : pctChange < -5 ? 'down' : 'stable' as const };
  }, [weeklyData]);

  if (saidas.length === 0) return null;

  const maxWeekTotal = Math.max(...weeklyData.map(w => w.total), 1);

  return (
    <div className={cn("space-y-5", className)}>
      {weeklyData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              📈 Saídas por Semana
            </h4>
            {trend && (
              <span className={cn(
                "text-[10px] font-medium",
                trend.direction === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                trend.direction === 'down' ? "text-rose-600 dark:text-rose-400" :
                "text-muted-foreground"
              )}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                {' '}{Math.abs(trend.pctChange).toFixed(0)}% vs semana anterior
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {weeklyData.map((week) => (
              <div key={week.weekKey} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-[48px] shrink-0 text-right">
                    {week.label}
                  </span>
                  <div className="flex-1 h-5 bg-muted/40 rounded-sm overflow-hidden flex">
                    {week.products.map((product, pi) => {
                      const pct = (product.qty / maxWeekTotal) * 100;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={pi}
                          className={cn("h-full transition-all", getProductColor(product.name))}
                          style={{ width: `${pct}%` }}
                          title={`${product.name}: ${product.qty} un`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-[50px] text-right shrink-0">
                    {week.total} un
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {topProducts.slice(0, 8).map((name) => (
              <div key={name} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", getProductColor(name))} />
                <span className="text-[10px] text-muted-foreground leading-tight">{name}</span>
              </div>
            ))}
            {topProducts.length > 8 && (
              <span className="text-[10px] text-muted-foreground">+{topProducts.length - 8} outros</span>
            )}
          </div>
        </div>
      )}

      {productMix.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">
            📊 Mix de Produtos (últimos 30d)
          </h4>
          <div className="space-y-2">
            {productMix.map((item) => (
              <div key={item.name} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground leading-tight">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0 ml-2">
                    {item.qty} un
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3.5 bg-muted/40 rounded-sm overflow-hidden">
                    <div
                      className={cn("h-full rounded-sm transition-all", getProductColor(item.name))}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold w-[36px] text-right shrink-0 text-muted-foreground">
                    {item.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
