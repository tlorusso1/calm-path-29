import { apiBase, proxyFetch } from "@/lib/apiBase";
// Tiny API — Vite proxy em dev, Supabase Edge Function em prod
const BASE = apiBase("tiny");
const TOKEN = import.meta.env.VITE_TINY_TOKEN;

async function get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ token: TOKEN, formato: "json", ...params });
  const res = await proxyFetch(`${BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Tiny ${endpoint}: ${res.status}`);
  return res.json();
}

export interface TinyContato {
  id: string;
  nome: string;
  fantasia: string;
  tipo_pessoa: "J" | "F"; // J=PJ, F=PF
  cpf_cnpj: string;
  fone: string;
  email: string;
  cidade: string;
  uf: string;
  situacao: string; // A=ativo
  obs?: string;
}

export interface TinyPedidoResumo {
  id: string;
  numero: string;
  data_pedido: string;   // DD/MM/YYYY
  nome: string;          // nome do cliente
  valor: number;
  situacao: string;
}

export interface TinyPedidoItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor: number;
}

export interface TinyPedidoDetalhe extends TinyPedidoResumo {
  itens: TinyPedidoItem[];
}

function parseValor(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(",", ".")) || 0;
  return 0;
}

// Carrega página de contatos
async function getContatosPagina(pagina: number): Promise<{ contatos: TinyContato[]; paginas: number }> {
  const data = await get<any>("contatos.pesquisa.php", { pagina: String(pagina) });
  const r = data?.retorno;
  return {
    contatos: (r?.contatos ?? []).map((c: any) => ({ ...c.contato })),
    paginas: parseInt(r?.numero_paginas ?? "1"),
  };
}

// Carrega TODOS os contatos ativos (pagina a pagina, máx 5 páginas por agora)
export async function getAllContatos(): Promise<TinyContato[]> {
  const first = await getContatosPagina(1);
  const pages = Math.min(first.paginas, 10); // máx 1000 contatos
  const all = [...first.contatos];
  for (let p = 2; p <= pages; p++) {
    const r = await getContatosPagina(p);
    all.push(...r.contatos);
  }
  // Tiny retorna "Ativo" (texto), não "A"
  return all.filter((c) => c.situacao?.toLowerCase() === "ativo");
}

// Carrega página de pedidos
async function getPedidosPagina(pagina: number, params: Record<string, string> = {}): Promise<{ pedidos: TinyPedidoResumo[]; paginas: number }> {
  const data = await get<any>("pedidos.pesquisa.php", { pagina: String(pagina), ...params });
  const r = data?.retorno;
  return {
    pedidos: (r?.pedidos ?? []).map((p: any) => ({
      ...p.pedido,
      valor: parseValor(p.pedido?.valor),
    })),
    paginas: parseInt(r?.numero_paginas ?? "1"),
  };
}

// Todos os pedidos dos últimos 12 meses (máx 8 páginas = 800 pedidos)
export async function getAllPedidos12m(): Promise<TinyPedidoResumo[]> {
  const now = new Date();
  const ini = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const dataInicial = `${String(ini.getDate()).padStart(2,"0")}/${String(ini.getMonth()+1).padStart(2,"0")}/${ini.getFullYear()}`;
  const dataFinal   = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

  const first = await getPedidosPagina(1, { dataInicial, dataFinal });
  const pages = Math.min(first.paginas, 10);
  const all = [...first.pedidos];
  for (let p = 2; p <= pages; p++) {
    const r = await getPedidosPagina(p, { dataInicial, dataFinal });
    all.push(...r.pedidos);
  }
  return all;
}

// Detalhe de um pedido com itens
export async function getPedidoDetalhe(id: string): Promise<TinyPedidoDetalhe> {
  const data = await get<any>("pedido.obter.php", { id });
  const p = data?.retorno?.pedido;
  return {
    ...p,
    valor: parseValor(p?.valor_total ?? p?.valor),
    itens: (p?.itens ?? []).map((it: any) => ({
      descricao: it.item?.descricao ?? "",
      quantidade: parseValor(it.item?.quantidade),
      valor_unitario: parseValor(it.item?.valor_unitario),
      valor: parseValor(it.item?.valor),
    })),
  };
}
