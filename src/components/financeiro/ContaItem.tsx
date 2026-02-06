import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Check, X, Pencil, Calendar, CalendarCheck, CheckCircle, Package } from 'lucide-react';
import { ContaFluxo, ContaFluxoTipo, ContaFluxoNatureza, Fornecedor } from '@/types/focus-mode';
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
  const [editNatureza, setEditNatureza] = useState<ContaFluxoNatureza | undefined>(conta.natureza);
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
      natureza: editNatureza,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor);
    setEditData(conta.dataVencimento);
    setEditTipo(conta.tipo);
    setEditNatureza(conta.natureza);
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
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded border ${styles.bg}`}>
        {/* Linha 1: Tipo + Natureza */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={editTipo} onValueChange={(val) => setEditTipo(val as ContaFluxoTipo)}>
            <SelectTrigger className="h-8 w-full sm:w-28 text-xs">
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
          
          {/* Seletor de Natureza (somente para tipo "pagar") */}
          {editTipo === 'pagar' && (
            <Select 
              value={editNatureza || 'operacional'} 
              onValueChange={(val) => setEditNatureza(val as ContaFluxoNatureza)}
            >
              <SelectTrigger className="h-8 w-full sm:w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">⚙️ Operacional</SelectItem>
                <SelectItem value="capitalGiro">📦 Estoque</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Linha 2: Data + Descrição */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
          <Input
            value={editData}
            onChange={(e) => setEditData(e.target.value)}
            type="date"
            className="h-8 w-full sm:w-32 text-xs"
            onKeyDown={handleKeyDown}
          />
          <Input
            ref={inputRef}
            value={editDescricao}
            onChange={(e) => setEditDescricao(e.target.value)}
            placeholder="Descrição"
            className="h-8 flex-1 min-w-0 text-xs"
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {/* Linha 3: Valor + Ações */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-28 sm:flex-none">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              value={editValor}
              onChange={(e) => setEditValor(e.target.value)}
              placeholder="0,00"
              className="h-8 text-xs pl-7 text-right"
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={handleSave}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 p-2 rounded border text-sm group transition-colors",
          styles.bg,
          "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => setIsEditing(true)}
      >
        {/* Linha 1: Data + Descrição */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
          <span className="text-xs text-muted-foreground w-12 shrink-0">
            {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate flex-1 sm:max-w-[300px] cursor-default">{conta.descricao}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[350px] text-xs">
              {conta.descricao}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Linha 2: Badges + Valor + Ações */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Badge de tipo clicável com cycling */}
          {(() => {
            const tipoConfig = {
              pagar: { emoji: '🔴', label: 'SAÍDA', next: 'receber' as ContaFluxoTipo },
              receber: { emoji: '🟢', label: 'ENTRADA', next: 'intercompany' as ContaFluxoTipo },
              intercompany: { emoji: '🔁', label: 'INTER', next: 'aplicacao' as ContaFluxoTipo },
              aplicacao: { emoji: '📈', label: 'APLIC', next: 'resgate' as ContaFluxoTipo },
              resgate: { emoji: '📉', label: 'RESG', next: 'cartao' as ContaFluxoTipo },
              cartao: { emoji: '💳', label: 'CARTÃO', next: 'pagar' as ContaFluxoTipo },
            };
            const config = tipoConfig[conta.tipo];
            const bgColor = 
              conta.tipo === 'pagar' ? 'bg-red-100 text-red-700' :
              conta.tipo === 'receber' ? 'bg-green-100 text-green-700' :
              conta.tipo === 'intercompany' ? 'bg-blue-100 text-blue-700' :
              conta.tipo === 'aplicacao' ? 'bg-purple-100 text-purple-700' :
              conta.tipo === 'resgate' ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-700';
            
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(conta.id, { tipo: config.next });
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity shrink-0 ${bgColor}`}
                    title="Clique para alternar tipo"
                  >
                    {config.emoji} {config.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Próximo: {tipoConfig[config.next as ContaFluxoTipo].label}
                </TooltipContent>
              </Tooltip>
            );
          })()}
          
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
          {/* Toggle de Natureza - apenas para contas a pagar pendentes */}
          {conta.tipo === 'pagar' && !conta.pago && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const novaNatureza = conta.natureza === 'capitalGiro' ? 'operacional' : 'capitalGiro';
                    onUpdate(conta.id, { natureza: novaNatureza });
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity shrink-0 flex items-center gap-1",
                    conta.natureza === 'capitalGiro' 
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {conta.natureza === 'capitalGiro' ? '📦 EST' : '⚙️ OP'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {conta.natureza === 'capitalGiro' 
                  ? "Estoque (não impacta meta) — Clique para Operacional" 
                  : "Operacional (impacta meta) — Clique para Estoque"}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Badge estático para contas pagas (histórico) */}
          {conta.tipo === 'pagar' && conta.pago && conta.natureza === 'capitalGiro' && (
            <Badge variant="outline" className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700 shrink-0 gap-1">
              <Package className="h-2.5 w-2.5" />
              Estoque
            </Badge>
          )}
          
          {/* Valor + Ações - empurrados para direita */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
        
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
      </div>
    </TooltipProvider>
  );
}
