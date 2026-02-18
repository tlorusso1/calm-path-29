import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
import { parseISO, differenceInDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { matchFornecedor } from '@/utils/fornecedoresParser';

// Auto-atribuir fornecedor para receitas baseado na origem bancária
// Retorna dados hardcoded de categoria/modalidade para não depender do CSV estar correto
function autoAtribuirFornecedorReceita(
  descricao: string,
  fornecedores: Fornecedor[]
): { fornecedorId?: string; categoria: string; modalidade: string; grupo: string } | null {
  const desc = descricao.toUpperCase();

  if (desc.includes('ITAUBBA') || desc.includes('ITAU BBA')) {
    const f = fornecedores.find(f => 
      f.nome === 'NICE FOODS ECOMMERCE LTDA' && f.modalidade === 'RECEITAS'
    );
    return {
      fornecedorId: f?.id,
      categoria: 'Clientes Nacionais (B2C)',
      modalidade: 'RECEITAS',
      grupo: 'Receitas Diretas',
    };
  }

  if (desc.includes('ITAU') || desc.includes('CONTA CORRENTE')) {
    const f = fornecedores.find(f => 
      f.nome === 'NICE FOODS LTDA' && f.modalidade === 'RECEITAS'
    );
    return {
      fornecedorId: f?.id,
      categoria: 'Clientes Nacionais (B2B)',
      modalidade: 'RECEITAS',
      grupo: 'Receitas Diretas',
    };
  }

  return null;
}

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
  conciliados: { id: string; descricao: string; dataPagamento?: string; lancamentoConciliadoId?: string }[];
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

// Extrai nomes próprios (4+ letras) e verifica se há ao menos 1 em comum
function extrairNomesProprios(descA: string, descB: string): boolean {
  const extrair = (s: string) => {
    const tokens = s.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/);
    return new Set(tokens.filter(t => t.length >= 4));
  };
  const nomesA = extrair(descA);
  const nomesB = extrair(descB);
  for (const n of nomesA) {
    if (nomesB.has(n)) return true;
  }
  return false;
}

// Match inteligente: valor ± R$0.01 E data ± 5 dias (pagar) / ± 1 dia (receber)
// ignorarPagas: se true, ignora contas já baixadas (padrão); se false, busca só nas pagas
function encontrarMatch(
  lancamento: { valor: string; dataVencimento: string; tipo: string },
  contas: ContaFluxo[],
  apenasNaoPagas: boolean = true
): ContaFluxo | null {
  const valorLanc = parseValorFlexivel(lancamento.valor);
  let dataLanc: Date;
  try {
    dataLanc = parseISO(lancamento.dataVencimento);
  } catch {
    return null;
  }
  
  const tiposSaida: string[] = ['pagar', 'cartao'];
  const lancEhSaida = tiposSaida.includes(lancamento.tipo);
  
  return contas.find(conta => {
    if (apenasNaoPagas && conta.pago) return false;
    if (!apenasNaoPagas && !conta.pago) return false;
    // Para saídas: pagar e cartao são equivalentes
    const contaEhSaida = tiposSaida.includes(conta.tipo);
    if (lancEhSaida && contaEhSaida) {
      // OK - ambos são saída
    } else if (conta.tipo !== lancamento.tipo) {
      return false;
    }
    
    const valorConta = parseValorFlexivel(conta.valor);
    let dataConta: Date;
    try {
      dataConta = parseISO(conta.dataVencimento);
    } catch {
      return false;
    }
    
    // Tolerância: ± R$0,01 no valor; ± 5 dias para pagar, ± 1 dia para demais
    const valorMatch = Math.abs(valorLanc - valorConta) <= 0.01;
    const diffDias = Math.abs(differenceInDays(dataLanc, dataConta));
    const toleranciaDias = lancEhSaida ? 5 : 1;
    const dataMatch = diffDias <= toleranciaDias;
    
    return valorMatch && dataMatch;
  }) || null;
}

