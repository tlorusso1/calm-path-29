import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConciliacaoSectionProps {
  onAddContas: (contas: Omit<ContaFluxo, 'id'>[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ConciliacaoSection({
  onAddContas,
  isOpen,
  onToggle,
}: ConciliacaoSectionProps) {
  const [texto, setTexto] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number } | null>(null);

  const handleProcessar = async () => {
    if (!texto.trim()) {
      toast.error('Cole o extrato bancário no campo de texto.');
      return;
    }

    setIsProcessing(true);
    setLastResult(null);

    try {
      // Detecta mês/ano do extrato se possível
      const hoje = new Date();
      const mesAno = `${hoje.getMonth() + 1}/${hoje.getFullYear()}`;

      const { data, error } = await supabase.functions.invoke('extract-extrato', {
        body: { texto, mesAno }
      });

      if (error) {
        console.error('Error extracting extrato:', error);
        toast.error('Erro ao processar extrato. Tente novamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const contas = data?.contas || [];

      if (contas.length === 0) {
        toast.warning('Nenhum lançamento encontrado no extrato.');
        return;
      }

      // Adiciona todas as contas processadas
      const contasParaAdicionar = contas.map((c: any) => ({
        tipo: c.tipo || 'pagar',
        descricao: c.descricao || '',
        valor: c.valor || '',
        dataVencimento: c.dataVencimento || '',
        pago: true, // Já foram realizadas
      }));

      onAddContas(contasParaAdicionar);
      setLastResult({ count: contas.length });
      setTexto('');
      toast.success(`${contas.length} lançamentos importados!`);

    } catch (err) {
      console.error('Error processing extrato:', err);
      toast.error('Erro ao processar extrato.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                📊 Conciliação Bancária
              </span>
              <div className="flex items-center gap-2">
                {lastResult && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {lastResult.count} importados
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Cole seu extrato bancário abaixo (do Itaú, Mercado Pago, etc.). 
                O sistema processará os lançamentos e os adicionará ao histórico.
              </p>
              
              <Textarea
                placeholder="Cole aqui o extrato bancário (Ctrl+V)...&#10;&#10;Exemplo:&#10;30 Conta Corrente PIX ENVIADO FULANO R$ -500,00 Transfer&#10;29 Conta Corrente BOLETO PAGO FORNECEDOR R$ -1.234,56 Services"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="min-h-[150px] font-mono text-xs"
                disabled={isProcessing}
              />

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  💡 Aceita formato tabular de extratos bancários. Transferências entre contas próprias serão ignoradas.
                </p>
                
                <Button
                  size="sm"
                  onClick={handleProcessar}
                  disabled={!texto.trim() || isProcessing}
                  className="gap-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-3 w-3" />
                      Processar Extrato
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
