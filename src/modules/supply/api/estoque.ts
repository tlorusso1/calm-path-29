/**
 * Estoque Multichannel — agrega Tiny + Nuvemshop
 *
 * Fontes:
 *   - Tiny:       GET /produtos.pesquisa.php  (requer VITE_TINY_TOKEN)
 *   - Nuvemshop:  GET /products               (requer VITE_NUVEMSHOP_CONFIGURED=true)
 *
 * Em produção: via Edge Functions (proxy-tiny / proxy-nuvemshop)
 * Em dev: via Vite proxy (/api/tiny / /api/nuvemshop)
 */

import { apiBase } from "@/lib/apiBase";

const TINY_BASE = apiBase("tiny");
const NS_BASE   = apiBase("nuvemshop");
const TINY_TOKEN = import.meta.env.VITE_TINY_TOKEN ?? "";

// ── Interfaces ─────────────────────────────────────────────────

export interface SKUEstoque {
  id: string;
  nome: string;
  sku: string;
  /** Estoque no Tiny (fonte de verdade) */
  estoqueErp: number | null;
  /** Estoque na Nuvemshop */
  estoqueNuvemshop: number | null;
  /** Diferença: Tiny - Nuvemshop */
  divergencia: number | null;
  /** Preço de custo (Tiny) */
  preco: number;
  /** Link direto no Tiny */
  urlTiny?: string;
  status: "ok" | "baixo" | "ruptura" | "divergente";
}

