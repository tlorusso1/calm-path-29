import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FocusMode, SupplyChainStage, ItemEstoque, TipoEstoque, MovimentacaoEstoque, DEFAULT_SUPPLYCHAIN_DATA } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePasteInput } from '@/components/ui/date-paste-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Truck,
  Check,
  ArrowDownUp,
  TrendingUp,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoberturaChart } from '@/components/CoberturaChart';
import { SaidasChart } from '@/components/SaidasChart';
import { 
  processarSupply, 
  TIPO_LABELS, 
  REGRAS_COBERTURA,
  calcularDiasAteVencimento,
  parsearListaEstoque 
} from '@/utils/supplyCalculator';
import {
  parsearMovimentacoes,
  calcularDemandaSemanalPorItem,
  calcularCMVPorSaidas,
  calcularReceitaBruta,
  topProdutosPorSaida,
  normalizarNomeProduto,
} from '@/utils/movimentacoesParser';
import { deduplicarMovimentacoes } from '@/utils/movimentacoesParser';

interface SupplyChainModeProps {
  mode: FocusMode;
  onUpdateSupplyChainData: (data: Partial<SupplyChainStage>) => void;
  onAddItem: (item: Omit<ItemEstoque, 'id'>) => void;
  onUpdateItem: (id: string, data: Partial<ItemEstoque>) => void;
  onRemoveItem: (id: string) => void;
  flushSave?: () => Promise<void>;
}

