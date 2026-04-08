import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContaFluxo, MovimentacaoEstoque, CanalVenda } from '@/types/focus-mode';

interface FaturamentoCanais {
  b2b: string;
  ecomNuvem: string;
  ecomShopee: string;
  ecomAssinaturas: string;
}

interface FaturamentoCanaisCardProps {
  faturamentoCanais: FaturamentoCanais;
  onUpdate: (canais: FaturamentoCanais) => void;
  receitaBrutaMovimentacoes?: number;
  contasFluxo?: ContaFluxo[];
  movimentacoes?: MovimentacaoEstoque[];
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
  { key: 'ecomAssinaturas', canalKey: 'ecomAssinaturas', label: 'ECOM-ASSINATURAS', color: 'bg-green-500' },
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
  receitaBrutaMovimentacoes,
  contasFluxo,
  movimentacoes,
}: FaturamentoCanaisCardProps) {
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaDoMes;
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Banco (líquido) por canal
  const liquidoPorCanal = useMemo(() => {
    const result: Record<CanalVenda, number> = { b2b: 0, ecomNuvem: 0, ecomShopee: 0, ecomAssinaturas: 0 };
    if (!contasFluxo) return result;
    for (const conta of contasFluxo) {
      if (conta.tipo !== 'receber') continue;
      const dataRef = conta.dataPagamento || conta.dataVencimento;
      if (dataRef) {
        const d = new Date(dataRef + 'T00:00:00');
        if (d.getMonth() !== mesAtual || d.getFullYear() !== anoAtual) continue;
      }
      const canal = classificarContaOrigem(conta.contaOrigem);
      if (canal) {
        result[canal] += Math.abs(parseCurrency(conta.valor));
      }
    }
    return result;
  }, [contasFluxo, mesAtual, anoAtual]);

  // Movimentações (bruto) por canal
  const brutoPorCanal = useMemo(() => {
    const result: Record<CanalVenda, number> = { b2b: 0, ecomNuvem: 0, ecomShopee: 0, ecomAssinaturas: 0 };
    if (!movimentacoes) return result;
    for (const mov of movimentacoes) {
      if (mov.tipo !== 'saida' || !mov.canal) continue;
      if (mov.data) {
        const d = new Date(mov.data + 'T00:00:00');
        if (d.getMonth() !== mesAtual || d.getFullYear() !== anoAtual) continue;
      }
      const receita = (mov.valorUnitarioVenda || 0) * mov.quantidade;
      if (receita > 0) {
        result[mov.canal] += receita;
      }
    }
    return result;
  }, [movimentacoes, mesAtual, anoAtual]);

  // Cálculos com prioridade: manual > movimentações > banco
  const calculos = useMemo(() => {
    const resultado = CANAIS.map(canal => {
      const manualVal = parseCurrency(faturamentoCanais[canal.key]);
      const brutoVal = brutoPorCanal[canal.canalKey];
      const liquidoVal = liquidoPorCanal[canal.canalKey];

      let valorFinal: number;
      let fonte: 'manual' | 'mov' | 'banco' | 'none';

      if (manualVal > 0) {
        valorFinal = manualVal;
        fonte = 'manual';
      } else if (brutoVal > 0) {
        valorFinal = brutoVal;
        fonte = 'mov';
      } else if (liquidoVal > 0) {
        valorFinal = liquidoVal;
        fonte = 'banco';
      } else {
        valorFinal = 0;
        fonte = 'none';
      }

      const projecaoMes = diaDoMes > 0 ? (valorFinal / diaDoMes) * diasNoMes : 0;

      return { ...canal, valorFinal, fonte, projecaoMes };
    });

    const totalRealizado = resultado.reduce((a, c) => a + c.valorFinal, 0);
    const totalProjecao = resultado.reduce((a, c) => a + c.projecaoMes, 0);

    return { canais: resultado, totalRealizado, totalProjecao };
  }, [faturamentoCanais, brutoPorCanal, liquidoPorCanal, diaDoMes, diasNoMes]);

  const handleChange = (key: keyof FaturamentoCanais, value: string) => {
    onUpdate({ ...faturamentoCanais, [key]: value });
  };

  const fonteIcon = (fonte: string) => {
    if (fonte === 'banco') return '🏦';
    if (fonte === 'mov') return '📦';
    if (fonte === 'manual') return '✏️';
    return '';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            📈 Faturamento por Canal
          </span>
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Dia {diaDoMes}/{diasNoMes}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-[1fr,90px,80px,80px] gap-1 text-[9px] text-muted-foreground font-medium px-1">
          <span>Canal</span>
          <span className="text-right">Realizado</span>
          <span className="text-right">Override</span>
          <span className="text-right">Projeção</span>
        </div>

        {/* Canais */}
        <div className="space-y-2">
          {calculos.canais.map(canal => (
            <div key={canal.key} className="grid grid-cols-[1fr,90px,80px,80px] gap-1 items-center">
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full shrink-0", canal.color)} />
                <span className="text-[10px] font-medium truncate">{canal.label}</span>
              </div>
              <span className="text-[10px] text-right font-medium">
                {canal.valorFinal > 0 ? (
                  <>{fonteIcon(canal.fonte)} {formatCurrency(canal.valorFinal)}</>
                ) : '-'}
              </span>
              <div className="relative">
                <Input
                  value={faturamentoCanais[canal.key]}
                  onChange={(e) => handleChange(canal.key, e.target.value)}
                  placeholder="R$"
                  className="h-6 text-[9px] text-right px-1"
                />
              </div>
              <span className="text-[10px] text-right text-primary font-medium">
                {canal.projecaoMes > 0 ? formatCurrency(canal.projecaoMes) : '-'}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-[1fr,90px,80px,80px] gap-1 items-center">
            <span className="text-sm font-bold">TOTAL</span>
            <span className="text-[10px] font-bold text-right">
              {calculos.totalRealizado > 0 ? formatCurrency(calculos.totalRealizado) : '-'}
            </span>
            <span />
            <span className="text-sm font-bold text-right text-primary">
              {formatCurrency(calculos.totalProjecao)}
            </span>
          </div>
        </div>

        {/* Legenda */}
        <div className="bg-muted/50 rounded-lg p-2 space-y-1">
          {receitaBrutaMovimentacoes && receitaBrutaMovimentacoes > 0 && (
            <p className="text-[10px] text-muted-foreground">
              📦 <strong>Receita Supply (total):</strong> {formatCurrency(receitaBrutaMovimentacoes)}
            </p>
          )}
          <p className="text-[9px] text-muted-foreground">
            📦 movimentações · 🏦 banco · ✏️ override manual · Faltam <strong>{diasRestantes}d</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
