import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Fornecedor } from '@/types/focus-mode';

interface FornecedorSelectProps {
  fornecedores: Fornecedor[];
  value?: string;
  onChange: (fornecedorId: string | undefined, fornecedor: Fornecedor | undefined) => void;
  onCreateNew?: (nome: string) => void;
  placeholder?: string;
  descricaoSugerida?: string;
}

// Extrai "Beneficiário Final" de descrições compostas
function extrairBeneficiario(texto: string): string | null {
  const match = texto.match(/Benefici[aá]rio\s*Final[:\s]+([^)]+)/i);
  if (match) return match[1].trim();
  return null;
}

// Fuzzy match simples
function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalizedText.includes(normalizedQuery);
}

export function FornecedorSelect({
  fornecedores,
  value,
  onChange,
  onCreateNew,
  placeholder = "Selecione fornecedor...",
  descricaoSugerida,
}: FornecedorSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedFornecedor = useMemo(() => 
    fornecedores.find(f => f.id === value),
    [fornecedores, value]
  );

  // Tenta encontrar sugestão baseada na descrição
  const sugestao = useMemo(() => {
    if (!descricaoSugerida) return null;
    
    // Tentar extrair beneficiário final
    const beneficiario = extrairBeneficiario(descricaoSugerida);
    const termosBusca = beneficiario 
      ? [beneficiario, descricaoSugerida]
      : [descricaoSugerida];
    
    for (const termo of termosBusca) {
      const match = fornecedores.find(f => 
        fuzzyMatch(f.nome, termo) || 
        f.aliases?.some(a => fuzzyMatch(a, termo))
      );
      if (match) return match;
    }
    return null;
  }, [descricaoSugerida, fornecedores]);

  const filteredFornecedores = useMemo(() => {
    if (!search) return fornecedores.slice(0, 50); // Limitar para performance
    return fornecedores.filter(f => 
      fuzzyMatch(f.nome, search) || 
      fuzzyMatch(f.categoria, search) ||
      f.aliases?.some(a => fuzzyMatch(a, search))
    ).slice(0, 50);
  }, [fornecedores, search]);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-xs"
          >
            {selectedFornecedor ? (
              <span className="truncate">{selectedFornecedor.nome}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar fornecedor..." 
              value={search}
              onValueChange={setSearch}
              className="text-xs"
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Nenhum fornecedor encontrado</p>
                  {onCreateNew && search && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1"
                      onClick={() => {
                        onCreateNew(search);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Criar "{search}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {/* Sugestão destacada */}
                {sugestao && !search && !selectedFornecedor && (
                  <CommandItem
                    key={`sugestao-${sugestao.id}`}
                    value={sugestao.id}
                    onSelect={() => {
                      onChange(sugestao.id, sugestao);
                      setOpen(false);
                    }}
                    className="bg-primary/5 border-l-2 border-primary"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        value === sugestao.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        💡 {sugestao.nome}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {sugestao.categoria}
                      </p>
                    </div>
                  </CommandItem>
                )}
                {filteredFornecedores.map((fornecedor) => (
                  <CommandItem
                    key={fornecedor.id}
                    value={fornecedor.id}
                    onSelect={() => {
                      onChange(
                        fornecedor.id === value ? undefined : fornecedor.id,
                        fornecedor.id === value ? undefined : fornecedor
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        value === fornecedor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{fornecedor.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {fornecedor.categoria}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Mostrar categoria selecionada */}
      {selectedFornecedor && (
        <p className="text-[10px] text-muted-foreground">
          {selectedFornecedor.modalidade} → {selectedFornecedor.categoria}
        </p>
      )}
    </div>
  );
}
