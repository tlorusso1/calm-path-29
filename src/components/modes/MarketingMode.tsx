import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';

interface MarketingModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
}

export function MarketingMode({
  mode,
  onToggleItem,
  onSetNotes,
}: MarketingModeProps) {
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
      
      <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
        <p className="text-xs font-medium text-foreground">Regras de Ads:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ads do mês = sobra do mês anterior</li>
          <li>• Gestão de Ads é custo fixo</li>
          <li>• Se mês fechou negativo → Ads mínimo técnico</li>
        </ul>
      </div>
    </div>
  );
}
