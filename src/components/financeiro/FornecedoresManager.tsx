import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Search, Pencil, Trash2, Plus, X, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Fornecedor, ContaFluxo } from '@/types/focus-mode';
import { buscarFornecedores } from '@/utils/loadFornecedores';
import { CategoriaSelect, CategoriaValue } from './CategoriaSelect';
import { toast } from 'sonner';

interface FornecedoresManagerProps {
  fornecedores: Fornecedor[];
  contasFluxo: ContaFluxo[];
  onAdd: (fornecedor: Omit<Fornecedor, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Fornecedor>) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function FornecedoresManager({
  fornecedores,
  contasFluxo,
  onAdd,
  onUpdate,
  onRemove,
  isOpen,
  onToggle,
}: FornecedoresManagerProps) {
  const [search, setSearch] = useState('');
  const [openModalidades, setOpenModalidades] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [editingCategoria, setEditingCategoria] = useState<CategoriaValue | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCategoria, setNewCategoria] = useState<CategoriaValue | undefined>();

  // Agrupar fornecedores por modalidade
  const grouped = useMemo(() => {
    const filtrados = buscarFornecedores(search, fornecedores, 500);
    return filtrados.reduce((acc, f) => {
      const key = f.modalidade || 'Não Classificado';
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {} as Record<string, Fornecedor[]>);
  }, [search, fornecedores]);

  // Total de fornecedores
  const totalFornecedores = fornecedores.length;

  // Verificar se fornecedor está vinculado a contas
  const getContasVinculadas = (id: string) => 
    contasFluxo.filter(c => c.fornecedorId === id);

  // Handlers
  const toggleModalidade = (modalidade: string) => {
    setOpenModalidades(prev => ({ ...prev, [modalidade]: !prev[modalidade] }));
  };

  const handleStartEdit = (fornecedor: Fornecedor) => {
    setEditingId(fornecedor.id);
    setEditingNome(fornecedor.nome);
    setEditingCategoria({
      modalidade: fornecedor.modalidade,
      grupo: fornecedor.grupo,
      categoria: fornecedor.categoria,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingNome.trim()) return;
    
    onUpdate(editingId, {
      nome: editingNome.trim(),
      modalidade: editingCategoria?.modalidade || 'a classificar',
      grupo: editingCategoria?.grupo || 'a classificar',
      categoria: editingCategoria?.categoria || 'a classificar',
    });
    
    setEditingId(null);
    setEditingNome('');
    setEditingCategoria(undefined);
    toast.success('Fornecedor atualizado!');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNome('');
    setEditingCategoria(undefined);
  };

  const handleRemove = (id: string, nome: string) => {
    const vinculadas = getContasVinculadas(id);
    if (vinculadas.length > 0) {
      toast.error(`Não é possível excluir: ${vinculadas.length} conta(s) vinculada(s)`);
      return;
    }
    onRemove(id);
    toast.success(`Fornecedor "${nome}" removido!`);
  };

  const handleAddNew = () => {
    if (!newNome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    onAdd({
      nome: newNome.trim(),
      modalidade: newCategoria?.modalidade || 'a classificar',
      grupo: newCategoria?.grupo || 'a classificar',
      categoria: newCategoria?.categoria || 'a classificar',
    });
    
    setNewNome('');
    setNewCategoria(undefined);
    setShowAddForm(false);
    toast.success(`Fornecedor "${newNome.trim()}" criado!`);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between h-10 px-3 hover:bg-muted/50"
        >
          <span className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Fornecedores Cadastrados
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {totalFornecedores}
            </Badge>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
        
        {/* Lista agrupada por modalidade */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {Object.entries(grouped).map(([modalidade, lista]) => (
            <Card key={modalidade} className="border">
              <Collapsible 
                open={openModalidades[modalidade] ?? false} 
                onOpenChange={() => toggleModalidade(modalidade)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-9 px-3 rounded-b-none"
                  >
                    <span className="text-xs font-medium truncate">{modalidade}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {lista.length}
                      </Badge>
                      {openModalidades[modalidade] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-1">
                    {lista.map((forn) => (
                      <div
                        key={forn.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md text-xs",
                          editingId === forn.id ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        {editingId === forn.id ? (
                          // Modo Edição
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editingNome}
                              onChange={(e) => setEditingNome(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Nome do fornecedor"
                            />
                            <CategoriaSelect
                              value={editingCategoria}
                              onChange={setEditingCategoria}
                            
                              compact
                            />
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-6 px-2"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Modo Visualização
                          <>
                            <span className="flex-1 truncate">{forn.nome}</span>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] h-4 px-1 max-w-[100px] truncate"
                            >
                              {forn.categoria || 'Sem categoria'}
                            </Badge>
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleStartEdit(forn)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleRemove(forn.id, forn.nome)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
          
          {Object.keys(grouped).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {search ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
            </p>
          )}
        </div>
        
        {/* Formulário de Adição */}
        {showAddForm ? (
          <Card className="p-3 space-y-2 border-dashed">
            <p className="text-xs font-medium">Novo Fornecedor</p>
            <Input
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              className="h-8 text-xs"
              placeholder="Nome do fornecedor"
            />
            <CategoriaSelect
              value={newCategoria}
              onChange={setNewCategoria}
              
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNome('');
                  setNewCategoria(undefined);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddNew}
              >
                Adicionar
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar Novo Fornecedor
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
