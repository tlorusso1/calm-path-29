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

const AD_ACCOUNT = import.meta.env.VITE_META_AD_ACCOUNT_ID ?? "";
const BASE = "/api/meta/v20.0";

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