export interface EstoqueStats {
  totalSkus: number;
  skusRuptura: number;
  skusBaixo: number;
  skusDivergente: number;
  coberturaMediaDias: number;
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_SKUS: SKUEstoque[] = [
  { id: "1", nome: "Granola Premium 500g",          sku: "GRL-500",  estoqueErp: 342, estoqueNuvemshop: 342, divergencia: 0,   preco: 18.50, status: "ok" },
  { id: "2", nome: "Pasta de Amendoim Integral 450g", sku: "PAM-450", estoqueErp: 87,  estoqueNuvemshop: 90,  divergencia: -3,  preco: 14.90, status: "divergente" },
  { id: "3", nome: "Mix de Nuts 200g",              sku: "MNT-200",  estoqueErp: 12,  estoqueNuvemshop: 12,  divergencia: 0,   preco: 11.20, status: "baixo" },
  { id: "4", nome: "Barra de Cereal Cacau 30g (cx12)", sku: "BCR-12", estoqueErp: 0,  estoqueNuvemshop: 2,   divergencia: -2,  preco: 22.00, status: "ruptura" },
  { id: "5", nome: "Blend Proteico Baunilha 1kg",   sku: "PRO-VAN",  estoqueErp: 64,  estoqueNuvemshop: 64,  divergencia: 0,   preco: 42.00, status: "ok" },
  { id: "6", nome: "Chia Orgânica 250g",            sku: "CHI-250",  estoqueErp: 210, estoqueNuvemshop: 210, divergencia: 0,   preco: 9.80,  status: "ok" },
  { id: "7", nome: "Aveia em Flocos Finos 500g",    sku: "AVF-500",  estoqueErp: 5,   estoqueNuvemshop: 8,   divergencia: -3,  preco: 6.50,  status: "divergente" },
  { id: "8", nome: "Whey Protein Chocolate 900g",   sku: "WPC-900",  estoqueErp: 31,  estoqueNuvemshop: 31,  divergencia: 0,   preco: 68.00, status: "ok" },
  { id: "9", nome: "Castanha de Caju W2 200g",      sku: "CCW-200",  estoqueErp: 0,   estoqueNuvemshop: 0,   divergencia: 0,   preco: 19.40, status: "ruptura" },
  { id: "10", nome: "Amendoim Tostado S/ Sal 400g", sku: "AMT-400",  estoqueErp: 156, estoqueNuvemshop: 156, divergencia: 0,   preco: 8.20,  status: "ok" },
];

function mockStats(): EstoqueStats {
  return {
    totalSkus: MOCK_SKUS.length,
    skusRuptura: MOCK_SKUS.filter((s) => s.status === "ruptura").length,
    skusBaixo: MOCK_SKUS.filter((s) => s.status === "baixo").length,
    skusDivergente: MOCK_SKUS.filter((s) => s.status === "divergente").length,
    coberturaMediaDias: 34,
  };
}

// ── Tiny API helpers ───────────────────────────────────────────

async function getTinyProdutos(): Promise<SKUEstoque[]> {
  const qs = new URLSearchParams({ token: TINY_TOKEN, formato: "json", situacao: "A" });
  const res = await fetch(`${TINY_BASE}/produtos.pesquisa.php?${qs}`);
  if (!res.ok) throw new Error(`Tiny produtos: ${res.status}`);
  const data = await res.json();
  const produtos = data?.retorno?.produtos ?? [];
  return produtos.map((p: any) => {
    const prod = p.produto ?? p;
    const estoque = parseFloat(prod.saldo_fisico ?? prod.estoque ?? "0") || 0;
    return {
      id: String(prod.id),
      nome: prod.nome ?? prod.descricao ?? "",
      sku: prod.codigo ?? "",
      estoqueErp: estoque,
      estoqueNuvemshop: null,
      divergencia: null,
      preco: parseFloat(prod.preco_custo ?? "0") || 0,
      urlTiny: `https://erp.tiny.com.br/produtos#edit/${prod.id}`,
      status: estoque <= 0 ? "ruptura" : estoque <= 10 ? "baixo" : "ok",
    } as SKUEstoque;
  });
}

// ── Nuvemshop API helpers ──────────────────────────────────────

async function getNSEstoque(): Promise<Map<string, number>> {
  const res = await fetch(`${NS_BASE}/products?per_page=200`);
  if (!res.ok) return new Map();
  const data = await res.json();
  const map = new Map<string, number>();
  for (const product of data) {
    for (const variant of product.variants ?? []) {
      if (variant.sku) {
        map.set(variant.sku, variant.stock ?? 0);
      }
    }
  }
  return map;
}

// ── Merge e status ─────────────────────────────────────────────

function computeStatus(item: Omit<SKUEstoque, "status">): SKUEstoque["status"] {
  if ((item.estoqueErp ?? 0) <= 0) return "ruptura";
  if ((item.estoqueErp ?? 0) <= 10) return "baixo";
  if (item.divergencia !== null && Math.abs(item.divergencia) > 0) return "divergente";
  return "ok";
}

// ── Public API ─────────────────────────────────────────────────

const isTinyConfigured = () => !!TINY_TOKEN;
const isNSConfigured   = () => import.meta.env.VITE_NUVEMSHOP_CONFIGURED === "true";

export async function fetchEstoque(): Promise<SKUEstoque[]> {
  if (!isTinyConfigured()) {
    await new Promise((r) => setTimeout(r, 700));
    return MOCK_SKUS;
  }

  // Busca Tiny (obrigatório) + Nuvemshop em paralelo
  const [tinyItems, nsMap] = await Promise.all([
    getTinyProdutos(),
    isNSConfigured() ? getNSEstoque() : Promise.resolve(new Map<string, number>()),
  ]);

  return tinyItems.map((item) => {
    const ns = nsMap.has(item.sku) ? (nsMap.get(item.sku) ?? null) : null;
    const divergencia = (item.estoqueErp !== null && ns !== null)
      ? item.estoqueErp - ns
      : null;
    const merged = { ...item, estoqueNuvemshop: ns, divergencia };
    return { ...merged, status: computeStatus(merged) };
  });
}

export async function fetchEstoqueStats(): Promise<EstoqueStats> {
  if (!isTinyConfigured()) {
    await new Promise((r) => setTimeout(r, 400));
    return mockStats();
  }
  const skus = await fetchEstoque();
  return {
    totalSkus: skus.length,
    skusRuptura: skus.filter((s) => s.status === "ruptura").length,
    skusBaixo: skus.filter((s) => s.status === "baixo").length,
    skusDivergente: skus.filter((s) => s.status === "divergente").length,
    coberturaMediaDias: 0, // requer histórico de saídas — futuro
  };
}
