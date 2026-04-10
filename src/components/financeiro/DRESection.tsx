import { useMemo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, BarChart3, Calendar as CalendarIcon, Download, ArrowRight, CheckCircle2, ChevronsUpDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ContaFluxo, ContaFluxoTipo, Fornecedor, MapeamentoDescricaoFornecedor, extrairPadraoDescricao } from '@/types/focus-mode';
import { ORDEM_MODALIDADES_DRE, CATEGORIAS_DRE, findCategoria, getTipoByModalidade } from '@/data/categorias-dre';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfYear, endOfYear, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FATURAMENTO_HISTORICO } from '@/data/faturamento-historico';

interface CMVGerencialData {
  margemGerencial: number;
  cmvGerencialTotal: number;
  receitaBruta: number;
}

interface DRESectionProps {
  lancamentos: ContaFluxo[];
  fornecedores: Fornecedor[];
  cmvGerencialData?: CMVGerencialData;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateLancamentos?: (updates: { id: string; changes: Partial<ContaFluxo> }[]) => void;
  onAddMapeamento?: (mapeamento: MapeamentoDescricaoFornecedor) => void;
  mapeamentos?: MapeamentoDescricaoFornecedor[];
}

interface DRELinha {
  categoria: string;
  valor: number;
  lancamentoIds: string[];
}

interface DREGrupo {
  grupo: string;
  categorias: DRELinha[];
  total: number;
}

interface DREModalidade {
  modalidade: string;
  tipo: 'RECEITAS' | 'DESPESAS';
  grupos: DREGrupo[];
  total: number;
}

const TIPOS_EXCLUIDOS_DRE = ['intercompany', 'aplicacao', 'resgate', 'cartao'];

// Categorias que devem ser excluídas do DRE (movimentações financeiras, não operacionais)
const CATEGORIAS_EXCLUIDAS_DRE = ['Transferencias entre contas', 'Emprestimos e Financiamentos'];

function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getDataLancamento(l: ContaFluxo): Date | null {
  const dataBase = (l.dataPagamento || l.dataVencimento || '').slice(0, 10);
  if (!dataBase || dataBase.length < 10) return null;
  try {
    const d = parseISO(dataBase);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function classificarLancamento(
  lanc: ContaFluxo,
  fornecedores: Fornecedor[]
): { modalidade: string; grupo: string; categoria: string } {
  let categoria = lanc.categoria;
  const fornecedor = lanc.fornecedorId ? fornecedores.find(f => f.id === lanc.fornecedorId) : undefined;
  if (!categoria && fornecedor) categoria = fornecedor.categoria;

  // VALIDAÇÃO DE SINAL: o valor determina a direção real do lançamento
  const valorNum = parseValorFlexivel(lanc.valor);
  // Se receber com valor negativo → na prática é saída (estorno/chargeback)
  // Se pagar com valor negativo → na prática é entrada (devolução de fornecedor)
  const isEntradaReal = lanc.tipo === 'receber' ? valorNum >= 0 : valorNum < 0;

  const isReceita = lanc.tipo === 'receber';

  if (!categoria && isEntradaReal) {
    const desc = (lanc.descricao || '').toUpperCase();
    const contaOrigem = (lanc.contaOrigem || '').toUpperCase();
    if (
      contaOrigem.includes('MERCADO LIVRE') ||
      contaOrigem.includes('NICE ECOM') ||
      desc.includes('MERCADO LIVRE') ||
      desc.includes('MERCADO PAGO') ||
      desc.includes('SHOPEE') ||
      desc.includes('SHPP') ||
      desc.includes('NUVEMSHOP') ||
      desc.includes('PAGARME') ||
      desc.includes('PAGAR.ME') ||
      desc.includes('ASAAS')
    ) {
      categoria = 'Clientes Nacionais (B2C)';
    }
  }

  // Auto-classificação de saídas por palavras-chave na descrição
  // Roda tanto para sem categoria quanto para corrigir categorias genéricas erradas
  if (!isEntradaReal) {
    const desc = (lanc.descricao || '').toUpperCase();
    const CATEGORIAS_GENERICAS = ['Material de Uso e Consumo', 'Saídas a Reclassificar', 'a classificar'];
    const precisaOverride = !categoria || CATEGORIAS_GENERICAS.includes(categoria);
    
    if (precisaOverride) {
      // Impostos → DEDUÇÕES
      if (desc.includes('SIMPLES NACIONAL'))
        categoria = 'Simples Nacional (DAS)';
      else if (desc.includes('DAS'))
        categoria = 'Simples Nacional (DAS)';
      else if (desc.includes('DARF'))
        categoria = 'INSS';
      else if (desc.includes('DIFAL'))
        categoria = 'DIFAL';
      else if (desc.includes('ICMS-ST') || desc.includes('ICMS ST'))
        categoria = 'ICMS-ST';
      else if (desc.includes('ICMS'))
        categoria = 'ICMS';
      else if (desc.includes('PIS') || desc.includes('COFINS'))
        categoria = 'PIS E COFINS';
      
      // Pessoal
      else if (desc.includes('FOLHA') || desc.includes('SALARIO'))
        categoria = 'Salários CLT';
      else if (desc.includes('FGTS'))
        categoria = 'FGTS';
      else if (desc.includes('INSS'))
        categoria = 'INSS';
      else if (desc.includes('PRO LABORE') || desc.includes('PRÓ-LABORE'))
        categoria = 'Pro Labore';
      
      // Frete
      else if (desc.includes('JADLOG') || desc.includes('MANDAE') || desc.includes('CROSSDO'))
        categoria = 'Frete Venda';
      
      // Empréstimos / Giro
      else if (desc.includes('PARCELA GIRO') || desc.includes('EMPRESTIMO') || desc.includes('FINANCIAMENTO'))
        categoria = 'Pagamento da Parcela Principal';
      
      // Seguro
      else if (desc.includes('DEBITO SEGURO'))
        categoria = 'Seguros';
      
      // Tarifas bancárias
      else if (desc.includes('TARIFA') || desc.includes('IOF') || desc.startsWith('TAR '))
        categoria = 'Tarifas Bancárias';
      
      // Telefonia
      else if (desc.includes('DA CLARO') || desc.includes('VIVO') || desc.includes('TELEFONICA'))
        categoria = 'Telefonia / Internet';
    }
  }

  if (!categoria) {
    categoria = isEntradaReal ? 'Entradas a Reclassificar' : 'Saídas a Reclassificar';
  }

  const catDRE = findCategoria(categoria);

  if (catDRE) {
    const catTipo = catDRE.tipo;
    // Validação de sinal: só reclassificar se NÃO tiver categoria explícita do usuário
    // (ou seja, se a categoria veio de auto-classificação, não de reclassificação manual)
    const foiClassificadoManualmente = !!lanc.categoria;
    if (!foiClassificadoManualmente) {
      if (isEntradaReal && catTipo === 'DESPESAS') {
        console.warn('[DRE Sign-Override]', lanc.descricao, '| tipo:', lanc.tipo, '| valor:', valorNum, '| cat:', categoria, '→ Entradas a Reclassificar');
        return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Entradas', categoria: 'Entradas a Reclassificar' };
      }
      if (!isEntradaReal && catTipo === 'RECEITAS') {
        console.warn('[DRE Sign-Override]', lanc.descricao, '| tipo:', lanc.tipo, '| valor:', valorNum, '| cat:', categoria, '→ Saídas a Reclassificar');
        return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria: 'Saídas a Reclassificar' };
      }
    }
    return { modalidade: catDRE.modalidade, grupo: catDRE.grupo, categoria };
  }

  if (isEntradaReal) {
    return { modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria };
  }
  return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria };
}

