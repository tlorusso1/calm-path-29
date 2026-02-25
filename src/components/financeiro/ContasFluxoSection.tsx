import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Plus, ArrowDownCircle, ArrowUpCircle, ImageIcon, Loader2, AlertTriangle, Clock, History, CheckCircle2, Calendar, Trash2, RefreshCw, Building2, List, Search, Copy, Upload, FileUp, Check } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ContaFluxo, ContaAnexo, Fornecedor, ContaFluxoTipo } from '@/types/focus-mode';
import { format, parseISO, isAfter, isBefore, isToday, addDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { toast } from 'sonner';
import { ContaItem } from './ContaItem';

interface ContasFluxoSectionProps {
  contas: ContaFluxo[];
  fornecedores?: Fornecedor[];
  onAddConta: (conta: Omit<ContaFluxo, 'id'>) => void;
  onAddMultipleContas?: (contas: Omit<ContaFluxo, 'id'>[]) => void;
  onUpdateConta?: (id: string, updates: Partial<ContaFluxo>) => void;
  onRemoveConta: (id: string) => void;
  onTogglePago: (id: string) => void;
  onToggleAgendado?: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ContasFluxoSection({
  contas,
  fornecedores = [],
  onAddConta,
  onAddMultipleContas,
  onUpdateConta,
  onRemoveConta,
  onTogglePago,
  onToggleAgendado,
  isOpen,
  onToggle,
}: ContasFluxoSectionProps) {
  const [tipo, setTipo] = useState<'pagar' | 'receber' | 'intercompany'>('pagar');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  // Duplicata detection on add
  const [duplicataDialog, setDuplicataDialog] = useState<{
    candidata: ContaFluxo;
    novaConta: Omit<ContaFluxo, 'id'>;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [historicoLimit, setHistoricoLimit] = useState(30);
  // Dropdowns das seções de contas
  const [openAtrasadasPagar, setOpenAtrasadasPagar] = useState(false);
  const [openAtrasadasReceber, setOpenAtrasadasReceber] = useState(false);
  const [openAtrasadasOutras, setOpenAtrasadasOutras] = useState(false);
  const [openHojePagar, setOpenHojePagar] = useState(false);
  const [openHojeReceber, setOpenHojeReceber] = useState(false);
  const [openHojeOutras, setOpenHojeOutras] = useState(false);
  const [openFuturasPagar, setOpenFuturasPagar] = useState(false);
  const [openFuturasReceber, setOpenFuturasReceber] = useState(false);
  const [openFuturasOutras, setOpenFuturasOutras] = useState(false);
  // Filtro de agendamento nas futuras
  const [filtroAgendamento, setFiltroAgendamento] = useState<'todos' | 'agendado' | 'a-agendar'>('todos');
  const [historicoView, setHistoricoView] = useState<'lista' | 'por-conta'>('lista');
  // Filtros do histórico
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMes, setFiltroMes] = useState<number | 'todos'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<ContaFluxoTipo | 'todos'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string | 'todos'>('todos');
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite30d = addDays(hoje, 30);
  
  // ========== HISTÓRICO: Contas pagas dos últimos 60 dias ==========
  const { contasPagas, totalSaidas, totalEntradas, saldoPeriodo, porConta } = useMemo(() => {
    const limite60dAtras = subDays(hoje, 60);
    
    let pagas = contas
      .filter(c => c.pago)
      .filter(c => {
        const data = parseISO(c.dataVencimento);
        return isAfter(data, limite60dAtras);
      });
    
    // Aplicar filtros
    if (filtroTexto.trim()) {
      const termo = filtroTexto.toLowerCase();
      pagas = pagas.filter(c => c.descricao.toLowerCase().includes(termo));
    }
    
    if (filtroMes !== 'todos') {
      pagas = pagas.filter(c => {
        const data = parseISO(c.dataVencimento);
        return data.getMonth() + 1 === filtroMes;
      });
    }
    
    if (filtroTipo !== 'todos') {
      pagas = pagas.filter(c => c.tipo === filtroTipo);
    }
    
    if (filtroCategoria !== 'todos') {
      pagas = pagas.filter(c => {
        if (!c.fornecedorId) return false;
        const fornecedor = fornecedores.find(f => f.id === c.fornecedorId);
        return fornecedor?.modalidade === filtroCategoria;
      });
    }
    
    pagas = pagas.sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
    
    const saidas = pagas
      .filter(c => c.tipo === 'pagar')
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
    
    const entradas = pagas
      .filter(c => c.tipo === 'receber')
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
    
    // Agrupar por conta/origem
    const agrupado: Record<string, { entradas: number; saidas: number; count: number }> = {};
    
    for (const c of pagas) {
      let conta = 'Outros';
      const desc = c.descricao.toUpperCase();
      
      if (desc.includes('ITAUBBA') || desc.includes('ITAU BBA')) {
        conta = 'Itaú BBA (Ecom)';
      } else if (desc.includes('ITAU') || desc.includes('CONTA CORRENTE')) {
        conta = 'Itaú CC (Nice Foods)';
      } else if (desc.includes('MERCADO PAGO') || desc.includes('MP *')) {
        conta = 'Mercado Pago';
      } else if (desc.includes('ASAAS')) {
        conta = 'Asaas';
      } else if (desc.includes('PAGAR.ME') || desc.includes('PAGARME')) {
        conta = 'Pagar.me';
      } else if (desc.includes('NUVEM') || desc.includes('NUVEMSHOP')) {
        conta = 'Nuvemshop';
      } else if (desc.includes('SHOPEE')) {
        conta = 'Shopee';
      } else if (desc.includes('RECEITA FEDERAL') || desc.includes('SIMPLES')) {
        conta = 'Receita Federal';
      }
      
      if (!agrupado[conta]) {
        agrupado[conta] = { entradas: 0, saidas: 0, count: 0 };
      }
      
      const valor = parseValorFlexivel(c.valor);
      if (c.tipo === 'receber') {
        agrupado[conta].entradas += valor;
      } else {
        agrupado[conta].saidas += valor;
      }
      agrupado[conta].count++;
    }
    
    const porContaArray = Object.entries(agrupado)
      .map(([nome, dados]) => ({
        nome,
        entradas: dados.entradas,
        saidas: dados.saidas,
        saldo: dados.entradas - dados.saidas,
        count: dados.count,
      }))
      .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas));
    
    return {
      contasPagas: pagas,
      totalSaidas: saidas,
      totalEntradas: entradas,
      saldoPeriodo: entradas - saidas,
      porConta: porContaArray,
    };
  }, [contas, hoje, filtroTexto, filtroMes, filtroTipo, filtroCategoria, fornecedores]);
  
  const formatCurrencyValue = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const getBadgeTipoBaixa = (conta: ContaFluxo) => {
    if (conta.conciliado) {
      return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">conc</Badge>;
    }
    if (conta.agendado) {
      return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200">agend</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted">manual</Badge>;
  };

  const contasAtrasadas = contas
    .filter(c => !c.pago && isBefore(parseISO(c.dataVencimento), hoje) && !isToday(parseISO(c.dataVencimento)))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasHoje = contas
    .filter(c => !c.pago && isToday(parseISO(c.dataVencimento)))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasFuturas = contas
    .filter(c => !c.pago)
    .filter(c => {
      const data = parseISO(c.dataVencimento);
      return isAfter(data, hoje) && !isToday(data);
    })
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasPagarAtrasadas = contasAtrasadas.filter(c => c.tipo === 'pagar');
  const contasReceberAtrasadas = contasAtrasadas.filter(c => c.tipo === 'receber');
  const contasOutrasAtrasadas = contasAtrasadas.filter(c => 
    c.tipo !== 'pagar' && c.tipo !== 'receber'
  );
  const contasPagarHoje = contasHoje.filter(c => c.tipo === 'pagar');
  const contasReceberHoje = contasHoje.filter(c => c.tipo === 'receber');
  const contasOutrasHoje = contasHoje.filter(c => 
    c.tipo !== 'pagar' && c.tipo !== 'receber'
  );
  // Filtra futuras por agendamento
  const contasFuturasFiltered = contasFuturas.filter(c => {
    if (filtroAgendamento === 'agendado') return !!c.agendado;
    if (filtroAgendamento === 'a-agendar') return !c.agendado;
    return true;
  });

  const contasPagar = contasFuturasFiltered.filter(c => c.tipo === 'pagar');
  const contasReceber = contasFuturasFiltered.filter(c => c.tipo === 'receber');
  const contasOutrasFuturas = contasFuturasFiltered.filter(c => 
    c.tipo !== 'pagar' && c.tipo !== 'receber'
  );

  // Contagens para os badges do filtro
  const totalAgendadas = contasFuturas.filter(c => !!c.agendado).length;
  const totalAgendar = contasFuturas.filter(c => !c.agendado).length;

  // ========== DETECÇÃO DE DUPLICATAS ==========
  const [duplicatasDispensadas, setDuplicatasDispensadas] = useState<Set<string>>(new Set());
  
  const duplicatasSuspeitas = useMemo(() => {
    const contasNaoPagas = contas.filter(c => !c.pago && c.tipo === 'pagar');
    
    // Normaliza string para comparação de similaridade
    const normalizar = (s: string) =>
      s.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // Calcula similaridade por tokens em comum
    const calcSimilaridade = (a: string, b: string): number => {
      const tokensA = new Set(normalizar(a).split(' ').filter(t => t.length >= 3));
      const tokensB = new Set(normalizar(b).split(' ').filter(t => t.length >= 3));
      if (tokensA.size === 0 || tokensB.size === 0) return 0;
      let comuns = 0;
      for (const t of tokensA) if (tokensB.has(t)) comuns++;
      return comuns / Math.max(tokensA.size, tokensB.size);
    };

    // Grupos já visitados para não duplicar alertas
    const jaAgrupados = new Set<string>();
    const suspeitas: ContaFluxo[][] = [];

    for (let i = 0; i < contasNaoPagas.length; i++) {
      const a = contasNaoPagas[i];
      if (jaAgrupados.has(a.id)) continue;

      const valorA = parseValorFlexivel(a.valor);
      let dataA: Date;
      try { dataA = parseISO(a.dataVencimento); } catch { continue; }

      const grupo: ContaFluxo[] = [a];

      for (let j = i + 1; j < contasNaoPagas.length; j++) {
        const b = contasNaoPagas[j];
        if (jaAgrupados.has(b.id)) continue;

        const valorB = parseValorFlexivel(b.valor);
        // Valores devem ser iguais (± R$0,01)
        if (Math.abs(valorA - valorB) > 0.01) continue;

        let dataB: Date;
        try { dataB = parseISO(b.dataVencimento); } catch { continue; }

        const diffDias = Math.abs((dataA.getTime() - dataB.getTime()) / 86400000);

        // Datas iguais → duplicata certa
        // Datas próximas (± 7 dias) + descrição similar (≥ 40%) → suspeita de duplicata
        const dataMesmaDia = diffDias === 0;
        const dataPróxima = diffDias <= 7;
        const nomeSimilar = calcSimilaridade(a.descricao, b.descricao) >= 0.4;

        if (dataMesmaDia || (dataPróxima && nomeSimilar)) {
          grupo.push(b);
          jaAgrupados.add(b.id);
        }
      }

      if (grupo.length > 1) {
        jaAgrupados.add(a.id);
        suspeitas.push(grupo);
      }
    }

    return suspeitas;
  }, [contas]);

  // Chave única de grupo para dispensar
  const grupoKey = (grupo: ContaFluxo[]) => grupo.map(c => c.id).sort().join('|');
  const duplicatasFiltradas = duplicatasSuspeitas.filter(g => !duplicatasDispensadas.has(grupoKey(g)));
  const totalDuplicatasSuspeitas = duplicatasFiltradas.reduce((acc, grupo) => acc + grupo.length, 0);

  // Totais 30 dias
  const totalPagar30d = contasPagar.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  const totalReceber30d = contasReceber.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  const totalOutras30d = contasOutrasFuturas.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const processDocument = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      toast.error(`${file.name}: formato não suportado. Use PDF ou imagem.`);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name}: arquivo muito grande. Máximo 10MB.`);
      return;
    }

    const base64 = await fileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('extract-documento', {
      body: { imageBase64: base64 }
    });
    
    if (error) {
      console.error('Error extracting document:', error);
      toast.error(`Erro ao processar ${file.name}.`);
      return null;
    }
    
    if (data?.error) {
      toast.error(`${file.name}: ${data.error}`);
      return null;
    }
    
    return { contas: data?.contas || [], file };
  };

  const uploadFileAsAnexo = async (file: File, contaId: string): Promise<ContaAnexo | null> => {
    const ext = file.name.split('.').pop();
    const path = `${contaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('conta-anexos')
      .upload(path, file, { contentType: file.type });
    if (error) return null;
    return {
      id: crypto.randomUUID(),
      nome: file.name,
      url: '',
      path,
      tipo: file.type,
      tamanho: file.size,
      criadoEm: new Date().toISOString(),
    };
  };

  const processMultipleFiles = async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido. Use PDF ou imagem.');
      return;
    }

    setIsExtracting(true);
    try {
      // Process all files in parallel
      const results = await Promise.all(validFiles.map(f => processDocument(f)));
      const successResults = results.filter(Boolean) as { contas: any[]; file: File }[];
      
      if (successResults.length === 0) {
        toast.error('Não foi possível extrair dados dos documentos.');
        return;
      }

      // Collect all extracted contas with their source file
      const allContas: { conta: any; file: File }[] = [];
      for (const result of successResults) {
        for (const conta of result.contas) {
          allContas.push({ conta, file: result.file });
        }
      }

      if (allContas.length === 0) {
        toast.error('Nenhum lançamento encontrado nos documentos.');
        return;
      }

      // If single conta from single file, pre-fill the form
      if (allContas.length === 1 && validFiles.length === 1) {
        const { conta: c, file } = allContas[0];
        if (c.descricao) setDescricao(c.descricao);
        if (c.valor) setValor(c.valor);
        if (c.dataVencimento) setDataVencimento(c.dataVencimento);
        if (c.tipo) setTipo(c.tipo);
        
        // Auto-add with doc fields + attachment
        if (onAddMultipleContas) {
          const contaId = crypto.randomUUID();
          const anexo = await uploadFileAsAnexo(file, contaId);
          const novaConta: Omit<ContaFluxo, 'id'> = {
            tipo: c.tipo || 'pagar',
            descricao: c.descricao || '',
            valor: c.valor || '',
            dataVencimento: c.dataVencimento || '',
            pago: false,
            codigoBarrasPix: c.codigoBarrasPix || undefined,
            numeroNF: c.numeroNF || undefined,
            chaveDanfe: c.chaveDanfe || undefined,
            anexos: anexo ? [anexo] : undefined,
          };
          onAddMultipleContas([novaConta]);
          toast.success('Conta extraída e adicionada com anexo!');
          setDescricao('');
          setValor('');
          setDataVencimento('');
        } else {
          toast.success('Dados extraídos! Confira e clique em + para adicionar.');
        }
        return;
      }

      // Multiple contas: add all with doc fields + attachments
      if (onAddMultipleContas) {
        const contasParaAdicionar: Omit<ContaFluxo, 'id'>[] = [];
        
        for (const { conta: c, file } of allContas) {
          const contaId = crypto.randomUUID();
          const anexo = await uploadFileAsAnexo(file, contaId);
          contasParaAdicionar.push({
            tipo: c.tipo || 'pagar',
            descricao: c.descricao || '',
            valor: c.valor || '',
            dataVencimento: c.dataVencimento || '',
            pago: false,
            codigoBarrasPix: c.codigoBarrasPix || undefined,
            numeroNF: c.numeroNF || undefined,
            chaveDanfe: c.chaveDanfe || undefined,
            anexos: anexo ? [anexo] : undefined,
          });
        }
        
        onAddMultipleContas(contasParaAdicionar);
        toast.success(`${contasParaAdicionar.length} lançamento(s) extraído(s) de ${validFiles.length} documento(s)!`);
      } else {
        const c = allContas[0].conta;
        if (c.descricao) setDescricao(c.descricao);
        if (c.valor) setValor(c.valor);
        if (c.dataVencimento) setDataVencimento(c.dataVencimento);
        if (c.tipo) setTipo(c.tipo);
        toast.success(`Extraídos ${allContas.length} itens. Mostrando o primeiro.`);
      }
    } catch (err) {
      console.error('Error processing documents:', err);
      toast.error('Erro ao processar documentos.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    for (const item of Array.from(items || [])) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          await processMultipleFiles([blob]);
          return;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer?.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (validFiles.length > 0) {
      await processMultipleFiles(validFiles);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processMultipleFiles(files);
    }
    // Reset input
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // Normaliza string para similaridade
  const normalizarDesc = (s: string) =>
    s.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const calcSimilaridadeAdd = (a: string, b: string): number => {
    const tokensA = new Set(normalizarDesc(a).split(' ').filter(t => t.length >= 3));
    const tokensB = new Set(normalizarDesc(b).split(' ').filter(t => t.length >= 3));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    let comuns = 0;
    for (const t of tokensA) if (tokensB.has(t)) comuns++;
    return comuns / Math.max(tokensA.size, tokensB.size);
  };

  const handleAdd = () => {
    if (!descricao.trim() || !valor || !dataVencimento) return;

    const novaConta: Omit<ContaFluxo, 'id'> = {
      tipo,
      descricao: descricao.trim(),
      valor,
      dataVencimento,
      pago: false,
    };

    // Verificar duplicata nas contas NÃO pagas do mesmo tipo
    const valorNovo = parseValorFlexivel(valor);
    const dataNova = new Date(dataVencimento);

    const candidata = contas.find(c => {
      if (c.pago) return false;
      if (c.tipo !== tipo) return false;

      const valorExistente = parseValorFlexivel(c.valor);
      // Valor dentro de ±1%
      if (Math.abs(valorExistente - valorNovo) / Math.max(valorNovo, 0.01) > 0.01) return false;

      // Data dentro de ±7 dias
      const dataExistente = new Date(c.dataVencimento);
      const diffDias = Math.abs((dataNova.getTime() - dataExistente.getTime()) / 86400000);
      if (diffDias > 7) return false;

      // Sem necessidade de similaridade de descrição — valor + data + tipo já é forte o suficiente
      return true;
    });

    if (candidata) {
      setDuplicataDialog({ candidata, novaConta });
      return;
    }

    // Sem duplicata: adicionar normalmente
    onAddConta(novaConta);
    setDescricao('');
    setValor('');
    setDataVencimento('');
  };

  const handleConfirmarSubstituir = () => {
    if (!duplicataDialog || !onUpdateConta) return;
    const { candidata, novaConta } = duplicataDialog;
    onUpdateConta(candidata.id, {
      descricao: novaConta.descricao,
      valor: novaConta.valor,
      dataVencimento: novaConta.dataVencimento,
    });
    setDuplicataDialog(null);
    setDescricao('');
    setValor('');
    setDataVencimento('');
    toast.success('Conta atualizada com as novas informações.');
  };

  const handleConfirmarAdicionar = () => {
    if (!duplicataDialog) return;
    onAddConta(duplicataDialog.novaConta);
    setDuplicataDialog(null);
    setDescricao('');
    setValor('');
    setDataVencimento('');
  };

  const formatCurrency = (val: string): string => {
    const num = parseValorFlexivel(val);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                📑 Contas a Pagar/Receber
              </span>
              <div className="flex items-center gap-2">
                {totalDuplicatasSuspeitas > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Copy className="h-3 w-3" />
                    {duplicatasSuspeitas.length} duplicata(s)?
                  </Badge>
                )}
                {contas.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {contas.filter(c => !c.pago).length} pendente(s)
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0" onPaste={handlePaste}>
            {/* Zona de Drop/Paste/Upload para PDFs e imagens */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isExtracting && pdfInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
                ${isExtracting ? 'pointer-events-none opacity-70' : ''}
              `}
            >
              {isExtracting ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Extraindo dados dos documentos...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <FileUp className="h-6 w-6 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">
                    Arraste PDFs ou imagens de boletos, NFs ou DDAs
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Ctrl+V para colar imagem • Múltiplos arquivos aceitos • Extrai código de barras, PIX, NF e DANFE
                  </p>
                </div>
              )}
              <input
                ref={pdfInputRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* Form para adicionar - Responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-lg border bg-muted/30">
              <div className="sm:col-span-3">
                <Select value={tipo} onValueChange={(v) => setTipo(v as 'pagar' | 'receber' | 'intercompany')}>
                  <SelectTrigger className="h-9 sm:h-8 text-sm sm:text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                    <SelectItem value="intercompany">🔁 Intercompany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-4">
                <Input
                  placeholder="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-9 sm:h-8 text-sm sm:text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <div className="sm:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      placeholder="0,00"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="h-9 sm:h-8 text-sm sm:text-xs pl-7 text-right"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-9 sm:h-8 text-sm sm:text-xs"
                    min={format(hoje, 'yyyy-MM-dd')}
                    max={format(limite30d, 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              <div className="sm:col-span-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 sm:h-8 w-full"
                  onClick={handleAdd}
                  disabled={!descricao.trim() || !valor || !dataVencimento}
                >
                  <Plus className="h-4 sm:h-3 w-4 sm:w-3 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </div>
            </div>

            {/* 🔍 Painel de Duplicatas Suspeitas */}
            {duplicatasFiltradas.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Possíveis duplicatas ({duplicatasFiltradas.length} grupo{duplicatasFiltradas.length > 1 ? 's' : ''})
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">
                  Contas com mesmo valor e datas próximas. Remova duplicadas ou dispense se estiver correto.
                </p>
                <div className="space-y-2 mt-1">
                  {duplicatasFiltradas.map((grupo, gi) => {
                    const gk = grupoKey(grupo);
                    return (
                      <div key={gk} className="p-2 rounded border border-amber-200 dark:border-amber-800 bg-background/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            Grupo {gi + 1} — {formatCurrency(grupo[0].valor)} × {grupo.length} itens
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                            onClick={() => {
                              setDuplicatasDispensadas(prev => new Set([...prev, gk]));
                              toast.success('Grupo dispensado — não são duplicatas.');
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Tudo certo
                          </Button>
                        </div>
                        {grupo.map(conta => (
                          <div key={conta.id} className="flex items-center justify-between text-xs gap-2 py-1 border-b last:border-b-0 border-border/50">
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">{conta.descricao}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseISO(conta.dataVencimento), 'dd/MM')} • {formatCurrency(conta.valor)}
                                {conta.conciliado && ' • conc'}
                                {conta.agendado && ' • agend'}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                onRemoveConta(conta.id);
                                toast.success('Conta removida.');
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="text-[10px]">Remover</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ⚠️ Atrasadas */}
            {(contasPagarAtrasadas.length > 0 || contasReceberAtrasadas.length > 0 || contasOutrasAtrasadas.length > 0) && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Atrasadas ({contasAtrasadas.length})
                </p>
                {/* A Pagar Atrasadas */}
                {contasPagarAtrasadas.length > 0 && (
                  <div>
                    <button
                      onClick={() => setOpenAtrasadasPagar(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium text-destructive/80 hover:text-destructive mb-1"
                    >
                      {openAtrasadasPagar ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <ArrowDownCircle className="h-3 w-3" />
                      A Pagar ({contasPagarAtrasadas.length})
                    </button>
                    {openAtrasadasPagar && (
                      <div className="space-y-1 pl-2">
                        {contasPagarAtrasadas.map((conta) => (
                          <ContaItem key={conta.id} conta={conta} variant="pagar" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* A Receber Atrasadas */}
                {contasReceberAtrasadas.length > 0 && (
                  <div>
                    <button
                      onClick={() => setOpenAtrasadasReceber(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800 mb-1"
                    >
                      {openAtrasadasReceber ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <ArrowUpCircle className="h-3 w-3" />
                      A Receber ({contasReceberAtrasadas.length})
                    </button>
                    {openAtrasadasReceber && (
                      <div className="space-y-1 pl-2">
                        {contasReceberAtrasadas.map((conta) => (
                          <ContaItem key={conta.id} conta={conta} variant="receber" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Outras Atrasadas */}
                {contasOutrasAtrasadas.length > 0 && (
                  <div>
                    <button
                      onClick={() => setOpenAtrasadasOutras(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-800 mb-1"
                    >
                      {openAtrasadasOutras ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <RefreshCw className="h-3 w-3" />
                      Outras ({contasOutrasAtrasadas.length})
                    </button>
                    {openAtrasadasOutras && (
                      <div className="space-y-1 pl-2">
                        {contasOutrasAtrasadas.map((conta) => (
                          <ContaItem key={conta.id} conta={conta} variant={conta.tipo} fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ⏰ Hoje */}
            {(contasPagarHoje.length > 0 || contasReceberHoje.length > 0 || contasOutrasHoje.length > 0) && (
              <div className="space-y-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Vence Hoje ({contasHoje.length})
                </p>
                {contasPagarHoje.length > 0 && (
                  <div>
                    <button onClick={() => setOpenHojePagar(v => !v)} className="flex items-center gap-1 text-[11px] font-medium text-destructive/80 hover:text-destructive mb-1">
                      {openHojePagar ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <ArrowDownCircle className="h-3 w-3" /> A Pagar ({contasPagarHoje.length})
                    </button>
                    {openHojePagar && <div className="space-y-1 pl-2">{contasPagarHoje.map(conta => <ContaItem key={conta.id} conta={conta} variant="pagar" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}
                {contasReceberHoje.length > 0 && (
                  <div>
                    <button onClick={() => setOpenHojeReceber(v => !v)} className="flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800 mb-1">
                      {openHojeReceber ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <ArrowUpCircle className="h-3 w-3" /> A Receber ({contasReceberHoje.length})
                    </button>
                    {openHojeReceber && <div className="space-y-1 pl-2">{contasReceberHoje.map(conta => <ContaItem key={conta.id} conta={conta} variant="receber" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}
                {contasOutrasHoje.length > 0 && (
                  <div>
                    <button onClick={() => setOpenHojeOutras(v => !v)} className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-800 mb-1">
                      {openHojeOutras ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <RefreshCw className="h-3 w-3" /> Outras ({contasOutrasHoje.length})
                    </button>
                    {openHojeOutras && <div className="space-y-1 pl-2">{contasOutrasHoje.map(conta => <ContaItem key={conta.id} conta={conta} variant={conta.tipo} fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Próximos 30 dias */}
            {contasFuturas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Filtrar:</span>
                <button
                  onClick={() => setFiltroAgendamento('todos')}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filtroAgendamento === 'todos' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
                >
                  Todos ({contasFuturas.length})
                </button>
                <button
                  onClick={() => setFiltroAgendamento('agendado')}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filtroAgendamento === 'agendado' ? 'bg-purple-600 text-white border-purple-600' : 'border-border text-muted-foreground hover:border-foreground'}`}
                >
                  ✓ Agendados ({totalAgendadas})
                </button>
                <button
                  onClick={() => setFiltroAgendamento('a-agendar')}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filtroAgendamento === 'a-agendar' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-border text-muted-foreground hover:border-foreground'}`}
                >
                  ⏳ A Agendar ({totalAgendar})
                </button>
              </div>
            )}
            {(contasPagar.length > 0 || contasReceber.length > 0 || contasOutrasFuturas.length > 0) && (
              <div className="space-y-3">
                {/* A Pagar */}
                {contasPagar.length > 0 && (
                  <div>
                    <button onClick={() => setOpenFuturasPagar(v => !v)} className="flex items-center justify-between w-full text-left mb-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {openFuturasPagar ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        <ArrowDownCircle className="h-3 w-3 text-destructive" />
                        A Pagar (próx. 30d) <span className="text-muted-foreground/60">({contasPagar.length})</span>
                      </span>
                      <span className="font-semibold text-destructive text-xs">{formatCurrencyValue(totalPagar30d)}</span>
                    </button>
                    {openFuturasPagar && <div className="space-y-1 pl-2">{contasPagar.map(conta => <ContaItem key={conta.id} conta={conta} variant="pagar" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}

                {/* A Receber */}
                {contasReceber.length > 0 && (
                  <div>
                    <button onClick={() => setOpenFuturasReceber(v => !v)} className="flex items-center justify-between w-full text-left mb-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {openFuturasReceber ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        <ArrowUpCircle className="h-3 w-3 text-green-600" />
                        A Receber (próx. 30d) <span className="text-muted-foreground/60">({contasReceber.length})</span>
                      </span>
                      <span className="font-semibold text-green-600 text-xs">{formatCurrencyValue(totalReceber30d)}</span>
                    </button>
                    {openFuturasReceber && <div className="space-y-1 pl-2">{contasReceber.map(conta => <ContaItem key={conta.id} conta={conta} variant="receber" fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}

                {/* Outras Movimentações */}
                {contasOutrasFuturas.length > 0 && (
                  <div>
                    <button onClick={() => setOpenFuturasOutras(v => !v)} className="flex items-center justify-between w-full text-left mb-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {openFuturasOutras ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        <RefreshCw className="h-3 w-3 text-blue-600" />
                        Outras Movimentações (próx. 30d) <span className="text-muted-foreground/60">({contasOutrasFuturas.length})</span>
                      </span>
                      <span className="font-semibold text-blue-600 text-xs">{formatCurrencyValue(totalOutras30d)}</span>
                    </button>
                    {openFuturasOutras && <div className="space-y-1 pl-2">{contasOutrasFuturas.map(conta => <ContaItem key={conta.id} conta={conta} variant={conta.tipo} fornecedores={fornecedores} onUpdate={onUpdateConta || (() => {})} onRemove={onRemoveConta} onTogglePago={onTogglePago} onToggleAgendado={onToggleAgendado} formatCurrency={formatCurrency} />)}</div>}
                  </div>
                )}
              </div>
            )}

            {contas.filter(c => !c.pago).length === 0 && contasPagas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conta pendente. O gráfico usa projeção baseada em médias.
              </p>
            )}
            
            {/* ========== HISTÓRICO (últimos 60 dias) ========== */}
            {contasPagas.length > 0 && (
              <Collapsible open={isHistoricoOpen} onOpenChange={setIsHistoricoOpen}>
                <div className="border-t pt-3 mt-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Histórico (últimos 60d)
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {contasPagas.length} item(ns)
                        </Badge>
                        {isHistoricoOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {/* Resumo do período */}
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Saídas</p>
                            <p className="text-sm font-semibold text-destructive">
                              {formatCurrencyValue(totalSaidas)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Entradas</p>
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrencyValue(totalEntradas)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Saldo</p>
                            <p className={`text-sm font-semibold ${saldoPeriodo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                              {saldoPeriodo >= 0 ? '+' : ''}{formatCurrencyValue(saldoPeriodo)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Toggle entre lista e por conta */}
                      <div className="flex gap-1 p-1 bg-muted rounded-lg">
                        <button
                          onClick={() => setHistoricoView('lista')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                            historicoView === 'lista'
                              ? 'bg-background shadow-sm font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <List className="h-3 w-3" />
                          Lista
                        </button>
                        <button
                          onClick={() => setHistoricoView('por-conta')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                            historicoView === 'por-conta'
                              ? 'bg-background shadow-sm font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Building2 className="h-3 w-3" />
                          Por Conta
                        </button>
                      </div>

                      {/* Barra de Filtros */}
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border">
                        {/* Busca por texto */}
                        <div className="relative flex-1 min-w-[150px]">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por descrição..."
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                            className="h-8 text-xs pl-7"
                          />
                        </div>
                        
                        {/* Filtro por mês */}
                        <Select value={String(filtroMes)} onValueChange={(v) => setFiltroMes(v === 'todos' ? 'todos' : Number(v))}>
                          <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="1">Jan</SelectItem>
                            <SelectItem value="2">Fev</SelectItem>
                            <SelectItem value="3">Mar</SelectItem>
                            <SelectItem value="4">Abr</SelectItem>
                            <SelectItem value="5">Mai</SelectItem>
                            <SelectItem value="6">Jun</SelectItem>
                            <SelectItem value="7">Jul</SelectItem>
                            <SelectItem value="8">Ago</SelectItem>
                            <SelectItem value="9">Set</SelectItem>
                            <SelectItem value="10">Out</SelectItem>
                            <SelectItem value="11">Nov</SelectItem>
                            <SelectItem value="12">Dez</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Filtro por tipo */}
                        <Select value={filtroTipo as string} onValueChange={(v) => setFiltroTipo(v as any)}>
                          <SelectTrigger className="h-8 w-[110px] text-xs">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="receber">🟢 Entradas</SelectItem>
                            <SelectItem value="pagar">🔴 Saídas</SelectItem>
                            <SelectItem value="intercompany">🔁 Inter</SelectItem>
                            <SelectItem value="aplicacao">📈 Aplic.</SelectItem>
                            <SelectItem value="resgate">📉 Resg.</SelectItem>
                            <SelectItem value="cartao">💳 Cartão</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Filtro por categoria DRE */}
                        <Select value={filtroCategoria as string} onValueChange={setFiltroCategoria}>
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todas</SelectItem>
                            <SelectItem value="Vendas">Vendas</SelectItem>
                            <SelectItem value="Custo de Mercadoria">CMV</SelectItem>
                            <SelectItem value="Despesas Operacionais">Desp. Op.</SelectItem>
                            <SelectItem value="Financeiro">Financeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Mostrar quantidade de resultados após filtros */}
                      {(filtroTexto || filtroMes !== 'todos' || filtroTipo !== 'todos' || filtroCategoria !== 'todos') && (
                        <div className="text-xs text-muted-foreground px-1">
                          {contasPagas.length} resultado{contasPagas.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {/* Visualização por lista */}
                      {historicoView === 'lista' && (
                        <>
                          <ScrollArea
                            style={{
                              height: contasPagas.length > 5
                                ? `${Math.min(180 + (historicoLimit / 30 - 1) * 240, 800)}px`
                                : 'auto'
                            }}
                          >
                            <div className="space-y-1.5 pr-2">
                              {contasPagas.slice(0, historicoLimit).map((conta) => (
                                <ContaItem
                                  key={conta.id}
                                  conta={conta}
                                  variant={conta.tipo}
                                  fornecedores={fornecedores}
                                  onUpdate={onUpdateConta || (() => {})}
                                  onRemove={onRemoveConta}
                                  formatCurrency={formatCurrency}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                          
                          {contasPagas.length > historicoLimit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => setHistoricoLimit(prev => prev + 30)}
                            >
                              Mostrar mais ({contasPagas.length - historicoLimit} restantes)
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Visualização por conta */}
                      {historicoView === 'por-conta' && (
                        <div className="space-y-2">
                          {porConta.map((conta) => (
                            <div
                              key={conta.nome}
                              className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{conta.nome}</span>
                                  <Badge variant="secondary" className="text-[10px]">{conta.count}</Badge>
                                </div>
                                <span className={`font-semibold text-sm ${conta.saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                  {conta.saldo >= 0 ? '+' : ''}{formatCurrencyValue(conta.saldo)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Entradas:</span>
                                  <span className="font-medium text-green-600">+{formatCurrencyValue(conta.entradas)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Saídas:</span>
                                  <span className="font-medium text-destructive">-{formatCurrencyValue(conta.saidas)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Dialog de confirmação de duplicata */}
      <AlertDialog open={!!duplicataDialog} onOpenChange={(open) => { if (!open) setDuplicataDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Possível duplicidade detectada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Já existe uma conta pendente com valor e data próximos:</p>
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div><span className="font-medium">Existente:</span> {duplicataDialog?.candidata.descricao}</div>
                <div><span className="font-medium">Valor:</span> {duplicataDialog ? formatCurrency(duplicataDialog.candidata.valor) : ''}</div>
                <div><span className="font-medium">Vencimento:</span> {duplicataDialog?.candidata.dataVencimento}</div>
              </div>
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
                <div><span className="font-medium">Nova:</span> {duplicataDialog?.novaConta.descricao}</div>
                <div><span className="font-medium">Valor:</span> {duplicataDialog ? formatCurrency(duplicataDialog.novaConta.valor) : ''}</div>
                <div><span className="font-medium">Vencimento:</span> {duplicataDialog?.novaConta.dataVencimento}</div>
              </div>
              <p className="text-xs text-muted-foreground">Se os dados novos são os corretos (ex: data atualizada), substitua a conta existente.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setDuplicataDialog(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarAdicionar}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Adicionar mesmo assim
            </AlertDialogAction>
            <AlertDialogAction onClick={handleConfirmarSubstituir}>
              Substituir pela nova
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}

