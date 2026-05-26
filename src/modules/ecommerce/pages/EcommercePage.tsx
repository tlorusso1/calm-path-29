import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart, Package, TrendingUp, Clock, XCircle,
  RefreshCw, Info, Store, CreditCard, Truck, AlertCircle,
} from "lucide-react";
import { fetchNSOrders, fetchNSStats, isNuvemshopConfigured, type NSOrder } from "../api/nuvemshop";

// ── Helpers ──────────────────────────────────────────────────────

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(order: NSOrder) {
  const s = order.payment_status;
  const map: Record<string, { label: string; cls: string }> = {
    paid:       { label: "Pago",       cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    pending:    { label: "Aguardando", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    refunded:   { label: "Reembolsado",cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    voided:     { label: "Cancelado",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    authorized: { label: "Autorizado", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  };
  const { label, cls } = map[s] ?? { label: s, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function paymentIcon(method: string | undefined) {
  if (!method) return null;
  if (method.includes("pix")) return <span className="text-[9px] font-bold text-emerald-600">PIX</span>;
  if (method.includes("credit")) return <CreditCard size={11} className="text-blue-500" />;
  if (method.includes("boleto")) return <span className="text-[9px] font-bold text-orange-600">BOL</span>;
  return null;
}

// ── KPI Card ────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color = "slate",
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    yellow:  "text-yellow-600 dark:text-yellow-400",
    blue:    "text-blue-600 dark:text-blue-400",
    red:     "text-red-600 dark:text-red-400",
    slate:   "text-slate-600 dark:text-slate-400",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        <Icon size={14} className={colors[color] ?? colors.slate} />
      </div>
      <p className={`text-xl font-bold ${colors[color] ?? colors.slate}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Order Card ──────────────────────────────────────────────────

function OrderCard({ order }: { order: NSOrder }) {
  const total = parseFloat(order.total);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">#{order.number}</span>
            {statusBadge(order)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {order.customer?.name ?? "Cliente"}
            {order.shipping_address ? ` · ${order.shipping_address.city}/${order.shipping_address.province}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-foreground">{fmtBRL(total)}</p>
          <p className="text-[10px] text-muted-foreground">{fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* Products */}
      <div className="space-y-1">
        {order.products.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate max-w-[180px]">
              {p.quantity}× {p.name}
            </span>
            <span className="text-foreground font-medium shrink-0">
              {fmtBRL(parseFloat(p.price) * p.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {paymentIcon(order.payment_details?.method)}
        {order.payment_details?.installments && order.payment_details.installments > 1 && (
          <span className="text-[10px] text-muted-foreground">
            {order.payment_details.installments}×
          </span>
        )}
        <Truck size={11} className="text-muted-foreground ml-auto" />
        <span className="text-[10px] text-muted-foreground">{fmtBRL(parseFloat(order.shipping))}</span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function EcommercePage() {
  const stats = useQuery({
    queryKey: ["ecommerce", "ns-stats"],
    queryFn: fetchNSStats,
    staleTime: 5 * 60 * 1000,
  });

  const orders = useQuery({
    queryKey: ["ecommerce", "ns-orders"],
    queryFn: () => fetchNSOrders({ per_page: 20 }),
    staleTime: 3 * 60 * 1000,
  });

  const isConfigured = isNuvemshopConfigured();

  const handleRefresh = () => {
    stats.refetch();
    orders.refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Store size={16} className="text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">Ecommerce</h1>
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              Nuvemshop
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={12} className={(stats.isFetching || orders.isFetching) ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* ── Config banner ──────────────────────────────────── */}
      {!isConfigured && (
        <div className="mx-4 md:mx-6 mb-3 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong>Dados de demonstração.</strong> Para dados reais, configure{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">NUVEMSHOP_TOKEN</code>{" "}
            e{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">NUVEMSHOP_STORE_ID</code>{" "}
            nos secrets da Supabase e adicione{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">VITE_NUVEMSHOP_CONFIGURED=true</code>{" "}
            ao <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">.env.local</code>.
          </span>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pb-4">
        {stats.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : stats.data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <KpiCard
                label="Hoje — Faturamento"
                value={fmtBRL(stats.data.todayRevenue)}
                sub={`${stats.data.todayOrders} pedidos`}
                icon={TrendingUp}
                color="emerald"
              />
              <KpiCard
                label="Mês — Faturamento"
                value={fmtBRL(stats.data.monthRevenue)}
                sub={`${stats.data.monthOrders} pedidos`}
                icon={ShoppingCart}
                color="blue"
              />
              <KpiCard
                label="Ticket Médio"
                value={fmtBRL(stats.data.avgTicket)}
                sub="pedidos pagos"
                icon={CreditCard}
                color="slate"
              />
              <KpiCard
                label="Aguardando"
                value={String(stats.data.pendingOrders)}
                sub={`${stats.data.cancelledOrders} cancelados`}
                icon={stats.data.pendingOrders > 0 ? AlertCircle : Clock}
                color={stats.data.pendingOrders > 0 ? "yellow" : "slate"}
              />
            </div>
          </>
        ) : null}

        {/* ── Pedidos recentes ──────────────────────────── */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pedidos recentes ({orders.data?.length ?? 0})
          </p>

          {orders.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : orders.error ? (
            <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-400">
              <XCircle size={14} />
              Erro ao carregar pedidos. Verifique o token da Nuvemshop.
            </div>
          ) : (
            <div className="space-y-3">
              {(orders.data ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <Package size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                </div>
              ) : (
                (orders.data ?? []).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
