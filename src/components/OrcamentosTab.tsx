import { useState, useRef } from 'react';
import { Orcamento, OrcamentoTipo } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const TIPO_ORCAMENTO_LABELS: Record<OrcamentoTipo, string> = {
  embalagem: 'Embalagem',
  materia_prima: 'Matéria-Prima',
  mao_de_obra: 'Mão de Obra / Industrialização',
};

interface OrcamentosTabProps {
  orcamentos: Orcamento[];
  onUpdateOrcamentos: (orcamentos: Orcamento[]) => void;
}

export function OrcamentosTab({ orcamentos, onUpdateOrcamentos }: OrcamentosTabProps) {
  const [uploading, setUploading] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<OrcamentoTipo>('materia_prima');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        toast({ title: '🔍 Analisando orçamento...', description: file.name });

        const { data, error } = await supabase.functions.invoke('extract-orcamento', {
          body: { imageBase64: base64, tipo: tipoSelecionado },
        });

        if (error) throw error;

        if (data?.orcamento) {
          const novoOrcamento: Orcamento = {
            id: crypto.randomUUID(),
            fornecedor: data.orcamento.fornecedor || 'Fornecedor não identificado',
            tipo: tipoSelecionado,
            dataOrcamento: data.orcamento.dataOrcamento || undefined,
            prazoEntrega: data.orcamento.prazoEntrega || undefined,
            condicaoPagamento: data.orcamento.condicaoPagamento || undefined,
            itens: data.orcamento.itens || [],
            valorTotal: data.orcamento.valorTotal ? parseFloat(data.orcamento.valorTotal) : undefined,
            confianca: data.orcamento.confianca,
            createdAt: new Date().toISOString(),
          };

          onUpdateOrcamentos([...orcamentos, novoOrcamento]);
          toast({
            title: '✅ Orçamento extraído!',
            description: `${novoOrcamento.fornecedor} — ${novoOrcamento.itens.length} itens`,
          });
        }
      } catch (err: any) {
        console.error('Erro ao extrair orçamento:', err);
        toast({
          title: 'Erro ao processar',
          description: err?.message || 'Não foi possível extrair dados do documento.',
          variant: 'destructive',
        });
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = (id: string) => {
    onUpdateOrcamentos(orcamentos.filter(o => o.id !== id));
    toast({ title: 'Orçamento removido' });
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Group by tipo
  const grouped = orcamentos.reduce((acc, orc) => {
    if (!acc[orc.tipo]) acc[orc.tipo] = [];
    acc[orc.tipo].push(orc);
    return acc;
  }, {} as Record<OrcamentoTipo, Orcamento[]>);

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tipo do orçamento:</Label>
          <Select value={tipoSelecionado} onValueChange={(v) => setTipoSelecionado(v as OrcamentoTipo)}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
              <SelectItem value="embalagem">Embalagem</SelectItem>
              <SelectItem value="mao_de_obra">Mão de Obra / Industrialização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            uploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
          )}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Extraindo dados via OCR...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Envie um PDF ou print do orçamento
              </p>
              <p className="text-[10px] text-muted-foreground">
                Extrai automaticamente: fornecedor, itens, preços, prazo e condição de pagamento
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de orçamentos */}
      {orcamentos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {orcamentos.length} orçamento(s) cadastrado(s)
          </p>

          <Accordion type="multiple" defaultValue={Object.keys(grouped)}>
            {(Object.entries(grouped) as [OrcamentoTipo, Orcamento[]][]).map(([tipo, orcs]) => (
              <AccordionItem key={tipo} value={tipo}>
                <AccordionTrigger className="text-sm py-2">
                  {TIPO_ORCAMENTO_LABELS[tipo]} ({orcs.length})
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className={orcs.length > 3 ? "h-[400px]" : "h-auto"}>
                    <div className="space-y-3 pr-2">
                      {orcs.map(orc => (
                        <div key={orc.id} className="p-3 rounded-lg border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{orc.fornecedor}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemove(orc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                            {orc.dataOrcamento && (
                              <span>📅 {new Date(orc.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            )}
                            {orc.prazoEntrega && <span>🚚 {orc.prazoEntrega}</span>}
                            {orc.condicaoPagamento && <span>💳 {orc.condicaoPagamento}</span>}
                            {orc.valorTotal != null && (
                              <span className="font-medium text-foreground">
                                Total: {formatCurrency(orc.valorTotal)}
                              </span>
                            )}
                            {orc.confianca != null && (
                              <Badge variant="outline" className="text-[9px] h-4">
                                {Math.round(orc.confianca * 100)}% confiança
                              </Badge>
                            )}
                          </div>

                          {/* Itens do orçamento */}
                          {orc.itens.length > 0 && (
                            <div className="mt-1">
                              <div className="grid grid-cols-4 gap-1 text-[9px] font-medium text-muted-foreground uppercase pb-1 border-b border-border">
                                <span className="col-span-2">Item</span>
                                <span className="text-right">Valor un.</span>
                                <span className="text-right">Total</span>
                              </div>
                              {orc.itens.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-4 gap-1 py-1 border-b border-border/30 items-center">
                                  <div className="col-span-2 flex items-center gap-1">
                                    <Input
                                      value={item.nome}
                                      onChange={(e) => {
                                        const updatedOrcs = orcamentos.map(o => {
                                          if (o.id !== orc.id) return o;
                                          const newItens = [...o.itens];
                                          newItens[idx] = { ...newItens[idx], nome: e.target.value };
                                          return { ...o, itens: newItens };
                                        });
                                        onUpdateOrcamentos(updatedOrcs);
                                      }}
                                      className="h-6 text-xs border-none shadow-none px-1 focus-visible:ring-1"
                                      title={item.nome}
                                    />
                                    {item.quantidade != null && (
                                      <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                                        ({item.quantidade}{item.unidade ? ` ${item.unidade}` : ''})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-right text-xs">
                                    {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                                  </span>
                                  <span className="text-right text-xs font-medium">
                                    {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {orcamentos.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 italic">
          Nenhum orçamento cadastrado. Envie um PDF ou print para extrair automaticamente.
        </p>
      )}
    </div>
  );
}
