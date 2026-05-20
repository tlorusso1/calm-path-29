// Tiny API v2 — proxy via /api/tiny (Vite dev)
const BASE = "/api/tiny";
const TOKEN = import.meta.env.VITE_TINY_TOKEN;

async function get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ token: TOKEN, formato: "json", ...params });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Tiny ${endpoint}: ${res.status}`);
  return res.json();
}

export interface TinyPedido {
  id: string;
  numero: string;
  data_pedido: string;
  nome: string;
  valor: number;
  situacao: string;
}

function parseValor(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(",", ".")) || 0;
  return 0;
}

function mesAtual() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const a = now.getFullYear();
  return { dataInicial: `01/${m}/${a}`, dataFinal: `31/${m}/${a}` };
}

export async function getTinyPedidosMes(): Promise<TinyPedido[]> {
  const { dataInicial, dataFinal } = mesAtual();
  const data = await get<any>("pedidos.pesquisa.php", { dataInicial, dataFinal });
  return (data?.retorno?.pedidos ?? []).map((p: any) => ({
    ...p.pedido,
    valor: parseValor(p.pedido?.valor),
  }));
}

export async function getTinyPedidosRecentes(): Promise<TinyPedido[]> {
  const data = await get<any>("pedidos.pesquisa.php");
  return (data?.retorno?.pedidos ?? []).map((p: any) => ({
    ...p.pedido,
    valor: parseValor(p.pedido?.valor),
  }));
}
