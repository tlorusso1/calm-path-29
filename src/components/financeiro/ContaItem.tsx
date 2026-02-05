import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check, X, Pencil } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaItemProps {
  conta: ContaFluxo;
  variant: 'pagar' | 'receber';
  onUpdate: (id: string, updates: Partial<ContaFluxo>) => void;
  onRemove: (id: string) => void;
  formatCurrency: (val: string) => string;
}

export function ContaItem({ conta, variant, onUpdate, onRemove, formatCurrency }: ContaItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescricao, setEditDescricao] = useState(conta.descricao);
  const [editValor, setEditValor] = useState(conta.valor);
  const [editData, setEditData] = useState(conta.dataVencimento);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdate(conta.id, {
      descricao: editDescricao.trim() || conta.descricao,
      valor: editValor || conta.valor,
      dataVencimento: editData || conta.dataVencimento,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor);
    setEditData(conta.dataVencimento);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const bgClass = variant === 'pagar' ? 'bg-destructive/5' : 'bg-green-500/5';
  const textClass = variant === 'pagar' ? 'text-destructive' : 'text-green-600';

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded border ${bgClass}`}>
        <Input
          ref={inputRef}
          value={editData}
          onChange={(e) => setEditData(e.target.value)}
          type="date"
          className="h-7 w-24 text-xs"
          onKeyDown={handleKeyDown}
        />
        <Input
          value={editDescricao}
          onChange={(e) => setEditDescricao(e.target.value)}
          placeholder="Descrição"
          className="h-7 flex-1 text-xs"
          onKeyDown={handleKeyDown}
        />
        <div className="relative w-24">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <Input
            value={editValor}
            onChange={(e) => setEditValor(e.target.value)}
            placeholder="0,00"
            className="h-7 text-xs pl-7 text-right"
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-2 rounded border ${bgClass} text-sm group cursor-pointer hover:bg-muted/50 transition-colors`}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-12">
          {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
        </span>
        <span className="truncate max-w-[120px]">{conta.descricao}</span>
        {conta.pago && (
          <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">pago</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-medium ${textClass}`}>
          {formatCurrency(conta.valor)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(conta.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
