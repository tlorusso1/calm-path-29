import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CATEGORIAS_DRE, 
  getModalidades, 
  getGrupos, 
  getCategorias, 
  findCategoria,
  TipoDRE 
} from '@/data/categorias-dre';

export interface CategoriaValue {
  modalidade: string;
  grupo: string;
  categoria: string;
}

interface CategoriaSelectProps {
  value?: CategoriaValue;
  onChange: (value: CategoriaValue | undefined) => void;
  tipo?: TipoDRE; // Filtrar por tipo (RECEITAS ou DESPESAS)
  compact?: boolean; // Modo compacto para uso inline
  className?: string;
}

export function CategoriaSelect({
  value,
  onChange,
  tipo,
  compact = false,
  className,
}: CategoriaSelectProps) {
  const [selectedModalidade, setSelectedModalidade] = useState(value?.modalidade || '');
  const [selectedGrupo, setSelectedGrupo] = useState(value?.grupo || '');

  // Listas filtradas
  const modalidades = useMemo(() => getModalidades(tipo), [tipo]);
  const grupos = useMemo(() => 
    selectedModalidade ? getGrupos(selectedModalidade) : [],
    [selectedModalidade]
  );
  const categorias = useMemo(() => 
    selectedGrupo ? getCategorias(selectedGrupo) : [],
    [selectedGrupo]
  );

  const handleModalidadeChange = (modalidade: string) => {
    setSelectedModalidade(modalidade);
    setSelectedGrupo('');
    onChange(undefined);
  };

  const handleGrupoChange = (grupo: string) => {
    setSelectedGrupo(grupo);
    onChange(undefined);
  };

  const handleCategoriaChange = (categoria: string) => {
    if (selectedModalidade && selectedGrupo) {
      onChange({
        modalidade: selectedModalidade,
        grupo: selectedGrupo,
        categoria,
      });
    }
  };

  const handleClear = () => {
    setSelectedModalidade('');
    setSelectedGrupo('');
    onChange(undefined);
  };

  // Modo compacto mostra apenas categoria selecionada ou os selects em cascata
  if (compact && value) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 max-w-[200px]">
          <span className="truncate">{value.categoria}</span>
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
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Seletor de Modalidade */}
      <Select value={selectedModalidade} onValueChange={handleModalidadeChange}>
        <SelectTrigger className={cn("h-8 text-xs", compact && "h-7")}>
          <SelectValue placeholder="Modalidade..." />
        </SelectTrigger>
        <SelectContent>
          {modalidades.map(mod => (
            <SelectItem key={mod} value={mod} className="text-xs">
              {mod}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Seletor de Grupo */}
      {selectedModalidade && grupos.length > 0 && (
        <div className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <Select value={selectedGrupo} onValueChange={handleGrupoChange}>
            <SelectTrigger className={cn("h-8 text-xs flex-1", compact && "h-7")}>
              <SelectValue placeholder="Grupo..." />
            </SelectTrigger>
            <SelectContent>
              {grupos.map(grupo => (
                <SelectItem key={grupo} value={grupo} className="text-xs">
                  {grupo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Seletor de Categoria */}
      {selectedGrupo && categorias.length > 0 && (
        <div className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <Select value={value?.categoria || ''} onValueChange={handleCategoriaChange}>
            <SelectTrigger className={cn("h-8 text-xs flex-1", compact && "h-7")}>
              <SelectValue placeholder="Categoria..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mostrar seleção completa */}
      {value && !compact && (
        <div className="flex items-center gap-1 flex-wrap mt-1">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {value.categoria}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1 text-muted-foreground"
            onClick={handleClear}
          >
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
