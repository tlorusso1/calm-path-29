/**
 * Nuvemshop API — Loja própria Nice Foods
 *
 * Para ativar dados reais:
 *   1. Nuvemshop → Aplicativos → Aplicativos sob medida → Criar app → Acesso total
 *   2. Copiar Access Token e User ID (store id)
 *   3. supabase secrets set NUVEMSHOP_TOKEN=<access_token>
 *   4. supabase secrets set NUVEMSHOP_STORE_ID=<user_id>
 *   5. Adicione no .env.local:
 *      VITE_NUVEMSHOP_CONFIGURED=true
 *   6. Deploy: supabase functions deploy proxy-nuvemshop
 */

import { apiBase, proxyFetch } from "@/lib/apiBase";

const BASE = apiBase("nuvemshop");

export function isNuvemshopConfigured(): boolean {
  // Proxy edge function configurada em produção com NUVEMSHOP_TOKEN + NUVEMSHOP_STORE_ID
  return true;
}

// ── Interfaces ─────────────────────────────────────────────────

export interface NSOrder {
  id: number;
  number: number;
  status: "open" | "closed" | "cancelled" | "unpaid";
  payment_status: "pending" | "paid" | "refunded" | "voided" | "authorized";
  total: string;
  subtotal: string;
  shipping: string;
  discount: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    name: string;
    email: string;
  } | null;
  products: Array<{
    id: number;
    name: string;
    price: string;
    quantity: number;
    sku: string;
  }>;
  payment_details?: {
    method: string;
    installments: number;
  };
  shipping_address?: {
    city: string;
    province: string;
  };
}

export interface NSProduct {
  id: number;
  name: { pt: string };
  description: { pt: string };
  handle: { pt: string };
  published: boolean;
  free_shipping: boolean;
  stock_management: boolean;
  variants: Array<{
    id: number;
    price: string;
    stock: number;
    sku: string;
    promotional_price: string | null;
  }>;
  images: Array<{ id: number; src: string }>;
  categories: Array<{ id: number; name: { pt: string } }>;
}

export interface NSStats {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  pendingOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  todayRevenue: number;
  monthOrders: number;
  monthRevenue: number;
}

