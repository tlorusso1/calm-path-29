import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CUSTOS_VARIAVEIS } from '@/utils/financeiro/mediasCalculator';

interface CMVGerencialCardProps {
  receitaBruta: number;
  cmvProduto: number;
  ticketMedio: number;
  impostoPercentual: number;
  fulfillmentPorPedido?: number;
  materiaisPorPedido?: number;
  fretePorPedido?: number;
  onConfigChange?: (config: {
    fulfillmentPorPedido: number;
    materiaisPorPedido: number;
  }) => void;
}

function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(valor: number): string {
  return `${(valor * 100).toFixed(1)}%`;
}

export function CMVGerencialCard({
  receitaBruta,
  cmvProduto,
  ticketMedio,
  impostoPercentual,
  fulfillmentPorPedido: fulfillmentInit = CUSTOS_VARIAVEIS.fulfillment,
  materiaisPorPedido: materiaisInit = CUSTOS_VARIAVEIS.embalagem,
  fretePorPedido = 0,
  onConfigChange,
}: CMVGerencialCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState(fulfillmentInit);
  const [materiais, setMateriais] = useState(materiaisInit);

  const calculo = useMemo(() => {
    if (receitaBruta <= 0) return null;

    const impostos = receitaBruta * impostoPercentual;
    const devolucoesValor = receitaBruta * CUSTOS_VARIAVEIS.devolucoes;
    const numPedidos = ticketMedio > 0 ? receitaBruta / ticketMedio : 0;
    const fulfillmentTotal = numPedidos * fulfillment;
    const materiaisTotal = numPedidos * materiais;
    const freteTotal = numPedidos * fretePorPedido;

    const cmvGerencialTotal = cmvProduto + impostos + devolucoesValor + fulfillmentTotal + materiaisTotal + freteTotal;
    const margemGerencial = (receitaBruta - cmvGerencialTotal) / receitaBruta;

    return {
      impostos,
      devolucoesValor,
      numPedidos: Math.round(numPedidos),
      fulfillmentTotal,
      materiaisTotal,
      freteTotal,
      cmvGerencialTotal,
      margemGerencial,
    };
  }, [receitaBruta, cmvProduto, ticketMedio, impostoPercentual, fulfillment, materiais, fretePorPedido]);

  const handleConfigUpdate = (field: string, value: number) => {
    const newConfig = {
      fulfillmentPorPedido: fulfillment,
      materiaisPorPedido: materiais,
      [field]: value,
    };
    onConfigChange?.(newConfig);
  };

  if (!calculo) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            <Calculator className="h-4 w-4 inline mr-1" />
            CMV Gerencial: importe movimentações no Supply para calcular
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                🧠 CMV Real (Unit Economics)
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-1.5 py-0.5 rounded">GERENCIAL</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  calculo.margemGerencial >= 0.15 ? "text-green-600" : 
                  calculo.margemGerencial >= 0 ? "text-amber-600" : "text-destructive"
                )}>
                  Margem {formatPercent(calculo.margemGerencial)}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-medium text-green-600 border-b pb-1">
                <span>Receita Bruta</span>
                <span>{formatCurrency(receitaBruta)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground pl-2">
                <span>(-) Custo Produto (CP)</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/70">({formatPercent(cmvProduto / receitaBruta)})</span>
                  {formatCurrency(-cmvProduto)}
                </span>
              </div>

              <p className="text-[9px] font-medium text-muted-foreground pl-2 pt-1 uppercase">Despesas Variáveis:</p>

              <div className="flex justify-between text-muted-foreground pl-4">
                <span>Impostos</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/70">({formatPercent(impostoPercentual)})</span>
                  {formatCurrency(-calculo.impostos)}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground pl-4">
                <span>Devoluções/Reembolsos</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/70">({formatPercent(CUSTOS_VARIAVEIS.devolucoes)})</span>
                  {formatCurrency(-calculo.devolucoesValor)}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground pl-4">
                <span>Fulfillment ({calculo.numPedidos} ped.)</span>
                <span>{formatCurrency(-calculo.fulfillmentTotal)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground pl-4">
                <span>Embalagem ({calculo.numPedidos} ped.)</span>
                <span>{formatCurrency(-calculo.materiaisTotal)}</span>
              </div>

              {calculo.freteTotal > 0 && (
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Frete ({calculo.numPedidos} ped.)</span>
                  <span>{formatCurrency(-calculo.freteTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-[10px] text-muted-foreground/60 pl-4 italic">
                <span>Taxa cartão</span>
                <span>já descontada no extrato</span>
              </div>

              <div className={cn(
                "flex justify-between font-bold p-2 rounded-lg border mt-2",
                calculo.margemGerencial >= 0.15 
                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700" 
                  : calculo.margemGerencial >= 0
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-700"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700"
              )}>
                <span>= MARGEM DE CONTRIBUIÇÃO</span>
                <span>{formatCurrency(receitaBruta - calculo.cmvGerencialTotal)} ({formatPercent(calculo.margemGerencial)})</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">Parâmetros ajustáveis</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Fulfillment/ped</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={fulfillment.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setFulfillment(v);
                      handleConfigUpdate('fulfillmentPorPedido', v);
                    }}
                    className="h-7 text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Embalagem/ped</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={materiais.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setMateriais(v);
                      handleConfigUpdate('materiaisPorPedido', v);
                    }}
                    className="h-7 text-xs text-right"
                  />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Ticket médio: {formatCurrency(ticketMedio)} · Impostos: {formatPercent(impostoPercentual)} · 
                Frete/ped: {formatCurrency(fretePorPedido)} (conciliação) · 
                Devoluções: {formatPercent(CUSTOS_VARIAVEIS.devolucoes)} ·
                Taxa cartão: já descontada no extrato bancário
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
