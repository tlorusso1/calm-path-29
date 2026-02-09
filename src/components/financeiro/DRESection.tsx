import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, BarChart3, Calendar } from 'lucide-react';
import { ContaFluxo, Fornecedor } from '@/types/focus-mode';
import { ORDEM_MODALIDADES_DRE, findCategoria, getTipoByModalidade } from '@/data/categorias-dre';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DRESectionProps {
  lancamentos: ContaFluxo[];
  fornecedores: Fornecedor[];
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

// Tipos que NÃO entram no DRE (afetam caixa mas não resultado operacional)
const TIPOS_EXCLUIDOS_DRE = ['intercompany', 'aplicacao', 'resgate', 'cartao'];

function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function DRESection({
  lancamentos,
  fornecedores,
  isOpen,
  onToggle,
}: DRESectionProps) {
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(() => format(hoje, 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'mensal' | 'anual'>('mensal');
  
  // Gerar opções de meses (últimos 12 meses)
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = 0; i < 12; i++) {
      const data = subMonths(hoje, i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: format(data, 'MMMM/yyyy', { locale: ptBR }),
      });
    }
    return meses;
  }, [hoje]);
  
  // Filtrar lançamentos EXCLUINDO tipos que não entram no DRE
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (!l.pago) return false;
      // Excluir tipos que não afetam resultado operacional
      if (TIPOS_EXCLUIDOS_DRE.includes(l.tipo)) return false;
      return true;
    });
  }, [lancamentos]);
  
  // Filtrar por período
  const lancamentosPeriodo = useMemo(() => {
    if (viewMode === 'anual') {
      const anoAtual = hoje.getFullYear();
      const inicio = startOfYear(new Date(anoAtual, 0, 1));
      const fim = endOfYear(new Date(anoAtual, 11, 31));
      
      return lancamentosFiltrados.filter(l => {
        try {
          const data = parseISO(l.dataVencimento);
          return isWithinInterval(data, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });
    } else {
      const [ano, mes] = mesAno.split('-').map(Number);
      const inicio = startOfMonth(new Date(ano, mes - 1));
      const fim = endOfMonth(new Date(ano, mes - 1));
      
      return lancamentosFiltrados.filter(l => {
        try {
          const data = parseISO(l.dataVencimento);
          return isWithinInterval(data, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });
    }
  }, [lancamentosFiltrados, mesAno, viewMode, hoje]);
  
  // Agrupar por categoria DRE
  const dre = useMemo(() => {
    const modalidadesMap = new Map<string, Map<string, Map<string, number>>>();
    
    // Inicializar estrutura
    for (const lanc of lancamentosPeriodo) {
      // Tentar obter categoria do fornecedor ou do lançamento
      let categoria = lanc.categoria;
      
      if (!categoria && lanc.fornecedorId) {
        const fornecedor = fornecedores.find(f => f.id === lanc.fornecedorId);
        if (fornecedor) {
          categoria = fornecedor.categoria;
        }
      }
      
      if (!categoria) {
        // Categorizar como "a reclassificar"
        categoria = lanc.tipo === 'pagar' ? 'Saídas a Reclassificar' : 'Entradas a Reclassificar';
      }
      
      // Buscar estrutura DRE da categoria
      const catDRE = findCategoria(categoria);
      // Entradas sem categoria vão para RECEITAS (não OUTRAS RECEITAS/DESPESAS)
      const modalidadeFallback = lanc.tipo === 'receber' ? 'RECEITAS' : 'OUTRAS RECEITAS/DESPESAS';
      const grupoFallback = lanc.tipo === 'receber' ? 'Receitas Diretas' : (lanc.tipo === 'pagar' ? 'Outras Saídas' : 'Outras Entradas');
      const modalidade = catDRE?.modalidade || modalidadeFallback;
      const grupo = catDRE?.grupo || grupoFallback;
      
      // Adicionar ao mapa
      if (!modalidadesMap.has(modalidade)) {
        modalidadesMap.set(modalidade, new Map());
      }
      const gruposMap = modalidadesMap.get(modalidade)!;
      
      if (!gruposMap.has(grupo)) {
        gruposMap.set(grupo, new Map());
      }
      const categoriasMap = gruposMap.get(grupo)!;
      
      const valorAtual = categoriasMap.get(categoria) || 0;
      const valorLanc = parseValorFlexivel(lanc.valor);
      categoriasMap.set(categoria, valorAtual + valorLanc);
    }
    
    // Converter para estrutura final
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
        
        grupos.push({
          grupo,
          categorias: categorias.sort((a, b) => b.valor - a.valor),
          total: totalGrupo,
        });
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
  }, [lancamentosPeriodo, fornecedores]);
  
  // Calcular totais do DRE
  const totais = useMemo(() => {
    let receitas = 0;
    let deducoes = 0;
    let cpv = 0;
    let despesas = 0;
    
    for (const mod of dre) {
      if (mod.modalidade === 'RECEITAS' || mod.modalidade === 'RECEITAS FINANCEIRAS') {
        receitas += mod.total;
      } else if (mod.modalidade === 'DEDUÇÕES') {
        deducoes += mod.total;
      } else if (mod.modalidade === 'CUSTOS DE PRODUTO VENDIDO') {
        cpv += mod.total;
      } else if (mod.modalidade === 'OUTRAS RECEITAS/DESPESAS') {
        // Separar entradas e saídas dentro de OUTRAS
        for (const g of mod.grupos) {
          for (const cat of g.categorias) {
            if (cat.categoria.toLowerCase().includes('entrada') || g.grupo.toLowerCase().includes('entrada')) {
              receitas += cat.valor;
            } else {
              despesas += cat.valor;
            }
          }
        }
      } else if (mod.tipo === 'DESPESAS') {
        despesas += mod.total;
      }
    }
    
    const receitaLiquida = receitas - deducoes;
    const lucroBruto = receitaLiquida - cpv;
    const resultadoOperacional = lucroBruto - despesas;
    
    return {
      receitas,
      deducoes,
      receitaLiquida,
      cpv,
      lucroBruto,
      despesas,
      resultadoOperacional,
    };
  }, [dre]);
  
  // Contar lançamentos excluídos para feedback
  const lancamentosExcluidos = useMemo(() => {
    return lancamentos.filter(l => l.pago && TIPOS_EXCLUIDOS_DRE.includes(l.tipo)).length;
  }, [lancamentos]);
  
  const mesLabel = mesesDisponiveis.find(m => m.value === mesAno)?.label || mesAno;

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
            {/* Toggle Mensal/Anual + Seletor de mês */}
            <div className="flex flex-col gap-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'mensal' | 'anual')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="mensal" className="text-xs gap-1">
                    <Calendar className="h-3 w-3" />
                    Mensal
                  </TabsTrigger>
                  <TabsTrigger value="anual" className="text-xs gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Anual {hoje.getFullYear()}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {lancamentosPeriodo.length} lançamentos
                  {lancamentosExcluidos > 0 && (
                    <span className="text-muted-foreground/70"> ({lancamentosExcluidos} mov. financeiras excluídas)</span>
                  )}
                </p>
                {viewMode === 'mensal' && (
                  <Select value={mesAno} onValueChange={setMesAno}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
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
              </div>
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
                  <span>(-) CUSTOS DE PRODUTO VENDIDO</span>
                  <span>{formatCurrency(-totais.cpv)}</span>
                </div>
                {dre
                  .filter(m => m.modalidade === 'CUSTOS DE PRODUTO VENDIDO')
                  .map(mod => (
                    <DREModalidadeRow key={mod.modalidade} modalidade={mod} />
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Componente para linha de modalidade expandível
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
