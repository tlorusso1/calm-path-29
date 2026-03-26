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

const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function getISOWeek(date: Date): { key: string; weekNo: number; month: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return {
    key: `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`,
    weekNo,
    month: date.getMonth(),
  };
}

function getWeekLabel(weekKey: string, month: number): string {
  const match = weekKey.match(/\d{4}-W(\d{2})/);
  const monthLabel = MONTH_ABBR[month] || '';
  return match ? `S${parseInt(match[1])} (${monthLabel})` : weekKey;
}

interface WeekData {
  weekKey: string;
  label: string;
  total: number;
  totalFat: number;
  products: { name: string; qty: number; fat: number }[];
}

interface ProductMix {
  name: string;
  qty: number;
  fat: number;
  pct: number;
  pctFat: number;
}

export function SaidasChart({ movimentacoes, className }: SaidasChartProps) {
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [viewMode, setViewMode] = useState<'volume' | 'faturamento'>('volume');
  const [mixViewMode, setMixViewMode] = useState<'volume' | 'faturamento'>('volume');
  const [mixDays, setMixDays] = useState<30 | 90>(30);
  const saidas = useMemo(() => movimentacoes.filter(m => m.tipo === 'saida'), [movimentacoes]);

  const hasFaturamento = useMemo(() => saidas.some(s => s.valorUnitarioVenda && s.valorUnitarioVenda > 0), [saidas]);

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
    const weekMap = new Map<string, { products: Map<string, { qty: number; fat: number }>; month: number }>();

    for (const s of saidas) {
      const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
      const d = new Date(dataStr);
      const ts = d.getTime();
      if (isNaN(ts) || ts < corte) continue;

      const week = getISOWeek(d);
      if (!weekMap.has(week.key)) weekMap.set(week.key, { products: new Map(), month: week.month });
      const entry = weekMap.get(week.key)!;
      const prod = entry.products.get(s.produto) || { qty: 0, fat: 0 };
      prod.qty += s.quantidade;
      if (s.valorUnitarioVenda) prod.fat += s.quantidade * s.valorUnitarioVenda;
      entry.products.set(s.produto, prod);
    }

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekKey, { products, month }]) => {
        const productList = Array.from(products.entries())
          .map(([name, { qty, fat }]) => ({ name, qty, fat }))
          .sort((a, b) => b.qty - a.qty);
        return {
          weekKey,
          label: getWeekLabel(weekKey, month),
          total: productList.reduce((sum, p) => sum + p.qty, 0),
          totalFat: productList.reduce((sum, p) => sum + p.fat, 0),
          products: productList,
        };
      });
  }, [saidas, showAllWeeks]);

  const productMix = useMemo<ProductMix[]>(() => {
    const corte = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, { qty: number; fat: number }>();

    for (const s of saidas) {
      const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
      const ts = new Date(dataStr).getTime();
      if (isNaN(ts) || ts < corte) continue;
      const e = map.get(s.produto) || { qty: 0, fat: 0 };
      e.qty += s.quantidade;
      if (s.valorUnitarioVenda) e.fat += s.quantidade * s.valorUnitarioVenda;
      map.set(s.produto, e);
    }

    const totalQty = Array.from(map.values()).reduce((a, b) => a + b.qty, 0);
    const totalFat = Array.from(map.values()).reduce((a, b) => a + b.fat, 0);
    if (totalQty === 0) return [];

    return Array.from(map.entries())
      .map(([name, { qty, fat }]) => ({
        name, qty, fat,
        pct: (qty / totalQty) * 100,
        pctFat: totalFat > 0 ? (fat / totalFat) * 100 : 0,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [saidas]);

  const avg90d = useMemo(() => {
    const corte = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const weekMap = new Map<string, { vol: number; fat: number }>();
    for (const s of saidas) {
      const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
      const d = new Date(dataStr);
      if (isNaN(d.getTime()) || d.getTime() < corte) continue;
      const wk = getISOWeek(d).key;
      const e = weekMap.get(wk) || { vol: 0, fat: 0 };
      e.vol += s.quantidade;
      if (s.valorUnitarioVenda) e.fat += s.quantidade * s.valorUnitarioVenda;
      weekMap.set(wk, e);
    }
    const weeks = Array.from(weekMap.values());
    if (weeks.length === 0) return { vol: 0, fat: 0 };
    return {
      vol: weeks.reduce((a, w) => a + w.vol, 0) / weeks.length,
      fat: weeks.reduce((a, w) => a + w.fat, 0) / weeks.length,
    };
  }, [saidas]);

  const trend = useMemo(() => {
    if (weeklyData.length < 2) return null;
    const isFat = viewMode === 'faturamento';
    const last = isFat ? weeklyData[weeklyData.length - 1].totalFat : weeklyData[weeklyData.length - 1].total;
    const prev = isFat ? weeklyData[weeklyData.length - 2].totalFat : weeklyData[weeklyData.length - 2].total;
    if (prev === 0) return null;
    const pctChange = ((last - prev) / prev) * 100;
    return { pctChange, direction: pctChange > 5 ? 'up' : pctChange < -5 ? 'down' : 'stable' as const };
  }, [weeklyData, viewMode]);

  if (saidas.length === 0) return null;

  const isFat = viewMode === 'faturamento';
  const maxWeekTotal = Math.max(...weeklyData.map(w => isFat ? w.totalFat : w.total), 1);
  const formatVal = (v: number) => isFat ? `R$ ${(v / 1000).toFixed(1)}k` : `${v} un`;

  return (
    <div className={cn("space-y-5", className)}>
      {weeklyData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              📈 Saídas por Semana
            </h4>
            <div className="flex items-center gap-2">
              {hasFaturamento && (
                <div className="flex items-center rounded border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode('volume')}
                    className={cn("text-[10px] px-2 py-0.5", viewMode === 'volume' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setViewMode('faturamento')}
                    className={cn("text-[10px] px-2 py-0.5", viewMode === 'faturamento' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    R$
                  </button>
                </div>
              )}
              {trend && (
                <span className={cn(
                  "text-[10px] font-medium",
                  trend.direction === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                  trend.direction === 'down' ? "text-rose-600 dark:text-rose-400" :
                  "text-muted-foreground"
                )}>
                  {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                  {' '}{Math.abs(trend.pctChange).toFixed(0)}%
                </span>
              )}
              <button
                onClick={() => setShowAllWeeks(!showAllWeeks)}
                className="text-[10px] font-medium text-primary hover:underline"
              >
                {showAllWeeks ? '8 sem' : 'Tudo'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {weeklyData.map((week) => {
              const weekVal = isFat ? week.totalFat : week.total;
              return (
              <div key={week.weekKey} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-[72px] shrink-0 text-right">
                    {week.label}
                  </span>
                  <div className="flex-1 h-5 bg-muted/40 rounded-sm overflow-hidden flex">
                    {week.products.map((product, pi) => {
                      const val = isFat ? product.fat : product.qty;
                      const pct = (val / maxWeekTotal) * 100;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={pi}
                          className={cn("h-full transition-all", getProductColor(product.name))}
                          style={{ width: `${pct}%` }}
                          title={`${product.name}: ${isFat ? `R$ ${product.fat.toFixed(0)}` : `${product.qty} un`}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground w-[60px] text-right shrink-0">
                    {formatVal(weekVal)}
                  </span>
                  {(() => {
                    const avgVal = isFat ? avg90d.fat : avg90d.vol;
                    if (avgVal <= 0) return null;
                    const delta = ((weekVal - avgVal) / avgVal) * 100;
                    return (
                      <span className={cn(
                        "text-[9px] font-medium w-[38px] text-right shrink-0",
                        delta > 5 ? "text-emerald-600 dark:text-emerald-400" :
                        delta < -5 ? "text-rose-600 dark:text-rose-400" :
                        "text-muted-foreground"
                      )}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
              );
            })}
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
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground">
              📊 Mix de Produtos (últimos 30d)
            </h4>
            {hasFaturamento && (
              <div className="flex items-center rounded border border-border overflow-hidden">
                <button
                  onClick={() => setMixViewMode('volume')}
                  className={cn("text-[10px] px-2 py-0.5", mixViewMode === 'volume' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  Volume
                </button>
                <button
                  onClick={() => setMixViewMode('faturamento')}
                  className={cn("text-[10px] px-2 py-0.5", mixViewMode === 'faturamento' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  R$
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {productMix
              .slice()
              .sort((a, b) => mixViewMode === 'faturamento' ? b.fat - a.fat : b.qty - a.qty)
              .map((item) => {
                const isMixFat = mixViewMode === 'faturamento';
                const val = isMixFat ? item.fat : item.qty;
                const pct = isMixFat ? item.pctFat : item.pct;
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground leading-tight">
                        {item.name}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 ml-2">
                        {isMixFat ? `R$ ${val.toFixed(0)}` : `${val} un`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3.5 bg-muted/40 rounded-sm overflow-hidden">
                        <div
                          className={cn("h-full rounded-sm transition-all", getProductColor(item.name))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold w-[36px] text-right shrink-0 text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
