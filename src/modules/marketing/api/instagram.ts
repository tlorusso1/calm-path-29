/**
 * Instagram Business API — via Meta Graph API (mesmo token do Meta Ads)
 *
 * Para ativar dados reais:
 *   1. Certifique-se de ter META_ADS_TOKEN com scopes:
 *      instagram_basic, instagram_manage_insights, pages_show_list
 *   2. Adicione no .env.local:
 *      VITE_INSTAGRAM_CONFIGURED=true
 *   3. O ID da conta IG é resolvido automaticamente via Facebook Pages
 *      e cacheado em sessionStorage como "ig_account_id"
 */

import { apiBase } from "@/lib/apiBase";
const BASE = `${apiBase("meta")}/v20.0`;

// ── Interfaces ─────────────────────────────────────────────────

export interface IGProfile {
  id: string;
  username: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  biography: string;
}

export interface IGMedia {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  insights?: {
    reach: number;
    impressions: number;
    saved: number;
    shares: number;
  };
}

export interface IGAccountInsights {
  reach: number;
  impressions: number;
  profileViews: number;
  followerCount: number;
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_PROFILE: IGProfile = {
  id: "17841400000000000",
  username: "nicefoods.br",
  followersCount: 18400,
  followsCount: 312,
  mediaCount: 247,
  profilePictureUrl: "",
  biography: "🌿 Alimentos naturais e saudáveis | Granola, Mix de Nuts e muito mais 🌾",
};

const MOCK_MEDIA: IGMedia[] = [
  {
    id: "ig001",
    caption: "Nossa granola premium chegou! 🌾 Energia natural pra começar o dia com tudo. Link na bio 👆",
    mediaType: "REEL",
    mediaUrl: "",
    thumbnailUrl: "",
    permalink: "https://www.instagram.com/p/example1/",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 1247,
    commentsCount: 84,
    insights: { reach: 32400, impressions: 47800, saved: 342, shares: 218 },
  },
  {
    id: "ig002",
    caption: "Mix de nuts perfeito para qualquer hora! Proteína, gordura boa e sabor incrível 🥜",
    mediaType: "IMAGE",
    mediaUrl: "",
    permalink: "https://www.instagram.com/p/example2/",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 893,
    commentsCount: 47,
    insights: { reach: 18200, impressions: 24100, saved: 187, shares: 93 },
  },
  {
    id: "ig003",
    caption: "Receita de mingau de aveia com nossa granola 🍓 Salva para fazer amanhã!",
    mediaType: "CAROUSEL_ALBUM",
    mediaUrl: "",
    permalink: "https://www.instagram.com/p/example3/",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 2134,
    commentsCount: 132,
    insights: { reach: 41000, impressions: 58200, saved: 876, shares: 412 },
  },
  {
    id: "ig004",
    caption: "Por dentro da nossa fábrica! Qualidade e cuidado em cada etapa da produção 🏭",
    mediaType: "REEL",
    mediaUrl: "",
    thumbnailUrl: "",
    permalink: "https://www.instagram.com/p/example4/",
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 3821,
    commentsCount: 201,
    insights: { reach: 87300, impressions: 124000, saved: 1240, shares: 892 },
  },
  {
    id: "ig005",
    caption: "Novidade chegando! Fica de olho nos próximos dias 👀 #nicefoods",
    mediaType: "IMAGE",
    mediaUrl: "",
    permalink: "https://www.instagram.com/p/example5/",
    timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 567,
    commentsCount: 29,
    insights: { reach: 11800, impressions: 15400, saved: 84, shares: 41 },
  },
  {
    id: "ig006",
    caption: "Domingo é dia de preparar a semana com saúde! 💚 Nosso mix de cereais é perfeito pra isso.",
    mediaType: "IMAGE",
    mediaUrl: "",
    permalink: "https://www.instagram.com/p/example6/",
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: 1089,
    commentsCount: 62,
    insights: { reach: 22100, impressions: 29800, saved: 234, shares: 147 },
  },
];

const MOCK_INSIGHTS: IGAccountInsights = {
  reach: 94200,
  impressions: 187000,
  profileViews: 3840,
  followerCount: 18400,
};

// ── Helpers ────────────────────────────────────────────────────

export function isInstagramConfigured(): boolean {
  return import.meta.env.VITE_INSTAGRAM_CONFIGURED === "true";
}

async function resolveIGAccountId(): Promise<string | null> {
  // Cache in sessionStorage to avoid repeated lookups
  const cached = sessionStorage.getItem("ig_account_id");
  if (cached) return cached;

  try {
    const pagesRes = await fetch(`${BASE}/me/accounts`);
    if (!pagesRes.ok) return null;
    const pagesData = await pagesRes.json();
    const pages: { id: string }[] = pagesData.data ?? [];
    if (pages.length === 0) return null;

    const pageRes = await fetch(`${BASE}/${pages[0].id}?fields=instagram_business_account`);
    if (!pageRes.ok) return null;
    const pageData = await pageRes.json();
    const igId: string = pageData.instagram_business_account?.id ?? null;

    if (igId) {
      sessionStorage.setItem("ig_account_id", igId);
      return igId;
    }
  } catch {
    // silently fail — mock will be used
  }
  return null;
}

function parseInsights(insights: { data?: { name: string; values?: { value: number }[] }[] }): Partial<IGMedia["insights"]> {
  const map: Record<string, number> = {};
  for (const metric of insights.data ?? []) {
    const val = metric.values?.[0]?.value;
    if (val !== undefined) map[metric.name] = val;
  }
  return {
    reach: map.reach ?? 0,
    impressions: map.impressions ?? 0,
    saved: map.saved ?? 0,
    shares: map.shares ?? 0,
  };
}

// ── Public functions ───────────────────────────────────────────

export async function getInstagramProfile(): Promise<IGProfile> {
  if (!isInstagramConfigured()) return MOCK_PROFILE;

  const igId = await resolveIGAccountId();
  if (!igId) return MOCK_PROFILE;

  const fields = "followers_count,follows_count,media_count,profile_picture_url,username,biography";
  const res = await fetch(`${BASE}/${igId}?fields=${fields}`);
  if (!res.ok) return MOCK_PROFILE;
  const d = await res.json();

  return {
    id: igId,
    username: d.username ?? "",
    followersCount: d.followers_count ?? 0,
    followsCount: d.follows_count ?? 0,
    mediaCount: d.media_count ?? 0,
    profilePictureUrl: d.profile_picture_url ?? "",
    biography: d.biography ?? "",
  };
}

export async function getInstagramMedia(): Promise<IGMedia[]> {
  if (!isInstagramConfigured()) return MOCK_MEDIA;

  const igId = await resolveIGAccountId();
  if (!igId) return MOCK_MEDIA;

  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const res = await fetch(`${BASE}/${igId}/media?fields=${fields}&limit=20`);
  if (!res.ok) return MOCK_MEDIA;
  const data = await res.json();

  const items: IGMedia[] = await Promise.all(
    (data.data ?? []).map(async (raw: Record<string, string | number>) => {
      const item: IGMedia = {
        id: String(raw.id),
        caption: String(raw.caption ?? ""),
        mediaType: raw.media_type as IGMedia["mediaType"],
        mediaUrl: String(raw.media_url ?? ""),
        thumbnailUrl: raw.thumbnail_url ? String(raw.thumbnail_url) : undefined,
        permalink: String(raw.permalink ?? ""),
        timestamp: String(raw.timestamp ?? ""),
        likeCount: Number(raw.like_count ?? 0),
        commentsCount: Number(raw.comments_count ?? 0),
      };

      // Fetch insights for each media (only available for business accounts)
      try {
        const insightsRes = await fetch(
          `${BASE}/${item.id}/insights?metric=reach,impressions,saved,shares`
        );
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          item.insights = parseInsights(insightsData) as IGMedia["insights"];
        }
      } catch {
        // insights not available for all media types
      }

      return item;
    })
  );

  return items;
}

export async function getInstagramAccountInsights(): Promise<IGAccountInsights> {
  if (!isInstagramConfigured()) return MOCK_INSIGHTS;

  const igId = await resolveIGAccountId();
  if (!igId) return MOCK_INSIGHTS;

  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const metric = "reach,impressions,profile_views,follower_count";

  const res = await fetch(
    `${BASE}/${igId}/insights?metric=${metric}&period=day&since=${since}&until=${until}`
  );
  if (!res.ok) return MOCK_INSIGHTS;

  const data = await res.json();
  const map: Record<string, number> = {};
  for (const metric of data.data ?? []) {
    const sum = (metric.values ?? []).reduce((s: number, v: { value: number }) => s + v.value, 0);
    map[metric.name] = sum;
  }

  return {
    reach: map.reach ?? 0,
    impressions: map.impressions ?? 0,
    profileViews: map.profile_views ?? 0,
    followerCount: map.follower_count ?? MOCK_INSIGHTS.followerCount,
  };
}
