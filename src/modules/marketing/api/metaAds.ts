/**
 * Meta Ads Marketing API
 *
 * Para ativar dados reais:
 *   1. Gere um token em business.facebook.com → Configurações → Tokens de acesso do sistema
 *   2. Adicione no .env.local:
 *      META_ADS_TOKEN=EAAxxxxxxx
 *      VITE_META_AD_ACCOUNT_ID=act_123456789
 *   3. Configure proxy em vite.config.ts:
 *      "/api/meta" → "https://graph.facebook.com"
 *      header: Authorization: Bearer <token>
 */

import { apiBase } from "@/lib/apiBase";
const AD_ACCOUNT = import.meta.env.VITE_META_AD_ACCOUNT_ID ?? "";
const BASE = `${apiBase("meta")}/v20.0`;

export interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpp: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  objective: string;
  dailyBudget: number;
  insights: MetaInsights;
}

// ── Mock data (remove quando token estiver configurado) ─────────
const MOCK_CAMPAIGNS: MetaCampaign[] = [
  {
    id: "1001",
    name: "NICE FOODS — Granola Performance",
    status: "ACTIVE",
    objective: "CONVERSIONS",
    dailyBudget: 150,
    insights: { spend: 3420, impressions: 312000, clicks: 8900, reach: 187000, ctr: 2.85, cpc: 0.38, cpp: 18.3, purchases: 187, purchaseValue: 12834, roas: 3.75 },
  },
  {
    id: "1002",
    name: "NICE FOODS — Mix Outubro",
    status: "ACTIVE",
    objective: "CONVERSIONS",
    dailyBudget: 80,
    insights: { spend: 1850, impressions: 198000, clicks: 4200, reach: 95000, ctr: 2.12, cpc: 0.44, cpp: 19.5, purchases: 94, purchaseValue: 5640, roas: 3.05 },
  },
  {
    id: "1003",
    name: "Retargeting — Carrinho Abandonado",
    status: "ACTIVE",
    objective: "CONVERSIONS",
    dailyBudget: 50,
    insights: { spend: 980, impressions: 87000, clicks: 3100, reach: 42000, ctr: 3.56, cpc: 0.32, cpp: 23.3, purchases: 71, purchaseValue: 4970, roas: 5.07 },
  },
  {
    id: "1004",
    name: "Brand Awareness — Novembro",
    status: "PAUSED",
    objective: "BRAND_AWARENESS",
    dailyBudget: 100,
    insights: { spend: 2100, impressions: 520000, clicks: 2800, reach: 310000, ctr: 0.54, cpc: 0.75, cpp: 6.77, purchases: 0, purchaseValue: 0, roas: 0 },
  },
];

const MOCK_ACCOUNT_INSIGHTS: MetaInsights = {
  spend: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.spend, 0),
  impressions: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.impressions, 0),
  clicks: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.clicks, 0),
  reach: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.reach, 0),
  ctr: 2.1,
  cpc: 0.45,
  cpp: 15.2,
  purchases: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.purchases, 0),
  purchaseValue: MOCK_CAMPAIGNS.reduce((s, c) => s + c.insights.purchaseValue, 0),
  roas: 0,
};
MOCK_ACCOUNT_INSIGHTS.roas = MOCK_ACCOUNT_INSIGHTS.purchaseValue / MOCK_ACCOUNT_INSIGHTS.spend;

// ── Funções públicas ────────────────────────────────────────────
export function isMetaConfigured(): boolean {
  return Boolean(AD_ACCOUNT && import.meta.env.VITE_META_ADS_CONFIGURED === "true");
}

export async function getMetaAccountInsights(datePreset = "this_month"): Promise<MetaInsights> {
  if (!isMetaConfigured()) return MOCK_ACCOUNT_INSIGHTS;

  const fields = "spend,impressions,clicks,reach,ctr,cpc,cpp,actions,action_values";
  // Token injetado pelo proxy (vite.config.ts) — não exposto no browser
  const res = await fetch(`${BASE}/${AD_ACCOUNT}/insights?fields=${fields}&date_preset=${datePreset}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta Ads insights: ${res.status} — ${err?.error?.message ?? ""}`);
  }
  const data = await res.json();
  return parseInsights(data.data?.[0] ?? {});
}

// ── Ad Sets (Públicos) ──────────────────────────────────────────
export interface MetaAdSetTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[]; // 1=M, 2=F
  geo_locations?: { countries?: string[]; cities?: { name: string }[] };
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  dailyBudget: number;
  targeting: MetaAdSetTargeting;
  insights: MetaInsights;
}

