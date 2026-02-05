import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plus, ArrowDownCircle, ArrowUpCircle, ImageIcon, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { format, parseISO, isAfter, isBefore, isToday, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite30d = addDays(hoje, 30);

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

            {contas.filter(c => !c.pago).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conta pendente. O gráfico usa projeção baseada em médias.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
