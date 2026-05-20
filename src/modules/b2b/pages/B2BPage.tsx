import { useState, useMemo } from "react";
import { Search, RefreshCw, Users, AlertTriangle, XCircle, LayoutList, DollarSign, Bell, CheckSquare, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  useB2BClientes,
  getPeriodoRange,
  getPeriodoAnterior,
  type ClienteB2B,
  type HealthStatus,
  type PeriodoKey,
  type PeriodoRange,
} from "../hooks/useB2BClientes";
import { ClienteCard } from "../components/ClienteCard";
import { ClienteDetalhe } from "../components/ClienteDetalhe";
import { B2BFaturamento } from "../components/B2BFaturamento";
import { B2BCobrancas } from "../components/B2BCobrancas";
import { ReativacaoEmMassa } from "../components/ReativacaoEmMassa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Filtro = "todos" | HealthStatus;
type Tab = "clientes" | "faturamento" | "cobrancas";

const FILTROS: { key: Filtro; label: string; icon: React.ReactNode }[] = [
  { key: "todos",   label: "Todos",    icon: <Users size={13} /> },
  { key: "ativo",   label: "Ativos",   icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
  { key: "risco",   label: "Em risco", icon: <AlertTriangle size={13} className="text-amber-500" /> },
  { key: "perdido", label: "Inativos", icon: <XCircle size={13} className="text-red-500" /> },
  { key: "novo",    label: "Leads",    icon: <span className="w-2 h-2 rounded-full bg-blue-400" /> },
];

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "clientes",    label: "Clientes",    icon: <LayoutList size={14} /> },
  { key: "faturamento", label: "Faturamento", icon: <DollarSign size={14} /> },
  { key: "cobrancas",   label: "Cobranças",   icon: <Bell size={14} /> },
];

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: "mes_atual",    label: "Este mês" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "trimestre",    label: "Trimestre" },
  { key: "ano",          label: "Este ano" },
  { key: "personalizado", label: "Personalizado" },
];

function variacaoLabel(v: number | null) {
  if (v === null) return null;
  const sinal = v >= 0 ? "+" : "";
  const cor = v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
  return <span className={`text-[10px] font-semibold ${cor}`}>{sinal}{v.toFixed(1)}%</span>;
}

