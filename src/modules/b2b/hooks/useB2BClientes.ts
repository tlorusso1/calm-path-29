import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parse, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { getAllContatos, getAllPedidos12m, type TinyPedidoResumo } from "../api/tinyB2B";

// ── Tipos públicos ─────────────────────────────────────────────
export type HealthStatus = "ativo" | "risco" | "perdido" | "novo";

export type PeriodoKey = "mes_atual" | "mes_anterior" | "trimestre" | "ano" | "personalizado";

export interface PeriodoRange {
  inicio: Date;
  fim: Date;
  label: string;
}

export interface ClienteB2B {
  id: string;
  nome: string;
  fantasia: string;
  tipo: "J" | "F";
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  obs: string;

  // Métricas calculadas dos pedidos (para o período selecionado)
  totalPedidos: number;
  receitaTotal: number;
  ticketMedio: number;
  ultimaCompra: string | null;
  diasSemComprar: number | null;
  skus: string[];
  pedidos: TinyPedidoResumo[];       // todos os pedidos (12m, sem filtro de período)
  pedidosPeriodo: TinyPedidoResumo[]; // pedidos do período selecionado

  // Comparação com período anterior
  receitaAnterior: number;
  variacaoReceita: number | null; // % de variação, null se sem dados anteriores

  // Health (baseado no histórico completo, não no período)
  health: HealthStatus;
  healthLabel: string;
}

export function getPeriodoRange(key: PeriodoKey, custom?: { inicio: Date; fim: Date }): PeriodoRange {
  const hoje = new Date();
  switch (key) {
    case "mes_atual":
      return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje), label: "Este mês" };
    case "mes_anterior": {
      const m = subMonths(hoje, 1);
      return { inicio: startOfMonth(m), fim: endOfMonth(m), label: "Mês anterior" };
    }
    case "trimestre":
      return { inicio: startOfQuarter(hoje), fim: endOfQuarter(hoje), label: "Este trimestre" };
    case "ano":
      return { inicio: startOfYear(hoje), fim: endOfYear(hoje), label: "Este ano" };
    case "personalizado":
      return custom
        ? { inicio: custom.inicio, fim: custom.fim, label: "Período personalizado" }
        : { inicio: startOfMonth(hoje), fim: endOfMonth(hoje), label: "Este mês" };
  }
}

export function getPeriodoAnterior(range: PeriodoRange): PeriodoRange {
  const duracao = range.fim.getTime() - range.inicio.getTime();
  const fimAnt = new Date(range.inicio.getTime() - 1);
  const inicioAnt = new Date(fimAnt.getTime() - duracao);
  return { inicio: inicioAnt, fim: fimAnt, label: "Período anterior" };
}

const SITUACOES_OK = ["aprovado", "pronto para envio", "enviado", "entregue"];

function parseTinyDate(d: string): Date | null {
  try { return parse(d, "dd/MM/yyyy", new Date()); } catch { return null; }
}

function calcHealth(diasSemComprar: number | null, totalPedidos: number): HealthStatus {
  if (totalPedidos === 0) return "novo";
  if (diasSemComprar === null) return "perdido";
  if (diasSemComprar <= 30) return "ativo";
  if (diasSemComprar <= 60) return "risco";
  return "perdido";
}

const HEALTH_LABELS: Record<HealthStatus, string> = {
  ativo:   "Ativo",
  risco:   "Em risco",
  perdido: "Inativo",
  novo:    "Novo / Lead",
};

function pedidosDoPeriodo(pedidos: TinyPedidoResumo[], range: PeriodoRange): TinyPedidoResumo[] {
  return pedidos.filter((p) => {
    const d = parseTinyDate(p.data_pedido);
    if (!d) return false;
    return d >= range.inicio && d <= range.fim;
  });
}

