import { useState } from "react";
import {
  RefreshCw, TrendingUp, MousePointerClick, ShoppingCart, Info,
  LayoutDashboard, BadgeDollarSign, Smartphone, BarChart3, Mail,
  Construction, Instagram, Youtube,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMarketingConsolidado,
  useMetaInsights,
  useMetaCampaigns,
  useGoogleCampaigns,
  useMetaAdSets,
  useMetaAds,
  useInstagramProfile,
  useInstagramMedia,
  useInstagramInsights,
  useYouTubeStats,
  useYouTubeVideos,
  useGA4TrafficByChannel,
  useGA4Summary,
  usePerfitCampaigns,
  usePerfitSummary,
} from "../hooks/useMarketingData";
import { isGoogleConfigured } from "../api/googleAds";
import { isInstagramConfigured } from "../api/instagram";
import { isYouTubeConfigured } from "../api/youtube";
import { isGA4Configured } from "../api/ga4";
import { isPerfitConfigured } from "../api/perfit";
import { CanalCard } from "../components/CanalCard";
import { CampanhaCard } from "../components/CampanhaCard";
import { AdSetCard } from "../components/AdSetCard";
import { AdCard } from "../components/AdCard";
import { BulkUploadPanel } from "../components/BulkUploadPanel";
import { IGProfileCard } from "../components/instagram/IGProfileCard";
import { IGInsightsBar } from "../components/instagram/IGInsightsBar";
import { IGMediaGrid } from "../components/instagram/IGMediaGrid";
import { YTChannelCard } from "../components/youtube/YTChannelCard";
import { YTVideoList } from "../components/youtube/YTVideoList";
import { GA4TrafficChart, GA4RevenueChart } from "../components/analytics/GA4TrafficChart";
import { GA4ChannelTable } from "../components/analytics/GA4ChannelTable";
import { OrganicVsPaidCard } from "../components/analytics/OrganicVsPaidCard";
import { PerfitSummaryBar } from "../components/email/PerfitSummaryBar";
import { PerfitCampaignCard } from "../components/email/PerfitCampaignCard";

// ─── Types ────────────────────────────────────────────────────
type Section    = "overview" | "ads" | "social" | "analytics" | "email";
type AdsTab     = "campanhas" | "publicos" | "criativos" | "upload";
type SocialTab  = "instagram" | "youtube";

const TOP_SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Visão Geral", icon: LayoutDashboard  },
  { id: "ads",        label: "Ads",         icon: BadgeDollarSign  },
  { id: "social",     label: "Social",      icon: Smartphone       },
  { id: "analytics",  label: "Analytics",   icon: BarChart3        },
  { id: "email",      label: "Email",        icon: Mail             },
];

const ADS_TABS: { id: AdsTab; label: string }[] = [
  { id: "campanhas", label: "Campanhas"  },
  { id: "publicos",  label: "Públicos"   },
  { id: "criativos", label: "Criativos"  },
  { id: "upload",    label: "Upload"     },
];

const SOCIAL_TABS: { id: SocialTab; label: string; icon: React.ElementType }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "youtube",   label: "YouTube",   icon: Youtube   },
];

// ─── Helpers ───────────────────────────────────────────────────
const fmt  = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

