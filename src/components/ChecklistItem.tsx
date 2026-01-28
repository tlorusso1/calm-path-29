import { ChecklistItem as ChecklistItemType } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onSetClassification?: (classification: 'A' | 'B' | 'C') => void;
  onSetDecision?: (decision: string) => void;
  onSetNotes?: (notes: string) => void;
  onRemove?: () => void;
  showClassification?: boolean;
  showDecision?: boolean;
  showNotes?: boolean;
}

const CLASSIFICATIONS = ['A', 'B', 'C'] as const;
const DECISIONS = ['pagar', 'segurar', 'renegociar'] as const;

export function ChecklistItem({
  item,
  onToggle,
  onSetClassification,
  onSetDecision,
  onSetNotes,
  onRemove,
  showClassification = false,
  showDecision = false,
  showNotes = false,
}: ChecklistItemProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border border-border bg-card transition-opacity",
      item.completed && "opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.completed}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-3">
          <span className={cn(
            "text-sm font-medium",
            item.completed && "line-through text-muted-foreground"
          )}>
            {item.text}
          </span>
          
          {showClassification && onSetClassification && (
            <div className="flex gap-2">
              {CLASSIFICATIONS.map(c => (
                <Button
                  key={c}
                  variant={item.classification === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetClassification(c)}
                  className="h-7 w-7 p-0 text-xs"
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
          
          {showDecision && onSetDecision && (
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map(d => (
                <Button
                  key={d}
                  variant={item.decision === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetDecision(d)}
                  className="h-7 text-xs capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          )}
          
          {showNotes && onSetNotes && (
            <Input
              placeholder="Notas rápidas..."
              value={item.notes || ''}
              onChange={(e) => onSetNotes(e.target.value)}
              className="h-8 text-sm"
            />
          )}
        </div>
        
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