// ── Ads (Criativos) ────────────────────────────────────────────
export interface MetaAd {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  thumbnailUrl: string;
  creative: { title?: string; body?: string; imageUrl?: string };
  insights: MetaInsights;
}

// ── Mock data Ad Sets ──────────────────────────────────────────
const MOCK_ADSETS: MetaAdSet[] = [
  {
    id: "as001", name: "Mulheres 25-44 — Alimentação saudável", status: "ACTIVE",
    dailyBudget: 80, targeting: { age_min: 25, age_max: 44, genders: [2] },
    insights: { spend: 2100, impressions: 210000, clicks: 4800, reach: 125000, ctr: 2.29, cpc: 0.44, cpp: 16.8, purchases: 98, purchaseValue: 7350, roas: 3.5 },
  },
  {
    id: "as002", name: "Lookalike — Compradores recentes", status: "ACTIVE",
    dailyBudget: 60, targeting: { age_min: 22, age_max: 55, genders: [1, 2] },
    insights: { spend: 1480, impressions: 178000, clicks: 3900, reach: 92000, ctr: 2.19, cpc: 0.38, cpp: 16.1, purchases: 67, purchaseValue: 4690, roas: 3.17 },
  },
  {
    id: "as003", name: "Retargeting 30d — Visitantes do site", status: "ACTIVE",
    dailyBudget: 40, targeting: { age_min: 18, age_max: 65, genders: [1, 2] },
    insights: { spend: 780, impressions: 87000, clicks: 2800, reach: 42000, ctr: 3.22, cpc: 0.28, cpp: 18.6, purchases: 59, purchaseValue: 4130, roas: 5.3 },
  },
  {
    id: "as004", name: "Público frio — Interesse fitness", status: "PAUSED",
    dailyBudget: 50, targeting: { age_min: 20, age_max: 40, genders: [1, 2] },
    insights: { spend: 950, impressions: 310000, clicks: 1200, reach: 198000, ctr: 0.39, cpc: 0.79, cpp: 4.8, purchases: 8, purchaseValue: 480, roas: 0.51 },
  },
];

const MOCK_ADS: MetaAd[] = [
  {
    id: "ad001", name: "Granola — vídeo 15s performance", status: "ACTIVE",
    thumbnailUrl: "", creative: { title: "Granola NICE FOODS", body: "Energia de verdade para o seu dia. 🌾" },
    insights: { spend: 1820, impressions: 198000, clicks: 4200, reach: 112000, ctr: 2.12, cpc: 0.43, cpp: 16.2, purchases: 84, purchaseValue: 5880, roas: 3.23 },
  },
  {
    id: "ad002", name: "Mix Outubro — carrossel produtos", status: "ACTIVE",
    thumbnailUrl: "", creative: { title: "Conheça o Mix NICE FOODS", body: "Produtos naturais direto pra sua casa." },
    insights: { spend: 1290, impressions: 142000, clicks: 3100, reach: 78000, ctr: 2.18, cpc: 0.42, cpp: 16.5, purchases: 61, purchaseValue: 4270, roas: 3.31 },
  },
  {
    id: "ad003", name: "Retargeting — estático produto", status: "ACTIVE",
    thumbnailUrl: "", creative: { title: "Esqueceu algo?", body: "Sua Granola NICE FOODS te espera! 😊" },
    insights: { spend: 680, impressions: 72000, clicks: 2200, reach: 38000, ctr: 3.06, cpc: 0.31, cpp: 17.9, purchases: 47, purchaseValue: 3290, roas: 4.84 },
  },
  {
    id: "ad004", name: "Brand — imagem institucional", status: "PAUSED",
    thumbnailUrl: "", creative: { title: "NICE FOODS — Alimentos naturais", body: "Qualidade e sabor em cada produto." },
    insights: { spend: 520, impressions: 245000, clicks: 680, reach: 162000, ctr: 0.28, cpc: 0.76, cpp: 3.2, purchases: 4, purchaseValue: 240, roas: 0.46 },
  },
];

export async function getMetaAdSets(): Promise<MetaAdSet[]> {
  if (!isMetaConfigured()) return MOCK_ADSETS;
  const fields = "id,name,status,daily_budget,targeting,insights{spend,impressions,clicks,reach,ctr,cpc,cpp,actions,action_values}";
  const res = await fetch(`${BASE}/${AD_ACCOUNT}/adsets?fields=${fields}&date_preset=this_month&limit=30`);
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`Meta adsets: ${res.status} — ${err?.error?.message ?? ""}`); }
  const data = await res.json();
  return (data.data ?? []).map((raw: any): MetaAdSet => ({
    id: raw.id, name: raw.name, status: raw.status,
    dailyBudget: parseInt(raw.daily_budget ?? "0") / 100,
    targeting: raw.targeting ?? {},
    insights: parseInsights(raw.insights?.data?.[0] ?? {}),
  }));
}

