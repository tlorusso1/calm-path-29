import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, FileSpreadsheet, Loader2, CheckCircle2, Link2, AlertCircle, Plus, Calendar } from 'lucide-react';
import { ContaFluxo, ContaFluxoTipo, ContaFluxoSubtipo, ContaFluxoNatureza, Fornecedor, MapeamentoDescricaoFornecedor, extrairPadraoDescricao, encontrarMapeamento, MODALIDADES_CAPITAL_GIRO } from '@/types/focus-mode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, differenceInDays, format } from 'date-fns';
import { matchFornecedor } from '@/utils/fornecedoresParser';

const BATCH_SIZE = 80; // Linhas por lote (seguro para timeout)
import { FornecedorSelect } from './FornecedorSelect';

interface ExtractedLancamento {
  descricao: string;
  valor: string;
  dataVencimento: string;
  tipo: ContaFluxoTipo;
  subtipo?: ContaFluxoSubtipo;
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
  onCreateFornecedor?: (fornecedor: Omit<Fornecedor, 'id'>) => string | void;
  onUpdateFornecedor?: (id: string, updates: Partial<Fornecedor>) => void;
  isOpen: boolean;
  onToggle: () => void;
  // Mapeamentos descrição→fornecedor
  mapeamentos?: MapeamentoDescricaoFornecedor[];
  onAddMapeamento?: (mapeamento: MapeamentoDescricaoFornecedor) => void;
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
  onCreateFornecedor,
  onUpdateFornecedor,
  isOpen,
  onToggle,
  mapeamentos = [],
  onAddMapeamento,
}: ConciliacaoSectionProps) {
  const [texto, setTexto] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ conciliados: number; novos: number; ignorados: number } | null>(null);
  const [lancamentosParaRevisar, setLancamentosParaRevisar] = useState<ExtractedLancamento[]>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  
  // Progress para lotes
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Seletores de mês/ano do extrato
  const [mesExtrato, setMesExtrato] = useState(new Date().getMonth() + 1);
  const [anoExtrato, setAnoExtrato] = useState(new Date().getFullYear());
  
  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];
  
  const anosDisponiveis = [2024, 2025, 2026, 2027];

  // Função para processar um lote
  const processarLote = async (textoLote: string, mesAno: string): Promise<ExtractedLancamento[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      console.log('🔄 Chamando extract-extrato com:', { textoLote: textoLote.substring(0, 100), mesAno });
      
      const { data, error } = await supabase.functions.invoke('extract-extrato', {
        body: { texto: textoLote, mesAno },
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      console.log('✅ Resposta extract-extrato:', { data, error });

      if (error) {
        console.error('❌ Erro na chamada:', error);
        throw error;
      }

      // Verificar estrutura de resposta
      if (!data) {
        console.warn('⚠️ Data vazia recebida');
        return [];
      }

      if (data?.error) {
        console.error('❌ Erro na resposta:', data.error);
        throw new Error(data.error);
      }

      const contas = data?.contas || [];
      console.log(`📊 ${contas.length} lançamentos extraídos`);

      return contas.map((c: any) => ({
        tipo: c.tipo || 'pagar',
        subtipo: c.subtipo,
        descricao: c.descricao || '',
        valor: c.valor || '',
        dataVencimento: c.dataVencimento || '',
        pago: true,
      } as ExtractedLancamento));
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('❌ Erro ao processar lote:', err);
      throw err;
    }
  };

  const handleProcessar = async () => {
    if (!texto.trim()) {
      toast.error('Cole o extrato bancário no campo de texto.');
      return;
    }

    const linhas = texto.split('\n').filter(l => l.trim());
    const totalLinhas = linhas.length;

    setIsProcessing(true);
    setLastResult(null);
    setLancamentosParaRevisar([]);
    setShowReviewPanel(false);
    setBatchProgress(null);

    try {
      const mesAno = `${mesExtrato}/${anoExtrato}`;
      
      // Dividir em lotes se necessário
      const lotes: string[] = [];
      for (let i = 0; i < linhas.length; i += BATCH_SIZE) {
        const loteLinhas = linhas.slice(i, i + BATCH_SIZE);
        lotes.push(loteLinhas.join('\n'));
      }

      // Mostrar progresso se múltiplos lotes
      if (lotes.length > 1) {
        toast.info(`Processando ${totalLinhas} linhas em ${lotes.length} lotes...`);
      }

      // Processar cada lote
      let todosLancamentos: ExtractedLancamento[] = [];
      
      for (let i = 0; i < lotes.length; i++) {
        setBatchProgress({ current: i + 1, total: lotes.length });
        
        try {
          const lancamentosLote = await processarLote(lotes[i], mesAno);
          todosLancamentos = [...todosLancamentos, ...lancamentosLote];
          
          // Pequena pausa entre lotes para não sobrecarregar
          if (i < lotes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err: any) {
          console.error(`Erro no lote ${i + 1}:`, err);
          if (err.message?.includes('Load failed') || err.message?.includes('timeout') || err.message?.includes('AbortError')) {
            toast.error(`⏱️ Timeout no lote ${i + 1}. Tente novamente.`);
          } else {
            toast.error(`Erro no lote ${i + 1}: ${err.message || 'Erro desconhecido'}`);
          }
          // Continuar com os lotes que já processou
          break;
        }
      }

      setBatchProgress(null);

      if (todosLancamentos.length === 0) {
        toast.warning('Nenhum lançamento encontrado no extrato.');
        return;
      }

      // Processar cada lançamento - tentar match
      const contasNaoPagas = contasExistentes.filter(c => !c.pago);
      const conciliados: { id: string; descricao: string }[] = [];
      const novos: Omit<ContaFluxo, 'id'>[] = [];
      const paraRevisar: ExtractedLancamento[] = [];
      let ignorados = 0;

      for (const lanc of todosLancamentos) {
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
          // 1. Primeiro: verificar mapeamentos salvos pelo usuário
          const fornecedorIdMapeado = encontrarMapeamento(lanc.descricao, mapeamentos);
          
          if (fornecedorIdMapeado) {
            const fornecedorMapeado = fornecedores.find(f => f.id === fornecedorIdMapeado);
            novos.push({
              tipo: lanc.tipo,
              subtipo: lanc.subtipo,
              descricao: lanc.descricao,
              valor: lanc.valor,
              dataVencimento: lanc.dataVencimento,
              pago: true,
              fornecedorId: fornecedorIdMapeado,
              categoria: fornecedorMapeado?.categoria,
              conciliado: true,
            });
          } else {
            // 2. Segundo: tentar match automático por nome/alias
            const fornecedorMatch = matchFornecedor(lanc.descricao, fornecedores);
          
            if (fornecedorMatch) {
              novos.push({
                tipo: lanc.tipo,
                subtipo: lanc.subtipo,
                descricao: lanc.descricao,
                valor: lanc.valor,
                dataVencimento: lanc.dataVencimento,
                pago: true,
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
              // Recebimento, aplicação, resgate, intercompany - adicionar direto
              novos.push({
                tipo: lanc.tipo,
                subtipo: lanc.subtipo,
                descricao: lanc.descricao,
                valor: lanc.valor,
                dataVencimento: lanc.dataVencimento,
                pago: true,
                conciliado: true,
              });
            }
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
        `${todosLancamentos.length} lançamentos: ${conciliados.length} conciliados, ${novos.length} novos` +
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
  const handleAddRevisado = (
    lanc: ExtractedLancamento, 
    fornecedorId?: string, 
    tipoOverride?: ContaFluxoTipo,
    naturezaOverride?: ContaFluxoNatureza
  ) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    const tipoFinal = tipoOverride || lanc.tipo;
    
    // Determinar natureza: override > fornecedor.naturezaPadrao > default
    let naturezaFinal: ContaFluxoNatureza | undefined = naturezaOverride;
    if (!naturezaFinal && fornecedor?.naturezaPadrao) {
      naturezaFinal = fornecedor.naturezaPadrao;
    }
    // Se fornecedor é de CPV, padrão é capitalGiro
    if (!naturezaFinal && fornecedor && MODALIDADES_CAPITAL_GIRO.includes(fornecedor.modalidade)) {
      naturezaFinal = 'capitalGiro';
    }
    
    onConciliar({
      conciliados: [],
      novos: [{
        tipo: tipoFinal,
        subtipo: lanc.subtipo,
        descricao: lanc.descricao,
        valor: lanc.valor,
        dataVencimento: lanc.dataVencimento,
        pago: true,
        fornecedorId,
        categoria: fornecedor?.categoria,
        conciliado: true,
        natureza: naturezaFinal,
      }],
      ignorados: 0,
      paraRevisar: [],
    });

    // Salvar mapeamento para uso futuro
    if (fornecedorId && onAddMapeamento) {
      const padrao = extrairPadraoDescricao(lanc.descricao);
      if (padrao.length >= 5) {
        // Verificar se já existe mapeamento para esse padrão
        const jaExiste = mapeamentos.some(m => m.padrao === padrao);
        if (!jaExiste) {
          onAddMapeamento({
            padrao,
            fornecedorId,
            criadoEm: new Date().toISOString(),
          });
        }
      }
    }
    
    // Aprender natureza padrão do fornecedor (se diferente da atual)
    if (fornecedorId && naturezaOverride && onUpdateFornecedor) {
      if (fornecedor && fornecedor.naturezaPadrao !== naturezaOverride) {
        onUpdateFornecedor(fornecedorId, { naturezaPadrao: naturezaOverride });
      }
    }

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
            {/* Seletores de Mês/Ano */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Mês do extrato:</span>
              <Select
                value={String(mesExtrato)}
                onValueChange={(v) => setMesExtrato(Number(v))}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(anoExtrato)}
                onValueChange={(v) => setAnoExtrato(Number(v))}
              >
                <SelectTrigger className="w-[90px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Cole seu extrato bancário. Datas sem ano usarão o mês/ano selecionado acima.
              </p>
              
              <Textarea
                placeholder="Cole aqui o extrato bancário (Ctrl+V)...&#10;&#10;Exemplo:&#10;30 Conta Corrente PIX ENVIADO FULANO R$ -500,00 Transfer&#10;29 Conta Corrente BOLETO PAGO FORNECEDOR R$ -1.234,56 Services"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="min-h-[150px] font-mono text-xs"
                disabled={isProcessing}
              />

              {/* Barra de progresso para lotes */}
              {batchProgress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Processando lote {batchProgress.current} de {batchProgress.total}...</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  💡 Extratos grandes são processados automaticamente em lotes.
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
                      {batchProgress ? `Lote ${batchProgress.current}/${batchProgress.total}` : 'Processando...'}
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
                     <div 
                       key={`${lanc.descricao}-${lanc.valor}-${lanc.dataVencimento}-${idx}`}
                       style={{ position: 'relative', zIndex: lancamentosParaRevisar.length - idx }}
                     >
                       <ReviewItem
                         lancamento={lanc}
                         fornecedores={fornecedores}
                         onAdd={handleAddRevisado}
                         onIgnore={handleIgnorar}
                         onCreateFornecedor={onCreateFornecedor}
                       />
                     </div>
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
  onCreateFornecedor,
}: {
  lancamento: ExtractedLancamento;
  fornecedores: Fornecedor[];
  onAdd: (lanc: ExtractedLancamento, fornecedorId?: string, tipoOverride?: ContaFluxoTipo, naturezaOverride?: ContaFluxoNatureza) => void;
  onIgnore: (lanc: ExtractedLancamento) => void;
  onCreateFornecedor?: (fornecedor: Omit<Fornecedor, 'id'>) => void;
}) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | undefined>();
  const [selectedTipo, setSelectedTipo] = useState<ContaFluxoTipo>(lancamento.tipo);
  const [selectedNatureza, setSelectedNatureza] = useState<ContaFluxoNatureza>('operacional');

  // Auto-selecionar natureza quando fornecedor muda
  const handleFornecedorChange = (id: string | undefined) => {
    setSelectedFornecedor(id);
    if (id) {
      const forn = fornecedores.find(f => f.id === id);
      if (forn) {
        // Se tem natureza padrão, usa ela
        if (forn.naturezaPadrao) {
          setSelectedNatureza(forn.naturezaPadrao);
        } else if (MODALIDADES_CAPITAL_GIRO.includes(forn.modalidade)) {
          // Se é CPV, padrão é capitalGiro
          setSelectedNatureza('capitalGiro');
        } else {
          setSelectedNatureza('operacional');
        }
      }
    }
  };

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

  const tipoLabels: Record<ContaFluxoTipo, { label: string; emoji: string }> = {
    pagar: { label: 'A Pagar', emoji: '🔴' },
    receber: { label: 'A Receber', emoji: '🟢' },
    intercompany: { label: 'Intercompany', emoji: '🔁' },
    aplicacao: { label: 'Aplicação', emoji: '📈' },
    resgate: { label: 'Resgate', emoji: '💰' },
    cartao: { label: 'Cartão', emoji: '💳' },
  };

  return (
    <div className="p-2 bg-background rounded border overflow-visible">
      {/* Linha 1: Descrição + Valor */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium leading-tight flex-1 min-w-0">{lancamento.descricao}</p>
        <p className="text-xs font-medium shrink-0">{valorFormatado}</p>
      </div>
      
      {/* Linha 2: Data + Tipo + Natureza + Fornecedor + Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground shrink-0">{dataFormatada}</span>
        
        {/* Seletor de Tipo */}
        <Select value={selectedTipo} onValueChange={(v) => setSelectedTipo(v as ContaFluxoTipo)}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(tipoLabels).map(([tipo, { label, emoji }]) => (
              <SelectItem key={tipo} value={tipo} className="text-xs">
                {emoji} {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Seletor de Natureza (apenas para tipo pagar) */}
        {selectedTipo === 'pagar' && (
          <Select value={selectedNatureza} onValueChange={(v) => setSelectedNatureza(v as ContaFluxoNatureza)}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operacional" className="text-xs">⚙️ Operac.</SelectItem>
              <SelectItem value="capitalGiro" className="text-xs">📦 Estoque</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Seletor de Fornecedor (apenas para tipo pagar) */}
         {selectedTipo === 'pagar' && (
           <div className="flex-1 min-w-0 relative">
             <FornecedorSelect
               fornecedores={fornecedores}
               value={selectedFornecedor}
               onChange={handleFornecedorChange}
               placeholder="Fornecedor..."
               descricaoSugerida={lancamento.descricao}
               onCreateNew={onCreateFornecedor}
             />
           </div>
         )}
        
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 shrink-0"
          onClick={() => onAdd(lancamento, selectedFornecedor, selectedTipo, selectedTipo === 'pagar' ? selectedNatureza : undefined)}
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Add</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground shrink-0"
          onClick={() => onIgnore(lancamento)}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
