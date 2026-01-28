import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';

interface SupplyChainModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
}

export function SupplyChainMode({
  mode,
  onToggleItem,
  onSetNotes,
}: SupplyChainModeProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {mode.items.map(item => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
            onSetNotes={(n) => onSetNotes(item.id, n)}
            showNotes
          />
        ))}
      </div>
      
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          Lembre-se: estoque parado é dinheiro parado. 
          Compras só se houver demanda real ou oportunidade clara.
        </p>
      </div>
    </div>
  );
}