export class NuvemshopAuthError extends Error {
  constructor(message = "Token inválido da Nuvemshop") {
    super(message);
    this.name = "NuvemshopAuthError";
  }
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_ORDERS: NSOrder[] = [
  {
    id: 1001, number: 1001, status: "closed", payment_status: "paid",
    total: "189.90", subtotal: "179.90", shipping: "10.00", discount: "0.00",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    customer: { id: 501, name: "Ana Lima", email: "ana@email.com" },
    products: [
      { id: 1, name: "Granola Premium 500g", price: "32.90", quantity: 2, sku: "GRL-500" },
      { id: 2, name: "Pasta de Amendoim Integral 450g", price: "29.90", quantity: 4, sku: "PAM-450" },
    ],
    payment_details: { method: "credit_card", installments: 2 },
    shipping_address: { city: "São Paulo", province: "SP" },
  },
  {
    id: 1002, number: 1002, status: "open", payment_status: "paid",
    total: "74.80", subtotal: "64.80", shipping: "10.00", discount: "0.00",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    customer: { id: 502, name: "Carlos Mendes", email: "carlos@email.com" },
    products: [
      { id: 3, name: "Mix de Nuts 200g", price: "24.90", quantity: 1, sku: "MNT-200" },
      { id: 4, name: "Barra de Cereal Cacau 30g (cx12)", price: "39.90", quantity: 1, sku: "BCR-12" },
    ],
    payment_details: { method: "pix", installments: 1 },
    shipping_address: { city: "Campinas", province: "SP" },
  },
  {
    id: 1003, number: 1003, status: "open", payment_status: "pending",
    total: "149.70", subtotal: "139.70", shipping: "10.00", discount: "0.00",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    customer: { id: 503, name: "Fernanda Costa", email: "fer@email.com" },
    products: [
      { id: 1, name: "Granola Premium 500g", price: "32.90", quantity: 3, sku: "GRL-500" },
      { id: 5, name: "Blend Proteico Baunilha 1kg", price: "74.90", quantity: 1, sku: "PRO-VAN" },
    ],
    payment_details: { method: "boleto", installments: 1 },
    shipping_address: { city: "Rio de Janeiro", province: "RJ" },
  },
  {
    id: 1004, number: 1004, status: "cancelled", payment_status: "refunded",
    total: "59.90", subtotal: "49.90", shipping: "10.00", discount: "0.00",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    customer: { id: 504, name: "Pedro Alves", email: "pedro@email.com" },
    products: [
      { id: 6, name: "Chia Orgânica 250g", price: "24.90", quantity: 2, sku: "CHI-250" },
    ],
    payment_details: { method: "credit_card", installments: 1 },
    shipping_address: { city: "Belo Horizonte", province: "MG" },
  },
  {
    id: 1005, number: 1005, status: "closed", payment_status: "paid",
    total: "219.60", subtotal: "209.60", shipping: "10.00", discount: "0.00",
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    customer: { id: 505, name: "Juliana Ferreira", email: "ju@email.com" },
    products: [
      { id: 5, name: "Blend Proteico Baunilha 1kg", price: "74.90", quantity: 1, sku: "PRO-VAN" },
      { id: 1, name: "Granola Premium 500g", price: "32.90", quantity: 2, sku: "GRL-500" },
      { id: 2, name: "Pasta de Amendoim Integral 450g", price: "29.90", quantity: 2, sku: "PAM-450" },
    ],
    payment_details: { method: "credit_card", installments: 3 },
    shipping_address: { city: "São Paulo", province: "SP" },
  },
];

function calcStats(orders: NSOrder[]): NSStats {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paid = orders.filter((o) => o.payment_status === "paid");
  const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.total), 0);
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= startOfToday);
  const todayPaid = todayOrders.filter((o) => o.payment_status === "paid");
  const monthOrders = orders.filter((o) => new Date(o.created_at) >= startOfMonth);
  const monthPaid = monthOrders.filter((o) => o.payment_status === "paid");

  return {
    totalOrders: orders.length,
    totalRevenue,
    avgTicket: paid.length > 0 ? totalRevenue / paid.length : 0,
    pendingOrders: orders.filter((o) => o.payment_status === "pending").length,
    cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
    todayOrders: todayOrders.length,
    todayRevenue: todayPaid.reduce((s, o) => s + parseFloat(o.total), 0),
    monthOrders: monthOrders.length,
    monthRevenue: monthPaid.reduce((s, o) => s + parseFloat(o.total), 0),
  };
}

// ── API functions ──────────────────────────────────────────────

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await proxyFetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  if (data?.error === "NUVEMSHOP_INVALID_TOKEN") {
    throw new NuvemshopAuthError(data.message);
  }
  if (!res.ok) throw new Error(`Nuvemshop ${path}: ${res.status}`);
  return data;
}

export async function fetchNSOrders(params: {
  per_page?: number;
  page?: number;
  status?: string;
} = {}): Promise<NSOrder[]> {
  if (!isNuvemshopConfigured()) {
    // Mock: retorna dados de demonstração
    await new Promise((r) => setTimeout(r, 600));
    return MOCK_ORDERS;
  }
  return get<NSOrder[]>("/orders", {
    per_page: String(params.per_page ?? 50),
    page: String(params.page ?? 1),
    ...(params.status ? { status: params.status } : {}),
  });
}

export async function fetchNSStats(): Promise<NSStats> {
  if (!isNuvemshopConfigured()) {
    await new Promise((r) => setTimeout(r, 400));
    return calcStats(MOCK_ORDERS);
  }
  const orders = await get<NSOrder[]>("/orders", { per_page: "200" });
  return calcStats(orders);
}

export async function fetchNSProducts(params: {
  per_page?: number;
  page?: number;
} = {}): Promise<NSProduct[]> {
  if (!isNuvemshopConfigured()) {
    await new Promise((r) => setTimeout(r, 500));
    return []; // produtos virão em próxima iteração
  }
  return get<NSProduct[]>("/products", {
    per_page: String(params.per_page ?? 50),
    page: String(params.page ?? 1),
  });
}
