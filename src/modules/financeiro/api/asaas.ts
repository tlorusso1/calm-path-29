// Asaas API — proxy via /api/asaas (Vite dev) ou Edge Function (prod)
const BASE = "/api/asaas";

export interface AsaasBalance {
  balance: number;
  totalTransferValue: number;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  dueDate: string;
  status: string; // PENDING | RECEIVED | CONFIRMED | OVERDUE
  description: string;
  billingType: string;
}

export interface AsaasBill {
  id: string;
  description: string;
  value: number;
  dueDate: string;
  status: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Asaas ${path}: ${res.status}`);
  return res.json();
}

export async function getAsaasBalance(): Promise<AsaasBalance> {
  return get<AsaasBalance>("/finance/balance");
}

export async function getAsaasReceivables(): Promise<{ data: AsaasPayment[]; totalCount: number }> {
  // Pega cobranças pendentes e vencidas
  return get("/payments?limit=100&status=PENDING,OVERDUE&sort=dueDate&order=asc");
}

export async function getAsaasReceivedThisMonth(): Promise<{ data: AsaasPayment[]; totalCount: number }> {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
  return get(`/payments?limit=100&status=RECEIVED,CONFIRMED&paymentDate[ge]=${start}&paymentDate[le]=${end}`);
}

export async function getAsaasOverdue(): Promise<{ data: AsaasPayment[]; totalCount: number }> {
  return get("/payments?limit=50&status=OVERDUE&sort=dueDate&order=asc");
}
