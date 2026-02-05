import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Check, X, Pencil, Calendar, CalendarCheck, CheckCircle, Package } from 'lucide-react';
import { ContaFluxo, ContaFluxoTipo, Fornecedor } from '@/types/focus-mode';
import { format, parseISO, isBefore, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isCapitalGiro } from '@/utils/fluxoCaixaCalculator';

interface ContaItemProps {
  conta: ContaFluxo;
  variant: ContaFluxoTipo;
  fornecedores?: Fornecedor[]; // Para verificar se é Capital de Giro
  onUpdate: (id: string, updates: Partial<ContaFluxo>) => void;
  onRemove: (id: string) => void;
  onTogglePago?: (id: string) => void;
  onToggleAgendado?: (id: string) => void;
  formatCurrency: (val: string) => string;
}

type StatusConta = 'atrasada' | 'hoje' | 'agendada' | 'normal';

function getStatusConta(conta: ContaFluxo): StatusConta {
  if (conta.pago) return 'normal';
  if (conta.agendado) return 'agendada';
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataVenc = parseISO(conta.dataVencimento);
  
  if (isToday(dataVenc)) return 'hoje';
  if (isBefore(dataVenc, hoje)) return 'atrasada';
  return 'normal';
}

// Mapeia tipo para estilo visual
function getEffectiveVariant(tipo: ContaFluxoTipo): 'pagar' | 'receber' | 'neutro' {
  switch (tipo) {
    case 'receber':
    case 'resgate':
      return 'receber';
    case 'pagar':
      return 'pagar';
    case 'intercompany':
    case 'aplicacao':
    default:
      return 'neutro';
  }
}

function getStatusStyles(status: StatusConta, variant: ContaFluxoTipo) {
  const effectiveVariant = getEffectiveVariant(variant);
  
  switch (status) {
    case 'atrasada':
      return {
        bg: 'bg-destructive/10 border-destructive/30',
        text: 'text-destructive',
      };
    case 'hoje':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300',
        text: 'text-yellow-700 dark:text-yellow-400',
      };
    case 'agendada':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300',
        text: effectiveVariant === 'pagar' ? 'text-destructive' : effectiveVariant === 'receber' ? 'text-green-600' : 'text-blue-600',
      };
    default:
      return {
        bg: effectiveVariant === 'pagar' ? 'bg-destructive/5' : effectiveVariant === 'receber' ? 'bg-green-500/5' : 'bg-blue-500/5',
        text: effectiveVariant === 'pagar' ? 'text-destructive' : effectiveVariant === 'receber' ? 'text-green-600' : 'text-blue-600',
      };
  }
}

export function ContaItem({ 
  conta, 
  variant, 
  fornecedores = [],
  onUpdate, 
  onRemove, 
  onTogglePago,
  onToggleAgendado,
  formatCurrency 
}: ContaItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescricao, setEditDescricao] = useState(conta.descricao);
  const [editValor, setEditValor] = useState(conta.valor);
  const [editData, setEditData] = useState(conta.dataVencimento);
  const [editTipo, setEditTipo] = useState(conta.tipo);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = getStatusConta(conta);
  const styles = getStatusStyles(status, variant);
  const ehCapitalGiro = isCapitalGiro(conta, fornecedores);

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
      tipo: editTipo,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor);
    setEditData(conta.dataVencimento);
    setEditTipo(conta.tipo);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getDiasAtraso = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = parseISO(conta.dataVencimento);
    return differenceInDays(hoje, dataVenc);
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded border ${styles.bg}`}>
        <Select value={editTipo} onValueChange={(val) => setEditTipo(val as ContaFluxoTipo)}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pagar">💸 Pagar</SelectItem>
            <SelectItem value="receber">💰 Receber</SelectItem>
            <SelectItem value="intercompany">🔁 Intercompany</SelectItem>
            <SelectItem value="aplicacao">📈 Aplicação</SelectItem>
            <SelectItem value="resgate">📉 Resgate</SelectItem>
          </SelectContent>
        </Select>
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
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center justify-between p-2 rounded border text-sm group transition-colors",
          styles.bg,
          !conta.pago && !conta.agendado && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => !conta.pago && !conta.agendado && setIsEditing(true)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground w-12 shrink-0">
            {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate max-w-[250px] cursor-default">{conta.descricao}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[350px] text-xs">
              {conta.descricao}
            </TooltipContent>
          </Tooltip>
          
          {/* Badges de status */}
          {conta.pago && (
            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 shrink-0">
              pago
            </Badge>
          )}
          {conta.agendado && !conta.pago && (
            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 shrink-0">
              agendado
            </Badge>
          )}
          {status === 'atrasada' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  {getDiasAtraso()}d atraso
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Vencido há {getDiasAtraso()} dia(s)
              </TooltipContent>
            </Tooltip>
          )}
          {status === 'hoje' && (
            <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-700 shrink-0">
              vence hoje
            </Badge>
          )}
          {ehCapitalGiro && !conta.pago && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700 shrink-0 gap-1">
                  <Package className="h-2.5 w-2.5" />
                  Estoque
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                Capital de Giro — não impacta meta de faturamento
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`font-medium ${styles.text}`}>
            {formatCurrency(conta.valor)}
          </span>
          
          {/* Botões de ação */}
          {!conta.pago && onTogglePago && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePago(conta.id);
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dar baixa (pago)</TooltipContent>
            </Tooltip>
          )}
          
          {!conta.pago && onToggleAgendado && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 w-6 p-0",
                    conta.agendado 
                      ? "text-blue-600 hover:text-blue-700 hover:bg-blue-100" 
                      : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAgendado(conta.id);
                  }}
                >
                  {conta.agendado ? (
                    <CalendarCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {conta.agendado ? 'Desmarcar agendamento' : 'Agendar (baixa automática no vencimento)'}
              </TooltipContent>
            </Tooltip>
          )}
          
          {!conta.pago && !conta.agendado && (
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
          )}
          
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
    </TooltipProvider>
  );
}
