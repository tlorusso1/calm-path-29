import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { FocusMode, SupplyChainStage, ItemEstoque, TipoEstoque, MovimentacaoEstoque, DEFAULT_SUPPLYCHAIN_DATA, Orcamento, CanalVenda, CANAIS_VENDA } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePasteInput } from '@/components/ui/date-paste-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoberturaChart } from '@/components/CoberturaChart';
import { SaidasChart } from '@/components/SaidasChart';
import { FichaTecnicaBOM } from '@/components/FichaTecnicaBOM';
import { OrcamentosTab } from '@/components/OrcamentosTab';
import { 
  processarSupply, 
  TIPO_LABELS, 
  REGRAS_COBERTURA,
  TIPOS_PRODUTO_FINAL,
  TIPOS_INSUMO,
  calcularDiasAteVencimento,
  parsearListaEstoque,
  calcularDemandaDerivadaBOM,
} from '@/utils/supplyCalculator';
import {
  parsearMovimentacoes,
  calcularDemandaSemanalPorItem,
  calcularCMVPorSaidas,
  calcularReceitaBruta,
  topProdutosPorSaida,
  normalizarNomeProduto,
  calcularDadosPorSKU,
} from '@/utils/movimentacoesParser';
import { deduplicarMovimentacoes } from '@/utils/movimentacoesParser';
import { PrecoMedioSKUCard } from '@/components/PrecoMedioSKUCard';

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
  const [localizacaoImport, setLocalizacaoImport] = useState('');
  const [textoMovimentacoes, setTextoMovimentacoes] = useState('');
  const [canalImportMov, setCanalImportMov] = useState<string>('');
  const [tabAtiva, setTabAtiva] = useState('itens');
  const [filtroTipo, setFiltroTipo] = useState<TipoEstoque | 'todos'>('todos');
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [mostrarRevisaoValidade, setMostrarRevisaoValidade] = useState(false);
  const [itensParaRevisar, setItensParaRevisar] = useState<ItemEstoque[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const movFileInputRef = useRef<HTMLInputElement>(null);

  const data: SupplyChainStage = useMemo(() => {
    const raw = { ...DEFAULT_SUPPLYCHAIN_DATA, ...mode.supplyChainData };
    // Migrar itens com tipo 'insumo' → 'materia_prima'
    const migrated = raw.itens.some((i: any) => i.tipo === 'insumo');
    if (migrated) {
      raw.itens = raw.itens.map((i: any) => i.tipo === 'insumo' ? { ...i, tipo: 'materia_prima' as TipoEstoque } : i);
      onUpdateSupplyChainData({ itens: raw.itens });
    }
    return raw;
  }, [mode.supplyChainData]);

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
        // UPSERT: Atualizar quantidade e localização - preserva demandaSemanal e dataValidade
        todosItens[idxExistente] = {
          ...todosItens[idxExistente],
          quantidade: itemImportado.quantidade,
          ...(localizacaoImport.trim() ? { localizacao: localizacaoImport.trim() } : {}),
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
          ...(localizacaoImport.trim() ? { localizacao: localizacaoImport.trim() } : {}),
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

  const processarMovimentacoesTexto = (texto: string) => {
    let novas = parsearMovimentacoes(texto);
    if (novas.length === 0) {
      toast({ title: "Nenhuma movimentação encontrada", description: "Verifique o formato do CSV.", variant: "destructive" });
      return;
    }
    
    // Aplicar canal selecionado às saídas
    if (canalImportMov && canalImportMov !== '' && canalImportMov !== 'all') {
      const canal = canalImportMov as CanalVenda;
      novas = novas.map(m => m.tipo === 'saida' ? { ...m, canal } : m);
    }
    
    const movExistentes = data.movimentacoes || [];
    const { resultado: todasMovimentacoes, novasAdicionadas, duplicatasIgnoradas } = deduplicarMovimentacoes(movExistentes, novas);
    const demandaMap = calcularDemandaSemanalPorItem(todasMovimentacoes);
    
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
      description: `${saidas} saídas, ${entradas} entradas. ${novasAdicionadas} novas${itensAtualizados > 0 ? `. Demanda: ${itensAtualizados} produtos` : ''}${descDuplicatas}`,
    });
    flushSave?.();
    setTextoMovimentacoes('');
  };

  const handleImportMovFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();

    reader.onerror = () => {
      toast({ title: `Erro ao ler ${file.name}`, variant: 'destructive' });
    };

    reader.onload = (evt) => {
      try {
        let textoCSV = '';
        if (isCsv) {
          textoCSV = String(evt.target?.result ?? '');
        } else {
          const arrayBuffer = evt.target?.result;
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          textoCSV = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
        }
        processarMovimentacoesTexto(textoCSV);
      } catch (err) {
        toast({ title: `Erro ao processar ${file.name}`, description: String(err), variant: 'destructive' });
      }
    };

    if (isCsv) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }

    if (movFileInputRef.current) movFileInputRef.current.value = '';
  };

  const handleImportXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    setImportFeedback({ type: 'loading', message: `Lendo ${selectedFiles.length} arquivo(s)...` });
    toast({ title: '📂 Lendo arquivo(s)...', description: `${selectedFiles.length} arquivo(s) selecionado(s)` });

    let totalNovos = 0;
    let totalAtualizados = 0;
    let totalLinhasLidas = 0;
    let filesProcessed = 0;
    let aparentaSerMovimentacoes = false;

    const todosItens = [...data.itens];

    const aplicarItensImportados = (itensImportados: Partial<ItemEstoque>[]) => {
      itensImportados.forEach(itemImportado => {
        if (!itemImportado.nome || !itemImportado.quantidade) return;
        const nomeNormalizado = normalizarNomeProduto(itemImportado.nome);
        const idxExistente = todosItens.findIndex(i => normalizarNomeProduto(i.nome) === nomeNormalizado);

        if (idxExistente >= 0) {
          todosItens[idxExistente] = {
            ...todosItens[idxExistente],
            quantidade: itemImportado.quantidade,
            ...(localizacaoImport.trim() ? { localizacao: localizacaoImport.trim() } : {}),
          };
          totalAtualizados++;
        } else {
          todosItens.push({
            id: crypto.randomUUID(),
            nome: itemImportado.nome,
            tipo: itemImportado.tipo || 'produto_acabado',
            quantidade: itemImportado.quantidade,
            unidade: itemImportado.unidade || 'un',
            ...(localizacaoImport.trim() ? { localizacao: localizacaoImport.trim() } : {}),
          });
          totalNovos++;
        }
      });
    };

    const pareceArquivoMovimentacoes = (linhas: string[]) => {
      const top = linhas.slice(0, 3).join(' ').toLowerCase();
      return top.includes('produto') && top.includes('data') && (top.includes('movimenta') || top.includes('saida') || top.includes('entrada') || top.includes('tipo'));
    };

    const finalizarSeConcluido = () => {
      filesProcessed++;
      if (filesProcessed !== selectedFiles.length) return;

      if (totalNovos === 0 && totalAtualizados === 0) {
        const msg = aparentaSerMovimentacoes
          ? 'Esse arquivo parece ser de Movimentações. Use a aba "Mov." para importar saídas/entradas.'
          : `${totalLinhasLidas} linhas lidas mas nenhum item reconhecido. Verifique se a planilha tem colunas de nome e quantidade.`;

        setImportFeedback({ type: 'error', message: msg });
        toast({ title: 'Nenhum item encontrado', description: msg, variant: 'destructive' });
        return;
      }

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

      onUpdateSupplyChainData({ itens: todosItens });
      const sucessoMsg = `${totalAtualizados} atualizados, ${totalNovos} novos (${totalLinhasLidas} linhas lidas)`;
      setImportFeedback({ type: 'success', message: sucessoMsg });
      toast({ title: '✅ Planilha Importada', description: sucessoMsg });
      flushSave?.();
    };

    selectedFiles.forEach((file) => {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const reader = new FileReader();

      reader.onerror = () => {
        const msg = `Não foi possível abrir ${file.name}.`;
        setImportFeedback({ type: 'error', message: msg });
        toast({ title: `Erro ao ler ${file.name}`, description: msg, variant: 'destructive' });
        finalizarSeConcluido();
      };

      reader.onload = (evt) => {
        try {
          if (isCsv) {
            const textoCsv = String(evt.target?.result ?? '');
            const linhasCsv = textoCsv.split(/\r?\n/).filter(Boolean);
            totalLinhasLidas += linhasCsv.length;
            if (pareceArquivoMovimentacoes(linhasCsv)) aparentaSerMovimentacoes = true;
            aplicarItensImportados(parsearListaEstoque(textoCsv));
          } else {
            const arrayBuffer = evt.target?.result;
            const wb = XLSX.read(arrayBuffer, { type: 'array' });

            for (const sheetName of wb.SheetNames) {
              const ws = wb.Sheets[sheetName];
              const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
              if (rows.length < 2) continue;

              totalLinhasLidas += rows.length;
              const linhas = rows.map(r => r.join('\t'));
              if (pareceArquivoMovimentacoes(linhas)) aparentaSerMovimentacoes = true;
              const texto = linhas.join('\n');
              aplicarItensImportados(parsearListaEstoque(texto));
            }
          }
        } catch (err) {
          const msg = String(err);
          setImportFeedback({ type: 'error', message: msg });
          toast({ title: `Erro ao ler ${file.name}`, description: msg, variant: 'destructive' });
        }

        finalizarSeConcluido();
      };

      if (isCsv) reader.readAsText(file, 'utf-8');
      else reader.readAsArrayBuffer(file);
    });

    e.target.value = '';
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

  // Demanda derivada via BOM para insumos/embalagens
  const demandaBOM = useMemo(() => 
    calcularDemandaDerivadaBOM(data.itens, data.fichasTecnicas ?? [], data.demandaSemanalMedia),
    [data.itens, data.fichasTecnicas, data.demandaSemanalMedia]
  );

  // Processar itens com cobertura calculada
  const itensProcessados = data.itens.map(item => {
    const isInsumo = TIPOS_INSUMO.includes(item.tipo);
    const keyInsumo = normalizarNomeProduto(item.nome);
    const demandaDerivada = demandaBOM.get(keyInsumo);
    
    let demanda: number;
    if (isInsumo && demandaDerivada !== undefined && demandaDerivada > 0) {
      demanda = demandaDerivada;
    } else {
      demanda = item.demandaSemanal ?? data.demandaSemanalMedia;
    }
    
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

  // Calcular valor do estoque — separado por categoria
  const valorEstoque = useMemo(() => {
    let custoProdutoAcabado = 0;
    let custoInsumos = 0;
    let itensComPreco = 0;
    const tiposInsumo: TipoEstoque[] = ['embalagem', 'materia_prima'];
    
    for (const item of data.itens) {
      if (item.precoCusto && item.precoCusto > 0) {
        const total = item.quantidade * item.precoCusto;
        if (tiposInsumo.includes(item.tipo)) {
          custoInsumos += total;
        } else {
          custoProdutoAcabado += total;
        }
        itensComPreco++;
      }
    }
    
    // Estimar investimento em produção: soma de custoProducao dos itens com esse campo
    let investimentoProducao = 0;
    for (const item of data.itens) {
      if (item.custoProducao && item.custoProducao > 0 && !tiposInsumo.includes(item.tipo)) {
        investimentoProducao += item.quantidade * item.custoProducao;
      }
    }
    
    return {
      custoProdutoAcabado,
      custoInsumos,
      custoTotal: custoProdutoAcabado + custoInsumos,
      valorVendavel: custoProdutoAcabado * 3, // Margem 3x só para produto acabado
      investimentoProducao,
      itensComPreco,
      totalItens: data.itens.length,
    };
  }, [data.itens]);

  // Localizações disponíveis para filtro
  const localizacoes = useMemo(() => {
    const locs = new Set<string>();
    for (const item of data.itens) {
      if (item.localizacao) locs.add(item.localizacao);
    }
    return Array.from(locs).sort();
  }, [data.itens]);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Ordem dos tipos para agrupamento nos alertas
  const TIPO_ORDER_ALERT: TipoEstoque[] = ['produto_acabado', 'acessorio', 'brinde', 'material_pdv', 'embalagem', 'materia_prima'];

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
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">💰 Valor em Estoque</span>
                <span className="text-[10px] text-muted-foreground">
                  ({valorEstoque.itensComPreco}/{valorEstoque.totalItens} itens com preço)
                </span>
              </div>
              
              {/* Produto Acabado */}
              {valorEstoque.custoProdutoAcabado > 0 && (
                <div className="p-2 rounded border border-green-500/20 bg-green-50/50 dark:bg-green-950/10">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">📦 Produto Acabado</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Custo</p>
                      <p className="text-sm font-medium">{formatCurrency(valorEstoque.custoProdutoAcabado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Vendável (3x)</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-500">
                        {formatCurrency(valorEstoque.valorVendavel)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Insumos / Matéria-Prima / Embalagem */}
              {valorEstoque.custoInsumos > 0 && (
                <div className="p-2 rounded border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">🧪 Insumos / Embalagens / MP</p>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Capital Investido</p>
                    <p className="text-sm font-medium text-amber-600">{formatCurrency(valorEstoque.custoInsumos)}</p>
                  </div>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Total em estoque</span>
                <span className="text-sm font-bold">{formatCurrency(valorEstoque.custoTotal)}</span>
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




          {/* Alertas */}
          {/* Alertas como Lista Estruturada */}
          {(itensProcessados.some(i => i.status === 'vermelho' && ['produto_acabado', 'acessorio', 'brinde', 'material_pdv'].includes(i.tipo)) || 
            itensProcessados.some(i => i.status === 'amarelo' && ['produto_acabado', 'acessorio', 'brinde', 'material_pdv'].includes(i.tipo)) ||
            itensProcessados.some(i => {
              const dias = calcularDiasAteVencimento(i.dataValidade);
              return dias !== null && dias < 90;
            })) && (
            <div className="pt-3 border-t border-border space-y-3">
              {/* Ruptura Iminente - produtos visíveis + insumos em dropdown */}
              {(() => {
                const produtosRuptura = itensProcessados.filter(
                  i => i.status === 'vermelho' && TIPOS_PRODUTO_FINAL.includes(i.tipo)
                );
                const insumosRuptura = itensProcessados.filter(
                  i => i.status === 'vermelho' && ['materia_prima', 'embalagem'].includes(i.tipo)
                );
                if (produtosRuptura.length === 0 && insumosRuptura.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-destructive text-sm">
                        Ruptura Iminente
                      </span>
                    </div>

                    {produtosRuptura.length > 0 && renderAlertGroupedByTipo(
                      produtosRuptura,
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

                    {insumosRuptura.length > 0 && (
                      <details className="rounded-md border border-border bg-muted/30 px-2 py-1">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Ver insumos/MP/embalagens em ruptura ({insumosRuptura.length})
                        </summary>
                        <div className="mt-2">
                          {renderAlertGroupedByTipo(
                            insumosRuptura,
                            (item) => (
                              <>
                                <span>{item.nome}</span>
                                {item.coberturaDias !== undefined && (
                                  <span className="text-muted-foreground font-medium">
                                    ({item.coberturaDias}d)
                                  </span>
                                )}
                              </>
                            )
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}

              {/* Cobertura Baixa - apenas produtos acabados */}
              {(() => {
                const produtosBaixa = itensProcessados
                  .filter(i => i.status === 'amarelo' && ['produto_acabado', 'acessorio', 'brinde', 'material_pdv'].includes(i.tipo))
                  .sort((a, b) => (a.coberturaDias ?? 999) - (b.coberturaDias ?? 999));
                if (produtosBaixa.length === 0) return null;
                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-yellow-600 text-sm">
                        Cobertura Baixa (Atenção)
                      </span>
                    </div>
                    {renderAlertGroupedByTipo(
                      produtosBaixa,
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
                );
              })()}

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
            <TabsList className="grid w-full grid-cols-8 mb-4">
              <TabsTrigger value="itens" className="text-[10px] px-0.5">Adicionar</TabsTrigger>
              <TabsTrigger value="colar" className="text-[10px] px-0.5">Estoques</TabsTrigger>
              <TabsTrigger value="movimentacoes" className="text-[10px] px-0.5">Mov.</TabsTrigger>
              <TabsTrigger value="bom" className="text-[10px] px-0.5">BOM</TabsTrigger>
              <TabsTrigger value="cobertura" className="text-[10px] px-0.5">Cobertura</TabsTrigger>
              <TabsTrigger value="producao" className="text-[10px] px-0.5">Produção</TabsTrigger>
              <TabsTrigger value="analise" className="text-[10px] px-0.5">Análise</TabsTrigger>
              <TabsTrigger value="orcamentos" className="text-[10px] px-0.5">Orçam.</TabsTrigger>
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Depósito / Localização</Label>
                <Input
                  placeholder="Ex: Cross Do, WBM, JundCoco..."
                  value={localizacaoImport}
                  onChange={(e) => setLocalizacaoImport(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Textarea
                placeholder="Cole sua lista aqui...&#10;Formato: Nome | Tipo | Quantidade | Unidade&#10;Ou: Nome - 450un"
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                rows={5}
              />
              <Button onClick={handleColarLista} className="w-full" size="sm" disabled={!textoColado.trim()}>
                <FileText className="h-4 w-4 mr-2" /> Importar Lista (Texto)
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={handleImportXlsx}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" /> Importar Planilhas (.xlsx, .csv)
              </Button>
              {importFeedback.type !== 'idle' && (
                <p className={cn(
                  "text-[11px]",
                  importFeedback.type === 'error' ? "text-destructive" : "text-muted-foreground"
                )}>
                  {importFeedback.type === 'loading' ? '⏳ ' : importFeedback.type === 'success' ? '✅ ' : '⚠️ '}
                  {importFeedback.message}
                </p>
              )}
            </TabsContent>

            <TabsContent value="movimentacoes" className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Canal de venda (para saídas)</Label>
                <Select value={canalImportMov} onValueChange={(v) => setCanalImportMov(v as CanalVenda | '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos / Não especificado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos / Não especificado</SelectItem>
                    {CANAIS_VENDA.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input
                ref={movFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImportMovFile}
              />
              <Button
                onClick={() => movFileInputRef.current?.click()}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" /> Importar Arquivo (.csv, .xlsx)
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou cole abaixo</span>
                </div>
              </div>
              <Textarea
                placeholder={"Cole o CSV de entradas ou saídas aqui...\nFormato esperado: separado por ; com cabeçalho"}
                value={textoMovimentacoes}
                onChange={(e) => setTextoMovimentacoes(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={() => processarMovimentacoesTexto(textoMovimentacoes)}
                className="w-full" 
                size="sm" 
                disabled={!textoMovimentacoes.trim()}
              >
                <ArrowDownUp className="h-4 w-4 mr-2" /> Importar do Texto
              </Button>
              
              {data.movimentacoes && data.movimentacoes.length > 0 && (() => {
                const datas = data.movimentacoes!
                  .map(m => m.data)
                  .filter(d => d && d !== '')
                  .sort();
                const dataMin = datas.length > 0 ? datas[0] : null;
                const dataMax = datas.length > 0 ? datas[datas.length - 1] : null;
                const formatDate = (d: string) => {
                  const parts = d.split('-');
                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
                };
                return (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-center space-y-0.5">
                    <div>{data.movimentacoes!.length} movimentações acumuladas</div>
                    {dataMin && dataMax && (
                      <div className="font-medium text-foreground/70">
                        📅 Período: {formatDate(dataMin)} até {formatDate(dataMax)}
                      </div>
                    )}
                    {data.ultimaImportacaoMov && (
                      <div>Última importação: {new Date(data.ultimaImportacaoMov).toLocaleDateString('pt-BR')}</div>
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
                );
              })()}
            </TabsContent>

            {/* ========== ABA BOM (FICHA TÉCNICA) ========== */}
            <TabsContent value="bom" className="space-y-3">
              <FichaTecnicaBOM
                fichasTecnicas={data.fichasTecnicas ?? []}
                itens={data.itens}
                onUpdate={(fichas) => onUpdateSupplyChainData({ fichasTecnicas: fichas })}
              />
            </TabsContent>

            {/* ========== ABA COBERTURA ========== */}
            <TabsContent value="cobertura" className="space-y-3">
              {(() => {
                const itensComCobertura = itensProcessados
                  .filter(i => i.coberturaDias !== undefined && i.coberturaDias !== null)
                  .map(i => ({ nome: i.nome, coberturaDias: i.coberturaDias!, tipo: i.tipo }));
                if (itensComCobertura.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">Nenhum item com dados de cobertura. Importe movimentações para calcular.</p>;
                }

                const allTipos: TipoEstoque[] = ['produto_acabado', 'acessorio', 'brinde', 'material_pdv', 'embalagem', 'materia_prima'];
                const gruposPorTipo = allTipos
                  .map(tipo => ({
                    tipo,
                    itens: itensComCobertura.filter(i => i.tipo === tipo),
                  }))
                  .filter(g => g.itens.length > 0);

                return (
                  <Accordion type="multiple" defaultValue={['produto_acabado']} className="space-y-2">
                    {gruposPorTipo.map(({ tipo, itens: grupoItens }) => (
                      <AccordionItem key={tipo} value={tipo} className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-3 py-2 text-xs font-semibold hover:no-underline">
                          {TIPO_LABELS[tipo]} ({grupoItens.length})
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <CoberturaChart itens={grupoItens} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                );
              })()}
            </TabsContent>

            {/* ========== ABA PRODUÇÃO ========== */}
            <TabsContent value="producao" className="space-y-3">
              {(() => {
                const demandaGlobal = data.demandaSemanalMedia || 0;
                const itensParaProduzir = itensProcessados
                  .filter(i => TIPOS_PRODUTO_FINAL.includes(i.tipo))
                  .map(i => {
                    const regra = REGRAS_COBERTURA[i.tipo];
                    const metaDias = regra.ideal;
                    const demanda = i.demandaSemanal ?? demandaGlobal;
                    if (demanda <= 0) {
                      return {
                        nome: i.nome,
                        tipo: i.tipo,
                        atual: i.quantidade,
                        coberturaDias: i.coberturaDias,
                        metaDias,
                        qtdIdeal: null as number | null,
                        precisaProduzir: null as number | null,
                        demandaDiaria: 0,
                        semDemanda: true,
                      };
                    }
                    const demandaDiaria = demanda / 7;
                    const qtdIdeal = Math.ceil(demandaDiaria * metaDias);
                    const precisaProduzir = Math.max(0, qtdIdeal - i.quantidade);
                    return {
                      nome: i.nome,
                      tipo: i.tipo,
                      atual: i.quantidade,
                      coberturaDias: i.coberturaDias,
                      metaDias,
                      qtdIdeal,
                      precisaProduzir,
                      demandaDiaria,
                      semDemanda: false,
                    };
                  })
                  .sort((a, b) => {
                    if (a.semDemanda && !b.semDemanda) return 1;
                    if (!a.semDemanda && b.semDemanda) return -1;
                    return (b.precisaProduzir ?? 0) - (a.precisaProduzir ?? 0);
                  });

                if (itensParaProduzir.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">Nenhum item cadastrado.</p>;
                }

                const precisam = itensParaProduzir.filter(i => !i.semDemanda && i.precisaProduzir && i.precisaProduzir > 0);
                const suficientes = itensParaProduzir.filter(i => !i.semDemanda && (i.precisaProduzir === 0 || i.precisaProduzir === null));
                const semDados = itensParaProduzir.filter(i => i.semDemanda);

                return (
                  <div className="space-y-4">
                    <p className="text-[11px] text-muted-foreground">
                      Quantidade necessária para atingir a cobertura ideal. Use a data estimada de produção para simular o estoque futuro.
                    </p>

                    {precisam.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-destructive">🔴 Precisam produzir ({precisam.length})</p>
                        {precisam.map((item, idx) => {
                          const storageKey = `prod_data_${normalizarNomeProduto(item.nome)}`;
                          const savedDate = data.datasProducao?.[normalizarNomeProduto(item.nome)] ?? '';
                          
                          // Simulação: se tiver data estimada, calcular estoque na data
                          let simulacao: { estoqueNaData: number; precisaProduzirSimulado: number; diasAteProducao: number } | null = null;
                          if (savedDate && item.demandaDiaria > 0) {
                            const hoje = new Date();
                            hoje.setHours(0, 0, 0, 0);
                            const dataProducao = new Date(savedDate + 'T00:00:00');
                            const diasAteProducao = Math.max(0, Math.ceil((dataProducao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
                            const consumoAteLa = Math.round(item.demandaDiaria * diasAteProducao);
                            const estoqueNaData = Math.max(0, item.atual - consumoAteLa);
                            const qtdIdealNaData = Math.ceil(item.demandaDiaria * item.metaDias);
                            const precisaProduzirSimulado = Math.max(0, qtdIdealNaData - estoqueNaData);
                            simulacao = { estoqueNaData, precisaProduzirSimulado, diasAteProducao };
                          }

                          return (
                            <div key={idx} className="p-2 rounded border border-destructive/20 bg-destructive/5 text-xs space-y-1.5">
                              <div className="flex justify-between items-baseline">
                                <span className="text-foreground font-medium">{item.nome}</span>
                                <span className="font-bold text-destructive whitespace-nowrap ml-2">
                                  +{simulacao ? simulacao.precisaProduzirSimulado : item.precisaProduzir} un
                                </span>
                              </div>
                              <div className="flex gap-3 text-[10px] text-muted-foreground">
                                <span>Atual: {item.atual} un ({item.coberturaDias ?? '?'}d)</span>
                                <span>Meta: {item.qtdIdeal} un ({item.metaDias}d)</span>
                              </div>
                              
                              {/* Simulador de data de produção */}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Pronto em:</span>
                                <input
                                  type="date"
                                  className="h-7 text-[11px] bg-background border border-border rounded px-1.5 w-[130px]"
                                  value={savedDate}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => {
                                    const novasDatas = { ...(data.datasProducao ?? {}), [normalizarNomeProduto(item.nome)]: e.target.value };
                                    onUpdateSupplyChainData({ datasProducao: novasDatas });
                                  }}
                                />
                                {savedDate && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                    onClick={() => {
                                      const novasDatas = { ...(data.datasProducao ?? {}) };
                                      delete novasDatas[normalizarNomeProduto(item.nome)];
                                      onUpdateSupplyChainData({ datasProducao: novasDatas });
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {simulacao && (() => {
                                const coberturas = [45, 60, 90];
                                return (
                                  <div className="bg-muted/50 rounded p-1.5 text-[10px] space-y-0.5">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Em {simulacao.diasAteProducao}d, estoque será:</span>
                                      <span className={cn("font-medium", simulacao.estoqueNaData === 0 ? "text-destructive" : "text-foreground")}>
                                        {simulacao.estoqueNaData} un
                                      </span>
                                    </div>
                                    <div className="border-t border-border/50 my-1 pt-1 space-y-0.5">
                                      {coberturas.map(dias => {
                                        const qtd = Math.max(0, Math.ceil(item.demandaDiaria * dias) - simulacao.estoqueNaData);
                                        return (
                                          <div key={dias} className="flex justify-between">
                                            <span className="text-muted-foreground">Produzir p/ {dias}d cobertura:</span>
                                            <span className={cn("font-medium", dias === item.metaDias ? "font-bold text-primary" : "text-foreground")}>
                                              {qtd} un
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {simulacao.estoqueNaData === 0 && (
                                      <p className="text-destructive font-medium mt-0.5">⚠️ Ruptura antes da produção ficar pronta!</p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {suficientes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-green-600">✅ Estoque suficiente ({suficientes.length})</p>
                        {suficientes.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-muted-foreground py-0.5">
                            <span>{item.nome}</span>
                            <span>{item.coberturaDias ?? '?'}d / meta {item.metaDias}d</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {semDados.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">⚠️ Sem dados de demanda ({semDados.length})</p>
                        {semDados.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-muted-foreground/60 py-0.5">
                            <span>{item.nome}</span>
                            <span>{item.atual} un</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* ========== ABA ANÁLISE: Saídas por Produto ========== */}
            <TabsContent value="analise" className="space-y-3">
              {/* Preço Médio por SKU */}
              {(() => {
                const skuData = calcularDadosPorSKU(data.movimentacoes || [], 90);
                return skuData.length > 0 ? <PrecoMedioSKUCard skus={skuData} /> : null;
              })()}

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

            {/* ========== ABA ORÇAMENTOS ========== */}
            <TabsContent value="orcamentos" className="space-y-3">
              <OrcamentosTab
                orcamentos={data.orcamentos ?? []}
                onUpdateOrcamentos={(orcamentos) => onUpdateSupplyChainData({ orcamentos })}
                produtosAcabados={(data.itens ?? []).filter(i => i.tipo === 'produto_acabado').map(i => i.nome)}
              />
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
          <CardContent className="space-y-3">
            {/* Filtros por tipo */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={filtroTipo === 'todos' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setFiltroTipo('todos')}
              >
                Todos
              </Button>
              {(['produto_acabado', 'acessorio', 'brinde', 'material_pdv', 'embalagem', 'materia_prima'] as TipoEstoque[])
                .filter(t => itensProcessados.some(i => i.tipo === t))
                .map(t => (
                  <Button
                    key={t}
                    variant={filtroTipo === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setFiltroTipo(filtroTipo === t ? 'todos' : t)}
                  >
                    {TIPO_LABELS[t]} ({itensProcessados.filter(i => i.tipo === t).length})
                  </Button>
                ))}
            </div>

            {/* Filtro por localização */}
            {localizacoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground self-center mr-1">📍</span>
                <Button
                  variant={filtroLocal === 'todos' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={() => setFiltroLocal('todos')}
                >
                  Todos
                </Button>
                {localizacoes.map(loc => (
                  <Button
                    key={loc}
                    variant={filtroLocal === loc ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => setFiltroLocal(filtroLocal === loc ? 'todos' : loc)}
                  >
                    {loc}
                  </Button>
                ))}
              </div>
            )}

            <ScrollArea className={cn(itensProcessados.length > 5 ? "h-[500px]" : "h-auto")}>
              <div className="space-y-2">
                {[...itensProcessados]
                  .filter(i => filtroTipo === 'todos' || i.tipo === filtroTipo)
                  .filter(i => filtroLocal === 'todos' || i.localizacao === filtroLocal)
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((item) => {
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                {TIPO_LABELS[item.tipo]}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    onUpdateItem(item.id, { quantidade: val ? parseFloat(val) : 0 });
                                  }}
                                  className="h-6 w-20 text-xs text-center font-medium"
                                />
                                <span className="text-[10px]">{item.unidade}</span>
                              </div>
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
                              {item.localizacao && (
                                <span>• 📍{item.localizacao}</span>
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

                        {/* Localização */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            📍 Local:
                          </Label>
                          <Input
                            placeholder="Depósito..."
                            value={item.localizacao ?? ''}
                            onChange={(e) => onUpdateItem(item.id, { 
                              localizacao: e.target.value || undefined 
                            })}
                            className="h-7 w-28 sm:w-32 text-xs"
                          />
                        </div>

                        {/* Custo Produção (só para produto acabado) */}
                        {!['embalagem', 'materia_prima'].includes(item.tipo) && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">
                              C.Prod:
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                placeholder="0,00"
                                value={item.custoProducao ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onUpdateItem(item.id, { 
                                    custoProducao: val ? parseFloat(val) : undefined 
                                  });
                                }}
                                className="h-7 w-28 sm:w-32 text-xs pl-7"
                              />
                            </div>
                          </div>
                        )}

                        {/* Validade - só para produto acabado e matéria-prima */}
                        {['produto_acabado', 'materia_prima'].includes(item.tipo) && (
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
                        )}
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