export function SupplyChainMode({
  mode,
  onUpdateSupplyChainData,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  flushSave,
}: SupplyChainModeProps) {
  const { user } = useAuth();
  const [novoItem, setNovoItem] = useState({
    nome: '',
    tipo: 'produto_acabado' as TipoEstoque,
    quantidade: '',
    unidade: 'un',
    demandaSemanal: '',
    dataValidade: '',
    precoCusto: '',
  });
  const [textoColado, setTextoColado] = useState('');
  const [textoMovimentacoes, setTextoMovimentacoes] = useState('');
  const [tabAtiva, setTabAtiva] = useState('itens');
  const [mostrarRevisaoValidade, setMostrarRevisaoValidade] = useState(false);
  const [itensParaRevisar, setItensParaRevisar] = useState<ItemEstoque[]>([]);

  const data: SupplyChainStage = {
    ...DEFAULT_SUPPLYCHAIN_DATA,
    ...mode.supplyChainData,
  };

  // Processar resumo
  const resumo = processarSupply(data);

  const handleAddItem = () => {
    if (!novoItem.nome.trim() || !novoItem.quantidade) return;

    onAddItem({
      nome: novoItem.nome.trim(),
      tipo: novoItem.tipo,
      quantidade: parseFloat(novoItem.quantidade) || 0,
      unidade: novoItem.unidade,
      demandaSemanal: novoItem.demandaSemanal ? parseFloat(novoItem.demandaSemanal) : undefined,
      dataValidade: novoItem.dataValidade || undefined,
      precoCusto: novoItem.precoCusto ? parseFloat(novoItem.precoCusto) : undefined,
    });
    flushSave?.();

    setNovoItem({
      nome: '',
      tipo: 'produto_acabado',
      quantidade: '',
      unidade: 'un',
      demandaSemanal: '',
      dataValidade: '',
      precoCusto: '',
    });
  };

  const handleColarLista = () => {
    const itensImportados = parsearListaEstoque(textoColado);
    const itensAtualizados: string[] = [];
    let novosItens = 0;
    
    // Construir lista final de itens (cópia mutável)
    const todosItens = [...data.itens];

    itensImportados.forEach(itemImportado => {
      if (!itemImportado.nome || !itemImportado.quantidade) return;
      
      // Procurar item existente pelo nome (normalizado)
      const nomeNormalizado = normalizarNomeProduto(itemImportado.nome);
      const idxExistente = todosItens.findIndex(
        i => normalizarNomeProduto(i.nome) === nomeNormalizado
      );
      
      if (idxExistente >= 0) {
        // UPSERT: Atualizar APENAS quantidade - preserva demandaSemanal e dataValidade
        todosItens[idxExistente] = {
          ...todosItens[idxExistente],
          quantidade: itemImportado.quantidade,
        };
        itensAtualizados.push(todosItens[idxExistente].nome);
      } else {
        // Criar novo item
        const novoId = crypto.randomUUID();
        todosItens.push({
          id: novoId,
          nome: itemImportado.nome,
          tipo: itemImportado.tipo || 'produto_acabado',
          quantidade: itemImportado.quantidade,
          unidade: itemImportado.unidade || 'un',
        });
        novosItens++;
      }
    });

    // Recalcular demanda semanal se já existem movimentações
    const movs = data.movimentacoes ?? [];
    if (movs.length > 0) {
      const demandaMap = calcularDemandaSemanalPorItem(movs);
      for (let i = 0; i < todosItens.length; i++) {
        const key = normalizarNomeProduto(todosItens[i].nome);
        const demanda = demandaMap.get(key);
        if (demanda !== undefined) {
          todosItens[i] = { ...todosItens[i], demandaSemanal: demanda };
        }
      }
    }

    // Atualizar tudo de uma vez
    onUpdateSupplyChainData({ itens: todosItens });
    
    // Mostrar modal de revisão se houver itens atualizados com validade
    const itensComValidade = todosItens.filter(i => 
      itensAtualizados.includes(i.nome) && i.dataValidade
    );
    
    if (itensComValidade.length > 0) {
      setItensParaRevisar(itensComValidade);
      setMostrarRevisaoValidade(true);
    }
    
    // Toast com resumo da importação
    toast({
      title: "Estoque Atualizado",
      description: `${itensAtualizados.length} itens atualizados${novosItens > 0 ? `, ${novosItens} novos` : ''}`,
    });
    flushSave?.();
    
    setTextoColado('');
  };

  const formatarDataValidade = (data: string | undefined) => {
    if (!data) return '—';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (status: 'verde' | 'amarelo' | 'vermelho' | undefined) => {
    switch (status) {
      case 'verde': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'amarelo': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'vermelho': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusColor = (status: 'verde' | 'amarelo' | 'vermelho' | undefined) => {
    switch (status) {
      case 'verde': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'amarelo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'vermelho': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Processar itens com cobertura calculada
  const itensProcessados = data.itens.map(item => {
    const demanda = item.demandaSemanal ?? data.demandaSemanalMedia;
    let coberturaDias: number | undefined;
    let status: 'verde' | 'amarelo' | 'vermelho' | undefined;

    if (demanda > 0) {
      coberturaDias = Math.round(item.quantidade / (demanda / 7));
      const regra = REGRAS_COBERTURA[item.tipo];
      if (coberturaDias < regra.critico) status = 'vermelho';
      else if (coberturaDias < regra.atencao) status = 'amarelo';
      else status = 'verde';
    }

    return { ...item, coberturaDias, status };
  });

  // Calcular valor do estoque
  const valorEstoque = useMemo(() => {
    let custo = 0;
    let itensComPreco = 0;
    
    for (const item of data.itens) {
      if (item.precoCusto && item.precoCusto > 0) {
        custo += item.quantidade * item.precoCusto;
        itensComPreco++;
      }
    }
    
    return {
      custoProdutos: custo,
      valorVendavel: custo * 3, // Margem 3x
      itensComPreco,
      totalItens: data.itens.length,
    };
  }, [data.itens]);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Ordem dos tipos para agrupamento nos alertas
  const TIPO_ORDER_ALERT: TipoEstoque[] = ['produto_acabado', 'acessorio', 'brinde', 'material_pdv', 'embalagem', 'insumo', 'materia_prima'];

  // Helper: renderiza lista de itens agrupada por tipo
  function renderAlertGroupedByTipo<T extends { id: string; tipo: TipoEstoque }>(
    itens: T[],
    renderItem: (item: T) => React.ReactNode
  ) {
    const grouped = new Map<TipoEstoque, T[]>();
    for (const item of itens) {
      const list = grouped.get(item.tipo) || [];
      list.push(item);
      grouped.set(item.tipo, list);
    }

    const tipos = TIPO_ORDER_ALERT.filter(t => grouped.has(t));
    const showHeaders = tipos.length > 1;

    return (
      <div className="ml-6 space-y-1">
        {tipos.map(tipo => (
          <div key={tipo}>
            {showHeaders && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 mb-0.5">
                {TIPO_LABELS[tipo]}
              </p>
            )}
            <ul className="space-y-0.5">
              {grouped.get(tipo)!.map(item => (
                <li key={item.id} className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>•</span>
                  {renderItem(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== DEMANDA SEMANAL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4" />
            Demanda Real (Base do Supply)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Pedidos/semana (média últimas 4 semanas)
            </Label>
            <Input
              type="number"
              placeholder="Ex: 200"
              value={data.demandaSemanalMedia || ''}
              onChange={(e) => onUpdateSupplyChainData({ 
                demandaSemanalMedia: parseFloat(e.target.value) || 0 
              })}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground italic">
              Este valor é usado para calcular a cobertura de produtos acabados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== VISÃO EXECUTIVA ========== */}
      <Card className={cn(
        "border-2",
        resumo.statusGeral === 'verde' ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10' :
        resumo.statusGeral === 'amarelo' ? 'border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10' :
        'border-destructive/30 bg-destructive/5'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            📊 Visão Executiva
            <Button
              variant="outline"
              size="sm"
              className="ml-2 h-8 px-3 text-xs gap-1.5"
              onClick={() => {
                if (!user?.id) return;
                const link = `https://intranet.tasks-thiago-edition.nicefoods.com.br/estoques/${user.id}`;
                navigator.clipboard.writeText(link);
                toast({ title: 'Link copiado!', description: 'Compartilhe com seu time.' });
              }}
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Compartilhar
            </Button>
            <Badge className={cn("ml-auto", getStatusColor(resumo.statusGeral))}>
              {resumo.statusGeral === 'verde' ? 'Saudável' :
               resumo.statusGeral === 'amarelo' ? 'Atenção' : 'Crítico'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Produtos */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Produtos Acabados</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(resumo.coberturaProdutos !== null ? 
                  (resumo.coberturaProdutos >= 30 ? 'verde' : resumo.coberturaProdutos >= 15 ? 'amarelo' : 'vermelho') 
                  : undefined
                )}
                <span className="font-medium">
                  {resumo.coberturaProdutos !== null ? `${resumo.coberturaProdutos}d` : '—'}
                </span>
              </div>
            </div>

            {/* Embalagens */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Embalagens</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(resumo.coberturaEmbalagens !== null ? 
                  (resumo.coberturaEmbalagens >= 60 ? 'verde' : resumo.coberturaEmbalagens >= 30 ? 'amarelo' : 'vermelho') 
                  : undefined
                )}
                <span className="font-medium">
                  {resumo.coberturaEmbalagens !== null ? `${resumo.coberturaEmbalagens}d` : '—'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 💰 Valor do Estoque */}
          {valorEstoque.itensComPreco > 0 && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">💰 Valor do Estoque</span>
                <span className="text-[10px] text-muted-foreground">
                  ({valorEstoque.itensComPreco}/{valorEstoque.totalItens} itens com preço)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Custo Total</p>
                  <p className="text-sm font-medium">{formatCurrency(valorEstoque.custoProdutos)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Valor Vendável (3x)</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-500">
                    {formatCurrency(valorEstoque.valorVendavel)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 📈 Resumo Movimentações / CMV */}
          {data.movimentacoes && data.movimentacoes.length > 0 && (() => {
            const saidas = data.movimentacoes!.filter(m => m.tipo === 'saida');
            if (saidas.length === 0) return null;
            const cmv = calcularCMVPorSaidas(data.movimentacoes!);
            const receita = calcularReceitaBruta(data.movimentacoes!);
            const margem = receita > 0 ? ((receita - cmv) / receita * 100) : 0;
            const top5 = topProdutosPorSaida(data.movimentacoes!, 5, 30);
            const totalUnidades = saidas.reduce((acc, s) => acc + s.quantidade, 0);

            return (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">📊 Movimentações ({saidas.length} saídas)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">CMV (Custo Real)</p>
                    <p className="text-sm font-medium text-amber-600">{formatCurrency(cmv)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Receita Bruta</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(receita)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Margem Bruta</p>
                    <p className={cn("text-sm font-medium", margem >= 50 ? "text-green-600" : margem >= 30 ? "text-yellow-600" : "text-destructive")}>
                      {margem.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Unidades</p>
                    <p className="text-sm font-medium">{totalUnidades}</p>
                  </div>
                </div>
                {top5.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Top Produtos (últimos 30d)</p>
                    {top5.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="truncate mr-2">{p.produto}</span>
                        <span className="text-muted-foreground whitespace-nowrap">{p.quantidade} un</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 📊 Gráfico de Cobertura */}
          {(() => {
            const itensComCobertura = itensProcessados
              .filter(i => i.coberturaDias !== undefined && i.coberturaDias !== null)
              .map(i => ({ nome: i.nome, coberturaDias: i.coberturaDias!, tipo: i.tipo }));
            if (itensComCobertura.length === 0) return null;
            return (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">📊 Cobertura por Produto</p>
                <CoberturaChart itens={itensComCobertura} />
              </div>
            );
          })()}

          {/* Alertas */}
          {/* Alertas como Lista Estruturada */}
          {(itensProcessados.some(i => i.status === 'vermelho') || 
            itensProcessados.some(i => {
              const dias = calcularDiasAteVencimento(i.dataValidade);
              return dias !== null && dias < 90;
            })) && (
            <div className="pt-3 border-t border-border space-y-3">
              {/* Ruptura Iminente */}
              {itensProcessados.some(i => i.status === 'vermelho') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive text-sm">
                      Ruptura Iminente
                    </span>
                  </div>
                  {renderAlertGroupedByTipo(
                    itensProcessados.filter(i => i.status === 'vermelho'),
                    (item) => (
                      <>
                        <span>{item.nome}</span>
                        {item.coberturaDias !== undefined && (
                          <span className="text-destructive font-medium">
                            ({item.coberturaDias}d)
                          </span>
                        )}
                      </>
                    )
                  )}
                </div>
              )}

              {/* Cobertura Baixa (Amarelos) */}
              {itensProcessados.some(i => i.status === 'amarelo') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-yellow-600 text-sm">
                      Cobertura Baixa (Atenção)
                    </span>
                  </div>
                  {renderAlertGroupedByTipo(
                    itensProcessados
                      .filter(i => i.status === 'amarelo')
                      .sort((a, b) => (a.coberturaDias ?? 999) - (b.coberturaDias ?? 999)),
                    (item) => (
                      <>
                        <span>{item.nome}</span>
                        {item.coberturaDias !== undefined && (
                          <span className="text-yellow-600 font-medium">
                            ({item.coberturaDias}d)
                          </span>
                        )}
                      </>
                    )
                  )}
                </div>
              )}

              {/* Acelerar Vendas - validade < cobertura */}
              {(() => {
                const itensParaAcelerar = itensProcessados
                  .map(item => ({
                    ...item,
                    diasVenc: calcularDiasAteVencimento(item.dataValidade)
                  }))
                  .filter(item => 
                    item.diasVenc !== null && 
                    item.coberturaDias !== undefined &&
                    item.diasVenc! > 30 &&
                    item.diasVenc! < (item.coberturaDias! + 30)
                  )
                  .sort((a, b) => (a.diasVenc ?? 999) - (b.diasVenc ?? 999));

                if (itensParaAcelerar.length === 0) return null;

                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔥</span>
                      <span className="font-medium text-orange-600 text-sm">
                        Acelerar Vendas
                      </span>
                    </div>
                    {renderAlertGroupedByTipo(
                      itensParaAcelerar,
                      (item) => (
                        <>
                          <span>{item.nome}</span>
                          <span className="text-orange-600 font-medium">
                            (vence: {item.diasVenc}d, estoque: {item.coberturaDias}d)
                          </span>
                        </>
                      )
                    )}
                  </div>
                );
              })()}

              {/* Vencendo em Breve - 3 níveis */}
              {(() => {
                const itensComVencimento = itensProcessados
                  .map(item => ({
                    ...item,
                    diasVenc: calcularDiasAteVencimento(item.dataValidade)
                  }))
                  .filter(item => item.diasVenc !== null && item.diasVenc < 90)
                  .sort((a, b) => (a.diasVenc ?? 999) - (b.diasVenc ?? 999));

                if (itensComVencimento.length === 0) return null;

                const criticos = itensComVencimento.filter(i => i.diasVenc !== null && i.diasVenc < 30);
                const alerta = itensComVencimento.filter(i => i.diasVenc !== null && i.diasVenc >= 30 && i.diasVenc < 60);
                const aviso = itensComVencimento.filter(i => i.diasVenc !== null && i.diasVenc >= 60 && i.diasVenc < 90);

                return (
                  <div className="space-y-2">
                    {criticos.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive text-sm">
                            Vencimento Crítico (&lt;30d)
                          </span>
                        </div>
                        {renderAlertGroupedByTipo(
                          criticos,
                          (item) => (
                            <>
                              <span>{item.nome}</span>
                              <span className="text-destructive font-medium">({item.diasVenc}d)</span>
                            </>
                          )
                        )}
                      </div>
                    )}
                    {alerta.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-yellow-600 text-sm">
                            Vencendo em Breve (30-60d)
                          </span>
                        </div>
                        {renderAlertGroupedByTipo(
                          alerta,
                          (item) => (
                            <>
                              <span>{item.nome}</span>
                              <span className="text-yellow-600 font-medium">({item.diasVenc}d)</span>
                            </>
                          )
                        )}
                      </div>
                    )}
                    {aviso.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground text-sm">
                            Atenção Vencimento (60-90d)
                          </span>
                        </div>
                        {renderAlertGroupedByTipo(
                          aviso,
                          (item) => (
                            <>
                              <span>{item.nome}</span>
                              <span className="font-medium">({item.diasVenc}d)</span>
                            </>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== GESTÃO DE ITENS ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            Itens do Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="itens">Adicionar</TabsTrigger>
              <TabsTrigger value="colar">Estoques</TabsTrigger>
              <TabsTrigger value="movimentacoes" className="flex items-center gap-1">
                <ArrowDownUp className="h-3 w-3" />
                Mov.
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Análise
              </TabsTrigger>
            </TabsList>

            <TabsContent value="itens" className="space-y-4">
              {/* Form de novo item */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    placeholder="Nome do item"
                    value={novoItem.nome}
                    onChange={(e) => setNovoItem(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                <Select 
                  value={novoItem.tipo} 
                  onValueChange={(v) => setNovoItem(prev => ({ ...prev, tipo: v as TipoEstoque }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto_acabado">Produto Acabado</SelectItem>
                    <SelectItem value="acessorio">Acessório</SelectItem>
                    <SelectItem value="brinde">Brinde</SelectItem>
                    <SelectItem value="material_pdv">Material PDV</SelectItem>
                    <SelectItem value="embalagem">Embalagem</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem(prev => ({ ...prev, quantidade: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="un"
                    value={novoItem.unidade}
                    onChange={(e) => setNovoItem(prev => ({ ...prev, unidade: e.target.value }))}
                    className="w-16"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Demanda/sem (opcional)"
                  value={novoItem.demandaSemanal}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, demandaSemanal: e.target.value }))}
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    placeholder="Custo un."
                    value={novoItem.precoCusto}
                    onChange={(e) => setNovoItem(prev => ({ ...prev, precoCusto: e.target.value }))}
                    className="pl-7"
                  />
                </div>
                <DatePasteInput
                  placeholder="Validade"
                  value={novoItem.dataValidade}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, dataValidade: e.target.value }))}
                />
              </div>
              <Button onClick={handleAddItem} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Item
              </Button>
            </TabsContent>

            <TabsContent value="colar" className="space-y-3">
              <Textarea
                placeholder="Cole sua lista aqui...&#10;Formato: Nome | Tipo | Quantidade | Unidade&#10;Ou: Nome - 450un"
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                rows={5}
              />
              <Button onClick={handleColarLista} className="w-full" size="sm" disabled={!textoColado.trim()}>
                <FileText className="h-4 w-4 mr-2" /> Importar Lista
              </Button>
            </TabsContent>

            <TabsContent value="movimentacoes" className="space-y-3">
              <Textarea
                placeholder={"Cole o CSV de entradas ou saídas aqui...\nFormato esperado: separado por ; com cabeçalho"}
                value={textoMovimentacoes}
                onChange={(e) => setTextoMovimentacoes(e.target.value)}
                rows={5}
              />
              <Button 
                onClick={() => {
                  const novas = parsearMovimentacoes(textoMovimentacoes);
                  if (novas.length === 0) {
                    toast({ title: "Nenhuma movimentação encontrada", description: "Verifique o formato do CSV.", variant: "destructive" });
                    return;
                  }
                  
                  const movExistentes = data.movimentacoes || [];
                  
                  // Deduplicar por conteúdo (tipo+produto+qtd+data), não por ID de linha
                  const { resultado: todasMovimentacoes, novasAdicionadas, duplicatasIgnoradas } = deduplicarMovimentacoes(movExistentes, novas);
                  
                  // Recalcular demanda semanal dos itens (usando normalizarNomeProduto consistente)
                  const demandaMap = calcularDemandaSemanalPorItem(todasMovimentacoes);
                  
                  // Atualizar itens com demanda calculada numa única operação atômica
                  let itensAtualizados = 0;
                  const itensComDemandaAtualizada = data.itens.map(item => {
                    const key = normalizarNomeProduto(item.nome);
                    const demanda = demandaMap.get(key);
                    if (demanda !== undefined) {
                      itensAtualizados++;
                      return { ...item, demandaSemanal: demanda };
                    }
                    return item;
                  });
                  
                  const saidas = novas.filter(m => m.tipo === 'saida').length;
                  const entradas = novas.filter(m => m.tipo === 'entrada').length;
                  
                  onUpdateSupplyChainData({ 
                    movimentacoes: todasMovimentacoes,
                    ultimaImportacaoMov: new Date().toISOString(),
                    itens: itensComDemandaAtualizada,
                  });
                  
                  const descDuplicatas = duplicatasIgnoradas > 0 ? ` (${duplicatasIgnoradas} duplicatas ignoradas)` : '';
                  toast({
                    title: "Movimentações Importadas",
                    description: `${saidas} saídas, ${entradas} entradas no CSV. ${novasAdicionadas} novas adicionadas${itensAtualizados > 0 ? `. Demanda atualizada para ${itensAtualizados} produtos` : ''}${descDuplicatas}`,
                  });
                  flushSave?.();
                  setTextoMovimentacoes('');
                }}
                className="w-full" 
                size="sm" 
                disabled={!textoMovimentacoes.trim()}
              >
                <ArrowDownUp className="h-4 w-4 mr-2" /> Importar Movimentações
              </Button>
              
              {data.movimentacoes && data.movimentacoes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-center">
                    {data.movimentacoes.length} movimentações acumuladas
                    {data.ultimaImportacaoMov && (
                      <span> • Última: {new Date(data.ultimaImportacaoMov).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10">
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
                        Limpar Movimentações
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar todas as movimentações?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso vai zerar as {data.movimentacoes.length} movimentações acumuladas (saídas e entradas). 
                          Os itens de estoque e demais dados <strong>não serão afetados</strong>.
                          Após limpar, reimporte o CSV uma vez para começar do zero sem duplicatas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            onUpdateSupplyChainData({
                              movimentacoes: [],
                              ultimaImportacaoMov: undefined,
                            });
                            flushSave?.();
                            toast({
                              title: "Movimentações zeradas",
                              description: "Reimporte o CSV para começar do zero.",
                            });
                          }}
                        >
                          Limpar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </TabsContent>

            {/* ========== ABA ANÁLISE: Saídas por Produto ========== */}
            <TabsContent value="analise" className="space-y-3">
              {/* Gráficos de tendência de saídas */}
              <SaidasChart movimentacoes={data.movimentacoes || []} />

              {(() => {
                const movs = data.movimentacoes || [];
                const saidas = movs.filter(m => m.tipo === 'saida');

                if (saidas.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma saída importada ainda. Importe um CSV na aba Mov.
                    </p>
                  );
                }

                const corte30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

                // Agrupar saídas por produto — últimos 30 dias
                const porProduto = new Map<string, {
                  nome: string;
                  totalQtd: number;
                  totalReceita: number;
                  transacoes: number;
                  datasUnicas: Set<string>;
                }>();

                for (const s of saidas) {
                  const dataStr = s.data.includes('T') ? s.data : s.data + 'T00:00:00';
                  const ts = new Date(dataStr).getTime();
                  if (isNaN(ts) || ts < corte30d) continue;

                  const key = s.produto;
                  if (!porProduto.has(key)) {
                    porProduto.set(key, { nome: s.produto, totalQtd: 0, totalReceita: 0, transacoes: 0, datasUnicas: new Set() });
                  }
                  const entry = porProduto.get(key)!;
                  entry.totalQtd += s.quantidade;
                  entry.transacoes += 1;
                  entry.datasUnicas.add(s.data.split('T')[0]);
                  if (s.valorUnitarioVenda && s.valorUnitarioVenda > 0) {
                    entry.totalReceita += s.quantidade * s.valorUnitarioVenda;
                  }
                }

                if (porProduto.size === 0) {
                  return (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma saída nos últimos 30 dias.
                    </p>
                  );
                }

                // Calcular período real das saídas (mínimo 7 dias)
                const datasAll = saidas.map(s => new Date(s.data.includes('T') ? s.data : s.data + 'T00:00:00').getTime()).filter(d => !isNaN(d));
                const minData = Math.min(...datasAll);
                const maxData = Math.max(...datasAll, Date.now());
                const periodoDias = Math.max(7, (maxData - minData) / (24 * 60 * 60 * 1000));
                const periodoSemanas = periodoDias / 7;

                const linhas = Array.from(porProduto.values())
                  .sort((a, b) => b.totalQtd - a.totalQtd);

                return (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">
                      Saídas dos últimos 30 dias · período real: {Math.round(periodoDias)}d ({periodoSemanas.toFixed(1)} sem)
                    </p>
                    <ScrollArea className="h-[340px]">
                      <div className="space-y-1 pr-2">
                        {/* Header */}
                        <div className="grid grid-cols-4 gap-1 text-[9px] font-medium text-muted-foreground uppercase pb-1 border-b border-border">
                          <span className="col-span-2">Produto</span>
                          <span className="text-right">Total 30d</span>
                          <span className="text-right">Média/sem</span>
                        </div>
                        {linhas.map((p, idx) => {
                          const mediaSemanal = Math.round((p.totalQtd / periodoSemanas) * 10) / 10;
                          return (
                            <div key={idx} className="grid grid-cols-4 gap-1 py-1.5 border-b border-border/40 items-center">
                              <span className="col-span-2 text-xs truncate" title={p.nome}>{p.nome}</span>
                              <div className="text-right">
                                <span className="text-xs font-medium">{p.totalQtd}</span>
                                <span className="text-[9px] text-muted-foreground ml-0.5">un</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold text-primary">{mediaSemanal}</span>
                                <span className="text-[9px] text-muted-foreground ml-0.5">/sem</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <p className="text-[10px] text-muted-foreground text-right">
                      {linhas.length} produtos · {saidas.filter(s => {
                        const ts = new Date(s.data.includes('T') ? s.data : s.data + 'T00:00:00').getTime();
                        return !isNaN(ts) && ts >= corte30d;
                      }).reduce((a, s) => a + s.quantidade, 0).toLocaleString('pt-BR')} unidades no total
                    </p>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ========== LISTA DE ITENS ========== */}
      {itensProcessados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Estoque Atual ({itensProcessados.length} itens)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className={cn(itensProcessados.length > 5 ? "h-[500px]" : "h-auto")}>
              <div className="space-y-2">
                {[...itensProcessados].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((item) => {
                  const diasVenc = calcularDiasAteVencimento(item.dataValidade);
                  const usandoGlobal = item.demandaSemanal === undefined;
                  
                  return (
                    <div 
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        item.status === 'vermelho' ? 'border-destructive/50 bg-destructive/5' :
                        item.status === 'amarelo' ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10' :
                        'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(item.status)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{item.nome}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {TIPO_LABELS[item.tipo]}
                              </Badge>
                              <span>{item.quantidade} {item.unidade}</span>
                              {item.coberturaDias !== undefined && (
                                <span className="font-medium">• {item.coberturaDias}d</span>
                              )}
                              {diasVenc !== null && diasVenc < 60 && (
                                <span className={cn(
                                  "font-medium",
                                  diasVenc < 30 ? "text-destructive" : "text-yellow-600"
                                )}>
                                  • Vence em {diasVenc}d
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Campos editáveis: Tipo + Saída semanal + Validade */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {/* Tipo */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Tipo:
                          </Label>
                          <Select
                            value={item.tipo}
                            onValueChange={(v) => onUpdateItem(item.id, { tipo: v as TipoEstoque })}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="produto_acabado">Produto Acabado</SelectItem>
                              <SelectItem value="acessorio">Acessório</SelectItem>
                              <SelectItem value="brinde">Brinde</SelectItem>
                              <SelectItem value="material_pdv">Material PDV</SelectItem>
                              <SelectItem value="embalagem">Embalagem</SelectItem>
                              <SelectItem value="insumo">Insumo</SelectItem>
                              <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Saída semanal */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Saída/sem:
                          </Label>
                          <Input
                            type="number"
                            placeholder={usandoGlobal ? `~${data.demandaSemanalMedia || 0}` : ""}
                            value={item.demandaSemanal ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateItem(item.id, { 
                                demandaSemanal: val ? parseFloat(val) : undefined 
                              });
                            }}
                            className="h-7 w-24 sm:w-28 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">un</span>
                          {usandoGlobal && data.demandaSemanalMedia > 0 && (
                            <span className="text-[10px] text-muted-foreground italic">
                              (global)
                            </span>
                          )}
                        </div>

                        {/* Preço Custo */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Custo un.:
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              placeholder="0,00"
                              value={item.precoCusto ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateItem(item.id, { 
                                  precoCusto: val ? parseFloat(val) : undefined 
                                });
                              }}
                              className="h-7 w-28 sm:w-32 text-xs pl-7"
                            />
                          </div>
                          {item.precoCusto && item.precoCusto > 0 && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              = {formatCurrency(item.quantidade * item.precoCusto)}
                            </span>
                          )}
                        </div>

                        {/* Validade */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Validade:
                          </Label>
                          <DatePasteInput
                            value={item.dataValidade ?? ''}
                            onChange={(e) => onUpdateItem(item.id, { 
                              dataValidade: e.target.value || undefined 
                            })}
                            className="h-7 w-32 sm:w-36 text-xs"
                          />
                          {diasVenc !== null && (
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                diasVenc < 30 ? "border-destructive text-destructive" :
                                diasVenc < 60 ? "border-yellow-500 text-yellow-600" :
                                diasVenc < 90 ? "border-muted-foreground text-muted-foreground" :
                                "border-green-500 text-green-600"
                              )}
                            >
                              {diasVenc}d
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ========== TEXTO ÂNCORA ========== */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground italic text-center">
          "Supply não olha clique. Supply olha saída real."
        </p>
      </div>

      {/* ========== MODAL DE REVISÃO DE VALIDADES ========== */}
      <Dialog open={mostrarRevisaoValidade} onOpenChange={setMostrarRevisaoValidade}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Revisar Validades
            </DialogTitle>
            <DialogDescription>
              Estes itens foram atualizados e têm validade cadastrada. 
              Alguma validade mudou?
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {itensParaRevisar.map(item => {
                const diasVenc = calcularDiasAteVencimento(item.dataValidade);
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence: {formatarDataValidade(item.dataValidade)}
                        {diasVenc !== null && (
                          <span className={cn(
                            "ml-1",
                            diasVenc < 30 ? "text-destructive" :
                            diasVenc < 60 ? "text-yellow-600" : ""
                          )}>
                            ({diasVenc}d)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <DatePasteInput
                        value={item.dataValidade ?? ''}
                        onChange={(e) => {
                          onUpdateItem(item.id, { 
                            dataValidade: e.target.value || undefined 
                          });
                          // Atualizar a lista local para refletir a mudança
                          setItensParaRevisar(prev => 
                            prev.map(i => i.id === item.id 
                              ? { ...i, dataValidade: e.target.value || undefined }
                              : i
                            )
                          );
                        }}
                        className="h-8 w-32 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button 
              onClick={() => setMostrarRevisaoValidade(false)}
              className="w-full"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
