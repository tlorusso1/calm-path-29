import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Zap, Info, Calculator } from 'lucide-react';
import { CustosFixosDetalhados, ContaFluxo } from '@/types/focus-mode';
import { gerarContasFixas } from '@/utils/gerarContasFixas';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GerarContasFixasButtonProps {
  custosFixos: CustosFixosDetalhados;
  contasExistentes: ContaFluxo[];
  adsBase: number;
  faturamentoMesAnterior: string;
  onFaturamentoChange: (value: string) => void;
  onGerarContas: (novasContas: Omit<ContaFluxo, 'id'>[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function GerarContasFixasButton({
  custosFixos,
  contasExistentes,
  adsBase,
  faturamentoMesAnterior,
  onFaturamentoChange,
  onGerarContas,
  isOpen,
  onToggle,
}: GerarContasFixasButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const mesAtual = format(new Date(), 'MMMM', { locale: ptBR });
  const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
  
  // Parse faturamento
  const fatAnterior = useMemo(() => {
    const cleaned = faturamentoMesAnterior.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }, [faturamentoMesAnterior]);
  
  // Calcular impostos estimados
  const impostosEstimados = fatAnterior * 0.16;
  const parcelaImposto = impostosEstimados / 4;
  
  // Preview: quantas contas serão geradas
  const preview = useMemo(() => {
    const result = gerarContasFixas(
      custosFixos,
      contasExistentes,
      fatAnterior,
      adsBase
    );
    return result;
  }, [custosFixos, contasExistentes, fatAnterior, adsBase]);
  
  const handleGerar = () => {
    if (preview.contasGeradas.length === 0) {
      toast.info('Nenhuma conta nova para gerar. Todas já existem.');
      return;
    }
    
    setIsGenerating(true);
    
    // Simular delay para feedback visual
    setTimeout(() => {
      onGerarContas(preview.contasGeradas);
      toast.success(`${preview.contasGeradas.length} contas geradas para ${mesCapitalizado}!`);
      setIsGenerating(false);
    }, 300);
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-primary" />
                Gerar Contas Fixas do Mês
              </span>
              <div className="flex items-center gap-2">
                {preview.contasGeradas.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {preview.contasGeradas.length} pendentes
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Gera automaticamente as contas a pagar baseadas nos custos fixos cadastrados.
              Contas já existentes não serão duplicadas.
            </p>
            
            {/* Input: Faturamento Mês Anterior */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Base de Impostos (Faturamento Mês Anterior)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>O faturamento do mês anterior é usado para calcular os impostos do mês atual (DAS + DARF = ~16%).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="140.000,00"
                  value={faturamentoMesAnterior}
                  onChange={(e) => onFaturamentoChange(e.target.value)}
                  className="pl-10 text-right font-medium"
                />
              </div>
              
              {fatAnterior > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Impostos estimados (16%): <span className="font-medium text-foreground">
                      {impostosEstimados.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </p>
                  <p>
                    → 4 parcelas de <span className="font-medium">
                      {parcelaImposto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span> cada
                  </p>
                </div>
              )}
            </div>
            
            {/* Preview */}
            {preview.contasGeradas.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-medium">Serão geradas:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {Object.entries(
                    preview.contasGeradas.reduce((acc, c) => {
                      const categoria = c.descricao.split(':')[0];
                      acc[categoria] = (acc[categoria] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([cat, count]) => (
                    <li key={cat}>{count}x {cat}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {preview.contasJaExistentes > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {preview.contasJaExistentes} conta(s) já existem e não serão duplicadas.
              </p>
            )}
            
            {/* Botão */}
            <Button
              onClick={handleGerar}
              disabled={preview.contasGeradas.length === 0 || isGenerating}
              className="w-full gap-2"
              variant={preview.contasGeradas.length > 0 ? 'default' : 'secondary'}
            >
              <Zap className="h-4 w-4" />
              {isGenerating 
                ? 'Gerando...' 
                : preview.contasGeradas.length > 0
                  ? `Gerar ${preview.contasGeradas.length} Contas de ${mesCapitalizado}`
                  : 'Todas as contas já existem'
              }
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
