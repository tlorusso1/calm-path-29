import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';

interface FinanceiroModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
}

export function FinanceiroMode({
  mode,
  onToggleItem,
  onSetClassification,
  onSetDecision,
  onSetNotes,
}: FinanceiroModeProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {mode.items.map(item => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
            onSetClassification={(c) => onSetClassification(item.id, c)}
            onSetDecision={(d) => onSetDecision(item.id, d)}
            onSetNotes={(n) => onSetNotes(item.id, n)}
            showClassification
            showDecision
            showNotes
          />
        ))}
      </div>
      
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground space-y-1">
          <span className="block"><strong>A</strong> = Crítico, pagar agora</span>
          <span className="block"><strong>B</strong> = Importante, pode esperar dias</span>
          <span className="block"><strong>C</strong> = Não urgente, renegociar ou adiar</span>
        </p>
      </div>
    </div>
  );
}
