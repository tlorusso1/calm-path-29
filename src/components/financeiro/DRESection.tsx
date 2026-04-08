import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, ChevronUp, BarChart3, Calendar as CalendarIcon, Download } from 'lucide-react';
import { ContaFluxo, Fornecedor } from '@/types/focus-mode';
import { ORDEM_MODALIDADES_DRE, findCategoria, getTipoByModalidade } from '@/data/categorias-dre';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfYear, endOfYear, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CMVGerencialData {
  margemGerencial: number;
  cmvGerencialTotal: number;
  receitaBruta: number;
}

interface DRESectionProps {
  lancamentos: ContaFluxo[];
  fornecedores: Fornecedor[];
  cmvSupply?: number;
  cmvGerencialData?: CMVGerencialData;
  isOpen: boolean;
  onToggle: () => void;
}

interface DRELinha {
  categoria: string;
  valor: number;
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

// Classify a lancamento into categoria, respecting tipo constraints
function classificarLancamento(
  lanc: ContaFluxo,
  fornecedores: Fornecedor[]
): { modalidade: string; grupo: string; categoria: string } {
  let categoria = lanc.categoria;
  const fornecedor = lanc.fornecedorId ? fornecedores.find(f => f.id === lanc.fornecedorId) : undefined;
  if (!categoria && fornecedor) categoria = fornecedor.categoria;

  const isReceita = lanc.tipo === 'receber';

  // Fallback for receitas without category
  if (!categoria && isReceita) {
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

  // Fallback: unclassified
  if (!categoria) {
    categoria = isReceita ? 'Entradas a Reclassificar' : 'Saídas a Reclassificar';
  }

  const catDRE = findCategoria(categoria);

  // CRITICAL: enforce tipo consistency
  // If lanc is 'receber' but category maps to DESPESAS tipo → force reclassify
  // If lanc is 'pagar' but category maps to RECEITAS tipo → force reclassify
  if (catDRE) {
    const catTipo = catDRE.tipo;
    if (isReceita && catTipo === 'DESPESAS') {
      return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Entradas', categoria: 'Entradas a Reclassificar' };
    }
    if (!isReceita && catTipo === 'RECEITAS') {
      return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria: 'Saídas a Reclassificar' };
    }
    return { modalidade: catDRE.modalidade, grupo: catDRE.grupo, categoria };
  }

  // No catDRE found
  if (isReceita) {
    return { modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria };
  }
  return { modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria };
}

function calcularDRE(
  lancamentosPeriodo: ContaFluxo[],
  fornecedores: Fornecedor[]
): DREModalidade[] {
  const modalidadesMap = new Map<string, Map<string, Map<string, number>>>();

  for (const lanc of lancamentosPeriodo) {
    const { modalidade, grupo, categoria } = classificarLancamento(lanc, fornecedores);

    if (!modalidadesMap.has(modalidade)) modalidadesMap.set(modalidade, new Map());
    const gruposMap = modalidadesMap.get(modalidade)!;
    if (!gruposMap.has(grupo)) gruposMap.set(grupo, new Map());
    const categoriasMap = gruposMap.get(grupo)!;

    const valorAtual = categoriasMap.get(categoria) || 0;
    categoriasMap.set(categoria, valorAtual + parseValorFlexivel(lanc.valor));
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
      for (const [categoria, valor] of categoriasMap) {
        categorias.push({ categoria, valor });
        totalGrupo += valor;
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

function calcularTotais(dre: DREModalidade[], cmvSupply?: number) {
  let receitas = 0;
  let deducoes = 0;
  let cpv = 0;
  let despesas = 0;

  for (const mod of dre) {
    if (mod.modalidade === 'RECEITAS' || mod.modalidade === 'RECEITAS FINANCEIRAS') {
      receitas += mod.total;
    } else if (mod.modalidade === 'OUTRAS RECEITAS/DESPESAS') {
      // Split: entries with tipo RECEITAS go to receitas, DESPESAS go to despesas
      // We know from classification: 'Outras Entradas' = receitas, 'Outras Saídas' = despesas
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

  if (cmvSupply && cmvSupply > 0) cpv = cmvSupply;

  const receitaLiquida = receitas - deducoes;
  const lucroBruto = receitaLiquida - cpv;
  const resultadoOperacional = lucroBruto - despesas;

  return { receitas, deducoes, receitaLiquida, cpv, lucroBruto, despesas, resultadoOperacional, usandoCmvSupply: !!(cmvSupply && cmvSupply > 0) };
}

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function DRESection({
  lancamentos,
  fornecedores,
  cmvSupply,
  cmvGerencialData,
  isOpen,
  onToggle,
}: DRESectionProps) {
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(() => format(hoje, 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'mensal' | 'anual' | 'custom'>('mensal');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [anoSelecionado, setAnoSelecionado] = useState(() => hoje.getFullYear().toString());

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
  const totais = useMemo(() => calcularTotais(dre, cmvSupply), [dre, cmvSupply]);

  const lancamentosExcluidos = useMemo(() => {
    return lancamentos.filter(l => l.pago && TIPOS_EXCLUIDOS_DRE.includes(l.tipo)).length;
  }, [lancamentos]);

  const receitasSemCategoria = useMemo(() => {
    return lancamentosPeriodo.filter(l => l.tipo === 'receber' && !l.categoria && !l.fornecedorId).length;
  }, [lancamentosPeriodo]);

  // Helper to download a string as file
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
    // Compute DRE for each month
    const dresMensais: { dre: DREModalidade[]; totais: ReturnType<typeof calcularTotais> }[] = [];
    for (let m = 0; m < 12; m++) {
      const inicio = startOfMonth(new Date(ano, m, 1));
      const fim = endOfMonth(new Date(ano, m, 1));
      const lancMes = lancamentosFiltrados.filter(l => {
        const d = getDataLancamento(l);
        return d ? isWithinInterval(d, { start: inicio, end: fim }) : false;
      });
      const dreMes = calcularDRE(lancMes, fornecedores);
      dresMensais.push({ dre: dreMes, totais: calcularTotais(dreMes, cmvSupply) });
    }

    // Collect all unique categories across all months grouped by modalidade
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

    // Helper: get value for a category in a month's DRE
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

    // Summary row helper
    const summaryRow = (label: string, getter: (t: ReturnType<typeof calcularTotais>) => number, negate = false) => {
      const vals = dresMensais.map(d => {
        const v = getter(d.totais);
        return negate ? -v : v;
      });
      const total = vals.reduce((a, b) => a + b, 0);
      return `${label};${vals.map(v => v.toFixed(2)).join(';')};${total.toFixed(2)}`;
    };

    linhas.push(summaryRow('RECEITAS BRUTAS', t => t.receitas));

    // Detail rows for receitas
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

    // Detail rows for despesas
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

  return (
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
                  totais.resultadoOperacional >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  {formatCurrency(totais.resultadoOperacional)}
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

              {/* Custom period date pickers */}
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
                  <span>RECEITAS BRUTAS</span>
                  <span>{formatCurrency(totais.receitas)}</span>
                </div>
                {dre
                  .filter(m => m.modalidade === 'RECEITAS' || m.modalidade === 'RECEITAS FINANCEIRAS')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} />
                  ))}
                {/* Outras Entradas (reclassificar) */}
                {dre
                  .filter(m => m.modalidade === 'OUTRAS RECEITAS/DESPESAS')
                  .map(mod => {
                    const entradas = mod.grupos.filter(g => g.grupo === 'Outras Entradas');
                    if (entradas.length === 0) return null;
                    return entradas.map(g => (
                      <div key={g.grupo} className="pl-2">
                        {g.categorias.map(cat => (
                          <div key={cat.categoria} className="flex justify-between text-[11px] text-amber-600">
                            <span>⚠ {cat.categoria}</span>
                            <span>{formatCurrency(cat.valor)}</span>
                          </div>
                        ))}
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
                {dre
                  .filter(m => m.modalidade === 'DEDUÇÕES')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} />
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
                    <span className="flex items-center gap-1">
                      (-) CUSTOS DE PRODUTO VENDIDO
                      {totais.usandoCmvSupply && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1 py-0.5 rounded">SUPPLY</span>
                      )}
                    </span>
                    <span className="text-[9px] font-normal text-muted-foreground">CMV Produto (custo MP + embalagem + industrialização)</span>
                  </span>
                  <span>{formatCurrency(-totais.cpv)}</span>
                </div>
                {!totais.usandoCmvSupply && dre
                  .filter(m => m.modalidade === 'CUSTOS DE PRODUTO VENDIDO')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} />
                  ))}
                {totais.usandoCmvSupply && (
                  <p className="text-[10px] text-muted-foreground pl-2">
                    CMV calculado: qtde saída × custo unitário real
                  </p>
                )}
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
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} />
                  ))}
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
                    CMV Produto + Impostos ({((cmvGerencialData.receitaBruta > 0 ? (cmvGerencialData.cmvGerencialTotal - (cmvSupply || 0)) / cmvGerencialData.receitaBruta * 100 : 0)).toFixed(0)}% variáveis) + Fulfillment + Materiais
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
  );
}

function DREModalidadeRow({ modalidade }: { modalidade: DREModalidade }) {
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