// Normaliza descrição para comparação fuzzy
function normalizarDescricao(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Similaridade simples: quantos tokens em comum / total de tokens
function calcularSimilaridade(a: string, b: string): number {
  const tokensA = new Set(normalizarDescricao(a).split(' ').filter(t => t.length >= 3));
  const tokensB = new Set(normalizarDescricao(b).split(' ').filter(t => t.length >= 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let comuns = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) comuns++;
  }
  return comuns / Math.max(tokensA.size, tokensB.size);
}

// Match por canal: SHPP/SHOPEE no extrato → vincular a conta aberta SHPP/SHOPEE (receber)
function encontrarMatchPorCanal(
  lancamento: { descricao: string; tipo: string },
  contas: ContaFluxo[]
): ContaFluxo | null {
  if (!/SHPP|SHOPEE/i.test(lancamento.descricao)) return null;
  
  return contas.find(c => {
    if (c.pago) return false;
    if (c.tipo !== 'receber') return false;
    return /SHPP|SHOPEE/i.test(c.descricao);
  }) || null;
}

// Match por descrição similar: mesmo tipo de fluxo, descrição ≥50% similar, data ± 5 dias
function encontrarMatchPorDescricao(
  lancamento: { valor: string; dataVencimento: string; tipo: string; descricao: string },
  contas: ContaFluxo[]
): ContaFluxo | null {
  const valorLanc = parseValorFlexivel(lancamento.valor);
  let dataLanc: Date;
  try { dataLanc = parseISO(lancamento.dataVencimento); } catch { return null; }
  
  const tiposSaida: string[] = ['pagar', 'cartao'];
  const lancEhSaida = tiposSaida.includes(lancamento.tipo);
  
  let melhorMatch: ContaFluxo | null = null;
  let melhorScore = 0;
  
  for (const conta of contas) {
    if (conta.pago) continue;
    const contaEhSaida = tiposSaida.includes(conta.tipo);
    if (lancEhSaida && !contaEhSaida) continue;
    if (!lancEhSaida && conta.tipo !== lancamento.tipo) continue;
    
    let dataConta: Date;
    try { dataConta = parseISO(conta.dataVencimento); } catch { continue; }
    
    const diffDias = Math.abs(differenceInDays(dataLanc, dataConta));
    if (diffDias > 7) continue;
    
    const similaridade = calcularSimilaridade(lancamento.descricao, conta.descricao);
    const nomeMatch = extrairNomesProprios(lancamento.descricao, conta.descricao);
    if (similaridade < 0.3 && !nomeMatch) continue;
    
    const score = similaridade - (diffDias * 0.05);
    if (score > melhorScore) {
      melhorScore = score;
      melhorMatch = conta;
    }
  }
  
  return melhorMatch;
}

// Match projeção: valor ± 30% E mesma semana
function encontrarMatchProjecao(
  lancamento: { valor: string; dataVencimento: string; tipo: string },
  contas: ContaFluxo[]
): ContaFluxo | null {
  if (lancamento.tipo !== 'receber') return null;
  
  const valorLanc = parseValorFlexivel(lancamento.valor);
  let dataLanc: Date;
  try {
    dataLanc = parseISO(lancamento.dataVencimento);
  } catch {
    return null;
  }
  
  const semanaInicio = startOfWeek(dataLanc, { weekStartsOn: 1 });
  const semanaFim = endOfWeek(dataLanc, { weekStartsOn: 1 });
  
  return contas.find(conta => {
    if (conta.pago || !conta.projecao) return false;
    if (conta.tipo !== 'receber') return false;
    
    const valorConta = parseValorFlexivel(conta.valor);
    let dataConta: Date;
    try {
      dataConta = parseISO(conta.dataVencimento);
    } catch {
      return false;
    }
    
    // Tolerância: ± 30% no valor e mesma semana
    const diff = Math.abs(valorLanc - valorConta) / Math.max(valorConta, 1);
    const valorMatch = diff <= 0.30;
    const mesmaSemana = dataConta >= semanaInicio && dataConta <= semanaFim;
    
    return valorMatch && mesmaSemana;
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
      const conciliados: { id: string; descricao: string; dataPagamento?: string; lancamentoConciliadoId?: string }[] = [];
      const novos: Omit<ContaFluxo, 'id'>[] = [];
      const paraRevisar: ExtractedLancamento[] = [];
      let ignorados = 0;

      const contasPagas = contasExistentes.filter(c => c.pago);

      for (const lanc of todosLancamentos) {
        // 1. Match exato: valor ± R$0.01 E data ± 5 dias (contas ainda em aberto)
        const match = encontrarMatch(lanc, contasNaoPagas);
        
        if (match) {
          conciliados.push({ 
            id: match.id, 
            descricao: lanc.descricao, 
            dataPagamento: lanc.dataVencimento,
            lancamentoConciliadoId: match.id,
          });
          const idx = contasNaoPagas.findIndex(c => c.id === match.id);
          if (idx >= 0) contasNaoPagas.splice(idx, 1);
          continue;
        }
        
        // 1b. Match exato com contas JÁ BAIXADAS: detecta duplicidade
        const matchJaBaixado = encontrarMatch(lanc, contasPagas, false);
        if (matchJaBaixado) {
          // Lançamento já foi baixado anteriormente — ignorar silenciosamente
          ignorados++;
          continue;
        }
        
        // 2. Match por canal (SHPP/SHOPEE → conta aberta SHPP/SHOPEE)
        const matchCanal = encontrarMatchPorCanal(lanc, contasNaoPagas);
        if (matchCanal) {
          conciliados.push({ 
            id: matchCanal.id, 
            descricao: `${lanc.descricao} (canal: ${matchCanal.descricao})`,
            dataPagamento: lanc.dataVencimento,
            lancamentoConciliadoId: matchCanal.id,
          });
          const idx = contasNaoPagas.findIndex(c => c.id === matchCanal.id);
          if (idx >= 0) contasNaoPagas.splice(idx, 1);
          continue;
        }
        
        // 3. Match por descrição similar (estimativa vs valor real)
        const matchDesc = encontrarMatchPorDescricao(lanc, contasNaoPagas);
        if (matchDesc) {
          conciliados.push({ 
            id: matchDesc.id, 
            descricao: `${lanc.descricao} (≈ ${matchDesc.descricao})`,
            dataPagamento: lanc.dataVencimento,
            lancamentoConciliadoId: matchDesc.id,
          });
          const idx = contasNaoPagas.findIndex(c => c.id === matchDesc.id);
          if (idx >= 0) contasNaoPagas.splice(idx, 1);
          continue;
        }
        
        // 3. Match com projeções (tolerância 30% valor, mesma semana)
        const matchProj = encontrarMatchProjecao(lanc, contasNaoPagas);
        if (matchProj) {
          conciliados.push({ id: matchProj.id, descricao: `${lanc.descricao} (proj: ${matchProj.descricao})` });
          const idx = contasNaoPagas.findIndex(c => c.id === matchProj.id);
          if (idx >= 0) contasNaoPagas.splice(idx, 1);
          continue;
        }
        
        // 4. Sem match - tentar identificar fornecedor
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
          // Para receitas sem match, tentar auto-atribuir por origem bancária
          const autoReceita = lanc.tipo === 'receber' 
            ? autoAtribuirFornecedorReceita(lanc.descricao, fornecedores) 
            : null;
          
          if (autoReceita) {
            // Auto-classificação de receita por origem bancária (hardcoded, não depende do CSV)
            novos.push({
              tipo: lanc.tipo,
              subtipo: lanc.subtipo,
              descricao: lanc.descricao,
              valor: lanc.valor,
              dataVencimento: lanc.dataVencimento,
              pago: true,
              fornecedorId: autoReceita.fornecedorId,
              categoria: autoReceita.categoria,
              conciliado: true,
            });
          } else {
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
            } else if (lanc.tipo === 'pagar' || lanc.tipo === 'cartao' || lanc.tipo === 'receber') {
              paraRevisar.push({
                ...lanc,
                needsReview: true,
              });
            } else {
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
      
      const partes = [
        conciliados.length > 0 ? `✅ ${conciliados.length} contas baixadas automaticamente` : null,
        novos.length > 0 ? `📥 ${novos.length} lançamentos novos no histórico` : null,
        paraRevisar.length > 0 ? `⚠️ ${paraRevisar.length} para revisar` : null,
      ].filter(Boolean);
      toast.success(`Conciliação: ${todosLancamentos.length} lançamentos processados`, {
        description: partes.join('\n'),
        duration: 8000,
      });

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

    // Remover da lista de revisão (comparar por dados, não referência)
    setLancamentosParaRevisar(prev => prev.filter(l => 
      !(l.descricao === lanc.descricao && l.valor === lanc.valor && l.dataVencimento === lanc.dataVencimento)
    ));
    toast.success('Lançamento adicionado!');
  };

  // Ignorar lançamento (comparar por dados, não referência)
  const handleIgnorar = (lanc: ExtractedLancamento) => {
    setLancamentosParaRevisar(prev => prev.filter(l => 
      !(l.descricao === lanc.descricao && l.valor === lanc.valor && l.dataVencimento === lanc.dataVencimento)
    ));
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
              <ReviewPanel
                lancamentos={lancamentosParaRevisar}
                fornecedores={fornecedores}
                contasExistentes={contasExistentes}
                onAdd={handleAddRevisado}
                onIgnore={handleIgnorar}
                onCreateFornecedor={onCreateFornecedor}
                onConciliar={onConciliar}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Componente de painel com keys estáveis
function ReviewPanel({
  lancamentos,
  fornecedores,
  contasExistentes,
  onAdd,
  onIgnore,
  onCreateFornecedor,
  onConciliar,
}: {
  lancamentos: ExtractedLancamento[];
  fornecedores: Fornecedor[];
  contasExistentes: ContaFluxo[];
  onAdd: (lanc: ExtractedLancamento, fornecedorId?: string, tipoOverride?: ContaFluxoTipo, naturezaOverride?: ContaFluxoNatureza) => void;
  onIgnore: (lanc: ExtractedLancamento) => void;
  onCreateFornecedor?: (fornecedor: Omit<Fornecedor, 'id'>) => void;
  onConciliar: (result: ConciliacaoResult) => void;
}) {
  // Ref para IDs estáveis - gerados uma vez por lançamento
  const stableIdsRef = useRef<Map<string, string>>(new Map());
  
  const getStableId = useCallback((lanc: ExtractedLancamento, idx: number) => {
    const dataKey = `${lanc.descricao}|${lanc.valor}|${lanc.dataVencimento}`;
    if (!stableIdsRef.current.has(dataKey)) {
      stableIdsRef.current.set(dataKey, `review-${Date.now()}-${idx}`);
    }
    return stableIdsRef.current.get(dataKey)!;
  }, []);
  
  // Cleanup apenas quando componente desmonta
  // NÃO limpar IDs durante re-renders para evitar perda de estado
  React.useEffect(() => {
    return () => {
      stableIdsRef.current.clear();
    };
  }, []);

  return (
    <div className="space-y-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700">
      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {lancamentos.length} lançamentos precisam de revisão
      </p>
      
      <div className="space-y-2">
        {lancamentos.map((lanc, idx) => (
          <div 
            key={getStableId(lanc, idx)}
            style={{ position: 'relative', zIndex: lancamentos.length - idx }}
          >
            <ReviewItem
              lancamento={lanc}
              fornecedores={fornecedores}
              contasExistentes={contasExistentes}
              onAdd={onAdd}
              onIgnore={onIgnore}
              onCreateFornecedor={onCreateFornecedor}
              onConciliar={onConciliar}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente para item de revisão
function ReviewItem({
  lancamento,
  fornecedores,
  contasExistentes,
  onAdd,
  onIgnore,
  onCreateFornecedor,
  onConciliar,
}: {
  lancamento: ExtractedLancamento;
  fornecedores: Fornecedor[];
  contasExistentes: ContaFluxo[];
  onAdd: (lanc: ExtractedLancamento, fornecedorId?: string, tipoOverride?: ContaFluxoTipo, naturezaOverride?: ContaFluxoNatureza) => void;
  onIgnore: (lanc: ExtractedLancamento) => void;
  onCreateFornecedor?: (fornecedor: Omit<Fornecedor, 'id'>) => void;
  onConciliar: (result: ConciliacaoResult) => void;
}) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | undefined>();
  const [selectedTipo, setSelectedTipo] = useState<ContaFluxoTipo>(lancamento.tipo);
  const [selectedNatureza, setSelectedNatureza] = useState<ContaFluxoNatureza>('operacional');

  // Handlers memoizados para evitar re-renders
  const handleTipoChange = useCallback((v: string) => {
    setSelectedTipo(v as ContaFluxoTipo);
  }, []);

  const handleNaturezaChange = useCallback((v: string) => {
    setSelectedNatureza(v as ContaFluxoNatureza);
  }, []);

  // Auto-selecionar natureza quando fornecedor muda
  const handleFornecedorChange = useCallback((id: string | undefined) => {
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
  }, [fornecedores]);

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

  const handleAdd = useCallback(() => {
    onAdd(lancamento, selectedFornecedor, selectedTipo, selectedNatureza);
  }, [lancamento, selectedFornecedor, selectedTipo, selectedNatureza, onAdd]);

  const handleIgnore = useCallback(() => {
    onIgnore(lancamento);
  }, [lancamento, onIgnore]);

  return (
    <div className="p-2 bg-background rounded border overflow-visible space-y-2">
      {/* Linha 1: Descrição + Valor */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight flex-1 min-w-0">{lancamento.descricao}</p>
        <p className="text-xs font-medium shrink-0">{valorFormatado}</p>
      </div>
      
      {/* Linha 2: Data + Tipo + Natureza */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground shrink-0">{dataFormatada}</span>
        
        <Select value={selectedTipo} onValueChange={handleTipoChange}>
          <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={4}>
            {Object.entries(tipoLabels).map(([tipo, { label, emoji }]) => (
              <SelectItem key={tipo} value={tipo} className="text-xs">
                {emoji} {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedNatureza} onValueChange={handleNaturezaChange}>
          <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={4}>
            <SelectItem value="operacional" className="text-xs">⚙️ Operacional</SelectItem>
            <SelectItem value="capitalGiro" className="text-xs">📦 Estoque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Linha 3: Fornecedor + Ações */}
      <div className="flex items-center gap-2">
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
        
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 shrink-0"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Add</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground shrink-0"
          onClick={handleIgnore}
        >
          ✕
        </Button>
      </div>
      
      {/* Linha 4: Vincular a conta aberta */}
      <VincularContaAberta
        lancamento={lancamento}
        contasExistentes={contasExistentes}
        onConciliar={onConciliar}
        onIgnore={onIgnore}
      />
    </div>
  );
}

// Componente para vincular lançamento a uma conta aberta existente
function VincularContaAberta({
  lancamento,
  contasExistentes,
  onConciliar,
  onIgnore,
}: {
  lancamento: ExtractedLancamento;
  contasExistentes: ContaFluxo[];
  onConciliar: (result: ConciliacaoResult) => void;
  onIgnore: (lanc: ExtractedLancamento) => void;
}) {
  const [showList, setShowList] = useState(false);
  
  const valorLanc = parseValorFlexivel(lancamento.valor);
  
  const [showJaBaixadas, setShowJaBaixadas] = useState(false);

  const filtrarContas = (apenasNaoPagas: boolean) => {
    const tiposSaida = ['pagar', 'cartao'];
    const lancEhSaida = tiposSaida.includes(lancamento.tipo);
    
    return contasExistentes.filter(c => {
      if (apenasNaoPagas && c.pago) return false;
      if (!apenasNaoPagas && !c.pago) return false;
      
      // Filtrar por tipo: receber só vê receber, pagar/cartao só vê pagar/cartao
      if (lancEhSaida) {
        if (!tiposSaida.includes(c.tipo)) return false;
      } else if (lancamento.tipo === 'receber') {
        if (c.tipo !== 'receber') return false;
      } else {
        if (c.tipo !== lancamento.tipo) return false;
      }
      
      const valorConta = parseValorFlexivel(c.valor);
      if (valorConta === 0 && valorLanc === 0) return true;
      const diff = Math.abs(valorLanc - valorConta) / Math.max(valorConta, valorLanc, 1);
      const valorSimilar = diff <= 0.30;
      const matchCanal = /SHPP|SHOPEE/i.test(lancamento.descricao) && /SHOPEE/i.test(c.descricao);
      return valorSimilar || matchCanal;
    }).slice(0, 10);
  };

  // Filtrar contas abertas com valor similar (± 30%) E mesmo tipo
  const contasSimilares = useMemo(() => filtrarContas(true), [contasExistentes, valorLanc, lancamento.tipo]);
  const contasJaBaixadas = useMemo(() => filtrarContas(false), [contasExistentes, valorLanc, lancamento.tipo]);
  
  if (contasSimilares.length === 0 && contasJaBaixadas.length === 0) return null;
  
  const handleVincular = (conta: ContaFluxo) => {
    onConciliar({
      conciliados: [{ 
        id: conta.id, 
        descricao: lancamento.descricao,
        dataPagamento: lancamento.dataVencimento,
        lancamentoConciliadoId: conta.id,
      }],
      novos: [],
      ignorados: 0,
      paraRevisar: [],
    });
    onIgnore(lancamento);
    toast.success(`Vinculado a "${conta.descricao}"`);
  };

  const handleMarcarDuplicata = (conta: ContaFluxo) => {
    // Lançamento já foi baixado → apenas ignorar sem criar novo
    onIgnore(lancamento);
    toast.info(`Ignorado — já estava conciliado em "${conta.descricao}"`);
  };
  
  const renderLista = (contas: ContaFluxo[], jaBaixada: boolean) => (
    <div className="mt-1 space-y-1 pl-2 border-l-2 border-blue-200">
      {jaBaixada && (
        <p className="text-[10px] text-muted-foreground italic px-1">
          Contas já baixadas — marcar como duplicata para ignorar
        </p>
      )}
      {contas.map(conta => {
        const valorFmt = parseValorFlexivel(conta.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        let dataFmt = conta.dataVencimento;
        try { dataFmt = format(parseISO(conta.dataVencimento), 'dd/MM'); } catch {}
        return (
          <button
            key={conta.id}
            className={`w-full text-left p-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
              jaBaixada
                ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20 opacity-70'
                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
            onClick={() => jaBaixada ? handleMarcarDuplicata(conta) : handleVincular(conta)}
          >
            <span className="truncate flex-1">
              {jaBaixada && '⚠️ '}{dataFmt} - {conta.descricao}
              {jaBaixada && <span className="ml-1 text-orange-500 font-medium">(já baixada)</span>}
            </span>
            <span className="font-medium shrink-0">{valorFmt}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-1">
      {contasSimilares.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setShowList(!showList)}
          >
            <Link2 className="h-3 w-3" />
            Vincular a conta aberta ({contasSimilares.length})
          </Button>
          {showList && renderLista(contasSimilares, false)}
        </div>
      )}

      {contasJaBaixadas.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            onClick={() => setShowJaBaixadas(!showJaBaixadas)}
          >
            <Link2 className="h-3 w-3" />
            Já foi baixado? ({contasJaBaixadas.length})
          </Button>
          {showJaBaixadas && renderLista(contasJaBaixadas, true)}
        </div>
      )}
    </div>
  );
}

