import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';

interface PreReuniaoGeralModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
}

export function PreReuniaoGeralMode({
  mode,
  onToggleItem,
  onSetNotes,
}: PreReuniaoGeralModeProps) {
  const allCompleted = mode.items.length > 0 && mode.items.every(item => item.completed);
  
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
      
      {allCompleted && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-sm font-medium text-primary">
            ✓ Preparação concluída
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Você está pronto para a reunião.
          </p>
        </div>
      )}
    </div>
  );
}
