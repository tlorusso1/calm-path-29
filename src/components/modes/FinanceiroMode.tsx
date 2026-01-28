import { FocusMode, FinanceiroStage, ChecklistItem } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Check, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface FinanceiroModeProps {
  mode: FocusMode;
  onUpdateFinanceiroData: (data: Partial<FinanceiroStage>) => void;
  onAddItem: (text: string) => void;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onRemoveItem: (itemId: string) => void;
}

const VENCIMENTO_SOURCES = [
  { key: 'dda', label: 'DDA' },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cobrancas', label: 'Cobranças' },
  { key: 'planilha', label: 'Planilha' },
] as const;

const CLASSIFICATIONS = ['A', 'B', 'C'] as const;
const DECISIONS = ['pagar', 'segurar', 'renegociar'] as const;

export function FinanceiroMode({
  mode,
  onUpdateFinanceiroData,
  onAddItem,
  onToggleItem,
  onSetClassification,
  onRemoveItem,
}: FinanceiroModeProps) {
  const [newItemText, setNewItemText] = useState('');
  const data = mode.financeiroData!;
  
  const allSourcesChecked = Object.values(data.vencimentos).every(v => v);
  const hasItems = data.itensVencimento.length > 0;
  const allItemsClassified = hasItems && data.itensVencimento.every(item => item.classification);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div className="space-y-8">
      {/* ETAPA 1: Caixa Atual */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            1
          </div>
          <h3 className="text-sm font-semibold text-foreground">Caixa atual</h3>
        </div>
        <Textarea
          placeholder="Digite o valor ou situação do caixa..."
          value={data.caixaAtual}
          onChange={(e) => onUpdateFinanceiroData({ caixaAtual: e.target.value })}
          className="min-h-[80px] text-sm"
        />
      </section>

      {/* ETAPA 2: O que vence até domingo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            2
          </div>
          <h3 className="text-sm font-semibold text-foreground">O que vence até domingo</h3>
        </div>
        
        {/* Sources checklist */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-3">Onde você verificou?</p>
          <div className="flex flex-wrap gap-3">
            {VENCIMENTO_SOURCES.map(({ key, label }) => (
              <label 
                key={key} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={data.vencimentos[key as keyof typeof data.vencimentos]}
                  onCheckedChange={(checked) => 
                    onUpdateFinanceiroData({ 
                      vencimentos: { 
                        ...data.vencimentos, 
                        [key]: checked === true 
                      } 
                    })
                  }
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
          
          {allSourcesChecked && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Todas as fontes verificadas</span>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Itens que vencem:</p>
          
          {data.itensVencimento.map((item) => (
            <div 
              key={item.id}
              className={cn(
                "p-3 rounded-lg border border-border bg-card",
                item.completed && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => onToggleItem(item.id)}
                  className="mt-0.5"
                />
                <span className={cn(
                  "flex-1 text-sm",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          
          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar item de vencimento..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="h-9 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddItem}
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ETAPA 3: Agendamento */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            3
          </div>
          <h3 className="text-sm font-semibold text-foreground">Agendamento confirmado</h3>
        </div>
        
        <label className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card cursor-pointer">
          <Checkbox
            checked={data.agendamentoConfirmado}
            onCheckedChange={(checked) => 
              onUpdateFinanceiroData({ agendamentoConfirmado: checked === true })
            }
          />
          <span className="text-sm">Confirmei o que foi e o que não foi agendado</span>
        </label>
      </section>

      {/* ETAPA 4: Classificação A/B/C */}
      {hasItems && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
              4
            </div>
            <h3 className="text-sm font-semibold text-foreground">Classificação A/B/C</h3>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-3">
              <strong>A</strong> = Crítico, pagar agora &nbsp;|&nbsp; 
              <strong>B</strong> = Importante, pode esperar &nbsp;|&nbsp; 
              <strong>C</strong> = Não urgente
            </p>
          </div>

          <div className="space-y-2">
            {data.itensVencimento.map((item) => (
              <div 
                key={item.id}
                className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3"
              >
                <span className="text-sm flex-1">{item.text}</span>
                <div className="flex gap-1">
                  {CLASSIFICATIONS.map(c => (
                    <Button
                      key={c}
                      variant={item.classification === c ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSetClassification(item.id, c)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {allItemsClassified && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Todos os itens classificados</span>
            </div>
          )}
        </section>
      )}

      {/* ETAPA 5: Decisão final */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            5
          </div>
          <h3 className="text-sm font-semibold text-foreground">Decisão final da semana</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map(d => (
            <Button
              key={d}
              variant={data.decisaoFinal === d ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdateFinanceiroData({ decisaoFinal: d })}
              className="capitalize"
            >
              {d === 'pagar' && '💵 '}
              {d === 'segurar' && '⏸️ '}
              {d === 'renegociar' && '🤝 '}
              {d}
            </Button>
          ))}
        </div>
        
        {data.decisaoFinal && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check className="h-4 w-4" />
            <span>Decisão registrada: {data.decisaoFinal}</span>
          </div>
        )}
      </section>
    </div>
  );
}
