import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Package } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendasRow {
  mes: string
  canal: string
  pedidos: number
  faturamento: number
}

interface ProdutoRow {
  mes: string
  canal: string
  nome: string
  sku: string | null
  qtd_vendida: number
  faturamento: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CANAL_CONFIG: Record<string, { label: string; color: string }> = {
  nuvemshop: { label: 'Nuvemshop', color: '#2B7FFF' },
  shopee:    { label: 'Shopee BR', color: '#FF6B00' },
  ritz_pay:  { label: 'Ritz Pay',  color: '#E8A838' },
  nice_sp:   { label: 'NICE SP',   color: '#4DC98A' },
  b2b_tiny:  { label: 'B2B',       color: '#7C3AED' },
}

const CANAL_ORDER = ['nuvemshop', 'shopee', 'ritz_pay', 'nice_sp', 'b2b_tiny']

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function subMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() - n)
  return startOfMonth(r)
}

function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function fmtMes(dateStr: string): string {
  const parts = dateStr.split('-')
  const year  = parts[0]
  const month = parseInt(parts[1], 10)
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${MONTHS[month - 1]}/${year.slice(2)}`
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

// ─── Periods ──────────────────────────────────────────────────────────────────

const _now = new Date()

const PERIODS: Record<string, { label: string; start: string; end: string }> = {
  '6m':   { label: '6 meses',  start: fmtIso(subMonths(_now, 6)),  end: fmtIso(_now) },
  '12m':  { label: '12 meses', start: fmtIso(subMonths(_now, 12)), end: fmtIso(_now) },
  '2026': { label: '2026',     start: '2026-01-01',                end: '2026-12-01' },
  '2025': { label: '2025',     start: '2025-01-01',                end: '2025-12-01' },
  '2024': { label: '2024',     start: '2024-01-01',                end: '2024-12-01' },
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, metrica }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, e: { value: number }) => s + (e.value || 0), 0)
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm min-w-40">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: { dataKey: string; value: number; color: string }) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: entry.color }}>
            {CANAL_CONFIG[entry.dataKey]?.label ?? entry.dataKey}
          </span>
          <span className="font-mono tabular-nums">
            {metrica === 'faturamento'
              ? fmtBRL(entry.value)
              : entry.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
      <div className="border-t mt-2 pt-1 flex justify-between font-semibold">
        <span className="text-muted-foreground">Total</span>
        <span className="font-mono tabular-nums">
          {metrica === 'faturamento' ? fmtBRL(total) : total.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendasCanaisPage() {
  const [period, setPeriod]       = useState<string>('12m')
  const [canal, setCanal]         = useState<string>('todos')
  const [metrica, setMetrica]     = useState<'faturamento' | 'pedidos'>('faturamento')
  const [tabelaView, setTabelaView] = useState<'somado' | 'canal'>('somado')

  const { start, end } = PERIODS[period] ?? PERIODS['12m']

  const { data: vendasData, isLoading: vendasLoading } = useQuery({
    queryKey: ['vendas-canais', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_canais')
        .select('mes, canal, pedidos, faturamento')
        .gte('mes', start)
        .lte('mes', end)
        .order('mes', { ascending: true })
      if (error) throw error
      return data as VendasRow[]
    }
  })

  const { data: produtosData, isLoading: produtosLoading } = useQuery({
    queryKey: ['vendas-produtos', start, end, canal],
    queryFn: async () => {
      let q = supabase
        .from('vendas_produtos')
        .select('mes, canal, nome, sku, qtd_vendida, faturamento')
        .gte('mes', start)
        .lte('mes', end)
      if (canal !== 'todos') q = q.eq('canal', canal)
      const { data, error } = await q
      if (error) throw error
      return data as ProdutoRow[]
    }
  })

  const canaisAtivos = useMemo(() => {
    if (!vendasData) return CANAL_ORDER
    const set = new Set(vendasData.map(r => r.canal))
    return CANAL_ORDER.filter(c => set.has(c))
  }, [vendasData])

  const filteredVendas = useMemo(() => {
    if (!vendasData) return []
    return canal === 'todos' ? vendasData : vendasData.filter(r => r.canal === canal)
  }, [vendasData, canal])

  const canaisDisplay = canal === 'todos'
    ? canaisAtivos
    : [canal].filter(c => canaisAtivos.includes(c))

  const chartData = useMemo(() => {
    const byMes: Record<string, Record<string, number>> = {}
    for (const row of filteredVendas) {
      if (!byMes[row.mes]) byMes[row.mes] = {}
      byMes[row.mes][row.canal] = (byMes[row.mes][row.canal] ?? 0) +
        (metrica === 'faturamento' ? Number(row.faturamento) : row.pedidos)
    }
    return Object.entries(byMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => ({ mes: fmtMes(mes), ...vals }))
  }, [filteredVendas, metrica])

  const kpis = useMemo(() => {
    const total    = filteredVendas.reduce((s, r) => s + Number(r.faturamento), 0)
    const totalPed = filteredVendas.reduce((s, r) => s + r.pedidos, 0)
    const byCanal: Record<string, { fat: number; ped: number }> = {}
    for (const r of filteredVendas) {
      if (!byCanal[r.canal]) byCanal[r.canal] = { fat: 0, ped: 0 }
      byCanal[r.canal].fat += Number(r.faturamento)
      byCanal[r.canal].ped += r.pedidos
    }
    return { total, totalPed, byCanal }
  }, [filteredVendas])

  const tabelaMeses = useMemo(() => {
    const byMes: Record<string, Record<string, { fat: number; ped: number }>> = {}
    for (const r of filteredVendas) {
      if (!byMes[r.mes]) byMes[r.mes] = {}
      if (!byMes[r.mes][r.canal]) byMes[r.mes][r.canal] = { fat: 0, ped: 0 }
      byMes[r.mes][r.canal].fat += Number(r.faturamento)
      byMes[r.mes][r.canal].ped += r.pedidos
    }
    return Object.entries(byMes)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, canais]) => ({
        mes,
        canais,
        totalFat: Object.values(canais).reduce((s, c) => s + c.fat, 0),
        totalPed: Object.values(canais).reduce((s, c) => s + c.ped, 0),
      }))
  }, [filteredVendas])

  const produtosAgg = useMemo(() => {
    if (!produtosData) return []
    const map: Record<string, { nome: string; sku: string | null; qtd: number; fat: number }> = {}
    for (const r of produtosData) {
      if (!map[r.nome]) map[r.nome] = { nome: r.nome, sku: r.sku, qtd: 0, fat: 0 }
      map[r.nome].qtd += r.qtd_vendida
      map[r.nome].fat += Number(r.faturamento)
    }
    return Object.values(map).sort((a, b) => b.fat - a.fat)
  }, [produtosData])

  const produtosTotal = produtosAgg.reduce((s, p) => s + p.fat, 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendas por Canal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Faturamento e pedidos por canal de venda
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-md border overflow-hidden divide-x text-sm">
          {Object.entries(PERIODS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                period === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Select value={canal} onValueChange={setCanal}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os canais</SelectItem>
            {CANAL_ORDER.map(c => (
              <SelectItem key={c} value={c}>{CANAL_CONFIG[c].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border overflow-hidden divide-x text-sm">
          {(['faturamento', 'pedidos'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetrica(m)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                metrica === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              {m === 'faturamento' ? 'Faturamento' : 'Pedidos'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Total
            </p>
            <p className="text-xl font-semibold mt-1 tabular-nums">{fmtBRL(kpis.total)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {kpis.totalPed.toLocaleString('pt-BR')} pedidos
            </p>
          </CardContent>
        </Card>

        {canaisDisplay.map(c => {
          const cfg = CANAL_CONFIG[c]
          const d   = kpis.byCanal[c]
          if (!d) return null
          const pct = kpis.total > 0 ? ((d.fat / kpis.total) * 100).toFixed(0) : '0'
          return (
            <Card key={c}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: cfg.color }}>
                  {cfg.label}
                </p>
                <p className="text-lg font-semibold mt-1 tabular-nums">{fmtBRL(d.fat)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {d.ped > 0 ? `${d.ped.toLocaleString('pt-BR')} ped.` : '—'}{' '}
                  <span className="opacity-60">{pct}%</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="canais">
        <TabsList>
          <TabsTrigger value="canais">Por Canal</TabsTrigger>
          <TabsTrigger value="produtos">Por Produto</TabsTrigger>
        </TabsList>

        {/* Por Canal */}
        <TabsContent value="canais" className="space-y-5 mt-4">
          <Card>
            <CardHeader className="pb-0 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metrica === 'faturamento' ? 'Faturamento R$' : 'Pedidos'} — evolução mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {vendasLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={v =>
                        metrica === 'faturamento'
                          ? `R$${(v / 1000).toFixed(0)}k`
                          : v.toLocaleString('pt-BR')
                      }
                      width={60}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={(props) => <ChartTooltip {...props} metrica={metrica} />}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                    />
                    <Legend
                      iconType="square"
                      iconSize={10}
                      formatter={v => (
                        <span className="text-xs">{CANAL_CONFIG[v]?.label ?? v}</span>
                      )}
                    />
                    {canaisDisplay.map(c => (
                      <Bar
                        key={c}
                        dataKey={c}
                        stackId="a"
                        fill={CANAL_CONFIG[c].color}
                        name={c}
                        radius={canaisDisplay.indexOf(c) === canaisDisplay.length - 1
                          ? [3, 3, 0, 0]
                          : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Detalhe por mês
              </CardTitle>
              <div className="flex rounded-md border overflow-hidden divide-x text-xs">
                <button
                  onClick={() => setTabelaView('somado')}
                  className={`px-2.5 py-1 font-medium transition-colors ${tabelaView === 'somado' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                >
                  Somado
                </button>
                <button
                  onClick={() => setTabelaView('canal')}
                  className={`px-2.5 py-1 font-medium transition-colors ${tabelaView === 'canal' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                >
                  Por canal
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {tabelaView === 'somado' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mês</th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Pedidos</th>
                        <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Faturamento</th>
                        <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Ticket médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabelaMeses.map(({ mes, totalFat, totalPed }) => (
                        <tr key={mes} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-medium">{fmtMes(mes)}</td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{totalPed.toLocaleString('pt-BR')}</td>
                          <td className="text-right py-2.5 px-3 tabular-nums font-medium">{fmtBRL(totalFat)}</td>
                          <td className="text-right py-2.5 px-4 tabular-nums text-muted-foreground">
                            {totalPed > 0 ? fmtBRL(totalFat / totalPed) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20 font-semibold">
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">Total</td>
                        <td className="text-right py-2.5 px-3 tabular-nums">
                          {tabelaMeses.reduce((s, r) => s + r.totalPed, 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right py-2.5 px-3 tabular-nums">
                          {fmtBRL(tabelaMeses.reduce((s, r) => s + r.totalFat, 0))}
                        </td>
                        <td className="py-2.5 px-4" />
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mês</th>
                        {canaisDisplay.map(c => (
                          <th key={c} className="text-right py-2.5 px-3 font-medium text-xs uppercase tracking-wide" style={{ color: CANAL_CONFIG[c].color }}>
                            {CANAL_CONFIG[c].label}
                          </th>
                        ))}
                        <th className="text-right py-2.5 px-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabelaMeses.map(({ mes, canais, totalFat, totalPed }) => (
                        <tr key={mes} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-medium">{fmtMes(mes)}</td>
                          {canaisDisplay.map(c => {
                            const d = canais[c]
                            return (
                              <td key={c} className="text-right py-2.5 px-3 tabular-nums text-sm">
                                {d
                                  ? metrica === 'faturamento' ? fmtBRL(d.fat) : d.ped.toLocaleString('pt-BR')
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                            )
                          })}
                          <td className="text-right py-2.5 px-4 font-semibold tabular-nums">
                            {metrica === 'faturamento' ? fmtBRL(totalFat) : totalPed.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Produto */}
        <TabsContent value="produtos" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package size={14} />
                Produtos mais vendidos
                {canal !== 'todos' && (
                  <Badge variant="secondary" className="text-xs">
                    {CANAL_CONFIG[canal]?.label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {produtosLoading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando…
                </div>
              ) : produtosAgg.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2 px-6 text-center">
                  <Package size={28} className="opacity-30" />
                  <p className="font-medium">Sincronização de produtos pendente</p>
                  <p className="text-xs text-balance leading-relaxed">
                    Os dados de produto serão preenchidos quando o backfill for executado.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2.5 px-4 font-medium text-xs uppercase tracking-wide text-muted-foreground w-8">#</th>
                        <th className="text-left py-2.5 px-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Produto</th>
                        <th className="text-right py-2.5 px-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Qtd</th>
                        <th className="text-right py-2.5 px-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Faturamento</th>
                        <th className="text-right py-2.5 px-4 font-medium text-xs uppercase tracking-wide text-muted-foreground">% total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosAgg.map((p, i) => {
                        const pct = produtosTotal > 0 ? (p.fat / produtosTotal) * 100 : 0
                        return (
                          <tr key={p.nome} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-muted-foreground text-xs font-mono">{i + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium leading-tight">{p.nome}</div>
                              {p.sku && (
                                <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                              )}
                            </td>
                            <td className="text-right py-2.5 px-3 tabular-nums">{p.qtd.toLocaleString('pt-BR')}</td>
                            <td className="text-right py-2.5 px-3 tabular-nums font-medium">{fmtBRL(p.fat)}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs tabular-nums w-9 text-right text-muted-foreground">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20">
                        <td className="py-2.5 px-4" />
                        <td className="py-2.5 px-3 font-medium text-muted-foreground text-xs">
                          {produtosAgg.length} produtos
                        </td>
                        <td className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {produtosAgg.reduce((s, p) => s + p.qtd, 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right py-2.5 px-3 tabular-nums font-semibold">
                          {fmtBRL(produtosTotal)}
                        </td>
                        <td className="py-2.5 px-4" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
