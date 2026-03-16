import { cn } from '@/lib/utils';

interface CoberturaItem {
  nome: string;
  coberturaDias: number;
  tipo?: string;
}

interface CoberturaChartProps {
  itens: CoberturaItem[];
  /** Max items to display */
  limit?: number;
  className?: string;
}

function getBarColor(dias: number): string {
  if (dias < 15) return 'bg-red-500';
  if (dias <= 30) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function CoberturaChart({ itens, limit, className }: CoberturaChartProps) {
  const sorted = [...itens]
    .filter(i => i.coberturaDias !== undefined && i.coberturaDias !== null)
    .sort((a, b) => b.coberturaDias - a.coberturaDias);

  const display = limit ? sorted.slice(0, limit) : sorted;
  if (display.length === 0) return null;

  const maxDias = Math.max(...display.map(i => i.coberturaDias), 1);

  return (
    <div className={cn("space-y-1.5", className)}>
      {display.map((item, idx) => {
        const pct = Math.max((item.coberturaDias / maxDias) * 100, 2);
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs truncate w-[160px] sm:w-[220px] text-right text-muted-foreground shrink-0">
              {item.nome}
            </span>
            <div className="flex-1 h-4 bg-muted/40 rounded-sm overflow-hidden">
              <div
                className={cn("h-full rounded-sm transition-all", getBarColor(item.coberturaDias))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium w-[40px] text-right shrink-0",
              item.coberturaDias < 15 ? "text-red-600 dark:text-red-400" :
              item.coberturaDias <= 30 ? "text-amber-600 dark:text-amber-400" :
              "text-muted-foreground"
            )}>
              {item.coberturaDias}d
            </span>
          </div>
        );
      })}
    </div>
  );
}
