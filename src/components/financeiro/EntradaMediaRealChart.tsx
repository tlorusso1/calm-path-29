import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { subDays, parseISO, isWithinInterval, startOfDay, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface EntradaMediaRealChartProps {
  contasFluxo: ContaFluxo[];
  custoFixoMensal: number;
  marketingEstrutural: number;
  adsBase: number;
}

export function EntradaMediaRealChart({
  contasFluxo,
  custoFixoMensal,
  marketingEstrutural,
  adsBase,
}: EntradaMediaRealChartProps) {
  const dados = useMemo(() => {
    const hoje = startOfDay(new Date());
    const inicio14d = subDays(hoje, 14);

    // Média real: lançamentos conciliados tipo 'receber' últimos 14 dias
    const entradas14d = contasFluxo
      .filter(c => {
        if (!c.pago || c.tipo !== 'receber') return false;
        try {
          const data = parseISO(c.dataVencimento);
          return isWithinInterval(data, { start: inicio14d, end: hoje });
        } catch {
          return false;
        }
      })
      .reduce((sum, c) => sum + parseValorFlexivel(c.valor), 0);

    const mediaReal = entradas14d / 14;

    // Mínima necessária: saídas operacionais / dias restantes do mês
    const fimMes = endOfMonth(hoje);
    const diasRestantes = Math.max(differenceInCalendarDays(fimMes, hoje), 1);
    const saidasOperacionais = custoFixoMensal + marketingEstrutural + adsBase;
    const minimaNecessaria = saidasOperacionais / diasRestantes;

    return { mediaReal, minimaNecessaria, entradas14d, diasRestantes };
  }, [contasFluxo, custoFixoMensal, marketingEstrutural, adsBase]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const chartData = [
    { name: 'Real/dia', valor: Math.round(dados.mediaReal), cor: 'hsl(142, 76%, 36%)' },
    { name: 'Mínimo/dia', valor: Math.round(dados.minimaNecessaria), cor: 'hsl(var(--muted-foreground))' },
  ];

  const saudavel = dados.mediaReal >= dados.minimaNecessaria;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            💰 Entrada Média Real vs Necessária
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">REAL</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 60 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={75} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={28}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
                <LabelList
                  dataKey="valor"
                  position="right"
                  formatter={(v: number) => formatCurrency(v)}
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={cn(
          "text-center text-sm font-medium py-1.5 rounded",
          saudavel ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20" : "text-destructive bg-destructive/10"
        )}>
          {saudavel
            ? `✅ Entrando ${formatCurrency(dados.mediaReal - dados.minimaNecessaria)}/dia acima do mínimo`
            : `⚠️ Faltam ${formatCurrency(dados.minimaNecessaria - dados.mediaReal)}/dia para cobrir saídas`}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Base: {formatCurrency(dados.entradas14d)} em 14 dias conciliados · {dados.diasRestantes} dias restantes no mês
        </p>
      </CardContent>
    </Card>
  );
}
