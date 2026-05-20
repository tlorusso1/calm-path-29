import { cn } from "@/lib/utils";
import type { HealthStatus } from "../hooks/useB2BClientes";

const CONFIG: Record<HealthStatus, { label: string; class: string; dot: string }> = {
  ativo:   { label: "Ativo",      class: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900", dot: "bg-emerald-500" },
  risco:   { label: "Em risco",   class: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",             dot: "bg-amber-500"   },
  perdido: { label: "Inativo",    class: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",                         dot: "bg-red-500"     },
  novo:    { label: "Lead",       class: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",                   dot: "bg-blue-400"    },
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  const { label, class: cls, dot } = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
