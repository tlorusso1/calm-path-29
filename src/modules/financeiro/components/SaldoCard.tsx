import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaldoCardProps {
  label: string;
  value: number | null;
  isLoading?: boolean;
  isError?: boolean;
  trend?: number; // percentual vs ontem/semana
  variant?: "default" | "positive" | "negative" | "warning";
  source?: string; // "Asaas" | "Bling" | "Tiny"
}

export function SaldoCard({ label, value, isLoading, isError, trend, variant = "default", source }: SaldoCardProps) {
  const formatted = value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "—";

  return (
    <div className={cn(
      "metric-card gap-2",
      variant === "positive" && "border-emerald-200 dark:border-emerald-900",
      variant === "negative" && "border-red-200 dark:border-red-900",
      variant === "warning" && "border-amber-200 dark:border-amber-900",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {source && (
          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{source}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 h-8">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando…</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 h-8 text-muted-foreground">
          <AlertCircle size={16} />
          <span className="text-sm">Sem conexão</span>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <span className={cn(
            "text-xl font-semibold tabular-nums",
            variant === "positive" && "text-emerald-600 dark:text-emerald-400",
            variant === "negative" && "text-red-600 dark:text-red-400",
            variant === "warning" && "text-amber-600 dark:text-amber-400",
          )}>
            {formatted}
          </span>
          {trend != null && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs mb-0.5",
              trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            )}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
