/**
 * Perfit Email Marketing API
 *
 * Para ativar dados reais:
 *   1. Perfit → Configurações → API → copiar API Key
 *   2. Adicione no .env.local:
 *      PERFIT_API_KEY=...
 *      PERFIT_ACCOUNT=nicefoods   (nome da conta/subdomínio)
 *      VITE_PERFIT_CONFIGURED=true
 */

import { apiBase, proxyFetch } from "@/lib/apiBase";
const BASE = apiBase("perfit");

// ── Interfaces ─────────────────────────────────────────────────

export interface PerfitCampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

export interface PerfitCampaign {
  id: string;
  name: string;
  status: "sent" | "draft" | "scheduled" | "sending";
  sentAt?: string;
  subject: string;
  listName: string;
  stats?: PerfitCampaignStats;
}

export interface PerfitList {
  id: string;
  name: string;
  subscribersCount: number;
  activeCount: number;
}

export interface PerfitSummary {
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  unsubscribeRate: number;
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_CAMPAIGNS: PerfitCampaign[] = [
  {
    id: "pf001",
    name: "Newsletter Novembro — Granola em promoção",
    status: "sent",
    sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    subject: "🌾 Granola NICE FOODS com 15% OFF essa semana!",
    listName: "Clientes Ativos",
    stats: { sent: 4820, delivered: 4731, opened: 1892, clicked: 284, unsubscribed: 12, bounced: 89, openRate: 39.9, clickRate: 6.0 },
  },
  {
    id: "pf002",
    name: "Reativação — Inativos 60 dias",
    status: "sent",
    sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    subject: "Sentimos sua falta! Volta aqui 💚",
    listName: "Inativos 60 dias",
    stats: { sent: 1240, delivered: 1180, opened: 312, clicked: 47, unsubscribed: 8, bounced: 60, openRate: 26.4, clickRate: 4.0 },
  },
  {
    id: "pf003",
    name: "Boas-vindas — Novos cadastros",
    status: "sent",
    sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    subject: "Bem-vindo(a) à família NICE FOODS! 🎉",
    listName: "Novos cadastros",
    stats: { sent: 340, delivered: 338, opened: 220, clicked: 68, unsubscribed: 1, bounced: 2, openRate: 65.1, clickRate: 20.1 },
  },
  {
    id: "pf004",
    name: "Black Friday — Ofertas exclusivas",
    status: "scheduled",
    subject: "🔥 Black Friday antecipada — só para nossa lista!",
    listName: "Todos os contatos",
  },
];

const MOCK_LISTS: PerfitList[] = [
  { id: "l001", name: "Clientes Ativos",    subscribersCount: 4820, activeCount: 4620 },
  { id: "l002", name: "Inativos 60 dias",   subscribersCount: 1240, activeCount: 1180 },
  { id: "l003", name: "Novos cadastros",    subscribersCount: 340,  activeCount: 338  },
  { id: "l004", name: "Todos os contatos",  subscribersCount: 8200, activeCount: 7840 },
];

const MOCK_SUMMARY: PerfitSummary = {
  totalSent: 6400,
  avgOpenRate: 38.2,
  avgClickRate: 8.4,
  unsubscribeRate: 0.33,
};

// ── Helpers ────────────────────────────────────────────────────

export function isPerfitConfigured(): boolean {
  return import.meta.env.VITE_PERFIT_CONFIGURED === "true";
}

async function perfitGet<T>(path: string): Promise<T> {
  const res = await proxyFetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Perfit ${path}: ${res.status}`);
  return res.json();
}

// ── Public functions ───────────────────────────────────────────

export async function getPerfitCampaigns(): Promise<PerfitCampaign[]> {
  if (!isPerfitConfigured()) return MOCK_CAMPAIGNS;
  return perfitGet<PerfitCampaign[]>("/campaigns?status=all&limit=20");
}

export async function getPerfitLists(): Promise<PerfitList[]> {
  if (!isPerfitConfigured()) return MOCK_LISTS;
  return perfitGet<PerfitList[]>("/lists");
}

export async function getPerfitSummary(): Promise<PerfitSummary> {
  if (!isPerfitConfigured()) return MOCK_SUMMARY;
  return perfitGet<PerfitSummary>("/reports/summary");
}
