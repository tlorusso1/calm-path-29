import { useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContaFluxo, Fornecedor } from '@/types/focus-mode';
import { ORDEM_MODALIDADES_DRE } from '@/data/categorias-dre';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { format } from 'date-fns';

interface OrcadoRealizadoSectionProps {
  contasFluxo: ContaFluxo[];
  fornecedores: Fornecedor[];
  isOpen: boolean;
  onToggle: () => void;
}

interface LinhaOrcadoRealizado {
  categoria: string;
  modalidade: string;
  orcado: number;
  realizado: number;
  variacao: number; // absoluta
  variacaoPerc: number; // percentual
  isReceita: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrcadoRealizadoSection({ contasFluxo, fornecedores, isOpen, onToggle }: OrcadoRealizadoSectionProps) {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  const mesAnoKey = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}`;

  const linhas = useMemo(() => {
    const contasMes = contasFluxo.filter(c => c.dataVencimento?.startsWith(mesAnoKey));
    
    // Ignorar tipos que não impactam DRE
    const tiposIgnorados = ['intercompany', 'aplicacao', 'resgate'];
    const contasRelevantes = contasMes.filter(c => !tiposIgnorados.includes(c.tipo));

    // Agrupar por categoria
    const categorias = new Map<string, { orcado: number; realizado: number; modalidade: string; isReceita: boolean }>();

    for (const conta of contasRelevantes) {
      const cat = conta.categoria || (conta.tipo === 'receber' ? 'Entradas a Reclassificar' : 'Saídas a Reclassificar');
      
      // Determinar modalidade a partir do fornecedor ou tipo
      let modalidade = '';
      let isReceita = conta.tipo === 'receber';
      
      if (conta.fornecedorId) {
        const forn = fornecedores.find(f => f.id === conta.fornecedorId);
        if (forn) {
          modalidade = forn.modalidade;
          isReceita = modalidade === 'RECEITAS' || modalidade === 'RECEITAS FINANCEIRAS';
        }
      }
      
      if (!modalidade) {
        modalidade = isReceita ? 'RECEITAS' : 'OUTRAS RECEITAS/DESPESAS';
      }

      const existing = categorias.get(cat) || { orcado: 0, realizado: 0, modalidade, isReceita };
      const valor = parseValorFlexivel(conta.valor?.toString() || '');

      if (conta.pago && conta.conciliado) {
        existing.realizado += valor;
      }
      // Orçado: tudo que estava previsto (incluindo o que já foi pago)
      existing.orcado += valor;
      
      categorias.set(cat, existing);
    }

    // Converter para array ordenado por modalidade
    const resultado: LinhaOrcadoRealizado[] = [];
    for (const [categoria, dados] of categorias) {
      const variacao = dados.realizado - dados.orcado;
      resultado.push({
        categoria,
        modalidade: dados.modalidade,
        orcado: dados.orcado,
        realizado: dados.realizado,
        variacao,
        variacaoPerc: dados.orcado !== 0 ? (variacao / dados.orcado) * 100 : 0,
        isReceita: dados.isReceita,
      });
    }

    // Ordenar por modalidade (seguindo ordem DRE)
    resultado.sort((a, b) => {
      const idxA = ORDEM_MODALIDADES_DRE.indexOf(a.modalidade);
      const idxB = ORDEM_MODALIDADES_DRE.indexOf(b.modalidade);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    return resultado;
  }, [contasFluxo, fornecedores, mesAnoKey]);

  // Totalizadores
  const totais = useMemo(() => {
    const receitas = linhas.filter(l => l.isReceita);
    const despesas = linhas.filter(l => !l.isReceita);
    
    const recOrcado = receitas.reduce((s, l) => s + l.orcado, 0);
    const recRealizado = receitas.reduce((s, l) => s + l.realizado, 0);
    const despOrcado = despesas.reduce((s, l) => s + l.orcado, 0);
    const despRealizado = despesas.reduce((s, l) => s + l.realizado, 0);
    
    return {
      recOrcado, recRealizado,
      despOrcado, despRealizado,
      resultadoOrcado: recOrcado - despOrcado,
      resultadoRealizado: recRealizado - despRealizado,
    };
  }, [linhas]);

  const meses = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
    { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' },
  ];

  // Variação com cor: para receitas, realizado > orcado = verde; para despesas, realizado < orcado = verde
  function getVariacaoColor(linha: LinhaOrcadoRealizado): string {
    if (linha.variacao === 0) return 'text-muted-foreground';
    if (linha.isReceita) {
      return linha.variacao > 0 ? 'text-emerald-600' : 'text-red-500';
    }
    return linha.variacao < 0 ? 'text-emerald-600' : 'text-red-500';
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-10 px-3 hover:bg-muted/50">
          <span className="flex items-center gap-2 text-sm font-medium">
            📊 Orçado vs Realizado
          </span>
          <div className="flex items-center gap-2">
            {totais.resultadoRealizado !== 0 && (
              <Badge variant={totais.resultadoRealizado >= 0 ? 'default' : 'destructive'} className="text-xs">
                {formatCurrency(totais.resultadoRealizado)}
              </Badge>
            )}
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        {/* Seletor de mês */}
        <div className="flex items-center gap-2">
          <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(a => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados para {meses[mesSelecionado - 1]?.label}/{anoSelecionado}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs text-right">Orçado</TableHead>
                  <TableHead className="text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-xs text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Receitas */}
                {linhas.filter(l => l.isReceita).length > 0 && (
                  <>
                    <TableRow className="bg-emerald-500/10">
                      <TableCell colSpan={4} className="text-xs font-bold py-1.5">RECEITAS</TableCell>
                    </TableRow>
                    {linhas.filter(l => l.isReceita).map((linha, i) => (
                      <TableRow key={`r-${i}`}>
                        <TableCell className="text-xs py-1.5 max-w-[140px] truncate">{linha.categoria}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 tabular-nums">{formatCurrency(linha.orcado)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 tabular-nums">{formatCurrency(linha.realizado)}</TableCell>
                        <TableCell className={`text-xs text-right py-1.5 tabular-nums ${getVariacaoColor(linha)}`}>
                          {linha.variacao >= 0 ? '+' : ''}{formatCurrency(linha.variacao)}
                          {linha.variacaoPerc !== 0 && (
                            <span className="text-[10px] ml-1">({linha.variacaoPerc > 0 ? '+' : ''}{linha.variacaoPerc.toFixed(0)}%)</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t">
                      <TableCell className="text-xs font-semibold py-1.5">Subtotal Receitas</TableCell>
                      <TableCell className="text-xs text-right font-semibold py-1.5 tabular-nums">{formatCurrency(totais.recOrcado)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold py-1.5 tabular-nums">{formatCurrency(totais.recRealizado)}</TableCell>
                      <TableCell className={`text-xs text-right font-semibold py-1.5 tabular-nums ${totais.recRealizado >= totais.recOrcado ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(totais.recRealizado - totais.recOrcado)}
                      </TableCell>
                    </TableRow>
                  </>
                )}

                {/* Despesas */}
                {linhas.filter(l => !l.isReceita).length > 0 && (
                  <>
                    <TableRow className="bg-red-500/10">
                      <TableCell colSpan={4} className="text-xs font-bold py-1.5">DESPESAS</TableCell>
                    </TableRow>
                    {linhas.filter(l => !l.isReceita).map((linha, i) => (
                      <TableRow key={`d-${i}`}>
                        <TableCell className="text-xs py-1.5 max-w-[140px] truncate">{linha.categoria}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 tabular-nums">{formatCurrency(linha.orcado)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 tabular-nums">{formatCurrency(linha.realizado)}</TableCell>
                        <TableCell className={`text-xs text-right py-1.5 tabular-nums ${getVariacaoColor(linha)}`}>
                          {linha.variacao >= 0 ? '+' : ''}{formatCurrency(linha.variacao)}
                          {linha.variacaoPerc !== 0 && (
                            <span className="text-[10px] ml-1">({linha.variacaoPerc > 0 ? '+' : ''}{linha.variacaoPerc.toFixed(0)}%)</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t">
                      <TableCell className="text-xs font-semibold py-1.5">Subtotal Despesas</TableCell>
                      <TableCell className="text-xs text-right font-semibold py-1.5 tabular-nums">{formatCurrency(totais.despOrcado)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold py-1.5 tabular-nums">{formatCurrency(totais.despRealizado)}</TableCell>
                      <TableCell className={`text-xs text-right font-semibold py-1.5 tabular-nums ${totais.despRealizado <= totais.despOrcado ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(totais.despRealizado - totais.despOrcado)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-xs font-bold">RESULTADO</TableCell>
                  <TableCell className="text-xs text-right font-bold tabular-nums">{formatCurrency(totais.resultadoOrcado)}</TableCell>
                  <TableCell className="text-xs text-right font-bold tabular-nums">{formatCurrency(totais.resultadoRealizado)}</TableCell>
                  <TableCell className={`text-xs text-right font-bold tabular-nums ${totais.resultadoRealizado >= totais.resultadoOrcado ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(totais.resultadoRealizado - totais.resultadoOrcado)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