export default function B2BPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("clientes");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteB2B | null>(null);

  // Período
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>("mes_atual");
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");
  const [compararAnterior, setCompararAnterior] = useState(false);

  const periodo: PeriodoRange = useMemo(() => {
    if (periodoKey === "personalizado" && customInicio && customFim) {
      return getPeriodoRange("personalizado", {
        inicio: new Date(customInicio),
        fim: new Date(customFim),
      });
    }
    return getPeriodoRange(periodoKey);
  }, [periodoKey, customInicio, customFim]);

  // Seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [showReativacao, setShowReativacao] = useState(false);

  function toggleSelecao(id: string) {
    setSelecionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function cancelarSelecao() {
    setModoSelecao(false);
    setSelecionados(new Set());
  }

  const { clientes, ativos, risco, perdidos, novos, totalReceita, isLoading } = useB2BClientes(periodo);

  const clientesSelecionados = clientes.filter(c => selecionados.has(c.id));

  // Variação total do período
  const variacaoTotal = useMemo(() => {
    if (!compararAnterior || clientes.length === 0) return null;
    const recAnterior = clientes.reduce((s, c) => s + c.receitaAnterior, 0);
    if (recAnterior === 0) return null;
    return ((totalReceita - recAnterior) / recAnterior) * 100;
  }, [clientes, totalReceita, compararAnterior]);

  const clientesFiltrados = useMemo(() => {
    let lista = filtro === "todos" ? clientes : clientes.filter((c) => c.health === filtro);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.fantasia?.toLowerCase().includes(q) ||
        c.cidade?.toLowerCase().includes(q) ||
        c.cnpj?.includes(q)
      );
    }
    return [...lista].sort((a, b) => {
      if (a.health !== b.health) {
        const order: Record<HealthStatus, number> = { perdido: 0, risco: 1, ativo: 2, novo: 3 };
        return order[a.health] - order[b.health];
      }
      return (b.diasSemComprar ?? 999) - (a.diasSemComprar ?? 999);
    });
  }, [clientes, filtro, busca]);

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:pt-6">
        <div>
          <h1 className="text-lg font-semibold">B2B — Lojistas & Food Service</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {isLoading ? "Carregando..." : (
              <>
                {clientes.filter(c => c.totalPedidos > 0).length} compraram · {fmt(totalReceita)} {periodo.label.toLowerCase()}
                {compararAnterior && variacaoTotal !== null && variacaoLabel(variacaoTotal)}
              </>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["b2b"] })} className="gap-1.5">
          <RefreshCw size={13} />
          Atualizar
        </Button>
      </div>

      {/* Seletor de período */}
      <div className="px-4 md:px-6 mb-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodoKey(p.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                periodoKey === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {p.label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1 cursor-pointer">
            <input
              type="checkbox"
              checked={compararAnterior}
              onChange={e => setCompararAnterior(e.target.checked)}
              className="rounded"
            />
            vs. período anterior
          </label>
        </div>
        {periodoKey === "personalizado" && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-4 md:px-6 mb-4">
        {[
          { label: "Ativos",   value: ativos.length,   color: "text-emerald-600 dark:text-emerald-400", bg: "" },
          { label: "Em risco", value: risco.length,    color: "text-amber-600 dark:text-amber-400",     bg: "border-amber-200 dark:border-amber-900" },
          { label: "Inativos", value: perdidos.length, color: "text-red-600 dark:text-red-400",         bg: "border-red-200 dark:border-red-900" },
          { label: "Leads",    value: novos.length,    color: "text-blue-600 dark:text-blue-400",       bg: "" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`metric-card ${bg}`}>
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={`text-2xl font-bold ${color}`}>{isLoading ? "—" : value}</span>
          </div>
        ))}
      </div>

      {/* Tabs principais */}
      <div className="px-4 md:px-6 mb-4">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 md:px-6 pb-24">

        {/* Tab Clientes */}
        {tab === "clientes" && (
          <>
            {/* Filtros + busca + botão selecionar */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILTROS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      filtro === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {f.icon}
                    {f.label}
                    {f.key !== "todos" && !isLoading && (
                      <span className="ml-0.5 opacity-70">
                        ({f.key === "ativo" ? ativos.length : f.key === "risco" ? risco.length : f.key === "perdido" ? perdidos.length : novos.length})
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => { setModoSelecao(!modoSelecao); setSelecionados(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ml-auto ${
                    modoSelecao ? "bg-blue-600 text-white border-blue-600" : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <CheckSquare size={13} />
                  Selecionar
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome, cidade ou CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="grid grid-cols-3 gap-2">
                      {[0,1,2].map(j => <div key={j} className="h-10 bg-muted rounded-lg" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Nenhum cliente encontrado</p>
                <p className="text-xs opacity-60 mt-1">Tente outro período ou filtro</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""}
                  {busca && ` para "${busca}"`}
                  {modoSelecao && selecionados.size > 0 && ` · ${selecionados.size} selecionado(s)`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clientesFiltrados.map((c) => (
                    <ClienteCard
                      key={c.id}
                      cliente={c}
                      onClick={() => modoSelecao ? toggleSelecao(c.id) : setClienteSelecionado(c)}
                      selecionado={selecionados.has(c.id)}
                      modoSelecao={modoSelecao}
                      compararAnterior={compararAnterior}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "faturamento" && <B2BFaturamento periodo={periodo} />}
        {tab === "cobrancas" && <B2BCobrancas />}
      </div>

      {/* Floating action bar — seleção múltipla */}
      {modoSelecao && selecionados.size > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 bg-background border border-border rounded-2xl shadow-lg p-3 flex items-center gap-2">
          <span className="text-xs font-semibold flex-1">{selecionados.size} selecionado(s)</span>
          <button
            onClick={() => setShowReativacao(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
          >
            Reativar todos
          </button>
          <button onClick={cancelarSelecao} className="p-2 hover:bg-muted rounded-xl">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modal detalhe */}
      {clienteSelecionado && (
        <ClienteDetalhe cliente={clienteSelecionado} onClose={() => setClienteSelecionado(null)} />
      )}

      {/* Modal reativação em massa */}
      {showReativacao && (
        <ReativacaoEmMassa
          clientes={clientesSelecionados}
          onClose={() => { setShowReativacao(false); cancelarSelecao(); }}
        />
      )}
    </div>
  );
}
