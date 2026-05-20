/**
 * Google Ads API
 *
 * Para ativar dados reais:
 *   1. Crie credenciais OAuth2 em console.cloud.google.com
 *   2. Habilite "Google Ads API" no projeto
 *   3. Adicione no .env.local:
 *      GOOGLE_ADS_DEVELOPER_TOKEN=xxx
 *      GOOGLE_ADS_CUSTOMER_ID=123-456-7890
 *      VITE_GOOGLE_ADS_CONFIGURED=true
 *   4. Configure proxy em vite.config.ts
 */

export interface GoogleCampaign {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  type: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
}

export interface GoogleAccountInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
}

// ── Mock data ───────────────────────────────────────────────────
const MOCK_GOOGLE_CAMPAIGNS: GoogleCampaign[] = [
  {
    id: "g001",
    name: "Search — Granola NICE FOODS",
    status: "ENABLED",
    type: "SEARCH",
    budget: 60,
    spend: 1540,
    impressions: 42000,
    clicks: 2100,
    ctr: 5.0,
    cpc: 0.73,
    conversions: 98,
    conversionValue: 7840,
    roas: 5.09,
  },
  {
    id: "g002",
    name: "Shopping — Mix Produtos",
    status: "ENABLED",
    type: "SHOPPING",
    budget: 40,
    spend: 920,
    impressions: 78000,
    clicks: 1850,
    ctr: 2.37,
    cpc: 0.50,
    conversions: 64,
    conversionValue: 4480,
    roas: 4.87,
  },
  {
    id: "g003",
    name: "Display — Remarketing",
    status: "PAUSED",
    type: "DISPLAY",
    budget: 30,
    spend: 340,
    impressions: 210000,
    clicks: 680,
    ctr: 0.32,
    cpc: 0.50,
    conversions: 12,
    conversionValue: 720,
    roas: 2.12,
  },
];

export const MOCK_GOOGLE_INSIGHTS: GoogleAccountInsights = {
  spend: MOCK_GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.spend, 0),
  impressions: MOCK_GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0),
  clicks: MOCK_GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0),
  ctr: 2.9,
  cpc: 0.59,
  conversions: MOCK_GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0),
  conversionValue: MOCK_GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.conversionValue, 0),
  roas: 0,
};
MOCK_GOOGLE_INSIGHTS.roas = MOCK_GOOGLE_INSIGHTS.conversionValue / MOCK_GOOGLE_INSIGHTS.spend;

export function isGoogleConfigured(): boolean {
  return import.meta.env.VITE_GOOGLE_ADS_CONFIGURED === "true";
}

export async function getGoogleAccountInsights(): Promise<GoogleAccountInsights> {
  if (!isGoogleConfigured()) return MOCK_GOOGLE_INSIGHTS;
  // TODO: implementar chamada real via Supabase Edge Function
  throw new Error("Google Ads API: configure VITE_GOOGLE_ADS_CONFIGURED=true e o proxy");
}

export async function getGoogleCampaigns(): Promise<GoogleCampaign[]> {
  if (!isGoogleConfigured()) return MOCK_GOOGLE_CAMPAIGNS;
  throw new Error("Google Ads API: configure VITE_GOOGLE_ADS_CONFIGURED=true e o proxy");
}
