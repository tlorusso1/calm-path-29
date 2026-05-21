import { Mail, MousePointerClick, UserMinus, Send } from "lucide-react";
import type { PerfitSummary } from "../../api/perfit";

const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

interface Props {
  summary: PerfitSummary;
  isLoading?: boolean;
}

export function PerfitSummaryBar({ summary, isLoading }: Props) {
  const kpis = [
    {
      label: "Total enviado",
      value: fmtK(summary.totalSent),
      icon: <Send size={13} className="text-blue-500" />,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Taxa de abertura",
      value: `${summary.avgOpenRate.toFixed(1)}%`,
      icon: <Mail size={13} className="text-emerald-500" />,
      color: summary.avgOpenRate >= 25
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Taxa de clique",
      value: `${summary.avgClickRate.toFixed(1)}%`,
      icon: <MousePointerClick size={13} className="text-purple-500" />,
      color: summary.avgClickRate >= 5
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Descadastros",
      value: `${summary.unsubscribeRate.toFixed(2)}%`,
      icon: <UserMinus size={13} className="text-red-400" />,
      color: summary.unsubscribeRate <= 0.5
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {kpis.map(({ label, value, icon, color }) => (
        <div key={label} className="metric-card">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {icon}
            {label}
          </div>
          {isLoading ? (
            <div className="h-7 w-20 bg-muted animate-pulse rounded" />
          ) : (
            <span className={`text-xl font-bold ${color}`}>{value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
