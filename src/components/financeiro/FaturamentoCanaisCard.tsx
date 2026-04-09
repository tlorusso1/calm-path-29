import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContaFluxo, MovimentacaoEstoque, CanalVenda } from '@/types/focus-mode';
import { FATURAMENTO_HISTORICO, FaturamentoMensal } from '@/data/faturamento-historico';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FaturamentoCanais {
  b2b: string;
  ecomNuvem: string;
  ecomShopee: string;
  ecomAssinaturas: string;
}

interface FaturamentoCanaisCardProps {
  faturamentoCanais: FaturamentoCanais;
  onUpdate: (canais: FaturamentoCanais) => void;
  contasFluxo?: ContaFluxo[];
  movimentacoes?: MovimentacaoEstoque[];
  forecastMensal?: number;
  forecastSemanal?: number;
}

interface CanalInfo {
  key: keyof FaturamentoCanais;
  canalKey: CanalVenda;
  label: string;
  color: string;
}

const CANAIS: CanalInfo[] = [
  { key: 'b2b', canalKey: 'b2b', label: 'B2B', color: 'bg-blue-500' },
  { key: 'ecomNuvem', canalKey: 'ecomNuvem', label: 'ECOM-NUVEM', color: 'bg-purple-500' },
  { key: 'ecomShopee', canalKey: 'ecomShopee', label: 'ECOM-SHOPEE', color: 'bg-orange-500' },
  { key: 'ecomAssinaturas', canalKey: 'ecomAssinaturas', label: 'ASSINATURAS', color: 'bg-green-500' },
];

