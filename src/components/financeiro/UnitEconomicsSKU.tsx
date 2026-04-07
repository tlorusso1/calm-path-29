import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { CUSTOS_VARIAVEIS } from '@/utils/financeiro/mediasCalculator';
import { cn } from '@/lib/utils';

interface SKUData {
  nome: string;
  qtdVendida: number;
  receitaTotal: number;
  custoUnitario: number;
}

interface UnitEconomicsSKUProps {
  skus: SKUData[];
  ticketMedio: number;
  fretePorPedido: number;
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function UnitEconomicsSKU({ skus, ticketMedio, fretePorPedido }: UnitEconomicsSKUProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dados = useMemo(() => {
    if (!skus.length) return [];

    return skus
      .filter(s => s.qtdVendida > 0 && s.receitaTotal > 0)
      .map(s => {
        const precoMedio = s.receitaTotal / s.qtdVendida;
        const cp = s.custoUnitario;

        // Despesas variáveis por unidade
        const meioPgto = precoMedio * CUSTOS_VARIAVEIS.taxaCartao;
        const imposto = precoMedio * CUSTOS_VARIAVEIS.imposto;
        const devolucoes = precoMedio * CUSTOS_VARIAVEIS.devolucoes;
        // Fulfillment e embalagem rateados — simplificação: 1 pedido ≈ 1 unidade
        const fulfillment = CUSTOS_VARIAVEIS.fulfillment;
        const embalagem = CUSTOS_VARIAVEIS.embalagem;
        const frete = fretePorPedido;

        const totalVariaveis = meioPgto + imposto + devolucoes + fulfillment + embalagem + frete;
        const cmvReal = cp + totalVariaveis;
        const margemRS = precoMedio - cmvReal;
        const margemPct = margemRS / precoMedio;

        return {
          nome: s.nome,
          qtd: s.qtdVendida,
          precoMedio,
          cp,
          meioPgto,
          imposto,
          devolucoes,
          fulfillment,
          embalagem,
          frete,
          totalVariaveis,
          cmvReal,
          margemRS,
          margemPct,
        };
      })
      .sort((a, b) => b.margemPct - a.margemPct);
  }, [skus, fretePorPedido]);

  if (!dados.length) return null;

  const margemMedia = dados.reduce((s, d) => s + d.margemPct, 0) / dados.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-200 dark:border-purple-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                📦 Margem por SKU
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-1.5 py-0.5 rounded">UNIT ECON</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  margemMedia >= 0.15 ? "text-green-600" : margemMedia >= 0 ? "text-amber-600" : "text-destructive"
                )}>
                  Média {fmtPct(margemMedia)}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 font-medium">SKU</th>
                    <th className="text-right py-1 font-medium">Preço Méd.</th>
                    <th className="text-right py-1 font-medium">CP</th>
                    <th className="text-right py-1 font-medium">Variáveis</th>
                    <th className="text-right py-1 font-medium">CMV Real</th>
                    <th className="text-right py-1 font-medium">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <Collapsible key={i} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <tr className="border-b border-dashed cursor-pointer hover:bg-muted/30">
                            <td className="py-1.5 max-w-[140px] truncate" title={d.nome}>
                              {d.nome}
                              <span className="text-[9px] text-muted-foreground ml-1">({d.qtd}un)</span>
                            </td>
                            <td className="text-right py-1.5">{fmt(d.precoMedio)}</td>
                            <td className="text-right py-1.5">{fmt(d.cp)}</td>
                            <td className="text-right py-1.5 text-muted-foreground">{fmt(d.totalVariaveis)}</td>
                            <td className="text-right py-1.5 font-medium">{fmt(d.cmvReal)}</td>
                            <td className={cn(
                              "text-right py-1.5 font-bold",
                              d.margemPct >= 0.15 ? "text-green-600" : d.margemPct >= 0 ? "text-amber-600" : "text-destructive"
                            )}>
                              {fmtPct(d.margemPct)}
                            </td>
                          </tr>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={6} className="py-1 px-2">
                              <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
                                <span>Meio Pgto: {fmt(d.meioPgto)}</span>
                                <span>Imposto: {fmt(d.imposto)}</span>
                                <span>Devoluções: {fmt(d.devolucoes)}</span>
                                <span>Fulfillment: {fmt(d.fulfillment)}</span>
                                <span>Embalagem: {fmt(d.embalagem)}</span>
                                <span>Frete: {fmt(d.frete)}</span>
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[9px] text-muted-foreground">
              Frete/pedido: {fmt(fretePorPedido)} (conciliação Jadlog+Mandae) · 
              Ticket médio: {fmt(ticketMedio)} · 
              Devoluções: {fmtPct(CUSTOS_VARIAVEIS.devolucoes)}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