export async function getMetaAds(): Promise<MetaAd[]> {
  if (!isMetaConfigured()) return MOCK_ADS;
  const fields = "id,name,status,creative{id,name,thumbnail_url,object_story_spec},insights{spend,impressions,clicks,reach,ctr,cpc,cpp,actions,action_values}";
  const res = await fetch(`${BASE}/${AD_ACCOUNT}/ads?fields=${fields}&date_preset=this_month&limit=50`);
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`Meta ads: ${res.status} — ${err?.error?.message ?? ""}`); }
  const data = await res.json();
  return (data.data ?? []).map((raw: any): MetaAd => ({
    id: raw.id, name: raw.name, status: raw.status,
    thumbnailUrl: raw.creative?.thumbnail_url ?? "",
    creative: {
      title: raw.creative?.object_story_spec?.link_data?.name ?? raw.creative?.name ?? "",
      body: raw.creative?.object_story_spec?.link_data?.message ?? "",
      imageUrl: raw.creative?.object_story_spec?.link_data?.picture ?? "",
    },
    insights: parseInsights(raw.insights?.data?.[0] ?? {}),
  }));
}

export async function uploadMetaImage(file: File): Promise<{ hash: string; url: string }> {
  if (!isMetaConfigured()) {
    await new Promise(r => setTimeout(r, 1500));
    return { hash: "mock_hash_" + Date.now(), url: URL.createObjectURL(file) };
  }
  const form = new FormData();
  form.append("filename", file.name);
  form.append("bytes", file);
  const res = await fetch(`${BASE}/${AD_ACCOUNT}/adimages`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Meta upload: ${res.status}`);
  const data = await res.json();
  const imgData = Object.values(data.images ?? {})[0] as any;
  return { hash: imgData?.hash ?? "", url: imgData?.url ?? "" };
}

export interface MetaCampaignUpdate {
  status?: "ACTIVE" | "PAUSED";
  dailyBudget?: number; // em reais — convertemos pra centavos
}

export async function updateMetaCampaign(id: string, updates: MetaCampaignUpdate): Promise<void> {
  if (!isMetaConfigured()) {
    // Mock: simula delay de 800ms
    await new Promise((r) => setTimeout(r, 800));
    return;
  }
  const body: Record<string, unknown> = {};
  if (updates.status) body.status = updates.status;
  if (updates.dailyBudget != null) body.daily_budget = Math.round(updates.dailyBudget * 100); // centavos

  const res = await fetch(`${BASE}/${id}`, {
    method: "POST", // Meta Graph API usa POST com ?method=PATCH ou POST direto pra updates
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(
      Object.entries(body).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
    ).toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta update campaign: ${res.status} — ${err?.error?.message ?? ""}`);
  }
}

export async function getMetaCampaigns(): Promise<MetaCampaign[]> {
  if (!isMetaConfigured()) return MOCK_CAMPAIGNS;

  const fields = "id,name,status,objective,daily_budget,insights{spend,impressions,clicks,reach,ctr,cpc,cpp,actions,action_values}";
  const res = await fetch(`${BASE}/${AD_ACCOUNT}/campaigns?fields=${fields}&date_preset=this_month&limit=20`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta campaigns: ${res.status} — ${err?.error?.message ?? ""}`);
  }
  const data = await res.json();
  return (data.data ?? []).map(parseCampaign);
}

function parseInsights(raw: any): MetaInsights {
  const purchases = raw.actions?.find((a: any) => a.action_type === "purchase")?.value ?? 0;
  const purchaseValue = raw.action_values?.find((a: any) => a.action_type === "purchase")?.value ?? 0;
  const spend = parseFloat(raw.spend ?? "0");
  return {
    spend,
    impressions: parseInt(raw.impressions ?? "0"),
    clicks: parseInt(raw.clicks ?? "0"),
    reach: parseInt(raw.reach ?? "0"),
    ctr: parseFloat(raw.ctr ?? "0"),
    cpc: parseFloat(raw.cpc ?? "0"),
    cpp: parseFloat(raw.cpp ?? "0"),
    purchases: parseFloat(String(purchases)),
    purchaseValue: parseFloat(String(purchaseValue)),
    roas: spend > 0 ? parseFloat(String(purchaseValue)) / spend : 0,
  };
}

function parseCampaign(raw: any): MetaCampaign {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    objective: raw.objective,
    dailyBudget: parseInt(raw.daily_budget ?? "0") / 100,
    insights: parseInsights(raw.insights?.data?.[0] ?? {}),
  };
}