// ── Hook principal ─────────────────────────────────────────────
export function useB2BClientes(periodo?: PeriodoRange) {
  const range = periodo ?? getPeriodoRange("mes_atual");
  const rangeAnterior = getPeriodoAnterior(range);

  const contatos = useQuery({
    queryKey: ["b2b", "contatos"],
    queryFn: getAllContatos,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });

  const pedidos = useQuery({
    queryKey: ["b2b", "pedidos12m"],
    queryFn: getAllPedidos12m,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });

  const clientes: ClienteB2B[] = (() => {
    if (!contatos.data || !pedidos.data) return [];

    // Agrupa TODOS os pedidos aprovados por nome
    const pedidosPorNome = new Map<string, TinyPedidoResumo[]>();
    for (const p of pedidos.data) {
      if (!SITUACOES_OK.includes(p.situacao?.toLowerCase() ?? "")) continue;
      const chave = p.nome?.trim()?.toLowerCase() ?? "";
      if (!chave) continue;
      if (!pedidosPorNome.has(chave)) pedidosPorNome.set(chave, []);
      pedidosPorNome.get(chave)!.push(p);
    }

    const hoje = new Date();

    return contatos.data.map((c): ClienteB2B => {
      const chaves = [
        c.nome?.trim()?.toLowerCase(),
        c.fantasia?.trim()?.toLowerCase(),
      ].filter(Boolean);

      let todosPedidos: TinyPedidoResumo[] = [];
      for (const chave of chaves) {
        if (pedidosPorNome.has(chave!)) { todosPedidos = pedidosPorNome.get(chave!)!; break; }
        for (const [k, v] of pedidosPorNome) {
          if (k.includes(chave!) || chave!.includes(k)) { todosPedidos = v; break; }
        }
        if (todosPedidos.length) break;
      }

      // Health baseado no histórico completo
      const datas = todosPedidos.map((p) => parseTinyDate(p.data_pedido)).filter(Boolean) as Date[];
      const ultimaData = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;
      const ultimaCompra = ultimaData?.toISOString().split("T")[0] ?? null;
      const diasSemComprar = ultimaData ? differenceInDays(hoje, ultimaData) : null;
      const health = calcHealth(diasSemComprar, todosPedidos.length);

      // Métricas do período selecionado
      const pedPeriodo = pedidosDoPeriodo(todosPedidos, range);
      const pedAnterior = pedidosDoPeriodo(todosPedidos, rangeAnterior);

      const totalPedidos = pedPeriodo.length;
      const receitaTotal = pedPeriodo.reduce((s, p) => s + (p.valor ?? 0), 0);
      const ticketMedio  = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;
      const receitaAnterior = pedAnterior.reduce((s, p) => s + (p.valor ?? 0), 0);
      const variacaoReceita = receitaAnterior > 0
        ? ((receitaTotal - receitaAnterior) / receitaAnterior) * 100
        : null;

      return {
        id: c.id,
        nome: c.nome?.trim() ?? "",
        fantasia: c.fantasia?.trim() ?? "",
        tipo: c.tipo_pessoa ?? "J",
        cnpj: c.cpf_cnpj ?? "",
        telefone: c.fone || "",
        email: c.email ?? "",
        cidade: c.cidade ?? "",
        uf: c.uf ?? "",
        obs: c.obs ?? "",
        totalPedidos,
        receitaTotal,
        ticketMedio,
        ultimaCompra,
        diasSemComprar,
        skus: [],
        pedidos: todosPedidos,
        pedidosPeriodo: pedPeriodo,
        receitaAnterior,
        variacaoReceita,
        health,
        healthLabel: HEALTH_LABELS[health],
      };
    });
  })();

  const ativos   = clientes.filter((c) => c.health === "ativo");
  const risco    = clientes.filter((c) => c.health === "risco");
  const perdidos = clientes.filter((c) => c.health === "perdido");
  const novos    = clientes.filter((c) => c.health === "novo");

  const topClientes = [...clientes]
    .filter((c) => c.receitaTotal > 0)
    .sort((a, b) => b.receitaTotal - a.receitaTotal)
    .slice(0, 10);

  const totalReceita = clientes.reduce((s, c) => s + c.receitaTotal, 0);
  const totalReceita12m = clientes.reduce((s, c) =>
    s + c.pedidos.reduce((ps, p) => ps + (p.valor ?? 0), 0), 0);

  return {
    clientes,
    ativos,
    risco,
    perdidos,
    novos,
    topClientes,
    totalReceita,      // receita do período selecionado
    totalReceita12m,   // receita total 12m (para faturamento)
    isLoading: contatos.isLoading || pedidos.isLoading,
    isError: contatos.isError || pedidos.isError,
  };
}
