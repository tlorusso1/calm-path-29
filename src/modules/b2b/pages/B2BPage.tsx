import { useState, useMemo } from "react";
import { Search, RefreshCw, Users, AlertTriangle, TrendingUp, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useB2BClientes, type ClienteB2B, type HealthStatus } from "../hooks/useB2BClientes";
import { ClienteCard } from "../components/ClienteCard";
import { ClienteDetalhe } from "../components/ClienteDetalhe";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Filtro = "todos" | HealthStatus;

const FILTROS: { key: Filtro; label: string; icon: React.ReactNode }[] = [
  { key: "todos",   label: "Todos",     icon: <Users size={13} /> },
  { key: "ativo",   label: "Ativos",    icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
  { key: "risco",   label: "Em risco",  icon: <AlertTriangle size={13} className="text-amber-500" /> },
  { key: "perdido", label: "Inativos",  icon: <XCircle size={13} className="text-red-500" /> },
  { key: "novo",    label: "Leads",     icon: <span className="w-2 h-2 rounded-full bg-blue-400" /> },
];

export default function B2BPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteB2B | null>(null);

  const { clientes, ativos, risco, perdidos, novos, totalReceita, isLoading } = useB2BClientes();

  const clientesFiltrados = useMemo(() => {
    let lista = filtro === "todos" ? clientes : clientes.filter((c) => c.health === filtro);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (c) => c.nome.toLowerCase().includes(q) ||
               c.fantasia?.toLowerCase().includes(q) ||
               c.cidade?.toLowerCase().includes(q) ||
               c.cnpj?.includes(q)
      );
    }
    // Ordena: mais dias sem comprar primeiro (maior urgência)
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
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${clientes.filter(c => c.totalPedidos > 0).length} clientes ativos · ${fmt(totalReceita)} últimos 12 meses`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["b2b"] })} className="gap-1.5">
          <RefreshCw size={13} />
          Atualizar
        </Button>
      </div>

      {/* KPIs de alertas */}
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

      {/* Filtros + busca */}
      <div className="px-4 md:px-6 mb-3 space-y-2">
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

      {/* Lista */}
      <div className="px-4 md:px-6 pb-8">
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
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""}
              {busca && ` para "${busca}"`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientesFiltrados.map((c) => (
                <ClienteCard key={c.id} cliente={c} onClick={() => setClienteSelecionado(c)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detalhe modal */}
      {clienteSelecionado && (
        <ClienteDetalhe
          cliente={clienteSelecionado}
          onClose={() => setClienteSelecionado(null)}
        />
      )}
    </div>
  );
}