// ─── Stub component for sections in development ────────────────
function ComingSoonSection({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon size={28} className="opacity-40" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs mt-1 opacity-70 max-w-xs">{description}</p>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full font-medium">
        <Construction size={11} />
        Em desenvolvimento — chegando em breve
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function MarketingPage() {
  const [section,    setSection]    = useState<Section>("overview");
  const [adsTab,     setAdsTab]     = useState<AdsTab>("campanhas");
  const [socialTab,  setSocialTab]  = useState<SocialTab>("instagram");

  const qc = useQueryClient();
  const { totalSpend, totalRevenue, roasGeral, channels, isLoading, isMock } = useMarketingConsolidado();
  const metaInsights   = useMetaInsights();
  const metaCampaigns  = useMetaCampaigns();
  const googleCampaigns = useGoogleCampaigns();
  const metaAdSets     = useMetaAdSets();
  const metaAds        = useMetaAds();

  const meta = metaInsights.data;

  const allCampaigns = [
    ...(metaCampaigns.data ?? []).map((c) => ({ ...c, channel: "meta" as const })),
    ...(isGoogleConfigured()
      ? (googleCampaigns.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status === "ENABLED" ? "ACTIVE" as const : "PAUSED" as const,
          objective: c.type,
          dailyBudget: c.budget,
          insights: {
            spend: c.spend, impressions: c.impressions, clicks: c.clicks,
            reach: 0, ctr: c.ctr, cpc: c.cpc, cpp: 0,
            purchases: c.conversions, purchaseValue: c.conversionValue, roas: c.roas,
          },
          channel: "google" as const,
        }))
      : []),
  ].sort((a, b) => b.insights.spend - a.insights.spend);

  const adsets = (metaAdSets.data ?? []).sort((a, b) => b.insights.spend - a.insights.spend);
  const ads    = (metaAds.data    ?? []).sort((a, b) => b.insights.spend - a.insights.spend);

  // Social
  const igProfile  = useInstagramProfile();
  const igMedia    = useInstagramMedia();
  const igInsights = useInstagramInsights();
  const ytStats    = useYouTubeStats();
  const ytVideos   = useYouTubeVideos();

  // Analytics
  const ga4Traffic  = useGA4TrafficByChannel();
  const ga4Summary  = useGA4Summary();

  // Email
  const perfitCampaigns = usePerfitCampaigns();
  const perfitSummary   = usePerfitSummary();

  return (
    <div className="flex flex-col animate-fade-in">

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6 md:pt-6">
        <div>
          <h1 className="text-lg font-semibold">Marketing & Ads</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando..."
              : `Este mês · ${allCampaigns.filter((c) => c.status === "ACTIVE").length} campanhas ativas`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["marketing"] })}
          className="gap-1.5"
        >
          <RefreshCw size={13} />
          Atualizar
        </Button>
      </div>

      {/* ─── Top-level section tabs ──────────────────────────── */}
      <div className="px-4 md:px-6 pb-3">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {TOP_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg whitespace-nowrap transition-colors shrink-0",
                section === id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Demo banner ─────────────────────────────────────── */}
      {isMock && section === "overview" && (
        <div className="mx-4 md:mx-6 mb-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong>Dados de demonstração.</strong> Para conectar dados reais, adicione seus tokens de
            Meta Ads e Google Ads no{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">.env.local</code>.
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEÇÃO: VISÃO GERAL
      ══════════════════════════════════════════════════════ */}
      {section === "overview" && (
        <div className="space-y-5 px-4 md:px-6 pb-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              {
                label: "Investimento total",
                value: isLoading ? null : fmt(totalSpend),
                icon: <ShoppingCart size={13} className="text-muted-foreground" />,
                sub: "este mês",
              },
              {
                label: "Receita atribuída",
                value: isLoading ? null : fmt(totalRevenue),
                icon: <TrendingUp size={13} className="text-emerald-500" />,
                sub: "via ads",
              },
              {
                label: "ROAS geral",
                value: isLoading ? null : `${roasGeral.toFixed(2)}x`,
                icon: null,
                sub: roasGeral >= 3 ? "✅ Saudável" : roasGeral >= 2 ? "⚠️ Atenção" : "🔴 Baixo",
                valueColor:
                  roasGeral >= 3
                    ? "text-emerald-600 dark:text-emerald-400"
                    : roasGeral >= 2
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-500",
              },
              {
                label: "Cliques totais",
                value: isLoading
                  ? null
                  : fmtK(
                      (meta?.clicks ?? 0) +
                        (isGoogleConfigured()
                          ? (googleCampaigns.data?.reduce((s, c) => s + c.clicks, 0) ?? 0)
                          : 0)
                    ),
                icon: <MousePointerClick size={13} className="text-muted-foreground" />,
                sub: `CTR ${(meta?.ctr ?? 0).toFixed(1)}% Meta`,
              },
            ].map(({ label, value, icon, sub, valueColor }) => (
              <div key={label} className="metric-card">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {icon}
                  {label}
                </div>
                {value === null ? (
                  <div className="h-7 w-24 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <span className={`text-xl font-bold ${valueColor ?? ""}`}>{value}</span>
                )}
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Canais */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Canais
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {channels.map((canal) => (
                <CanalCard key={canal.channel} canal={canal} totalSpend={totalSpend} />
              ))}
            </div>
          </div>

          {/* Meta detalhes */}
          {meta && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Meta Ads — Detalhes
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label: "Impressões", value: fmtK(meta.impressions) },
                  { label: "Alcance",    value: fmtK(meta.reach)       },
                  { label: "Cliques",    value: fmtK(meta.clicks)      },
                  { label: "CTR",        value: `${meta.ctr.toFixed(2)}%` },
                  { label: "CPC",        value: fmt(meta.cpc)          },
                  { label: "Compras",    value: String(meta.purchases)  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-xs font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEÇÃO: ADS
      ══════════════════════════════════════════════════════ */}
      {section === "ads" && (
        <div className="flex flex-col px-4 md:px-6 pb-8 gap-4">
          {/* Ads sub-tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
            {ADS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setAdsTab(t.id)}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors",
                  adsTab === t.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Campanhas */}
          {adsTab === "campanhas" && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-2">
                Campanhas ({allCampaigns.length})
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {allCampaigns.map((c) => (
                    <CampanhaCard key={`${c.channel}-${c.id}`} campanha={c} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Públicos */}
          {adsTab === "publicos" && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-2">
                Públicos / Ad Sets ({adsets.length})
              </p>
              {metaAdSets.isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : adsets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhum público encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {adsets.map((as) => (
                    <AdSetCard key={as.id} adset={as} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Criativos */}
          {adsTab === "criativos" && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-2">
                Criativos / Ads ({ads.length})
              </p>
              {metaAds.isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : ads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhum criativo encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ads.map((ad) => (
                    <AdCard key={ad.id} ad={ad} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bulk Upload */}
          {adsTab === "upload" && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-2">
                Upload em massa de criativos
              </p>
              <BulkUploadPanel adSets={adsets} />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEÇÃO: SOCIAL
      ══════════════════════════════════════════════════════ */}
      {section === "social" && (
        <div className="flex flex-col px-4 md:px-6 pb-8 gap-4">
          {/* Mock banners */}
          {!isInstagramConfigured() && socialTab === "instagram" && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg text-xs text-purple-800 dark:text-purple-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Dados de demonstração.</strong> Para conectar dados reais, adicione{" "}
                <code className="font-mono bg-purple-100 dark:bg-purple-900/40 px-1 rounded">VITE_INSTAGRAM_CONFIGURED=true</code>{" "}
                ao <code className="font-mono bg-purple-100 dark:bg-purple-900/40 px-1 rounded">.env.local</code>.
                O token Meta já está configurado.
              </span>
            </div>
          )}
          {!isYouTubeConfigured() && socialTab === "youtube" && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-800 dark:text-red-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Dados de demonstração.</strong> Para dados reais, adicione{" "}
                <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">YOUTUBE_API_KEY</code>{" "}
                e{" "}
                <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">VITE_YOUTUBE_CHANNEL_ID</code>{" "}
                ao <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">.env.local</code>.
              </span>
            </div>
          )}

          {/* Social sub-tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
            {SOCIAL_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSocialTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md transition-colors",
                  socialTab === id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Instagram */}
          {socialTab === "instagram" && (
            <div className="space-y-4">
              {igProfile.data && <IGProfileCard profile={igProfile.data} />}
              {igInsights.data && (
                <IGInsightsBar insights={igInsights.data} isLoading={igInsights.isLoading} />
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Posts recentes
                </p>
                <IGMediaGrid
                  media={igMedia.data ?? []}
                  isLoading={igMedia.isLoading}
                />
              </div>
            </div>
          )}

          {/* YouTube */}
          {socialTab === "youtube" && (
            <div className="space-y-4">
              {ytStats.data && <YTChannelCard stats={ytStats.data} />}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Vídeos recentes ({ytVideos.data?.length ?? 0})
                </p>
                <YTVideoList
                  videos={ytVideos.data ?? []}
                  isLoading={ytVideos.isLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEÇÃO: ANALYTICS
      ══════════════════════════════════════════════════════ */}
      {section === "analytics" && (
        <div className="px-4 md:px-6 pb-8 space-y-4">
          {!isGA4Configured() && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Dados de demonstração.</strong> Para dados reais do GA4, crie uma Service Account no
                Google Cloud, conceda acesso à propriedade GA4 e adicione{" "}
                <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">GOOGLE_SA_KEY_JSON</code>{" "}
                + <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">VITE_GA4_PROPERTY_ID</code>{" "}
                ao <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">.env.local</code>.
              </span>
            </div>
          )}

          {/* KPIs de resumo */}
          {ga4Summary.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { label: "Sessões (30d)",  value: ga4Summary.data.totalSessions.toLocaleString("pt-BR"),  color: "text-foreground" },
                { label: "Usuários",       value: ga4Summary.data.totalUsers.toLocaleString("pt-BR"),      color: "text-foreground" },
                { label: "Conversões",     value: ga4Summary.data.totalConversions.toLocaleString("pt-BR"), color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Receita (GA4)",  value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ga4Summary.data.totalRevenue), color: "text-emerald-600 dark:text-emerald-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="metric-card">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  {ga4Summary.isLoading
                    ? <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                    : <span className={`text-xl font-bold ${color}`}>{value}</span>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Orgânico vs Pago */}
          {ga4Summary.data && (
            <OrganicVsPaidCard summary={ga4Summary.data} isLoading={ga4Summary.isLoading} />
          )}

          {/* Charts */}
          <GA4TrafficChart data={ga4Traffic.data ?? []} isLoading={ga4Traffic.isLoading} />
          <GA4RevenueChart data={ga4Traffic.data ?? []} isLoading={ga4Traffic.isLoading} />

          {/* Table */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Detalhes por canal
            </p>
            <GA4ChannelTable data={ga4Traffic.data ?? []} isLoading={ga4Traffic.isLoading} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEÇÃO: EMAIL
      ══════════════════════════════════════════════════════ */}
      {section === "email" && (
        <div className="px-4 md:px-6 pb-8 space-y-4">
          {/* Config banner */}
          {!isPerfitConfigured() && (
            <div className="flex items-start gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 rounded-lg text-xs text-violet-800 dark:text-violet-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Dados de demonstração.</strong> Para dados reais, adicione{" "}
                <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded">PERFIT_API_KEY</code>{" "}
                e{" "}
                <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded">VITE_PERFIT_CONFIGURED=true</code>{" "}
                ao <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded">.env.local</code>.
              </span>
            </div>
          )}

          {/* KPIs de resumo */}
          {perfitSummary.data && (
            <PerfitSummaryBar summary={perfitSummary.data} isLoading={perfitSummary.isLoading} />
          )}

          {/* Lista de campanhas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Campanhas ({perfitCampaigns.data?.length ?? 0})
            </p>
            {perfitCampaigns.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : perfitCampaigns.data?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma campanha encontrada.
              </div>
            ) : (
              <div className="space-y-3">
                {(perfitCampaigns.data ?? []).map((campaign) => (
                  <PerfitCampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
