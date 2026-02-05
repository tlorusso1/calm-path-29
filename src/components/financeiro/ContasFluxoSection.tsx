import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Plus, ArrowDownCircle, ArrowUpCircle, ImageIcon, Loader2, AlertTriangle, Clock, History, CheckCircle2, Calendar } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { format, parseISO, isAfter, isBefore, isToday, addDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { toast } from 'sonner';
import { ContaItem } from './ContaItem';

interface ContasFluxoSectionProps {
  contas: ContaFluxo[];
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
  onAddConta,
  onAddMultipleContas,
  onUpdateConta,
  onRemoveConta,
  onTogglePago,
  onToggleAgendado,
  isOpen,
  onToggle,
}: ContasFluxoSectionProps) {
  const [tipo, setTipo] = useState<'pagar' | 'receber'>('pagar');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [historicoLimit, setHistoricoLimit] = useState(30);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite30d = addDays(hoje, 30);
  
  // ========== HISTÓRICO: Contas pagas dos últimos 60 dias ==========
  const { contasPagas, totalSaidas, totalEntradas, saldoPeriodo } = useMemo(() => {
    const limite60dAtras = subDays(hoje, 60);
    
    const pagas = contas
      .filter(c => c.pago)
      .filter(c => {
        const data = parseISO(c.dataVencimento);
        return isAfter(data, limite60dAtras);
      })
      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento)); // Mais recentes primeiro
    
    const saidas = pagas
      .filter(c => c.tipo === 'pagar')
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
    
    const entradas = pagas
      .filter(c => c.tipo === 'receber')
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
    
    return {
      contasPagas: pagas,
      totalSaidas: saidas,
      totalEntradas: entradas,
      saldoPeriodo: entradas - saidas,
    };
  }, [contas, hoje]);
  
  const formatCurrencyValue = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  // Badge para tipo de baixa
  const getBadgeTipoBaixa = (conta: ContaFluxo) => {
    if (conta.conciliado) {
      return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">conc</Badge>;
    }
    if (conta.agendado) {
      return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200">agend</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted">manual</Badge>;
  };

  // Separar contas por status
  const contasAtrasadas = contas
    .filter(c => !c.pago && isBefore(parseISO(c.dataVencimento), hoje) && !isToday(parseISO(c.dataVencimento)))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasHoje = contas
    .filter(c => !c.pago && isToday(parseISO(c.dataVencimento)))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  // Contas futuras (próximos 30 dias, não pagas)
  const contasFuturas = contas
    .filter(c => !c.pago)
    .filter(c => {
      const data = parseISO(c.dataVencimento);
      return isAfter(data, hoje) && !isToday(data);
    })
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasPagarAtrasadas = contasAtrasadas.filter(c => c.tipo === 'pagar');
  const contasReceberAtrasadas = contasAtrasadas.filter(c => c.tipo === 'receber');
  const contasPagarHoje = contasHoje.filter(c => c.tipo === 'pagar');
  const contasReceberHoje = contasHoje.filter(c => c.tipo === 'receber');
  const contasPagar = contasFuturas.filter(c => c.tipo === 'pagar');
  const contasReceber = contasFuturas.filter(c => c.tipo === 'receber');

  // File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Process image via edge function
  const processImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }

    setIsExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('extract-documento', {
        body: { imageBase64: base64 }
      });
      
      if (error) {
        console.error('Error extracting document:', error);
        toast.error('Erro ao processar documento. Tente novamente.');
        return;
      }
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      
      // Handle array of contas from OCR
      const contasExtraidas = data?.contas || [];
      
      if (contasExtraidas.length === 0) {
        toast.error('Nenhum lançamento encontrado na imagem.');
        return;
      }
      
      if (contasExtraidas.length === 1) {
        // Single account: fill form for review
        const c = contasExtraidas[0];
        if (c.descricao) setDescricao(c.descricao);
        if (c.valor) setValor(c.valor);
        if (c.dataVencimento) setDataVencimento(c.dataVencimento);
        if (c.tipo) setTipo(c.tipo);
        toast.success('Dados extraídos! Confira e clique em + para adicionar.');
      } else {
        // Multiple accounts: add all at once
        if (onAddMultipleContas) {
          const contasParaAdicionar = contasExtraidas.map((c: any) => ({
            tipo: c.tipo || 'pagar',
            descricao: c.descricao || '',
            valor: c.valor || '',
            dataVencimento: c.dataVencimento || '',
            pago: false,
          }));
          onAddMultipleContas(contasParaAdicionar);
          toast.success(`${contasExtraidas.length} lançamentos extraídos e adicionados!`);
        } else {
          // Fallback: fill form with first item if handler not provided
          const c = contasExtraidas[0];
          if (c.descricao) setDescricao(c.descricao);
          if (c.valor) setValor(c.valor);
          if (c.dataVencimento) setDataVencimento(c.dataVencimento);
          if (c.tipo) setTipo(c.tipo);
          toast.success(`Extraídos ${contasExtraidas.length} itens. Mostrando o primeiro.`);
        }
      }
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erro ao processar imagem.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle paste (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    for (const item of Array.from(items || [])) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          await processImage(blob);
          return;
        }
      }
    }
  };

  // Handle drag events
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
    
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      await processImage(file);
    }
  };

  const handleAdd = () => {
    if (!descricao.trim() || !valor || !dataVencimento) return;

    onAddConta({
      tipo,
      descricao: descricao.trim(),
      valor,
      dataVencimento,
      pago: false,
    });

    // Reset form
    setDescricao('');
    setValor('');
    setDataVencimento('');
  };

  const formatCurrency = (val: string): string => {
    const num = parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
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
            {/* Zona de Drop/Paste para OCR */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
                ${isExtracting ? 'pointer-events-none opacity-70' : ''}
              `}
            >
              {isExtracting ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Extraindo dados...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">
                    Cole (Ctrl+V) ou arraste uma imagem de boleto, NF ou DDA
                  </p>
                </div>
              )}
            </div>

            {/* Form para adicionar */}
            <div className="grid grid-cols-12 gap-2 p-3 rounded-lg border bg-muted/30">
              <div className="col-span-3">
                <Select value={tipo} onValueChange={(v) => setTipo(v as 'pagar' | 'receber')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Input
                  placeholder="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="h-8 text-xs pl-7 text-right"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="h-8 text-xs"
                  min={format(hoje, 'yyyy-MM-dd')}
                  max={format(limite30d, 'yyyy-MM-dd')}
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full"
                  onClick={handleAdd}
                  disabled={!descricao.trim() || !valor || !dataVencimento}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* ⚠️ Atrasadas */}
            {(contasPagarAtrasadas.length > 0 || contasReceberAtrasadas.length > 0) && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Atrasadas ({contasPagarAtrasadas.length + contasReceberAtrasadas.length})
                </p>
                <div className="space-y-1">
                  {[...contasPagarAtrasadas, ...contasReceberAtrasadas].map((conta) => (
                    <ContaItem
                      key={conta.id}
                      conta={conta}
                      variant={conta.tipo}
                      onUpdate={onUpdateConta || (() => {})}
                      onRemove={onRemoveConta}
                      onTogglePago={onTogglePago}
                      onToggleAgendado={onToggleAgendado}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 📅 Vence Hoje */}
            {(contasPagarHoje.length > 0 || contasReceberHoje.length > 0) && (
              <div className="space-y-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Vence Hoje ({contasPagarHoje.length + contasReceberHoje.length})
                </p>
                <div className="space-y-1">
                  {[...contasPagarHoje, ...contasReceberHoje].map((conta) => (
                    <ContaItem
                      key={conta.id}
                      conta={conta}
                      variant={conta.tipo}
                      onUpdate={onUpdateConta || (() => {})}
                      onRemove={onRemoveConta}
                      onTogglePago={onTogglePago}
                      onToggleAgendado={onToggleAgendado}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lista A Pagar - Futuras */}
            {contasPagar.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3 text-destructive" />
                  A Pagar (próx. 30d)
                </p>
                <div className="space-y-1">
                  {contasPagar.map((conta) => (
                    <ContaItem
                      key={conta.id}
                      conta={conta}
                      variant="pagar"
                      onUpdate={onUpdateConta || (() => {})}
                      onRemove={onRemoveConta}
                      onTogglePago={onTogglePago}
                      onToggleAgendado={onToggleAgendado}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lista A Receber - Futuras */}
            {contasReceber.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-primary" />
                  A Receber (próx. 30d)
                </p>
                <div className="space-y-1">
                  {contasReceber.map((conta) => (
                    <ContaItem
                      key={conta.id}
                      conta={conta}
                      variant="receber"
                      onUpdate={onUpdateConta || (() => {})}
                      onRemove={onRemoveConta}
                      onTogglePago={onTogglePago}
                      onToggleAgendado={onToggleAgendado}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
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
                      
                      {/* Lista de itens pagos */}
                      <ScrollArea className={contasPagas.length > 5 ? 'h-[200px]' : ''}>
                        <div className="space-y-1.5">
                          {contasPagas.slice(0, historicoLimit).map((conta) => (
                            <div 
                              key={conta.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-muted-foreground font-mono shrink-0">
                                  {format(parseISO(conta.dataVencimento), 'dd/MM')}
                                </span>
                                <span className="truncate" title={conta.descricao}>
                                  {conta.descricao}
                                </span>
                                {getBadgeTipoBaixa(conta)}
                              </div>
                              <span className={`font-medium shrink-0 ml-2 ${
                                conta.tipo === 'receber' ? 'text-green-600' : 'text-muted-foreground'
                              }`}>
                                {conta.tipo === 'receber' ? '+' : '-'} {formatCurrency(conta.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      {/* Botão "Carregar mais" */}
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
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
