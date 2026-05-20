// Bling API v3 — proxy via /api/bling (Vite dev) ou Edge Function (prod)
const BASE = "/api/bling";

export interface BlingContaBancaria {
  id: number;
  descricao: string;
  tipo: { id: number; descricao: string };
  saldo: number;
  situacao: number;
}

export interface BlingContaPagar {
  id: number;
  fornecedor: { id: number; nome: string };
  vencimento: string;
  valor: number;
  situacao: { id: number; valor: string };
  historico: string;
  categoria: { id: number; descricao: string };
}

export interface BlingContaReceber {
  id: number;
  cliente: { id: number; nome: string };
  vencimento: string;
  valor: number;
  situacao: { id: number; valor: string };
  historico: string;
  categoria: { id: number; descricao: string };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Bling ${path}: ${res.status}`);
  return res.json();
}

export async function getBlingContasBancarias(): Promise<{ data: BlingContaBancaria[] }> {
  return get<{ data: BlingContaBancaria[] }>("/contas-bancarias?situacao=1");
}

export async function getBlingContasPagar(): Promise<{ data: BlingContaPagar[] }> {
  const now = new Date();
  const venc = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  // Situação 1 = Em aberto
  return get<{ data: BlingContaPagar[] }>(
    `/contas-pagar?situacoes[]=1&dataVencimentoInicial=${venc}&pagina=1&limite=100`
  );
}

export async function getBlingContasReceber(): Promise<{ data: BlingContaReceber[] }> {
  const now = new Date();
  const venc = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  // Situação 1 = Em aberto
  return get<{ data: BlingContaReceber[] }>(
    `/contas-receber?situacoes[]=1&dataVencimentoInicial=${venc}&pagina=1&limite=100`
  );
}
