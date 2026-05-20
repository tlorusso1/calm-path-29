import { RefreshCw, AlertTriangle, ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SaldoCard } from "../components/SaldoCard";
import { ContasList } from "../components/ContasList";
import { IntegrationBadge } from "../components/IntegrationBadge";
import {
  useAsaasBalance,
  useAsaasReceivables,
  useAsaasOverdue,
  useTinyPedidosMes,
  useSaldoConsolidado,
} from "../hooks/useFinanceiroData";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinanceiroPage() {
  const qc = useQueryClient();

  const asaasBalance = useAsaasBalance();
  const asaasRec     = useAsaasReceivables();
  const asaasOverdue = useAsaasOverdue();
  const tinyPedidos  = useTinyPedidosMes();
  const consolidado  = useSaldoConsolidado();

  // A receber via Asaas
  const contasReceber = (asaasRec.data?.data ?? []).map((c) => ({
    id: c.id,
    descricao: c.description || "Cobrança",
    valor: c.value,
    vencimento: c.dueDate,
    fonte: "Asaas",
  }));

  // Pedidos B2B Tiny — apenas aprovados/entregues/enviados
  const situacoesOk = ["aprovado", "pronto para envio", "enviado", "entregue"];
  const pedidosOk   = (tinyPedidos.data ?? []).filter(
    (p) => situacoesOk.includes(p.situacao?.toLowerCase() ?? "")
  );
  const faturamentoB2B = pedidosOk.reduce((s, p) => s + (p.valor ?? 0), 0);

  const totalReceber = contasReceber.reduce((s, c) => s + c.valor, 0);
  const totalVencido = (asaasOverdue.data?.data ?? []).reduce((s, c) => s + c.value, 0);

  type Status = "connected" | "error" | "loading";
  const st = (q: { isLoading: boolean; isError: boolean }): Status =>
    q.isLoading ? "loading" : q.isError ? "error" : "connected";

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:pt-6">
        <div>
          <h1 className="text-lg font-semibold">Financeiro</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="gap-1.5">
          <RefreshCw size={13} />
          Atualizar
        </Button>
      </div>

      {/* Integration badges */}
      <div className="flex items-center gap-2 px-4 md:px-6 pb-4 flex-wrap">
        <IntegrationBadge name="Asaas" status={st(asaasBalance)} />
        <IntegrationBadge name="Tiny"  status={st(tinyPedidos)} />
        <IntegrationBadge name="Bling" status="error" />
      </div>

      <div className="px-4 md:px-6 space-y-5 pb-8">

        {/* Aviso Bling */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-sm">
          <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <strong>Bling não conectado.</strong> Acesse{" "}
            <strong>Bling → Configurações → API → Tokens e Aplicativos</strong>{" "}
            e gere um novo token OAuth2. O token antigo (API v2) não funciona no v3.
          </p>
        </div>

        {/* Saldos */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saldos</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <SaldoCard
              label="Asaas"
              value={asaasBalance.isLoading ? null : (asaasBalance.data?.balance ?? null)}
              isLoading={asaasBalance.isLoading}
              isError={asaasBalance.isError}
              source="Asaas"
              variant={
                !asaasBalance.isLoading && !asaasBalance.isError
                  ? (asaasBalance.data?.balance ?? 0) < 1000 ? "warning" : "default"
                  : "default"
              }
            />
            <SaldoCard label="Itaú NICE FOODS"     value={null} isError source="Bling" />
            <SaldoCard label="Itaú NICE Ecommerce" value={null} isError source="Bling" />
          </div>
        </section>

        {/* Posição do mês */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Posição do mês — {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <SaldoCard label="A pagar (Bling)"        value={null} isError />
            <SaldoCard
              label="A receber (Asaas)"
              value={asaasRec.isLoading ? null : totalReceber}
              isLoading={asaasRec.isLoading}
              variant="positive"
            />
            <SaldoCard
              label="Faturamento B2B (Tiny)"
              value={tinyPedidos.isLoading ? null : faturamentoB2B}
              isLoading={tinyPedidos.isLoading}
              isError={tinyPedidos.isError}
              source="Tiny"
              variant="positive"
            />
            <SaldoCard
              label="Cobranças vencidas"
              value={asaasOverdue.isLoading ? null : totalVencido}
              isLoading={asaasOverdue.isLoading}
              variant={totalVencido > 0 ? "negative" : "positive"}
            />
          </div>
        </section>

        {/* Listas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContasList
            title="A Receber — Asaas"
            contas={contasReceber}
            tipo="receber"
            isLoading={asaasRec.isLoading}
          />

          {/* Pedidos B2B do Tiny */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingBag size={13} className="text-muted-foreground" />
                  Pedidos B2B — Tiny
                </p>
                {!tinyPedidos.isLoading && (
                  <p className="text-xs text-muted-foreground">{pedidosOk.length} aprovados no mês</p>
                )}
              </div>
              {!tinyPedidos.isLoading && (
                <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmt(faturamentoB2B)}
                </span>
              )}
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {tinyPedidos.isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                    <div className="h-3 bg-muted rounded flex-1" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                ))
              ) : pedidosOk.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum pedido aprovado no mês
                </div>
              ) : (
                pedidosOk.slice(0, 20).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="flex-1 truncate text-foreground">{p.nome || "—"}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{p.data_pedido}</span>
                    <span className="tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 w-20 text-right">
                      {fmt(p.valor)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cobranças vencidas */}
        {!asaasOverdue.isLoading && (asaasOverdue.data?.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">⚠ Cobranças vencidas</span>
              <span className="text-xs text-muted-foreground">
                {asaasOverdue.data!.totalCount} · {fmt(asaasOverdue.data!.data.reduce((s, c) => s + c.value, 0))}
              </span>
            </div>
            <ContasList
              title="Vencidas — Asaas"
              contas={asaasOverdue.data!.data.map((c) => ({
                id: c.id, descricao: c.description || "Cobrança",
                valor: c.value, vencimento: c.dueDate, fonte: "Asaas",
              }))}
              tipo="receber"
            />
          </section>
        )}
      </div>
    </div>
  );
}
