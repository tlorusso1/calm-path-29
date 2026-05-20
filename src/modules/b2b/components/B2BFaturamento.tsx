import { TrendingUp, Wallet, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthBadge } from "./HealthBadge";
import { useAsaasBalance, useAsaasReceivables, useAsaasReceivedThisMonth } from "@/modules/financeiro/hooks/useFinanceiroData";
import { useB2BClientes, type PeriodoRange } from "../hooks/useB2BClientes";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function B2BFaturamento({ periodo }: { periodo?: PeriodoRange }) {
  const balance = useAsaasBalance();
  const receivables = useAsaasReceivables();
  const received = useAsaasReceivedThisMonth();
  const { clientes, topClientes, totalReceita, totalReceita12m, isLoading: loadingTiny } = useB2BClientes(periodo);

  const totalPedidos = clientes.reduce((s, c) => s + c.totalPedidos, 0);
  const ticketMedioGeral = totalPedidos > 0 ? totalReceita / totalPedidos : 0;

  const recebidoMes = (received.data?.data ?? []).reduce((s, p) => s + p.value, 0);
  const aReceber = (receivables.data?.data ?? [])
    .filter(p => p.status === "PENDING")
    .reduce((s, p) => s + p.value, 0);

  const kpis = [
    {
      label: "Receita B2B 12m",
      value: totalReceita12m,
      icon: <TrendingUp size={14} className="text-emerald-500" />,
      color: "text-emerald-600 dark:text-emerald-400",
      sub: `${totalPedidos} pedidos`,
      loading: loadingTiny,
    },
    {
      label: "Recebido este mês",
      value: recebidoMes,
      icon: <DollarSign size={14} className="text-emerald-500" />,
      color: "text-emerald-600 dark:text-emerald-400",
      sub: "via Asaas",
      loading: received.isLoading,
    },
    {
      label: "A receber",
      value: aReceber,
      icon: <Clock size={14} className="text-amber-500" />,
      color: "text-amber-600 dark:text-amber-400",
      sub: `${receivables.data?.data?.filter(p => p.status === "PENDING").length ?? 0} cobranças`,
      loading: receivables.isLoading,
    },
    {
      label: "Saldo Asaas",
      value: balance.data?.balance ?? 0,
      icon: <Wallet size={14} className="text-blue-500" />,
      color: "text-blue-600 dark:text-blue-400",
      sub: "conta principal",
      loading: balance.isLoading,
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {kpis.map(({ label, value, icon, color, sub, loading }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              {icon}
              {label}
            </div>
            {loading ? (
              <div className="h-7 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <span className={cn("text-xl font-bold", color)}>{fmt(value)}</span>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Ticket médio */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-lg text-sm">
        <span className="text-muted-foreground text-xs">Ticket médio B2B:</span>
        <span className="font-semibold">{fmt(ticketMedioGeral)}</span>
      </div>

      {/* Top clientes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Top clientes por receita (12 meses)
        </p>
        {loadingTiny ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-1.5">
            {topClientes.slice(0, 10).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 hover:bg-muted/60 rounded-lg">
                <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{c.fantasia || c.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{c.totalPedidos} pedidos · ticket {fmt(c.ticketMedio)}</p>
                </div>
                <HealthBadge status={c.health} />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                  {fmt(c.receitaTotal)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
