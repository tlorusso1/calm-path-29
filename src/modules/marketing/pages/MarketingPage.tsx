import { useState } from "react";
import { RefreshCw, TrendingUp, MousePointerClick, ShoppingCart, Info, Upload } from "lucide-react";
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
} from "../hooks/useMarketingData";
import { isGoogleConfigured } from "../api/googleAds";
import { CanalCard } from "../components/CanalCard";
import { CampanhaCard } from "../components/CampanhaCard";
import { AdSetCard } from "../components/AdSetCard";
import { AdCard } from "../components/AdCard";
import { UploadCriativo } from "../components/UploadCriativo";

type SubTab = "campanhas" | "publicos" | "criativos" | "upload";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "campanhas", label: "Campanhas" },
  { id: "publicos", label: "Públicos" },
  { id: "criativos", label: "Criativos" },
  { id: "upload", label: "Upload" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

export default function MarketingPage() {
  const [subTab, setSubTab] = useState<SubTab>("campanhas");
  const qc = useQueryClient();
  const { totalSpend, totalRevenue, roasGeral, channels, isLoading, isMock } = useMarketingConsolidado();
  const metaInsights = useMetaInsights();
  const metaCampaigns = useMetaCampaigns();
  const googleCampaigns = useGoogleCampaigns();
  const metaAdSets = useMetaAdSets();
  const metaAds = useMetaAds();

  const meta = metaInsights.data;

  const allCampaigns = [
    ...(metaCampaigns.data ?? []).map(c => ({ ...c, channel: "meta" as const })),
    ...(isGoogleConfigured() ? (googleCampaigns.data ?? []).map(c => ({
      id: c.id,
      name: c.name,
      status: c.status === "ENABLED" ? "ACTIVE" as const : "PAUSED" as const,
      objective: c.type,
      dailyBudget: c.budget,
      insights: {
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
        reach: 0,
        ctr: c.ctr,
        cpc: c.cpc,
        cpp: 0,
        purchases: c.conversions,
        purchaseValue: c.conversionValue,
        roas: c.roas,
      },
      channel: "google" as const,
    })) : []),
  ].sort((a, b) => b.insights.spend - a.insights.spend);

  const adsets = (metaAdSets.data ?? []).sort((a, b) => b.insights.spend - a.insights.spend);
  const ads = (metaAds.data ?? []).sort((a, b) => b.insights.spend - a.insights.spend);

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:pt-6">
        <div>
          <h1 className="text-lg font-semibold">Marketing & Ads</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando..."
              : `Este mês · ${allCampaigns.filter(c => c.status === "ACTIVE").length} campanhas ativas`}
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

      {/* Banner demo */}
      {isMock && (
        <div className="mx-4 md:mx-6 mb-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong>Dados de demonstração.</strong> Para conectar dados reais, adicione seus tokens de
            Meta Ads e Google Ads no <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">.env.local</code>.
          </span>
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-4 md:px-6 mb-4">
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
            valueColor: roasGeral >= 3 ? "text-emerald-600 dark:text-emerald-400" : roasGeral >= 2 ? "text-amber-600 dark:text-amber-400" : "text-red-500",
          },
          {
            label: "Cliques totais",
            value: isLoading ? null : fmtK((meta?.clicks ?? 0) + (isGoogleConfigured() ? (googleCampaigns.data?.reduce((s, c) => s + c.clicks, 0) ?? 0) : 0)),
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
      <div className="px-4 md:px-6 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Canais
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {channels.map((canal) => (
            <CanalCard key={canal.channel} canal={canal} totalSpend={totalSpend} />
          ))}
        </div>
      </div>

      {/* KPIs Meta detalhados */}
      {meta && (
        <div className="px-4 md:px-6 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Meta Ads — Detalhes
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: "Impressões", value: fmtK(meta.impressions) },
              { label: "Alcance", value: fmtK(meta.reach) },
              { label: "Cliques", value: fmtK(meta.clicks) },
              { label: "CTR", value: `${meta.ctr.toFixed(2)}%` },
              { label: "CPC", value: fmt(meta.cpc) },
              { label: "Compras", value: String(meta.purchases) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-xs font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="px-4 md:px-6 mb-3">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors",
                subTab === t.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.id === "upload" ? (
                <span className="flex items-center justify-center gap-1">
                  <Upload size={10} />
                  {t.label}
                </span>
              ) : (
                t.label
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 md:px-6 pb-8">

        {/* Campanhas */}
        {subTab === "campanhas" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
        {subTab === "publicos" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
        {subTab === "criativos" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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

        {/* Upload */}
        {subTab === "upload" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upload de criativo
            </p>
            <UploadCriativo />
          </>
        )}
      </div>
    </div>
  );
}
