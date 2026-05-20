import { cn } from "@/lib/utils";
import { TrendingUp, WifiOff } from "lucide-react";
import type { ChannelSummary } from "../hooks/useMarketingData";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  canal: ChannelSummary;
  totalSpend: number;
}

const CHANNEL_ICONS: Record<string, string> = {
  meta: "M",
  google: "G",
  tiktok: "T",
};

export function CanalCard({ canal, totalSpend }: Props) {
  const pct = totalSpend > 0 ? (canal.spend / totalSpend) * 100 : 0;

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-4 space-y-3",
      !canal.configured && "opacity-70"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: canal.color }}
          >
            {CHANNEL_ICONS[canal.channel]}
          </span>
          <span className="text-sm font-medium">{canal.label}</span>
        </div>
        {!canal.configured ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-dashed border-border rounded-full px-2 py-0.5">
            <WifiOff size={9} />
            Demo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground">Investido</p>
          <p className="text-sm font-bold">{fmt(canal.spend)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">ROAS</p>
          <p className={cn(
            "text-sm font-bold",
            canal.roas === 0 ? "text-muted-foreground" :
            canal.roas >= 3 ? "text-emerald-600 dark:text-emerald-400" :
            canal.roas >= 2 ? "text-amber-600 dark:text-amber-400" : "text-red-500"
          )}>
            {canal.roas > 0 ? `${canal.roas.toFixed(2)}x` : "—"}
          </p>
        </div>
      </div>

      {/* Budget share bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{pct.toFixed(0)}% do investimento</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: canal.color }}
          />
        </div>
      </div>

      {canal.configured && canal.roas > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <TrendingUp size={10} />
          <span>Retorno: {fmt(canal.spend * canal.roas)}</span>
        </div>
      )}
    </div>
  );
}
