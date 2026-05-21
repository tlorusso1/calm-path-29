/**
 * Google Analytics 4 Data API v1beta
 *
 * Para ativar dados reais (via Service Account — sem OAuth no browser):
 *   1. Google Cloud Console → IAM → Criar Service Account
 *   2. Conceder "Viewer" na propriedade GA4
 *   3. Baixar JSON da chave → base64 -i sa-key.json
 *   4. Adicione no .env.local:
 *      GOOGLE_SA_KEY_JSON=<base64>
 *      VITE_GA4_PROPERTY_ID=properties/XXXXXXXXX
 *      VITE_GA4_CONFIGURED=true
 *   5. Token injetado automaticamente pelo proxy /api/ga4 (vite.config.ts — Semana 3)
 */

const BASE = "/api/ga4/v1beta";
const PROPERTY_ID = import.meta.env.VITE_GA4_PROPERTY_ID ?? "properties/000000000";

// ── Interfaces ─────────────────────────────────────────────────

export interface GA4ChannelBreakdown {
  channel: string;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
  color: string;
}

export interface GA4ReportRequest {
  dimensions: { name: string }[];
  metrics: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
  limit?: number;
}

export interface GA4Summary {
  totalSessions: number;
  totalUsers: number;
  totalConversions: number;
  totalRevenue: number;
  organicShare: number;   // 0–100 %
  paidShare: number;      // 0–100 %
}

// ── Color map for channels ─────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search":  "#10b981",
  "Paid Search":     "#3b82f6",
  "Organic Social":  "#a855f7",
  "Paid Social":     "#6366f1",
  "Direct":          "#6b7280",
  "Email":           "#f59e0b",
  "Referral":        "#ec4899",
  "Organic Video":   "#ef4444",
  "Cross-network":   "#8b5cf6",
};

function channelColor(channel: string): string {
  return CHANNEL_COLORS[channel] ?? "#64748b";
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_CHANNELS: GA4ChannelBreakdown[] = [
  { channel: "Organic Search",  sessions: 8420,  users: 6830,  newUsers: 5910,  bounceRate: 42.1, conversions: 184, revenue: 12480, color: channelColor("Organic Search")  },
  { channel: "Paid Social",     sessions: 6180,  users: 5940,  newUsers: 5840,  bounceRate: 58.3, conversions: 247, revenue: 18420, color: channelColor("Paid Social")     },
  { channel: "Direct",          sessions: 3920,  users: 2840,  newUsers: 890,   bounceRate: 31.7, conversions: 98,  revenue: 7830,  color: channelColor("Direct")          },
  { channel: "Organic Social",  sessions: 2840,  users: 2610,  newUsers: 2480,  bounceRate: 67.2, conversions: 42,  revenue: 2940,  color: channelColor("Organic Social")  },
  { channel: "Paid Search",     sessions: 2140,  users: 2090,  newUsers: 2050,  bounceRate: 55.8, conversions: 94,  revenue: 7120,  color: channelColor("Paid Search")     },
  { channel: "Email",           sessions: 1480,  users: 1320,  newUsers: 180,   bounceRate: 28.4, conversions: 67,  revenue: 5480,  color: channelColor("Email")           },
  { channel: "Referral",        sessions: 840,   users: 780,   newUsers: 720,   bounceRate: 49.1, conversions: 18,  revenue: 1240,  color: channelColor("Referral")        },
];

const MOCK_SUMMARY: GA4Summary = {
  totalSessions:    25820,
  totalUsers:       22410,
  totalConversions: 750,
  totalRevenue:     55510,
  organicShare:     43.6,
  paidShare:        32.2,
};

// ── Helpers ────────────────────────────────────────────────────

export function isGA4Configured(): boolean {
  return import.meta.env.VITE_GA4_CONFIGURED === "true";
}

async function runReport(request: GA4ReportRequest): Promise<{
  rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
}> {
  const res = await fetch(`${BASE}/${PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`GA4 runReport: ${res.status}`);
  return res.json();
}

// ── Public functions ───────────────────────────────────────────

export async function getTrafficByChannel(dateRange = { startDate: "30daysAgo", endDate: "today" }): Promise<GA4ChannelBreakdown[]> {
  if (!isGA4Configured()) return MOCK_CHANNELS;

  const data = await runReport({
    dimensions:  [{ name: "sessionDefaultChannelGroup" }],
    metrics:     [
      { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
      { name: "bounceRate" }, { name: "conversions" }, { name: "purchaseRevenue" },
    ],
    dateRanges:  [dateRange],
    limit:       20,
  });

  return (data.rows ?? []).map((row) => {
    const channel = row.dimensionValues[0]?.value ?? "Other";
    return {
      channel,
      sessions:    parseInt(row.metricValues[0]?.value ?? "0"),
      users:       parseInt(row.metricValues[1]?.value ?? "0"),
      newUsers:    parseInt(row.metricValues[2]?.value ?? "0"),
      bounceRate:  parseFloat(row.metricValues[3]?.value ?? "0") * 100,
      conversions: parseInt(row.metricValues[4]?.value ?? "0"),
      revenue:     parseFloat(row.metricValues[5]?.value ?? "0"),
      color:       channelColor(channel),
    };
  }).sort((a, b) => b.sessions - a.sessions);
}

export async function getGA4Summary(dateRange = { startDate: "30daysAgo", endDate: "today" }): Promise<GA4Summary> {
  if (!isGA4Configured()) return MOCK_SUMMARY;

  const channels = await getTrafficByChannel(dateRange);
  const totalSessions = channels.reduce((s, c) => s + c.sessions, 0);

  const organicChannels = ["Organic Search", "Organic Social", "Organic Video", "Direct", "Referral", "Email"];
  const paidChannels    = ["Paid Search", "Paid Social", "Cross-network"];

  const organicSessions = channels
    .filter((c) => organicChannels.includes(c.channel))
    .reduce((s, c) => s + c.sessions, 0);

  const paidSessions = channels
    .filter((c) => paidChannels.includes(c.channel))
    .reduce((s, c) => s + c.sessions, 0);

  return {
    totalSessions,
    totalUsers:      channels.reduce((s, c) => s + c.users, 0),
    totalConversions: channels.reduce((s, c) => s + c.conversions, 0),
    totalRevenue:    channels.reduce((s, c) => s + c.revenue, 0),
    organicShare:    totalSessions > 0 ? (organicSessions / totalSessions) * 100 : 0,
    paidShare:       totalSessions > 0 ? (paidSessions    / totalSessions) * 100 : 0,
  };
}
