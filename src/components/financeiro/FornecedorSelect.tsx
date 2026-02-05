import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fornecedor } from '@/types/focus-mode';
import { ChevronDown, X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buscarFornecedores } from '@/utils/loadFornecedores';
import { extrairBeneficiarioFinal } from '@/utils/fornecedoresParser';
import { CategoriaSelect, CategoriaValue } from './CategoriaSelect';

interface FornecedorSelectProps {
  fornecedores: Fornecedor[];
  value?: string; // fornecedorId
  onChange: (fornecedorId: string | undefined) => void;
  placeholder?: string;
  descricaoSugerida?: string; // Para tentar match automático
  onCreateNew?: (fornecedor: Omit<Fornecedor, 'id'>) => void;
  className?: string;
}

export function FornecedorSelect({
  fornecedores,
  value,
  onChange,
  placeholder = 'Buscar fornecedor...',
  descricaoSugerida,
  onCreateNew,
  className,
}: FornecedorSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFornecedorCategoria, setNewFornecedorCategoria] = useState<CategoriaValue | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fornecedor selecionado
  const selectedFornecedor = useMemo(() => 
    fornecedores.find(f => f.id === value),
    [fornecedores, value]
  );

  // Filtrar fornecedores por busca
  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedores.length) return [];
    return buscarFornecedores(search, fornecedores, 15);
  }, [search, fornecedores]);

  // Sugestão de beneficiário extraído
  const beneficiarioSugerido = useMemo(() => {
    if (!descricaoSugerida) return null;
    return extrairBeneficiarioFinal(descricaoSugerida);
  }, [descricaoSugerida]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fornecedor: Fornecedor) => {
    onChange(fornecedor.id);
    setSearch('');
    setOpen(false);
    setShowCreateForm(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setSearch('');
    setShowCreateForm(false);
  };

  const handleInputFocus = () => {
    setOpen(true);
    // Se tem sugestão de beneficiário, usar como busca inicial
    if (beneficiarioSugerido && !search && !value) {
      setSearch(beneficiarioSugerido);
    }
  };

  const handleStartCreate = () => {
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewFornecedorCategoria(undefined);
  };

  const handleConfirmCreate = () => {
    if (!newFornecedorCategoria || !search.trim()) return;
    
    const novoFornecedor: Omit<Fornecedor, 'id'> = {
      nome: search.trim(),
      modalidade: newFornecedorCategoria.modalidade,
      grupo: newFornecedorCategoria.grupo,
      categoria: newFornecedorCategoria.categoria,
    };
    
    onCreateNew?.(novoFornecedor);
    setSearch('');
    setOpen(false);
    setShowCreateForm(false);
    setNewFornecedorCategoria(undefined);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Campo de busca / seleção */}
      {selectedFornecedor ? (
        <div className="flex items-center gap-1.5 h-8 px-2 border rounded-md bg-background">
          <span className="text-xs truncate flex-1">{selectedFornecedor.nome}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
            {selectedFornecedor.categoria}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handleInputFocus}
            className="h-8 text-xs pr-8"
          />
          <ChevronDown 
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )} 
          />
        </div>
      )}

      {/* Dropdown */}
      {open && !selectedFornecedor && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {/* Formulário de criação */}
          {showCreateForm ? (
            <div className="p-3 space-y-3">
              <p className="text-xs font-medium">Novo fornecedor: "{search}"</p>
              <CategoriaSelect
                value={newFornecedorCategoria}
                onChange={setNewFornecedorCategoria}
                tipo="DESPESAS"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCancelCreate}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={handleConfirmCreate}
                  disabled={!newFornecedorCategoria}
                >
                  <Check className="h-3 w-3" />
                  Salvar e Selecionar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Sugestão de beneficiário */}
              {beneficiarioSugerido && !search && (
                <div className="p-2 border-b bg-muted/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Beneficiário extraído:</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 justify-start text-xs gap-1"
                    onClick={() => setSearch(beneficiarioSugerido)}
                  >
                    🔍 {beneficiarioSugerido}
                  </Button>
                </div>
              )}

              {/* Lista de resultados */}
              {fornecedoresFiltrados.length > 0 ? (
                <div className="py-1">
                  {fornecedoresFiltrados.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full px-2 py-1.5 text-left hover:bg-accent flex items-center justify-between gap-2"
                      onClick={() => handleSelect(f)}
                    >
                      <span className="text-xs truncate">{f.nome}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                        {f.categoria}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Nenhum fornecedor encontrado
                  </p>
                </div>
              )}
              
              {/* Botão criar novo */}
              {onCreateNew && search.length >= 2 && (
                <div className="p-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1 h-7 text-xs"
                    onClick={handleStartCreate}
                  >
                    <Plus className="h-3 w-3" />
                    Criar "{search}"
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