function calcularDRE(
  lancamentosPeriodo: ContaFluxo[],
  fornecedores: Fornecedor[]
): DREModalidade[] {
  const modalidadesMap = new Map<string, Map<string, Map<string, { valor: number; ids: string[] }>>>();

  for (const lanc of lancamentosPeriodo) {
    const { modalidade, grupo, categoria } = classificarLancamento(lanc, fornecedores);

    // Excluir categorias que não são operacionais (transferências, empréstimos-entrada)
    if (CATEGORIAS_EXCLUIDAS_DRE.includes(categoria)) continue;

    if (!modalidadesMap.has(modalidade)) modalidadesMap.set(modalidade, new Map());
    const gruposMap = modalidadesMap.get(modalidade)!;
    if (!gruposMap.has(grupo)) gruposMap.set(grupo, new Map());
    const categoriasMap = gruposMap.get(grupo)!;

    const atual = categoriasMap.get(categoria) || { valor: 0, ids: [] };
    atual.valor += parseValorFlexivel(lanc.valor);
    atual.ids.push(lanc.id);
    categoriasMap.set(categoria, atual);
  }

  const resultado: DREModalidade[] = [];
  for (const modalidade of ORDEM_MODALIDADES_DRE) {
    const gruposMap = modalidadesMap.get(modalidade);
    if (!gruposMap || gruposMap.size === 0) continue;

    const grupos: DREGrupo[] = [];
    let totalModalidade = 0;

    for (const [grupo, categoriasMap] of gruposMap) {
      const categorias: DRELinha[] = [];
      let totalGrupo = 0;
      for (const [categoria, data] of categoriasMap) {
        categorias.push({ categoria, valor: data.valor, lancamentoIds: data.ids });
        totalGrupo += data.valor;
      }
      grupos.push({ grupo, categorias: categorias.sort((a, b) => b.valor - a.valor), total: totalGrupo });
      totalModalidade += totalGrupo;
    }

    resultado.push({
      modalidade,
      tipo: getTipoByModalidade(modalidade) || 'DESPESAS',
      grupos: grupos.sort((a, b) => b.total - a.total),
      total: totalModalidade,
    });
  }
  return resultado;
}

