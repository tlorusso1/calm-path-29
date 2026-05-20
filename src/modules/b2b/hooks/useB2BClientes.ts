import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parse } from "date-fns";
import { getAllContatos, getAllPedidos12m, type TinyPedidoResumo } from "../api/tinyB2B";

// ── Tipos públicos ─────────────────────────────────────────────
export type HealthStatus = "ativo" | "risco" | "perdido" | "novo";

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

  // Métricas calculadas dos pedidos
  totalPedidos: number;
  receitaTotal: number;
  ticketMedio: number;
  ultimaCompra: string | null;    // ISO date
  diasSemComprar: number | null;
  skus: string[];                 // produtos únicos comprados
  pedidos: TinyPedidoResumo[];

  // Health
  health: HealthStatus;
  healthLabel: string;
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
  ativo:  "Ativo",
  risco:  "Em risco",
  perdido:"Inativo",
  novo:   "Novo / Lead",
};

// ── Hook principal ─────────────────────────────────────────────
export function useB2BClientes() {
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

    // Agrupa pedidos aprovados por nome de cliente
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
      // Tenta encontrar pedidos por nome exato ou fantasia
      const chaves = [
        c.nome?.trim()?.toLowerCase(),
        c.fantasia?.trim()?.toLowerCase(),
      ].filter(Boolean);

      let pedidosCliente: TinyPedidoResumo[] = [];
      for (const chave of chaves) {
        if (pedidosPorNome.has(chave!)) {
          pedidosCliente = pedidosPorNome.get(chave!)!;
          break;
        }
        // Busca parcial (nome contém)
        for (const [k, v] of pedidosPorNome) {
          if (k.includes(chave!) || chave!.includes(k)) {
            pedidosCliente = v;
            break;
          }
        }
        if (pedidosCliente.length) break;
      }

      const totalPedidos  = pedidosCliente.length;
      const receitaTotal  = pedidosCliente.reduce((s, p) => s + (p.valor ?? 0), 0);
      const ticketMedio   = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;

      // Última compra
      const datas = pedidosCliente
        .map((p) => parseTinyDate(p.data_pedido))
        .filter(Boolean) as Date[];
      const ultimaData = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;
      const ultimaCompra = ultimaData?.toISOString().split("T")[0] ?? null;
      const diasSemComprar = ultimaData ? differenceInDays(hoje, ultimaData) : null;

      // SKUs únicos
      const skus: string[] = [];

      const health = calcHealth(diasSemComprar, totalPedidos);

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
        skus,
        pedidos: pedidosCliente,
        health,
        healthLabel: HEALTH_LABELS[health],
      };
    });
  })();

  // Separados por status
  const ativos   = clientes.filter((c) => c.health === "ativo");
  const risco    = clientes.filter((c) => c.health === "risco");
  const perdidos = clientes.filter((c) => c.health === "perdido");
  const novos    = clientes.filter((c) => c.health === "novo");

  // Top clientes por receita
  const topClientes = [...clientes]
    .filter((c) => c.receitaTotal > 0)
    .sort((a, b) => b.receitaTotal - a.receitaTotal)
    .slice(0, 10);

  return {
    clientes,
    ativos,
    risco,
    perdidos,
    novos,
    topClientes,
    isLoading: contatos.isLoading || pedidos.isLoading,
    isError: contatos.isError || pedidos.isError,
    totalReceita: clientes.reduce((s, c) => s + c.receitaTotal, 0),
  };
}