function classificarContaOrigem(contaOrigem?: string): CanalVenda | null {
  if (!contaOrigem) return null;
  const upper = contaOrigem.toUpperCase();
  if (upper.includes('ASAAS')) return 'ecomAssinaturas';
  if (upper.includes('MERCADO LIVRE') || upper.includes('MERCADOLIVRE')) return 'ecomShopee';
  if (upper.includes('NICE ECOM') || upper.includes('PAGAR.ME') || upper.includes('PAGARME') || upper.includes('NUVEMSHOP') || upper.includes('NUVEM')) return 'ecomNuvem';
  if (upper.includes('NICE FOODS') && !upper.includes('ECOM')) return 'b2b';
  return null;
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FaturamentoCanaisCard({
  faturamentoCanais,
  onUpdate,
  contasFluxo,
  movimentacoes,
  forecastMensal,
  forecastSemanal,
}: FaturamentoCanaisCardProps) {
  const hoje = new Date();
  const mesAtualKey = format(hoje, 'yyyy-MM');
  
  const [selectedDate, setSelectedDate] = useState(hoje);
  const selectedKey = format(selectedDate, 'yyyy-MM');
  const isMesAtual = selectedKey === mesAtualKey;
  
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaDoMes;

  // Live data for current month (from contasFluxo + movimentações)
  const liveData = useMemo(() => {
    const mesRef = selectedDate.getMonth();
    const anoRef = selectedDate.getFullYear();

    const liquido: Record<CanalVenda, number> = { b2b: 0, ecomNuvem: 0, ecomShopee: 0, ecomAssinaturas: 0 };
    if (contasFluxo) {
      for (const conta of contasFluxo) {
        if (conta.tipo !== 'receber') continue;
        const dataRef = conta.dataPagamento || conta.dataVencimento;
        if (dataRef) {
          const d = new Date(dataRef + 'T00:00:00');
          if (d.getMonth() !== mesRef || d.getFullYear() !== anoRef) continue;
        }
        const canal = classificarContaOrigem(conta.contaOrigem);
        if (canal) liquido[canal] += Math.abs(parseCurrency(conta.valor));
      }
    }

    const bruto: Record<CanalVenda, number> = { b2b: 0, ecomNuvem: 0, ecomShopee: 0, ecomAssinaturas: 0 };
    if (movimentacoes) {
      for (const mov of movimentacoes) {
        if (mov.tipo !== 'saida' || !mov.canal) continue;
        if (mov.data) {
          const d = new Date(mov.data + 'T00:00:00');
          if (d.getMonth() !== mesRef || d.getFullYear() !== anoRef) continue;
        }
        const receita = (mov.valorUnitarioVenda || 0) * mov.quantidade;
        if (receita > 0) bruto[mov.canal] += receita;
      }
    }

    return { liquido, bruto };
  }, [contasFluxo, movimentacoes, selectedDate]);

  // Historical data from spreadsheet
  const historicoMes: FaturamentoMensal | null = FATURAMENTO_HISTORICO[selectedKey] || null;

  // Build final per-channel values
  const calculos = useMemo(() => {
    const resultado = CANAIS.map(canal => {
      let valorFinal = 0;
      let fonte: 'manual' | 'mov' | 'banco' | 'historico' | 'projetado' | 'none' = 'none';

      if (isMesAtual) {
        // Current month: manual > movimentações > banco
        const manualVal = parseCurrency(faturamentoCanais[canal.key]);
        const brutoVal = liveData.bruto[canal.canalKey];
        const liquidoVal = liveData.liquido[canal.canalKey];

        if (manualVal > 0) { valorFinal = manualVal; fonte = 'manual'; }
        else if (brutoVal > 0) { valorFinal = brutoVal; fonte = 'mov'; }
        else if (liquidoVal > 0) { valorFinal = liquidoVal; fonte = 'banco'; }
      } else if (historicoMes) {
        // Past/future month: use historical data
        const realVal = historicoMes.realizado[canal.canalKey] || 0;
        const projVal = historicoMes.projetado?.[canal.canalKey] || 0;
        
        if (realVal > 0) { valorFinal = realVal; fonte = 'historico'; }
        else if (projVal > 0) { valorFinal = projVal; fonte = 'projetado'; }
      }

      const projecaoMes = isMesAtual && diaDoMes > 0 ? (valorFinal / diaDoMes) * diasNoMes : 0;

      return { ...canal, valorFinal, fonte, projecaoMes };
    });

    const totalRealizado = resultado.reduce((a, c) => a + c.valorFinal, 0);
    const totalProjecao = resultado.reduce((a, c) => a + c.projecaoMes, 0);

    return { canais: resultado, totalRealizado, totalProjecao };
  }, [faturamentoCanais, liveData, historicoMes, isMesAtual, diaDoMes, diasNoMes]);

  // YoY comparison
  const yoyData = useMemo(() => {
    const mesAnoAnterior = format(subMonths(selectedDate, 12), 'yyyy-MM');
    const anterior = FATURAMENTO_HISTORICO[mesAnoAnterior];
    if (!anterior) return null;
    const totalAnterior = Object.values(anterior.realizado).reduce((a, b) => a + (b || 0), 0);
    if (totalAnterior <= 0) return null;
    return { totalAnterior, delta: calculos.totalRealizado > 0 ? ((calculos.totalRealizado / totalAnterior) - 1) * 100 : null };
  }, [selectedDate, calculos.totalRealizado]);

  const handleChange = (key: keyof FaturamentoCanais, value: string) => {
    onUpdate({ ...faturamentoCanais, [key]: value });
  };

  const fonteIcon = (fonte: string) => {
    switch (fonte) {
      case 'banco': return '🏦';
      case 'mov': return '📦';
      case 'manual': return '✏️';
      case 'historico': return '📊';
      case 'projetado': return '🔮';
      default: return '';
    }
  };

  const navigateMonth = (delta: number) => {
    setSelectedDate(prev => delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const monthLabel = format(selectedDate, "MMM ''yy", { locale: ptBR });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            📈 Faturamento por Canal
          </span>
          {isMesAtual && (
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Dia {diaDoMes}/{diasNoMes}
            </span>
          )}
        </CardTitle>
        {/* Month navigator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <button
            onClick={() => setSelectedDate(hoje)}
            className={cn(
              "text-xs font-semibold px-3 py-1 rounded-full transition-colors",
              isMesAtual ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            )}
          >
            {monthLabel.toUpperCase()}
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          {!isMesAtual && (
            <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1" onClick={() => setSelectedDate(hoje)}>
              <History className="h-3 w-3" /> Hoje
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className={cn(
          "grid gap-1 text-[9px] text-muted-foreground font-medium px-1",
          isMesAtual ? "grid-cols-[1fr,90px,80px,80px]" : "grid-cols-[1fr,100px]"
        )}>
          <span>Canal</span>
          <span className="text-right">{isMesAtual ? 'Realizado' : 'Valor'}</span>
          {isMesAtual && <span className="text-right">Override</span>}
          {isMesAtual && <span className="text-right">Projeção</span>}
        </div>

        {/* Canais */}
        <div className="space-y-2">
          {calculos.canais.map(canal => (
            <div key={canal.key} className={cn(
              "grid gap-1 items-center",
              isMesAtual ? "grid-cols-[1fr,90px,80px,80px]" : "grid-cols-[1fr,100px]"
            )}>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full shrink-0", canal.color)} />
                <span className="text-[10px] font-medium truncate">{canal.label}</span>
              </div>
              <span className="text-[10px] text-right font-medium">
                {canal.valorFinal > 0 ? (
                  <>{fonteIcon(canal.fonte)} {formatCurrency(canal.valorFinal)}</>
                ) : '-'}
              </span>
              {isMesAtual && (
                <div className="relative">
                  <Input
                    value={faturamentoCanais[canal.key]}
                    onChange={(e) => handleChange(canal.key, e.target.value)}
                    placeholder="R$"
                    className="h-6 text-[9px] text-right px-1"
                  />
                </div>
              )}
              {isMesAtual && (
                <span className="text-[10px] text-right text-primary font-medium">
                  {canal.projecaoMes > 0 ? formatCurrency(canal.projecaoMes) : '-'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-3">
          <div className={cn(
            "grid gap-1 items-center",
            isMesAtual ? "grid-cols-[1fr,90px,80px,80px]" : "grid-cols-[1fr,100px]"
          )}>
            <span className="text-sm font-bold">TOTAL</span>
            <span className="text-[10px] font-bold text-right">
              {calculos.totalRealizado > 0 ? formatCurrency(calculos.totalRealizado) : '-'}
            </span>
            {isMesAtual && <span />}
            {isMesAtual && (
              <span className="text-sm font-bold text-right text-primary">
                {formatCurrency(calculos.totalProjecao)}
              </span>
            )}
          </div>
        </div>

        {/* YoY */}
        {yoyData && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>vs mesmo mês ano anterior: {formatCurrency(yoyData.totalAnterior)}</span>
            {yoyData.delta !== null && (
              <span className={cn("font-bold", yoyData.delta >= 0 ? "text-green-600" : "text-red-600")}>
                {yoyData.delta >= 0 ? '+' : ''}{yoyData.delta.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        {/* Forecast reference (current month only) */}
        {isMesAtual && forecastMensal && forecastMensal > 0 && (
          <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 space-y-1">
            <p className="text-[10px] font-medium text-cyan-700 dark:text-cyan-400">
              📊 Referência Forecast (média 90d Supply)
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-[9px] text-muted-foreground">Mensal</p>
                <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">{formatCurrency(forecastMensal)}</p>
              </div>
              {forecastSemanal && (
                <div>
                  <p className="text-[9px] text-muted-foreground">Semanal</p>
                  <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">{formatCurrency(forecastSemanal)}</p>
                </div>
              )}
              {calculos.totalProjecao > 0 && forecastMensal > 0 && (
                <div>
                  <p className="text-[9px] text-muted-foreground">Δ vs Forecast</p>
                  <p className={cn("text-xs font-bold",
                    calculos.totalProjecao >= forecastMensal ? "text-green-600" : "text-amber-600"
                  )}>
                    {((calculos.totalProjecao / forecastMensal - 1) * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legenda */}
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-[9px] text-muted-foreground">
            {isMesAtual
              ? <>📦 movimentações · 🏦 banco · ✏️ override · Faltam <strong>{diasRestantes}d</strong></>
              : <>📊 realizado histórico · 🔮 projetado (planilha)</>
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
