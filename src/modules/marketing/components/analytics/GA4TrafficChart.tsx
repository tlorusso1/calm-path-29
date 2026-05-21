import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { GA4ChannelBreakdown } from "../../api/ga4";

const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  data: GA4ChannelBreakdown[];
  isLoading?: boolean;
}

// Shortened channel names for mobile
function shortLabel(channel: string): string {
  const map: Record<string, string> = {
    "Organic Search":  "Org. Search",
    "Paid Search":     "Paid Search",
    "Organic Social":  "Org. Social",
    "Paid Social":     "Paid Social",
    "Direct":          "Direto",
    "Email":           "Email",
    "Referral":        "Referral",
    "Organic Video":   "Org. Video",
    "Cross-network":   "Cross-net",
  };
  return map[channel] ?? channel;
}

export function GA4TrafficChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="h-4 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-52 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: shortLabel(d.channel),
    Sessões: d.sessions,
    Conversões: d.conversions,
    fill: d.color,
  }));

  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Tráfego por canal — últimos 30 dias
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={40}
            />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "Sessões" ? [fmtK(value), name] : [value, name]
              }
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, marginTop: 8 }} />
            <Bar dataKey="Sessões"   fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Conversões" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GA4RevenueChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="h-4 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-44 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      name: shortLabel(d.channel),
      Receita: d.revenue,
      fill: d.color,
    }));

  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Receita por canal (GA4)
      </p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={36}
            />
            <YAxis tickFormatter={(v) => `R$${fmtK(v)}`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value: number) => [fmt(value), "Receita"]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Bar dataKey="Receita" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
