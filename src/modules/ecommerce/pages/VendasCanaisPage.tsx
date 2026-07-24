import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart3, Package, TrendingUp, Loader2 } from "lucide-react";

type VendaCanal = {
  id: string;
  mes: string;
  canal: string;
  pedidos: number;
  faturamento: number;
  fonte: string | null;
};

type VendaProduto = {
  id: string;
  mes: string;
  canal: string;
  nome: string;
  sku: string | null;
  qtd_vendida: number;
  faturamento: number;
  fonte: string | null;
};

type Metric = "faturamento" | "pedidos";
type Tab = "canal" | "produto";

const PERIODOS = [
  { label: "3 meses",  months: 3 },
  { label: "6 meses",  months: 6 },
  { label: "12 meses", months: 12 },
  { label: "24 meses", months: 24 },
  { label: "Tudo",     months: 0 },
];

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(340 82% 60%)",
  "hsl(262 83% 58%)",
  "hsl(174 62% 47%)",
  "hsl(14 90% 55%)",
  "hsl(199 89% 48%)",
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtMes = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

export default function VendasCanaisPage() {
  const [tab, setTab] = useState<Tab>("canal");
  const [periodoIdx, setPeriodoIdx] = useState(2); // 12 meses
  const [canalFiltro, setCanalFiltro] = useState<string>("todos");
  const [metric, setMetric] = useState<Metric>("faturamento");

  const dataCorte = useMemo(() => {
    const months = PERIODOS[periodoIdx].months;
    if (!months) return null;
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1));
    return d.toISOString().slice(0, 10);
  }, [periodoIdx]);

  const canaisQuery = useQuery({
    queryKey: ["vendas_canais", dataCorte],
    queryFn: async () => {
      let q = supabase
        .from("vendas_canais")
        .select("*")
        .order("mes", { ascending: true });
      if (dataCorte) q = q.gte("mes", dataCorte);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VendaCanal[];
    },
  });

  const produtosQuery = useQuery({
    queryKey: ["vendas_produtos", dataCorte, canalFiltro],
    queryFn: async () => {
      let q = supabase
        .from("vendas_produtos")
        .select("*")
        .order("faturamento", { ascending: false });
      if (dataCorte) q = q.gte("mes", dataCorte);
      if (canalFiltro !== "todos") q = q.eq("canal", canalFiltro);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as VendaProduto[];
    },
    enabled: tab === "produto",
  });

  const canais = useMemo(() => {
    const set = new Set<string>();
    (canaisQuery.data ?? []).forEach((r) => set.add(r.canal));
    return Array.from(set).sort();
  }, [canaisQuery.data]);

  const dadosFiltrados = useMemo(() => {
    const rows = canaisQuery.data ?? [];
    return canalFiltro === "todos" ? rows : rows.filter((r) => r.canal === canalFiltro);
  }, [canaisQuery.data, canalFiltro]);

  // Pivot: uma linha por mês, colunas = canais
  const chartData = useMemo(() => {
    const byMes = new Map<string, Record<string, number | string>>();
    for (const r of dadosFiltrados) {
      const key = r.mes;
      if (!byMes.has(key)) byMes.set(key, { mes: key, label: fmtMes(key) });
      const row = byMes.get(key)!;
      row[r.canal] = ((row[r.canal] as number) ?? 0) + (metric === "faturamento" ? Number(r.faturamento) : r.pedidos);
    }
    return Array.from(byMes.values()).sort((a, b) => (a.mes as string).localeCompare(b.mes as string));
  }, [dadosFiltrados, metric]);

  const canaisNoChart = canalFiltro === "todos" ? canais : [canalFiltro];

  // Totais por mês (para tabela)
  const tabelaMensal = useMemo(() => {
    const byMes = new Map<string, { mes: string; pedidos: number; faturamento: number; canais: Set<string> }>();
    for (const r of dadosFiltrados) {
      if (!byMes.has(r.mes)) byMes.set(r.mes, { mes: r.mes, pedidos: 0, faturamento: 0, canais: new Set() });
      const row = byMes.get(r.mes)!;
      row.pedidos += r.pedidos;
      row.faturamento += Number(r.faturamento);
      row.canais.add(r.canal);
    }
    return Array.from(byMes.values()).sort((a, b) => b.mes.localeCompare(a.mes));
  }, [dadosFiltrados]);

  const totalFaturamento = tabelaMensal.reduce((s, r) => s + r.faturamento, 0);
  const totalPedidos = tabelaMensal.reduce((s, r) => s + r.pedidos, 0);
  const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

  // Ranking de produtos
  const rankingProdutos = useMemo(() => {
    const rows = produtosQuery.data ?? [];
    const bySku = new Map<string, VendaProduto & { key: string }>();
    for (const r of rows) {
      const key = `${r.sku ?? ""}::${r.nome}`;
      if (!bySku.has(key)) {
        bySku.set(key, { ...r, key });
      } else {
        const cur = bySku.get(key)!;
        cur.qtd_vendida += r.qtd_vendida;
        cur.faturamento = Number(cur.faturamento) + Number(r.faturamento);
      }
    }
    return Array.from(bySku.values()).sort((a, b) => Number(b.faturamento) - Number(a.faturamento));
  }, [produtosQuery.data]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            Vendas por Canal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consolidação mensal por canal e produto (Tiny B2B, Bling D2C)
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
          <button
            onClick={() => setTab("canal")}
            className={`px-3 py-1.5 rounded-md transition ${tab === "canal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Por Canal
          </button>
          <button
            onClick={() => setTab("produto")}
            className={`px-3 py-1.5 rounded-md transition ${tab === "produto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Por Produto
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
          {PERIODOS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodoIdx(i)}
              className={`px-2.5 py-1 rounded-md ${periodoIdx === i ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <select
          value={canalFiltro}
          onChange={(e) => setCanalFiltro(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="todos">Todos os canais</option>
          {canais.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {tab === "canal" && (
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs ml-auto">
            <button
              onClick={() => setMetric("faturamento")}
              className={`px-2.5 py-1 rounded-md ${metric === "faturamento" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              Faturamento
            </button>
            <button
              onClick={() => setMetric("pedidos")}
              className={`px-2.5 py-1 rounded-md ${metric === "pedidos" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              Pedidos
            </button>
          </div>
        )}
      </div>

      {tab === "canal" ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPI icon={<TrendingUp size={16} />} label="Faturamento" value={fmtBRL(totalFaturamento)} />
            <KPI icon={<Package size={16} />} label="Pedidos" value={fmtNum(totalPedidos)} />
            <KPI icon={<BarChart3 size={16} />} label="Ticket médio" value={fmtBRL(ticketMedio)} />
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium mb-3">
              {metric === "faturamento" ? "Faturamento mensal por canal" : "Pedidos mensais por canal"}
            </h2>
            <div className="h-80">
              {canaisQuery.isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => metric === "faturamento" ? `${(v/1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => metric === "faturamento" ? fmtBRL(v) : fmtNum(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {canaisNoChart.map((c, i) => (
                      <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === canaisNoChart.length - 1 ? [4,4,0,0] : 0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabela mensal */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-medium">Detalhamento mensal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Mês</th>
                    <th className="text-right px-4 py-2 font-medium">Pedidos</th>
                    <th className="text-right px-4 py-2 font-medium">Faturamento</th>
                    <th className="text-right px-4 py-2 font-medium">Ticket médio</th>
                    <th className="text-right px-4 py-2 font-medium">Canais</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaMensal.length === 0 && !canaisQuery.isLoading && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem dados no período</td></tr>
                  )}
                  {tabelaMensal.map((r) => (
                    <tr key={r.mes} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-2 capitalize">{fmtMes(r.mes)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtNum(r.pedidos)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtBRL(r.faturamento)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.pedidos > 0 ? fmtBRL(r.faturamento / r.pedidos) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{r.canais.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium">Ranking de produtos por faturamento</h2>
            <span className="text-xs text-muted-foreground">{rankingProdutos.length} itens</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium w-10">#</th>
                  <th className="text-left px-4 py-2 font-medium">Produto</th>
                  <th className="text-left px-4 py-2 font-medium">SKU</th>
                  <th className="text-left px-4 py-2 font-medium">Canal</th>
                  <th className="text-right px-4 py-2 font-medium">Qtd</th>
                  <th className="text-right px-4 py-2 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {produtosQuery.isLoading && (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 size={18} className="animate-spin inline text-muted-foreground" /></td></tr>
                )}
                {!produtosQuery.isLoading && rankingProdutos.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sem produtos no período</td></tr>
                )}
                {rankingProdutos.slice(0, 100).map((p, i) => (
                  <tr key={p.key} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2">{p.nome}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{p.sku ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{p.canal}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(p.qtd_vendida)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtBRL(Number(p.faturamento))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} <span>{label}</span>
      </div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
      <BarChart3 size={28} className="mb-2 opacity-50" />
      <p className="text-sm">Ainda não há vendas registradas no período.</p>
      <p className="text-xs mt-1">Rode <code className="px-1 py-0.5 rounded bg-muted">sync-vendas</code> para popular a tabela.</p>
    </div>
  );
}
