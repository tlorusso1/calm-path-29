import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';

interface PreReuniaoVerterModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
}

export function PreReuniaoVerterMode({
  mode,
  onToggleItem,
  onSetNotes,
}: PreReuniaoVerterModeProps) {
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
      
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          Nenhum assunto operacional entra aqui. 
          Foco em estratégia e visão de longo prazo.
        </p>
      </div>
      
      {allCompleted && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-sm font-medium text-primary">
            ✓ Preparação Verter concluída
          </p>
        </div>
      )}
    </div>
  );
}
