import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Mail, Clock, CheckCircle, Loader2 } from "lucide-react";
import type { PerfitCampaign } from "../../api/perfit";

const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "dd/MM/yy 'às' HH:mm", { locale: ptBR }); }
  catch { return iso; }
}

const STATUS_CONFIG = {
  sent:      { label: "Enviado",     icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900" },
  draft:     { label: "Rascunho",    icon: Mail,        color: "text-muted-foreground bg-muted border-border" },
  scheduled: { label: "Agendado",    icon: Clock,       color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" },
  sending:   { label: "Enviando...", icon: Loader2,     color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900" },
};

interface Props {
  campaign: PerfitCampaign;
}

export function PerfitCampaignCard({ campaign }: Props) {
  const statusConfig = STATUS_CONFIG[campaign.status];
  const StatusIcon   = statusConfig.icon;
  const stats        = campaign.stats;

  // Funnel steps: sent → delivered → opened → clicked
  const steps = stats
    ? [
        { label: "Enviados",   value: stats.sent      },
        { label: "Entregues",  value: stats.delivered },
        { label: "Abertos",    value: stats.opened    },
        { label: "Clicados",   value: stats.clicked   },
      ]
    : [];

  const maxVal = steps[0]?.value ?? 1;

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {campaign.subject}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{campaign.listName}</span>
            {campaign.sentAt && (
              <>
                <span>·</span>
                <span>{fmtDate(campaign.sentAt)}</span>
              </>
            )}
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
          statusConfig.color
        )}>
          <StatusIcon size={10} className={campaign.status === "sending" ? "animate-spin" : ""} />
          {statusConfig.label}
        </span>
      </div>

      {/* Funnel */}
      {steps.length > 0 && (
        <div className="space-y-1.5">
          {steps.map(({ label, value }, i) => {
            const pct = Math.round((value / maxVal) * 100);
            const isRate = i > 0;
            const rate = isRate ? ((value / steps[i - 1].value) * 100).toFixed(0) : null;

            return (
              <div key={label}>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">
                    {fmtK(value)}
                    {rate && (
                      <span className="text-muted-foreground ml-1">({rate}%)</span>
                    )}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      i === 0 ? "bg-blue-500" :
                      i === 1 ? "bg-indigo-500" :
                      i === 2 ? "bg-emerald-500" :
                      "bg-purple-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Key rates */}
      {stats && (
        <div className="flex items-center gap-3 pt-1 border-t">
          <div className="text-center flex-1">
            <p className="text-[9px] text-muted-foreground">Abertura</p>
            <p className={cn(
              "text-xs font-bold",
              stats.openRate >= 30 ? "text-emerald-600 dark:text-emerald-400" :
              stats.openRate >= 20 ? "text-amber-600 dark:text-amber-400" : "text-red-500"
            )}>{stats.openRate.toFixed(1)}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-muted-foreground">Clique</p>
            <p className={cn(
              "text-xs font-bold",
              stats.clickRate >= 5 ? "text-emerald-600 dark:text-emerald-400" :
              stats.clickRate >= 2 ? "text-amber-600 dark:text-amber-400" : "text-red-500"
            )}>{stats.clickRate.toFixed(1)}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-muted-foreground">Descadastros</p>
            <p className="text-xs font-bold text-muted-foreground">{stats.unsubscribed}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-muted-foreground">Bounces</p>
            <p className="text-xs font-bold text-muted-foreground">{stats.bounced}</p>
          </div>
        </div>
      )}
    </div>
  );
}
