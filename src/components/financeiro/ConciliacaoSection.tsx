import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileSpreadsheet, Loader2, CheckCircle2, Link2, AlertCircle, Plus } from 'lucide-react';
import { ContaFluxo, Fornecedor } from '@/types/focus-mode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, differenceInDays, format } from 'date-fns';
import { matchFornecedor } from '@/utils/fornecedoresParser';
import { FornecedorSelect } from './FornecedorSelect';

interface ExtractedLancamento {
  descricao: string;
  valor: string;
  dataVencimento: string;
  tipo: 'pagar' | 'receber';
  pago?: boolean;
  // Match info
  matchedContaId?: string;
  matchedConta?: ContaFluxo;
  fornecedorMatch?: Fornecedor;
  needsReview?: boolean;
}

interface ConciliacaoResult {
  conciliados: { id: string; descricao: string }[];
  novos: Omit<ContaFluxo, 'id'>[];
  ignorados: number;
  paraRevisar: ExtractedLancamento[];
}

interface ConciliacaoSectionProps {
  contasExistentes: ContaFluxo[];
  fornecedores: Fornecedor[];
  onConciliar: (result: ConciliacaoResult) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Match inteligente: valor ± R$0.01 E data ± 1 dia
function encontrarMatch(
  lancamento: { valor: string; dataVencimento: string; tipo: string },
  contas: ContaFluxo[]
): ContaFluxo | null {
  const valorLanc = parseValorFlexivel(lancamento.valor);
  let dataLanc: Date;
  try {
    dataLanc = parseISO(lancamento.dataVencimento);
  } catch {
    return null;
  }
  
  return contas.find(conta => {
    if (conta.pago) return false;
    if (conta.tipo !== lancamento.tipo) return false;
    
    const valorConta = parseValorFlexivel(conta.valor);
    let dataConta: Date;
    try {
      dataConta = parseISO(conta.dataVencimento);
    } catch {
      return false;
    }
    
    // Tolerância: ± R$0,01 e ± 1 dia
    const valorMatch = Math.abs(valorLanc - valorConta) <= 0.01;
    const diffDias = Math.abs(differenceInDays(dataLanc, dataConta));
    const dataMatch = diffDias <= 1;
    
    return valorMatch && dataMatch;
  }) || null;
}

export function ConciliacaoSection({
  contasExistentes,
  fornecedores,
  onConciliar,
  isOpen,
  onToggle,
}: ConciliacaoSectionProps) {
  const [texto, setTexto] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ conciliados: number; novos: number; ignorados: number } | null>(null);
  const [lancamentosParaRevisar, setLancamentosParaRevisar] = useState<ExtractedLancamento[]>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const handleProcessar = async () => {
    if (!texto.trim()) {
      toast.error('Cole o extrato bancário no campo de texto.');
      return;
    }

    setIsProcessing(true);
    setLastResult(null);
    setLancamentosParaRevisar([]);
    setShowReviewPanel(false);

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

      const lancamentos: ExtractedLancamento[] = (data?.contas || []).map((c: any) => ({
        tipo: c.tipo || 'pagar',
        descricao: c.descricao || '',
        valor: c.valor || '',
        dataVencimento: c.dataVencimento || '',
        pago: true,
      }));

      if (lancamentos.length === 0) {
        toast.warning('Nenhum lançamento encontrado no extrato.');
        return;
      }

      // Processar cada lançamento - tentar match
      const contasNaoPagas = contasExistentes.filter(c => !c.pago);
      const conciliados: { id: string; descricao: string }[] = [];
      const novos: Omit<ContaFluxo, 'id'>[] = [];
      const paraRevisar: ExtractedLancamento[] = [];
      let ignorados = 0;

      for (const lanc of lancamentos) {
        // Tentar match com contas existentes
        const match = encontrarMatch(lanc, contasNaoPagas);
        
        if (match) {
          // Match encontrado - marcar como conciliado
          conciliados.push({ id: match.id, descricao: lanc.descricao });
          // Remover da lista para não fazer match duplo
          const idx = contasNaoPagas.findIndex(c => c.id === match.id);
          if (idx >= 0) contasNaoPagas.splice(idx, 1);
        } else {
          // Sem match - tentar identificar fornecedor
          const fornecedorMatch = matchFornecedor(lanc.descricao, fornecedores);
          
          if (fornecedorMatch) {
            // Adicionar como novo com fornecedor identificado
            novos.push({
              ...lanc,
              fornecedorId: fornecedorMatch.id,
              categoria: fornecedorMatch.categoria,
              conciliado: true,
            });
          } else if (lanc.tipo === 'pagar') {
            // Conta a pagar sem fornecedor - precisa de revisão
            paraRevisar.push({
              ...lanc,
              needsReview: true,
            });
          } else {
            // Recebimento - adicionar direto
            novos.push({
              ...lanc,
              conciliado: true,
            });
          }
        }
      }

      // Se tem itens para revisar, mostrar painel
      if (paraRevisar.length > 0) {
        setLancamentosParaRevisar(paraRevisar);
        setShowReviewPanel(true);
      }

      // Executar conciliação
      onConciliar({
        conciliados,
        novos,
        ignorados,
        paraRevisar,
      });

      setLastResult({ 
        conciliados: conciliados.length, 
        novos: novos.length, 
        ignorados 
      });
      
      if (paraRevisar.length === 0) {
        setTexto('');
      }
      
      toast.success(
        `${lancamentos.length} lançamentos: ${conciliados.length} conciliados, ${novos.length} novos` +
        (paraRevisar.length > 0 ? `, ${paraRevisar.length} para revisar` : '')
      );

    } catch (err) {
      console.error('Error processing extrato:', err);
      toast.error('Erro ao processar extrato.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler para adicionar lançamento revisado
  const handleAddRevisado = (lanc: ExtractedLancamento, fornecedorId?: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    
    onConciliar({
      conciliados: [],
      novos: [{
        tipo: lanc.tipo,
        descricao: lanc.descricao,
        valor: lanc.valor,
        dataVencimento: lanc.dataVencimento,
        pago: true,
        fornecedorId,
        categoria: fornecedor?.categoria,
        conciliado: true,
      }],
      ignorados: 0,
      paraRevisar: [],
    });

    // Remover da lista de revisão
    setLancamentosParaRevisar(prev => prev.filter(l => l !== lanc));
    toast.success('Lançamento adicionado!');
  };

  // Ignorar lançamento
  const handleIgnorar = (lanc: ExtractedLancamento) => {
    setLancamentosParaRevisar(prev => prev.filter(l => l !== lanc));
    toast.info('Lançamento ignorado');
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
                    {lastResult.conciliados} conc. / {lastResult.novos} novos
                  </Badge>
                )}
                {lancamentosParaRevisar.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 border-yellow-500 text-yellow-600">
                    <AlertCircle className="h-3 w-3" />
                    {lancamentosParaRevisar.length} revisar
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
                Cole seu extrato bancário. O sistema faz match automático com contas existentes (± R$0,01, ± 1 dia).
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
                  💡 Matches automáticos marcam contas como pagas. Novos são adicionados ao histórico.
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

            {/* Painel de Revisão */}
            {showReviewPanel && lancamentosParaRevisar.length > 0 && (
              <div className="space-y-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {lancamentosParaRevisar.length} lançamentos precisam de revisão
                </p>
                
                <div className="space-y-2">
                  {lancamentosParaRevisar.map((lanc, idx) => (
                    <ReviewItem
                      key={idx}
                      lancamento={lanc}
                      fornecedores={fornecedores}
                      onAdd={handleAddRevisado}
                      onIgnore={handleIgnorar}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Componente para item de revisão
function ReviewItem({
  lancamento,
  fornecedores,
  onAdd,
  onIgnore,
}: {
  lancamento: ExtractedLancamento;
  fornecedores: Fornecedor[];
  onAdd: (lanc: ExtractedLancamento, fornecedorId?: string) => void;
  onIgnore: (lanc: ExtractedLancamento) => void;
}) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | undefined>();

  const valorFormatado = useMemo(() => {
    const num = parseValorFlexivel(lancamento.valor);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [lancamento.valor]);

  const dataFormatada = useMemo(() => {
    try {
      return format(parseISO(lancamento.dataVencimento), 'dd/MM');
    } catch {
      return lancamento.dataVencimento;
    }
  }, [lancamento.dataVencimento]);

  return (
    <div className="flex flex-col gap-2 p-2 bg-background rounded border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{lancamento.descricao}</p>
          <p className="text-[10px] text-muted-foreground">
            {dataFormatada} • {valorFormatado}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <FornecedorSelect
            fornecedores={fornecedores}
            value={selectedFornecedor}
            onChange={(id) => setSelectedFornecedor(id)}
            placeholder="Selecionar fornecedor..."
            descricaoSugerida={lancamento.descricao}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => onAdd(lancamento, selectedFornecedor)}
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => onIgnore(lancamento)}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}
