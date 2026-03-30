import { useState, useRef } from 'react';
import { Orcamento, OrcamentoTipo, OrcamentoItem } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { Upload, Trash2, FileText, Loader2, Filter, CheckCircle2, ShoppingCart } from 'lucide-react';
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
  produtosAcabados?: string[];
}

export function OrcamentosTab({ orcamentos, onUpdateOrcamentos, produtosAcabados = [] }: OrcamentosTabProps) {
  const [uploading, setUploading] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<OrcamentoTipo>('materia_prima');
  const [filtroTipo, setFiltroTipo] = useState<string>('_todos');
  const [filtroProduto, setFiltroProduto] = useState<string>('_todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      try {
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

  const handleUpdateItem = (orcId: string, idx: number, updates: Partial<OrcamentoItem>) => {
    const updated = orcamentos.map(o => {
      if (o.id !== orcId) return o;
      const newItens = [...o.itens];
      newItens[idx] = { ...newItens[idx], ...updates };
      return { ...o, itens: newItens };
    });
    onUpdateOrcamentos(updated);
  };

  const handleMarcarComprado = (orcId: string, idx: number, item: OrcamentoItem) => {
    handleUpdateItem(orcId, idx, {
      comprado: !item.comprado,
      ...(item.comprado ? {} : {
        qtdComprada: item.quantidade,
        valorUnitarioReal: item.valorUnitario,
        dataCompra: new Date().toISOString().split('T')[0],
      }),
    });
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Apply filters
  const filteredOrcamentos = orcamentos.filter(orc => {
    if (filtroTipo !== '_todos' && orc.tipo !== filtroTipo) return false;
    if (filtroProduto !== '_todos') {
      if (filtroProduto === '_sem_produto' && orc.produtoVinculado) return false;
      if (filtroProduto !== '_sem_produto' && orc.produtoVinculado !== filtroProduto) return false;
    }
    return true;
  });

  // Group filtered by tipo
  const grouped = filteredOrcamentos.reduce((acc, orc) => {
    if (!acc[orc.tipo]) acc[orc.tipo] = [];
    acc[orc.tipo].push(orc);
    return acc;
  }, {} as Record<OrcamentoTipo, Orcamento[]>);

  // Products that have orçamentos
  const produtosComOrcamento = [...new Set(orcamentos.map(o => o.produtoVinculado).filter(Boolean))] as string[];

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

      {/* Filtros */}
      {orcamentos.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-7 w-40 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos">Todos os tipos</SelectItem>
              <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
              <SelectItem value="embalagem">Embalagem</SelectItem>
              <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroProduto} onValueChange={setFiltroProduto}>
            <SelectTrigger className="h-7 w-48 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos">Todos os produtos</SelectItem>
              <SelectItem value="_sem_produto">Sem produto vinculado</SelectItem>
              {produtosComOrcamento.map(nome => (
                <SelectItem key={nome} value={nome}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filtroTipo !== '_todos' || filtroProduto !== '_todos') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => { setFiltroTipo('_todos'); setFiltroProduto('_todos'); }}
            >
              Limpar filtros
            </Button>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {filteredOrcamentos.length} de {orcamentos.length} orçamento(s)
          </span>
        </div>
      )}

      {/* Lista de orçamentos */}
      {filteredOrcamentos.length > 0 && (
        <Accordion type="multiple" defaultValue={Object.keys(grouped)}>
          {(Object.entries(grouped) as [OrcamentoTipo, Orcamento[]][]).map(([tipo, orcs]) => (
            <AccordionItem key={tipo} value={tipo}>
              <AccordionTrigger className="text-sm py-2">
                {TIPO_ORCAMENTO_LABELS[tipo]} ({orcs.length})
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className={orcs.length > 3 ? "h-[400px]" : "h-auto"}>
                  <div className="space-y-3 pr-2">
                    {orcs
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(orc => (
                      <div key={orc.id} className="p-3 rounded-lg border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{orc.fornecedor}</span>
                            {orc.produtoVinculado && (
                              <Badge variant="secondary" className="text-[9px] h-4">
                                🏷️ {orc.produtoVinculado}
                              </Badge>
                            )}
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

                        {/* Produto vinculado */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">🏷️ Produto:</span>
                          <Select
                            value={orc.produtoVinculado || '_none'}
                            onValueChange={(v) => {
                              const updated = orcamentos.map(o =>
                                o.id === orc.id ? { ...o, produtoVinculado: v === '_none' ? undefined : v } : o
                              );
                              onUpdateOrcamentos(updated);
                            }}
                          >
                            <SelectTrigger className="h-6 text-[10px] flex-1 max-w-xs">
                              <SelectValue placeholder="Selecionar produto acabado..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">Nenhum (geral)</SelectItem>
                              {produtosAcabados.map(nome => (
                                <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <div className="grid grid-cols-[2fr_auto_auto_auto] gap-1 text-[9px] font-medium text-muted-foreground uppercase pb-1 border-b border-border">
                              <span>Item</span>
                              <span className="text-right px-2">Valor un.</span>
                              <span className="text-right px-2">Total</span>
                              <span className="text-center w-16">Comprado</span>
                            </div>
                            {orc.itens.map((item, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "grid grid-cols-[2fr_auto_auto_auto] gap-1 py-1.5 border-b border-border/30 items-center",
                                  item.comprado && "bg-green-50/50 dark:bg-green-950/10"
                                )}
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  <Input
                                    value={item.nome}
                                    onChange={(e) => handleUpdateItem(orc.id, idx, { nome: e.target.value })}
                                    className="h-6 text-xs border-none shadow-none px-1 focus-visible:ring-1 min-w-0"
                                    title={item.nome}
                                  />
                                  {item.quantidade != null && (
                                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                                      ({item.quantidade}{item.unidade ? ` ${item.unidade}` : ''})
                                    </span>
                                  )}
                                </div>
                                <span className="text-right text-xs px-2 whitespace-nowrap">
                                  {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                                </span>
                                <span className="text-right text-xs font-medium px-2 whitespace-nowrap">
                                  {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                                </span>
                                <div className="flex justify-center w-16">
                                  <Button
                                    variant={item.comprado ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "h-6 text-[9px] px-2",
                                      item.comprado && "bg-green-600 hover:bg-green-700"
                                    )}
                                    onClick={() => handleMarcarComprado(orc.id, idx, item)}
                                  >
                                    {item.comprado ? (
                                      <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Pago</>
                                    ) : (
                                      <><ShoppingCart className="h-3 w-3 mr-0.5" /> Comprar</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}

                            {/* Edição inline quando comprado */}
                            {orc.itens.some(i => i.comprado) && (
                              <div className="mt-2 p-2 rounded border border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20 space-y-1.5">
                                <p className="text-[9px] font-medium text-green-700 dark:text-green-400 uppercase">
                                  ✅ Valores reais pagos
                                </p>
                                {orc.itens.map((item, idx) => item.comprado ? (
                                  <div key={idx} className="flex items-center gap-2 text-[10px]">
                                    <span className="truncate flex-1 text-xs font-medium">{item.nome}</span>
                                    <div className="flex items-center gap-1">
                                      <Label className="text-[9px] text-muted-foreground">Qtd:</Label>
                                      <Input
                                        type="number"
                                        value={item.qtdComprada ?? item.quantidade ?? ''}
                                        onChange={(e) => handleUpdateItem(orc.id, idx, {
                                          qtdComprada: e.target.value ? parseFloat(e.target.value) : undefined,
                                        })}
                                        className="h-5 w-16 text-[10px] text-center"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Label className="text-[9px] text-muted-foreground">Valor un.:</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.valorUnitarioReal ?? item.valorUnitario ?? ''}
                                        onChange={(e) => handleUpdateItem(orc.id, idx, {
                                          valorUnitarioReal: e.target.value ? parseFloat(e.target.value) : undefined,
                                        })}
                                        className="h-5 w-20 text-[10px] text-center"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Label className="text-[9px] text-muted-foreground">Data:</Label>
                                      <Input
                                        type="date"
                                        value={item.dataCompra ?? ''}
                                        onChange={(e) => handleUpdateItem(orc.id, idx, {
                                          dataCompra: e.target.value || undefined,
                                        })}
                                        className="h-5 w-28 text-[10px]"
                                      />
                                    </div>
                                  </div>
                                ) : null)}
                              </div>
                            )}
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
      )}

      {orcamentos.length > 0 && filteredOrcamentos.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 italic">
          Nenhum orçamento encontrado com os filtros selecionados.
        </p>
      )}

      {orcamentos.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 italic">
          Nenhum orçamento cadastrado. Envie um PDF ou print para extrair automaticamente.
        </p>
      )}
    </div>
  );
}
