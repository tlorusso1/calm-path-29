/**
 * YouTube Data API v3 — dados públicos do canal NICE FOODS
 *
 * Para ativar dados reais (sem OAuth — apenas API key pública):
 *   1. Google Cloud Console → APIs & Services → YouTube Data API v3 → Criar API Key
 *   2. Adicione no .env.local:
 *      YOUTUBE_API_KEY=AIzaSy...       (server-side, injetado pelo proxy)
 *      VITE_YOUTUBE_CHANNEL_ID=UC...   (achar em YouTube Studio → Personalização)
 *      VITE_YOUTUBE_CONFIGURED=true
 */

import { apiBase, proxyFetch } from "@/lib/apiBase";
const BASE = apiBase("youtube");

// ── Interfaces ─────────────────────────────────────────────────

export interface YTChannelStats {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  hiddenSubscriberCount: boolean;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
}

export interface YTVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string; // ISO 8601, ex: "PT3M42S"
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_CHANNEL: YTChannelStats = {
  id: "UCxxxxxxxxxxxxxxxxxxxxxxxx",
  title: "NICE FOODS",
  description: "Canal oficial da NICE FOODS — alimentos naturais e saudáveis para o seu dia a dia.",
  thumbnailUrl: "",
  subscriberCount: 4820,
  hiddenSubscriberCount: false,
  videoCount: 48,
  viewCount: 312000,
  publishedAt: "2021-03-15T00:00:00Z",
};

const MOCK_VIDEOS: YTVideo[] = [
  {
    id: "ytv001",
    title: "Como fazer granola caseira com NICE FOODS | Receita rápida",
    description: "Aprenda a fazer granola caseira deliciosa usando nossos produtos.",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: "",
    duration: "PT5M18S",
    durationSeconds: 318,
    viewCount: 8420,
    likeCount: 347,
    commentCount: 52,
  },
  {
    id: "ytv002",
    title: "Tour pela fábrica NICE FOODS — Qualidade do campo à mesa",
    description: "Veja como produzimos nossos alimentos naturais com máximo cuidado e higiene.",
    publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: "",
    duration: "PT8M43S",
    durationSeconds: 523,
    viewCount: 21300,
    likeCount: 892,
    commentCount: 134,
  },
  {
    id: "ytv003",
    title: "5 receitas fit com Mix de Nuts NICE FOODS",
    description: "Cinco receitas saudáveis usando nosso mix de nuts premium.",
    publishedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: "",
    duration: "PT12M07S",
    durationSeconds: 727,
    viewCount: 14700,
    likeCount: 621,
    commentCount: 89,
  },
  {
    id: "ytv004",
    title: "Benefícios da aveia — O que a ciência diz",
    description: "Descubra todos os benefícios científicos da aveia para a sua saúde.",
    publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: "",
    duration: "PT7M32S",
    durationSeconds: 452,
    viewCount: 38900,
    likeCount: 1840,
    commentCount: 276,
  },
  {
    id: "ytv005",
    title: "Café da manhã saudável em 5 minutos com NICE FOODS",
    description: "Dicas rápidas de café da manhã nutritivo usando nossos produtos.",
    publishedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: "",
    duration: "PT4M15S",
    durationSeconds: 255,
    viewCount: 9800,
    likeCount: 412,
    commentCount: 67,
  },
];

// ── Helpers ────────────────────────────────────────────────────

export function isYouTubeConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_YOUTUBE_CONFIGURED === "true" &&
    import.meta.env.VITE_YOUTUBE_CHANNEL_ID
  );
}

/** Converte ISO 8601 duration (PT3M42S) para segundos */
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
}

async function ytFetch<T>(path: string): Promise<T> {
  const res = await proxyFetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`YouTube API ${path}: ${res.status}`);
  return res.json();
}

// ── Public functions ───────────────────────────────────────────

export async function getYouTubeChannelStats(): Promise<YTChannelStats> {
  if (!isYouTubeConfigured()) return MOCK_CHANNEL;

  const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  const data = await ytFetch<{ items?: Record<string, unknown>[] }>(
    `/channels?part=statistics,snippet&id=${channelId}`
  );

  const item = data.items?.[0] as Record<string, Record<string, string | number | boolean>> | undefined;
  if (!item) return MOCK_CHANNEL;

  const snippet    = item.snippet    as Record<string, string | Record<string, string>>;
  const statistics = item.statistics as Record<string, string | boolean>;

  return {
    id: channelId,
    title: String(snippet.title ?? ""),
    description: String(snippet.description ?? ""),
    thumbnailUrl: (snippet.thumbnails as unknown as Record<string, { url: string }>)?.high?.url ?? "",
    subscriberCount: parseInt(String(statistics.subscriberCount ?? "0")),
    hiddenSubscriberCount: statistics.hiddenSubscriberCount === true,
    videoCount: parseInt(String(statistics.videoCount ?? "0")),
    viewCount: parseInt(String(statistics.viewCount ?? "0")),
    publishedAt: String(snippet.publishedAt ?? ""),
  };
}

export async function getYouTubeVideos(): Promise<YTVideo[]> {
  if (!isYouTubeConfigured()) return MOCK_VIDEOS;

  const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;

  // Step 1: get recent video IDs via search
  const searchData = await ytFetch<{ items?: { id: { videoId: string } }[] }>(
    `/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10`
  );

  const videoIds = (searchData.items ?? []).map((i) => i.id.videoId).join(",");
  if (!videoIds) return [];

  // Step 2: get full stats for those videos
  const videosData = await ytFetch<{
    items?: {
      id: string;
      snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string } } };
      statistics: { viewCount: string; likeCount: string; commentCount: string };
      contentDetails: { duration: string };
    }[];
  }>(`/videos?part=statistics,snippet,contentDetails&id=${videoIds}`);

  return (videosData.items ?? []).map((v) => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    publishedAt: v.snippet.publishedAt,
    thumbnailUrl: v.snippet.thumbnails.high?.url ?? "",
    duration: v.contentDetails.duration,
    durationSeconds: parseDuration(v.contentDetails.duration),
    viewCount: parseInt(v.statistics.viewCount ?? "0"),
    likeCount: parseInt(v.statistics.likeCount ?? "0"),
    commentCount: parseInt(v.statistics.commentCount ?? "0"),
  }));
}
