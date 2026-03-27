import { useState } from 'react';
import { FichaTecnica, FichaTecnicaIngrediente, ItemEstoque, TipoEstoque } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizarNomeProduto } from '@/utils/movimentacoesParser';

interface FichaTecnicaBOMProps {
  fichasTecnicas: FichaTecnica[];
  itens: ItemEstoque[];
  onUpdate: (fichas: FichaTecnica[]) => void;
}

const UNIDADES = ['kg', 'g', 'un', 'ml', 'L'];

export function FichaTecnicaBOM({ fichasTecnicas, itens, onUpdate }: FichaTecnicaBOMProps) {
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [novoIngrediente, setNovoIngrediente] = useState<FichaTecnicaIngrediente>({
    insumoNome: '',
    quantidade: 0,
    unidade: 'kg',
  });

  const produtosAcabados = itens.filter(i => 
    i.tipo === 'produto_acabado' || i.tipo === 'acessorio' || i.tipo === 'brinde'
  );

  const insumos = itens.filter(i => 
    i.tipo === 'materia_prima' || i.tipo === 'embalagem'
  );

  const fichaExistente = fichasTecnicas.find(
    f => normalizarNomeProduto(f.produtoAcabadoNome) === normalizarNomeProduto(produtoSelecionado)
  );

  const handleCriarFicha = () => {
    if (!produtoSelecionado) return;
    if (fichaExistente) return;
    
    const novasFichas = [...fichasTecnicas, {
      produtoAcabadoNome: produtoSelecionado,
      ingredientes: [],
    }];
    onUpdate(novasFichas);
    setExpandido(produtoSelecionado);
  };

  const handleAddIngrediente = (fichaIdx: number) => {
    if (!novoIngrediente.insumoNome || novoIngrediente.quantidade <= 0) return;
    
    const updated = [...fichasTecnicas];
    updated[fichaIdx] = {
      ...updated[fichaIdx],
      ingredientes: [...updated[fichaIdx].ingredientes, { ...novoIngrediente }],
    };
    onUpdate(updated);
    setNovoIngrediente({ insumoNome: '', quantidade: 0, unidade: 'kg' });
  };

  const handleRemoveIngrediente = (fichaIdx: number, ingIdx: number) => {
    const updated = [...fichasTecnicas];
    updated[fichaIdx] = {
      ...updated[fichaIdx],
      ingredientes: updated[fichaIdx].ingredientes.filter((_, i) => i !== ingIdx),
    };
    onUpdate(updated);
  };

  const handleRemoveFicha = (fichaIdx: number) => {
    onUpdate(fichasTecnicas.filter((_, i) => i !== fichaIdx));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Cadastre a composição de cada produto acabado. A demanda de insumos será calculada automaticamente a partir do forecast de produção.
      </p>

      {/* Criar nova ficha */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Produto Acabado</Label>
          <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecionar produto..." />
            </SelectTrigger>
            <SelectContent>
              {produtosAcabados.map(p => {
                const jaTemFicha = fichasTecnicas.some(
                  f => normalizarNomeProduto(f.produtoAcabadoNome) === normalizarNomeProduto(p.nome)
                );
                return (
                  <SelectItem key={p.id} value={p.nome} disabled={jaTemFicha}>
                    {p.nome} {jaTemFicha && '✓'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button 
          size="sm" 
          onClick={handleCriarFicha} 
          disabled={!produtoSelecionado || !!fichaExistente}
          className="h-9"
        >
          <Plus className="h-3 w-3 mr-1" /> Criar Ficha
        </Button>
      </div>

      {/* Lista de fichas cadastradas */}
      {fichasTecnicas.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma ficha técnica cadastrada
        </div>
      )}

      <div className="space-y-2">
        {fichasTecnicas.map((ficha, fichaIdx) => {
          const isExpanded = expandido === ficha.produtoAcabadoNome;
          return (
            <Card key={ficha.produtoAcabadoNome} className="border-border">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-t-lg"
                onClick={() => setExpandido(isExpanded ? null : ficha.produtoAcabadoNome)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span className="text-sm font-medium">{ficha.produtoAcabadoNome}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {ficha.ingredientes.length} {ficha.ingredientes.length === 1 ? 'insumo' : 'insumos'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFicha(fichaIdx); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-3 space-y-3">
                  {/* Lista de ingredientes */}
                  {ficha.ingredientes.length > 0 && (
                    <div className="space-y-1">
                      {ficha.ingredientes.map((ing, ingIdx) => (
                        <div key={ingIdx} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                          <span className="flex-1">{ing.insumoNome}</span>
                          <span className="font-mono text-muted-foreground mx-2">
                            {ing.quantidade} {ing.unidade}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveIngrediente(fichaIdx, ingIdx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar ingrediente */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-[10px]">Insumo/Embalagem</Label>
                      <Select 
                        value={novoIngrediente.insumoNome} 
                        onValueChange={(v) => setNovoIngrediente(prev => ({ ...prev, insumoNome: v }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {insumos.map(ins => (
                            <SelectItem key={ins.id} value={ins.nome}>
                              {ins.nome} ({ins.unidade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Qtd/un</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 text-xs"
                        value={novoIngrediente.quantidade || ''}
                        onChange={(e) => setNovoIngrediente(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="w-16">
                      <Label className="text-[10px]">Un</Label>
                      <Select
                        value={novoIngrediente.unidade}
                        onValueChange={(v) => setNovoIngrediente(prev => ({ ...prev, unidade: v }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleAddIngrediente(fichaIdx)}
                      disabled={!novoIngrediente.insumoNome || novoIngrediente.quantidade <= 0}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo */}
      {fichasTecnicas.length > 0 && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          {fichasTecnicas.length} ficha(s) cadastrada(s) · {fichasTecnicas.reduce((sum, f) => sum + f.ingredientes.length, 0)} ingredientes no total
        </div>
      )}
    </div>
  );
}