function calcularTotais(dre: DREModalidade[], faturamentoBruto?: number) {
  let receitas = 0;
  let receitasFinanceiras = 0;
  let deducoes = 0;
  let cpv = 0;
  let despesas = 0;

  for (const mod of dre) {
    if (mod.modalidade === 'RECEITAS') {
      receitas += mod.total;
    } else if (mod.modalidade === 'RECEITAS FINANCEIRAS') {
      // Receitas financeiras (rendimentos) NÃO entram em receita bruta
      // Aparecem após resultado operacional
      receitasFinanceiras += mod.total;
    } else if (mod.modalidade === 'OUTRAS RECEITAS/DESPESAS') {
      for (const g of mod.grupos) {
        if (g.grupo === 'Outras Entradas') {
          receitas += g.total;
        } else {
          despesas += g.total;
        }
      }
    } else if (mod.modalidade === 'DEDUÇÕES') {
      deducoes += mod.total;
    } else if (mod.modalidade === 'CUSTOS DE PRODUTO VENDIDO') {
      cpv += mod.total;
    } else if (mod.tipo === 'DESPESAS') {
      despesas += mod.total;
    }
  }

  // Se temos faturamento bruto (planilha/movimentações), calcular taxa de transação
  let taxasTransacao = 0;
  let receitasBrutas = receitas;
  if (faturamentoBruto && faturamentoBruto > 0 && receitas > 0) {
    taxasTransacao = faturamentoBruto - receitas;
    if (taxasTransacao > 0) {
      receitasBrutas = faturamentoBruto;
      deducoes += taxasTransacao;
    } else {
      taxasTransacao = 0;
    }
  }

  const receitaLiquida = receitasBrutas - deducoes;
  const lucroBruto = receitaLiquida - cpv;
  const resultadoOperacional = lucroBruto - despesas;
  const resultadoFinal = resultadoOperacional + receitasFinanceiras;

  return { receitas: receitasBrutas, receitasBanco: receitas, deducoes, receitaLiquida, cpv, lucroBruto, despesas, resultadoOperacional, receitasFinanceiras, resultadoFinal, taxasTransacao };
}

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function CategoriaSearchSelect({
  categorias,
  value,
  onChange,
}: {
  categorias: { modalidade: string; categoria: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categorias.find(c => c.categoria === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-8 justify-between text-xs font-normal"
        >
          {selected ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selected.modalidade}</span> → {selected.categoria}
            </span>
          ) : (
            <span className="text-muted-foreground">Buscar categoria...</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 z-[200]" align="start">
        <Command>
          <CommandInput placeholder="Digitar para buscar..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs p-2 text-center">Nenhuma categoria encontrada</CommandEmpty>
            <CommandGroup className="max-h-[200px]">
              {categorias.map(c => (
                <CommandItem
                  key={`${c.modalidade}-${c.categoria}`}
                  value={`${c.modalidade} ${c.categoria}`}
                  onSelect={() => {
                    onChange(c.categoria);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn("mr-1 h-3 w-3", value === c.categoria ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground mr-1">{c.modalidade}</span>→ {c.categoria}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DRESection({
  lancamentos,
  fornecedores,
  cmvGerencialData,
  isOpen,
  onToggle,
  onUpdateLancamentos,
  onAddMapeamento,
  mapeamentos,
}: DRESectionProps) {
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(() => format(hoje, 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'mensal' | 'anual' | 'custom'>('mensal');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [anoSelecionado, setAnoSelecionado] = useState(() => hoje.getFullYear().toString());

  // Bulk reclassify modal
  const [reclassModalOpen, setReclassModalOpen] = useState(false);
  const [reclassLancamentos, setReclassLancamentos] = useState<ContaFluxo[]>([]);
  const [reclassSelected, setReclassSelected] = useState<Set<string>>(new Set());
  const [reclassCategoria, setReclassCategoria] = useState('');
  const [reclassTipo, setReclassTipo] = useState<'receber' | 'pagar'>('receber');

  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = 0; i < 18; i++) {
      const data = subMonths(hoje, i);
      meses.push({ value: format(data, 'yyyy-MM'), label: format(data, 'MMMM/yyyy', { locale: ptBR }) });
    }
    return meses;
  }, []);

  const anosDisponiveis = useMemo(() => {
    const ano = hoje.getFullYear();
    return [ano.toString(), (ano - 1).toString(), (ano - 2).toString()];
  }, []);

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (!l.pago) return false;
      if (TIPOS_EXCLUIDOS_DRE.includes(l.tipo)) return false;
      if (l.projecao) return false;
      return l.tipo === 'receber' || l.tipo === 'pagar';
    });
  }, [lancamentos]);

  const lancamentosPeriodo = useMemo(() => {
    let inicio: Date;
    let fim: Date;

    if (viewMode === 'anual') {
      const ano = parseInt(anoSelecionado);
      inicio = startOfYear(new Date(ano, 0, 1));
      fim = endOfYear(new Date(ano, 11, 31));
    } else if (viewMode === 'custom' && customFrom && customTo) {
      inicio = customFrom;
      fim = customTo;
    } else {
      const [ano, mes] = mesAno.split('-').map(Number);
      inicio = startOfMonth(new Date(ano, mes - 1));
      fim = endOfMonth(new Date(ano, mes - 1));
    }

    return lancamentosFiltrados.filter(l => {
      const data = getDataLancamento(l);
      return data ? isWithinInterval(data, { start: inicio, end: fim }) : false;
    });
  }, [lancamentosFiltrados, mesAno, viewMode, customFrom, customTo, anoSelecionado]);

  const dre = useMemo(() => calcularDRE(lancamentosPeriodo, fornecedores), [lancamentosPeriodo, fornecedores]);

  // Faturamento bruto do período (planilha histórica)
  const faturamentoBrutoPeriodo = useMemo(() => {
    if (viewMode === 'mensal') {
      const hist = FATURAMENTO_HISTORICO[mesAno];
      if (!hist) return undefined;
      const r = hist.realizado;
      const total = (r.b2b || 0) + (r.ecomNuvem || 0) + (r.ecomShopee || 0) + (r.ecomAssinaturas || 0);
      return total > 0 ? total : undefined;
    }
    if (viewMode === 'anual') {
      let total = 0;
      for (let m = 0; m < 12; m++) {
        const key = `${anoSelecionado}-${String(m + 1).padStart(2, '0')}`;
        const hist = FATURAMENTO_HISTORICO[key];
        if (hist) {
          const r = hist.realizado;
          total += (r.b2b || 0) + (r.ecomNuvem || 0) + (r.ecomShopee || 0) + (r.ecomAssinaturas || 0);
        }
      }
      return total > 0 ? total : undefined;
    }
    return undefined;
  }, [viewMode, mesAno, anoSelecionado]);

  const totais = useMemo(() => calcularTotais(dre, faturamentoBrutoPeriodo), [dre, faturamentoBrutoPeriodo]);

  const lancamentosExcluidos = useMemo(() => {
    return lancamentos.filter(l => {
      if (!l.pago) return false;
      if (TIPOS_EXCLUIDOS_DRE.includes(l.tipo)) return true;
      // Também excluir por categoria resolvida
      const { categoria } = classificarLancamento(l, fornecedores);
      return CATEGORIAS_EXCLUIDAS_DRE.includes(categoria);
    }).length;
  }, [lancamentos, fornecedores]);

  const receitasSemCategoria = useMemo(() => {
    return lancamentosPeriodo.filter(l => l.tipo === 'receber' && !l.categoria && !l.fornecedorId).length;
  }, [lancamentosPeriodo]);

  // Get categorias for reclassify based on tipo
  const categoriasParaReclassificar = useMemo(() => {
    // Usa o sinal do valor para determinar categorias permitidas, não o tipo
    // Isso impede classificar valor negativo como receita e positivo como despesa
    const valoresNegativos = reclassLancamentos.some(l => reclassSelected.has(l.id) && parseValorFlexivel(l.valor) < 0);
    const valoresPositivos = reclassLancamentos.some(l => reclassSelected.has(l.id) && parseValorFlexivel(l.valor) >= 0);
    
    // Se tem mix de sinais, mostra todas (raro)
    if (valoresNegativos && valoresPositivos) {
      return CATEGORIAS_DRE;
    }
    // Valores negativos → só categorias de despesa
    if (valoresNegativos) {
      return CATEGORIAS_DRE.filter(c => c.tipo === 'DESPESAS');
    }
    // Valores positivos → filtrar por tipo do lançamento
    if (reclassTipo === 'receber') {
      return CATEGORIAS_DRE.filter(c => c.tipo === 'RECEITAS');
    }
    return CATEGORIAS_DRE.filter(c => c.tipo === 'DESPESAS');
  }, [reclassTipo, reclassLancamentos, reclassSelected]);

  // Open reclassify modal with specific lancamento ids
  const openReclassModal = useCallback((lancamentoIds: string[], tipo: 'receber' | 'pagar') => {
    const lancs = lancamentosPeriodo.filter(l => lancamentoIds.includes(l.id));
    if (lancs.length === 0) return;
    setReclassLancamentos(lancs);
    setReclassSelected(new Set(lancamentoIds));
    setReclassTipo(tipo);
    setReclassCategoria('');
    setReclassModalOpen(true);
  }, [lancamentosPeriodo]);

  // Apply bulk reclassification
  const applyReclassification = useCallback(() => {
    if (!reclassCategoria || reclassSelected.size === 0 || !onUpdateLancamentos) return;

    const updates = Array.from(reclassSelected).map(id => ({
      id,
      changes: { categoria: reclassCategoria } as Partial<ContaFluxo>,
    }));
    onUpdateLancamentos(updates);

    // Save learning: for each unique description pattern, save the mapping
    if (onAddMapeamento) {
      const seenPatterns = new Set<string>();
      for (const lanc of reclassLancamentos) {
        if (!reclassSelected.has(lanc.id)) continue;
        const padrao = extrairPadraoDescricao(lanc.descricao || '');
        if (padrao && !seenPatterns.has(padrao)) {
          seenPatterns.add(padrao);
          // Check if already mapped
          const jaExiste = (mapeamentos || []).some(m => m.padrao === padrao);
          if (!jaExiste) {
            onAddMapeamento({
              padrao,
              fornecedorId: '',
              categoria: reclassCategoria,
              criadoEm: new Date().toISOString(),
              ultimoUso: new Date().toISOString(),
              confianca: 1,
            });
          }
        }
      }
    }

    toast.success(`${reclassSelected.size} lançamento(s) reclassificado(s) como "${reclassCategoria}"`);
    setReclassModalOpen(false);
  }, [reclassCategoria, reclassSelected, reclassLancamentos, onUpdateLancamentos, onAddMapeamento, mapeamentos]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    toast.success('DRE exportado com sucesso!');
  };

  const exportarCSV = () => {
    if (viewMode === 'anual') {
      exportarAnualCSV();
      return;
    }

    const linhas: string[] = [];
    const periodoLabel = viewMode === 'custom' && customFrom && customTo
      ? `${format(customFrom, 'dd/MM/yyyy')} a ${format(customTo, 'dd/MM/yyyy')}`
      : mesesDisponiveis.find(m => m.value === mesAno)?.label || mesAno;

    linhas.push(`DRE - ${periodoLabel}`);
    linhas.push('');
    linhas.push('Modalidade;Grupo;Categoria;Valor');

    linhas.push(`RECEITAS BRUTAS;;;${totais.receitas.toFixed(2)}`);
    for (const mod of dre.filter(m => m.modalidade === 'RECEITAS' || m.modalidade === 'RECEITAS FINANCEIRAS')) {
      for (const g of mod.grupos) {
        for (const cat of g.categorias) {
          linhas.push(`${mod.modalidade};${g.grupo};${cat.categoria};${cat.valor.toFixed(2)}`);
        }
      }
    }

    linhas.push(`(-) DEDUÇÕES;;;${(-totais.deducoes).toFixed(2)}`);
    if (totais.taxasTransacao > 0) {
      linhas.push(`DEDUÇÕES;Deduções da receita;Taxas meios de pagamento (bruto-líquido);${(-totais.taxasTransacao).toFixed(2)}`);
    }
    for (const mod of dre.filter(m => m.modalidade === 'DEDUÇÕES')) {
      for (const g of mod.grupos) {
        for (const cat of g.categorias) {
          linhas.push(`${mod.modalidade};${g.grupo};${cat.categoria};${(-cat.valor).toFixed(2)}`);
        }
      }
    }

    linhas.push(`RECEITA LÍQUIDA;;;${totais.receitaLiquida.toFixed(2)}`);
    linhas.push(`(-) CPV;;;${(-totais.cpv).toFixed(2)}`);
    linhas.push(`LUCRO BRUTO;;;${totais.lucroBruto.toFixed(2)}`);

    linhas.push(`(-) DESPESAS OPERACIONAIS;;;${(-totais.despesas).toFixed(2)}`);
    for (const mod of dre.filter(m => m.tipo === 'DESPESAS' && !['DEDUÇÕES', 'CUSTOS DE PRODUTO VENDIDO'].includes(m.modalidade))) {
      for (const g of mod.grupos) {
        for (const cat of g.categorias) {
          linhas.push(`${mod.modalidade};${g.grupo};${cat.categoria};${(-cat.valor).toFixed(2)}`);
        }
      }
    }

    linhas.push('');
    linhas.push(`RESULTADO OPERACIONAL;;;${totais.resultadoOperacional.toFixed(2)}`);

    downloadFile(linhas.join('\n'), `DRE_${periodoLabel.replace(/[\s/]/g, '_')}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportarAnualCSV = () => {
    const ano = parseInt(anoSelecionado);
    const dresMensais: { dre: DREModalidade[]; totais: ReturnType<typeof calcularTotais> }[] = [];
    for (let m = 0; m < 12; m++) {
      const inicio = startOfMonth(new Date(ano, m, 1));
      const fim = endOfMonth(new Date(ano, m, 1));
      const lancMes = lancamentosFiltrados.filter(l => {
        const d = getDataLancamento(l);
        return d ? isWithinInterval(d, { start: inicio, end: fim }) : false;
      });
      const dreMes = calcularDRE(lancMes, fornecedores);
      dresMensais.push({ dre: dreMes, totais: calcularTotais(dreMes) });
    }

    const allCategorias: { modalidade: string; grupo: string; categoria: string }[] = [];
    const seen = new Set<string>();
    for (const { dre: dreMes } of dresMensais) {
      for (const mod of dreMes) {
        for (const g of mod.grupos) {
          for (const cat of g.categorias) {
            const key = `${mod.modalidade}|${g.grupo}|${cat.categoria}`;
            if (!seen.has(key)) {
              seen.add(key);
              allCategorias.push({ modalidade: mod.modalidade, grupo: g.grupo, categoria: cat.categoria });
            }
          }
        }
      }
    }

    const header = `DRE Anual ${ano};` + MESES_LABEL.join(';') + ';Total Anual';
    const linhas: string[] = [header];

    const getVal = (dreMes: DREModalidade[], mod: string, cat: string): number => {
      const m = dreMes.find(x => x.modalidade === mod);
      if (!m) return 0;
      for (const g of m.grupos) {
        for (const c of g.categorias) {
          if (c.categoria === cat) return c.valor;
        }
      }
      return 0;
    };

    const summaryRow = (label: string, getter: (t: ReturnType<typeof calcularTotais>) => number, negate = false) => {
      const vals = dresMensais.map(d => {
        const v = getter(d.totais);
        return negate ? -v : v;
      });
      const total = vals.reduce((a, b) => a + b, 0);
      return `${label};${vals.map(v => v.toFixed(2)).join(';')};${total.toFixed(2)}`;
    };

    linhas.push(summaryRow('RECEITAS BRUTAS', t => t.receitas));
    for (const c of allCategorias.filter(x => x.modalidade === 'RECEITAS' || x.modalidade === 'RECEITAS FINANCEIRAS')) {
      const vals = dresMensais.map(d => getVal(d.dre, c.modalidade, c.categoria));
      const total = vals.reduce((a, b) => a + b, 0);
      linhas.push(`  ${c.categoria};${vals.map(v => v.toFixed(2)).join(';')};${total.toFixed(2)}`);
    }

    linhas.push(summaryRow('(-) DEDUÇÕES', t => t.deducoes, true));
    linhas.push(summaryRow('RECEITA LÍQUIDA', t => t.receitaLiquida));
    linhas.push(summaryRow('(-) CPV', t => t.cpv, true));
    linhas.push(summaryRow('LUCRO BRUTO', t => t.lucroBruto));
    linhas.push(summaryRow('(-) DESPESAS OPERACIONAIS', t => t.despesas, true));

    for (const c of allCategorias.filter(x => x.modalidade !== 'RECEITAS' && x.modalidade !== 'RECEITAS FINANCEIRAS' && x.modalidade !== 'DEDUÇÕES' && x.modalidade !== 'CUSTOS DE PRODUTO VENDIDO')) {
      const vals = dresMensais.map(d => getVal(d.dre, c.modalidade, c.categoria));
      const total = vals.reduce((a, b) => a + b, 0);
      if (total !== 0) {
        linhas.push(`  ${c.categoria};${vals.map(v => (-v).toFixed(2)).join(';')};${(-total).toFixed(2)}`);
      }
    }

    linhas.push('');
    linhas.push(summaryRow('RESULTADO OPERACIONAL', t => t.resultadoOperacional));

    downloadFile(linhas.join('\n'), `DRE_Anual_${ano}.csv`, 'text/csv;charset=utf-8;');
  };

  // Render a clickable "a reclassificar" item
  const renderReclassificarItem = (cat: DRELinha, tipo: 'receber' | 'pagar') => (
    <div
      key={cat.categoria}
      className="flex justify-between text-[11px] text-amber-600 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded px-1 py-0.5 transition-colors group"
      onClick={() => openReclassModal(cat.lancamentoIds, tipo)}
    >
      <span className="flex items-center gap-1">
        ⚠ {cat.categoria}
        <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
          ({cat.lancamentoIds.length} itens → clique p/ classificar)
        </span>
      </span>
      <span className="flex items-center gap-1">
        {formatCurrency(cat.valor)}
        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </div>
  );

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                📊 DRE - Resultado do Exercício
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">REAL</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  totais.resultadoFinal >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  {formatCurrency(totais.resultadoFinal)}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Toggle Mensal/Anual/Custom + Seletor */}
            <div className="flex flex-col gap-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'mensal' | 'anual' | 'custom')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="mensal" className="text-xs gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Mensal
                  </TabsTrigger>
                  <TabsTrigger value="anual" className="text-xs gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Anual
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Período
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {lancamentosPeriodo.length} lançamentos
                  {lancamentosExcluidos > 0 && (
                    <span className="text-muted-foreground/70"> ({lancamentosExcluidos} mov. financeiras excl.)</span>
                  )}
                  {receitasSemCategoria > 0 && (
                    <span className="text-amber-600"> • {receitasSemCategoria} receitas s/ classificação</span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  {viewMode === 'mensal' && (
                    <Select value={mesAno} onValueChange={setMesAno}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mesesDisponiveis.map(mes => (
                          <SelectItem key={mes.value} value={mes.value} className="text-xs">
                            {mes.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {viewMode === 'anual' && (
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {anosDisponiveis.map(ano => (
                          <SelectItem key={ano} value={ano} className="text-xs">
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportarCSV}>
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                </div>
              </div>

              {viewMode === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1 w-[130px]", !customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="h-3 w-3" />
                        {customFrom ? format(customFrom, 'dd/MM/yyyy') : 'De'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1 w-[130px]", !customTo && "text-muted-foreground")}>
                        <CalendarIcon className="h-3 w-3" />
                        {customTo ? format(customTo, 'dd/MM/yyyy') : 'Até'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* DRE */}
            <div className="space-y-4 text-sm">
              {/* Receitas */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-green-600 border-b pb-1">
                  <span className="flex flex-col">
                    <span>RECEITAS BRUTAS</span>
                    {totais.taxasTransacao > 0 && (
                      <span className="text-[9px] font-normal text-muted-foreground">
                        Faturamento bruto (planilha) · Banco: {formatCurrency(totais.receitasBanco)}
                      </span>
                    )}
                  </span>
                  <span>{formatCurrency(totais.receitas)}</span>
                </div>
                {dre
                  .filter(m => m.modalidade === 'RECEITAS' || m.modalidade === 'RECEITAS FINANCEIRAS')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} onReclassify={openReclassModal} />
                  ))}
                {/* Outras Entradas (reclassificar) - CLICKABLE */}
                {dre
                  .filter(m => m.modalidade === 'OUTRAS RECEITAS/DESPESAS')
                  .map(mod => {
                    const entradas = mod.grupos.filter(g => g.grupo === 'Outras Entradas');
                    if (entradas.length === 0) return null;
                    return entradas.map(g => (
                      <div key={g.grupo} className="pl-2">
                        {g.categorias.map(cat => renderReclassificarItem(cat, 'receber'))}
                      </div>
                    ));
                  })}
              </div>

              {/* Deduções */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-orange-600 border-b pb-1">
                  <span>(-) DEDUÇÕES</span>
                  <span>{formatCurrency(-totais.deducoes)}</span>
                </div>
                {/* Taxas de transação calculadas (bruto - líquido) */}
                {totais.taxasTransacao > 0 && (
                  <div className="flex justify-between pl-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      💳 Taxas meios de pagamento
                      <span className="text-[9px]">(bruto − líquido banco)</span>
                    </span>
                    <span className="text-orange-600 font-medium">{formatCurrency(-totais.taxasTransacao)}</span>
                  </div>
                )}
                {dre
                  .filter(m => m.modalidade === 'DEDUÇÕES')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} onReclassify={openReclassModal} />
                  ))}
              </div>

              {/* Receita Líquida */}
              <div className="flex justify-between font-bold bg-muted/50 p-2 rounded">
                <span>RECEITA LÍQUIDA</span>
                <span className={totais.receitaLiquida >= 0 ? "text-green-600" : "text-destructive"}>
                  {formatCurrency(totais.receitaLiquida)}
                </span>
              </div>

              {/* CPV */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-amber-600 border-b pb-1">
                  <span className="flex flex-col">
                    <span>(-) CUSTOS DE PRODUTO VENDIDO</span>
                    <span className="text-[9px] font-normal text-muted-foreground">CPV dos lançamentos do período</span>
                  </span>
                  <span>{formatCurrency(-totais.cpv)}</span>
                </div>
                {dre
                  .filter(m => m.modalidade === 'CUSTOS DE PRODUTO VENDIDO')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} onReclassify={openReclassModal} />
                  ))}
              </div>

              {/* Lucro Bruto */}
              <div className="flex justify-between font-bold bg-muted/50 p-2 rounded">
                <span>LUCRO BRUTO</span>
                <span className={totais.lucroBruto >= 0 ? "text-green-600" : "text-destructive"}>
                  {formatCurrency(totais.lucroBruto)}
                </span>
              </div>

              {/* Despesas Operacionais */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-destructive border-b pb-1">
                  <span>(-) DESPESAS OPERACIONAIS</span>
                  <span>{formatCurrency(-totais.despesas)}</span>
                </div>
                {dre
                  .filter(m =>
                    m.tipo === 'DESPESAS' &&
                    !['DEDUÇÕES', 'CUSTOS DE PRODUTO VENDIDO'].includes(m.modalidade)
                  )
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} onReclassify={openReclassModal} />
                  ))}
                {/* Saídas a reclassificar - CLICKABLE */}
                {dre
                  .filter(m => m.modalidade === 'OUTRAS RECEITAS/DESPESAS')
                  .map(mod => {
                    const saidas = mod.grupos.filter(g => g.grupo === 'Outras Saídas');
                    if (saidas.length === 0) return null;
                    return saidas.map(g => (
                      <div key={g.grupo} className="pl-2">
                        {g.categorias.map(cat => renderReclassificarItem(cat, 'pagar'))}
                      </div>
                    ));
                  })}
              </div>

              {/* Resultado Operacional */}
              <div className={cn(
                "flex justify-between font-bold p-3 rounded-lg border-2",
                totais.resultadoOperacional >= 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700"
              )}>
                <span>RESULTADO OPERACIONAL</span>
                <span>{formatCurrency(totais.resultadoOperacional)}</span>
              </div>

              {/* Receitas Financeiras (após resultado operacional) */}
              {totais.receitasFinanceiras !== 0 && (
                <div className="space-y-1 p-2 rounded border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between text-sm font-medium text-blue-700 dark:text-blue-400">
                    <span>RECEITAS FINANCEIRAS</span>
                    <span>{formatCurrency(totais.receitasFinanceiras)}</span>
                  </div>
                  {dre.filter(m => m.modalidade === 'RECEITAS FINANCEIRAS').map(mod =>
                    mod.grupos.map(g =>
                      g.categorias.map(cat => (
                        <div key={cat.categoria} className="flex justify-between text-xs text-muted-foreground pl-2">
                          <span>{cat.categoria}</span>
                          <span>{formatCurrency(cat.valor)}</span>
                        </div>
                      ))
                    )
                  )}
                </div>
              )}

              {/* Resultado Final */}
              {totais.receitasFinanceiras !== 0 && (
                <div className={cn(
                  "flex justify-between font-bold p-3 rounded-lg border-2",
                  totais.resultadoFinal >= 0
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700"
                    : "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700"
                )}>
                  <span>RESULTADO FINAL</span>
                  <span>{formatCurrency(totais.resultadoFinal)}</span>
                </div>
              )}

              {/* CMV Real (Gerencial) */}
              {cmvGerencialData && cmvGerencialData.receitaBruta > 0 && (
                <div className="space-y-1 p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
                  <div className="flex justify-between font-bold text-sm text-purple-700 dark:text-purple-400">
                    <span className="flex items-center gap-1">
                      🧠 CMV REAL (Gerencial)
                      <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-1 py-0.5 rounded">UNIT ECON</span>
                    </span>
                    <span>{formatCurrency(cmvGerencialData.cmvGerencialTotal)}</span>
                  </div>
                  <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">
                    CMV Produto + Impostos + Fulfillment + Materiais (visão gerencial, não filtrado por período)
                  </p>
                  <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400">
                    <span>Margem após CMV Real</span>
                    <span className="font-medium">
                      {formatCurrency(cmvGerencialData.receitaBruta - cmvGerencialData.cmvGerencialTotal)} ({(cmvGerencialData.margemGerencial * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Resumo Margem Gerencial */}
              {cmvGerencialData && cmvGerencialData.receitaBruta > 0 && (
                <div className={cn(
                  "flex justify-between text-xs p-2 rounded border mt-1",
                  cmvGerencialData.margemGerencial >= 0.15
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-purple-700"
                    : cmvGerencialData.margemGerencial >= 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-700"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700"
                )}>
                  <span className="flex items-center gap-1">
                    🧠 Margem Gerencial (unit economics)
                    <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-1 py-0.5 rounded">GERENCIAL</span>
                  </span>
                  <span className="font-medium">
                    {(cmvGerencialData.margemGerencial * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>

    {/* Bulk Reclassify Modal */}
    <Dialog open={reclassModalOpen} onOpenChange={setReclassModalOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            📋 Reclassificar Lançamentos ({reclassLancamentos.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Select all / none */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={reclassSelected.size === reclassLancamentos.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  setReclassSelected(new Set(reclassLancamentos.map(l => l.id)));
                } else {
                  setReclassSelected(new Set());
                }
              }}
            />
            <span className="text-xs text-muted-foreground">
              Selecionar todos ({reclassSelected.size}/{reclassLancamentos.length})
            </span>
          </div>

          {/* List of lancamentos */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded p-2">
            {reclassLancamentos.map(l => (
              <div key={l.id} className="flex items-start gap-2 text-[11px] py-1 border-b last:border-0">
                <Checkbox
                  checked={reclassSelected.has(l.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(reclassSelected);
                    if (checked) next.add(l.id); else next.delete(l.id);
                    setReclassSelected(next);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.descricao || 'Sem descrição'}</p>
                  <p className="text-muted-foreground">
                    {l.dataVencimento?.slice(0, 10)} • {formatCurrency(parseValorFlexivel(l.valor))}
                    {l.contaOrigem && <span> • {l.contaOrigem}</span>}
                    {/* Alerta de sinal invertido */}
                    {((l.tipo === 'receber' && parseValorFlexivel(l.valor) < 0) || 
                      (l.tipo === 'pagar' && parseValorFlexivel(l.valor) < 0)) && (
                      <span className="text-amber-600 font-medium"> ⚠️ valor negativo</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Category selector with search */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Nova categoria DRE:</label>
            <CategoriaSearchSelect
              categorias={categoriasParaReclassificar}
              value={reclassCategoria}
              onChange={setReclassCategoria}
            />
          </div>

          {onAddMapeamento && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              O padrão da descrição será salvo para classificar automaticamente lançamentos futuros
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setReclassModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={reclassSelected.size === 0 || !reclassCategoria}
            onClick={applyReclassification}
          >
            Reclassificar {reclassSelected.size} item(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function DREModalidadeRow({ modalidade, onReclassify }: { modalidade: DREModalidade; onReclassify?: (ids: string[], tipo: 'receber' | 'pagar') => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex justify-between text-xs py-0.5 pl-2 hover:bg-muted/30 rounded cursor-pointer">
          <span className="text-muted-foreground flex items-center gap-1">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3 rotate-90" />}
            {modalidade.modalidade}
          </span>
          <span>{formatCurrency(modalidade.total)}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 space-y-0.5">
          {modalidade.grupos.map(grupo => (
            <div key={grupo.grupo} className="space-y-0.5">
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>{grupo.grupo}</span>
                <span>{formatCurrency(grupo.total)}</span>
              </div>
              {grupo.categorias.map(cat => (
                <div key={cat.categoria} className="flex justify-between text-[10px] text-muted-foreground pl-2">
                  <span>{cat.categoria}</span>
                  <span>{formatCurrency(cat.valor)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}