import { FocusMode, FinanceiroStage, ChecklistItem } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
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
  { key: 'dda', label: 'Verifiquei DDA' },
  { key: 'email', label: 'Verifiquei E-mail' },
  { key: 'whatsapp', label: 'Verifiquei WhatsApp' },
  { key: 'planilha', label: 'Coloquei na planilha' },
] as const;

const CLASSIFICATIONS = ['A', 'B', 'C'] as const;

// Funções de formatação de moeda
const parseCurrency = (value: string): number => {
  const cleaned = value
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

export function FinanceiroMode({
  mode,
  onUpdateFinanceiroData,
  onAddItem,
  onToggleItem,
  onSetClassification,
  onRemoveItem,
}: FinanceiroModeProps) {
  const [newItemText, setNewItemText] = useState('');
  
  // Merge with defaults to handle partial/missing data from localStorage
  const data: FinanceiroStage = {
    caixaNiceFoods: mode.financeiroData?.caixaNiceFoods ?? '',
    caixaEcommerce: mode.financeiroData?.caixaEcommerce ?? '',
    vencimentos: {
      dda: mode.financeiroData?.vencimentos?.dda ?? false,
      email: mode.financeiroData?.vencimentos?.email ?? false,
      whatsapp: mode.financeiroData?.vencimentos?.whatsapp ?? false,
      planilha: mode.financeiroData?.vencimentos?.planilha ?? false,
    },
    itensVencimento: mode.financeiroData?.itensVencimento ?? [],
    agendamentoConfirmado: mode.financeiroData?.agendamentoConfirmado ?? false,
    decisaoPagar: mode.financeiroData?.decisaoPagar ?? '',
    decisaoSegurar: mode.financeiroData?.decisaoSegurar ?? '',
    decisaoRenegociar: mode.financeiroData?.decisaoRenegociar ?? '',
  };
  
  const allSourcesChecked = Object.values(data.vencimentos).every(v => v);
  const hasItems = data.itensVencimento.length > 0;
  const allItemsClassified = hasItems && data.itensVencimento.every(item => item.classification);
  
  // Calcula o total automaticamente
  const total = parseCurrency(data.caixaNiceFoods) + parseCurrency(data.caixaEcommerce);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div className="space-y-8">
      {/* SEÇÃO 1: Caixa Hoje */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            1
          </div>
          <h3 className="text-sm font-semibold text-foreground">Caixa hoje</h3>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          {/* NICE FOODS */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              NICE FOODS
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaNiceFoods}
                onChange={(e) => onUpdateFinanceiroData({ caixaNiceFoods: e.target.value })}
                className="h-9 text-sm text-right"
              />
            </div>
          </div>
          
          {/* NICE FOODS ECOMMERCE */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              NICE FOODS ECOM
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaEcommerce}
                onChange={(e) => onUpdateFinanceiroData({ caixaEcommerce: e.target.value })}
                className="h-9 text-sm text-right"
              />
            </div>
          </div>
          
          {/* Linha divisória */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-foreground">TOTAL</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: O que vence até domingo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            2
          </div>
          <h3 className="text-sm font-semibold text-foreground">O que vence até domingo</h3>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          {/* Verificações */}
          <div className="space-y-3">
            {VENCIMENTO_SOURCES.map(({ key, label }) => (
              <label 
                key={key} 
                className="flex items-center gap-3 cursor-pointer"
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
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Todas as verificações feitas</span>
            </div>
          )}
        </div>

        {/* Itens de vencimento */}
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

        {/* Agendamento confirmado - junto com vencimentos */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={data.agendamentoConfirmado}
              onCheckedChange={(checked) => 
                onUpdateFinanceiroData({ agendamentoConfirmado: checked === true })
              }
            />
            <span className="text-sm">Confirmei o que foi e o que não foi agendado</span>
          </label>
        </div>
      </section>

      {/* SEÇÃO 3: Classificação A/B/C - apenas se tiver itens */}
      {hasItems && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
              3
            </div>
            <h3 className="text-sm font-semibold text-foreground">Classificação A/B/C</h3>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
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

      {/* SEÇÃO 4: Decisões da Semana */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
            {hasItems ? '4' : '3'}
          </div>
          <h3 className="text-sm font-semibold text-foreground">Decisões da semana</h3>
        </div>
        
        <div className="space-y-4">
          {/* Pagar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              💵 O que vou pagar:
            </label>
            <Textarea
              placeholder="Ex: Fornecedor X, conta de luz..."
              value={data.decisaoPagar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoPagar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
          
          {/* Segurar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              ⏸️ O que vou segurar:
            </label>
            <Textarea
              placeholder="Ex: Compra de estoque, renovação..."
              value={data.decisaoSegurar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoSegurar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
          
          {/* Renegociar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              🤝 O que vou renegociar:
            </label>
            <Textarea
              placeholder="Ex: Parcela do banco, prazo com fornecedor..."
              value={data.decisaoRenegociar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoRenegociar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
