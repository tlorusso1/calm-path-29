import { useQuery } from "@tanstack/react-query";
import {
  getMetaAccountInsights,
  getMetaCampaigns,
  isMetaConfigured,
  type MetaInsights,
  type MetaCampaign,
} from "../api/metaAds";
import {
  getGoogleAccountInsights,
  getGoogleCampaigns,
  isGoogleConfigured,
  MOCK_GOOGLE_INSIGHTS,
  type GoogleAccountInsights,
  type GoogleCampaign,
} from "../api/googleAds";

export type { MetaInsights, MetaCampaign, GoogleAccountInsights, GoogleCampaign };

export interface ChannelSummary {
  channel: "meta" | "google" | "tiktok";
  label: string;
  color: string;
  spend: number;
  roas: number;
  configured: boolean;
}

export function useMetaInsights() {
  return useQuery({
    queryKey: ["marketing", "meta", "insights"],
    queryFn: () => getMetaAccountInsights("this_month"),
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useMetaCampaigns() {
  return useQuery({
    queryKey: ["marketing", "meta", "campaigns"],
    queryFn: getMetaCampaigns,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useGoogleInsights() {
  return useQuery({
    queryKey: ["marketing", "google", "insights"],
    queryFn: getGoogleAccountInsights,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useGoogleCampaigns() {
  return useQuery({
    queryKey: ["marketing", "google", "campaigns"],
    queryFn: getGoogleCampaigns,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useMarketingConsolidado() {
  const meta = useMetaInsights();
  const google = useGoogleInsights();

  const metaData = meta.data;
  const googleData = google.data ?? MOCK_GOOGLE_INSIGHTS;

  const totalSpend = (metaData?.spend ?? 0) + (googleData?.spend ?? 0);
  const totalRevenue = (metaData?.purchaseValue ?? 0) + (googleData?.conversionValue ?? 0);
  const roasGeral = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const channels: ChannelSummary[] = [
    {
      channel: "meta",
      label: "Meta Ads",
      color: "#1877F2",
      spend: metaData?.spend ?? 0,
      roas: metaData?.roas ?? 0,
      configured: isMetaConfigured(),
    },
    {
      channel: "google",
      label: "Google Ads",
      color: "#4285F4",
      spend: googleData?.spend ?? 0,
      roas: googleData?.roas ?? 0,
      configured: isGoogleConfigured(),
    },
    {
      channel: "tiktok",
      label: "TikTok Ads",
      color: "#010101",
      spend: 0,
      roas: 0,
      configured: false,
    },
  ];

  return {
    totalSpend,
    totalRevenue,
    roasGeral,
    channels,
    isLoading: meta.isLoading || google.isLoading,
    isError: meta.isError || google.isError,
    isMock: !isMetaConfigured() && !isGoogleConfigured(),
  };
}
