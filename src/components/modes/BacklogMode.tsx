import { useState } from 'react';
import { FocusMode } from '@/types/focus-mode';
import { ChecklistItem } from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Star, Clock } from 'lucide-react';

interface BacklogModeProps {
  mode: FocusMode;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
  onAddItem: (text: string) => void;
  onRemoveItem: (itemId: string) => void;
}

export function BacklogMode({
  mode,
  onToggleItem,
  onSetNotes,
  onAddItem,
  onRemoveItem,
}: BacklogModeProps) {
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText);
      setNewItemText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  // Sort: urgent first (marked with ⭐ in notes), then incomplete, then completed
  const sortedItems = [...mode.items].sort((a, b) => {
    const aUrgent = a.notes?.includes('⭐') ? 1 : 0;
    const bUrgent = b.notes?.includes('⭐') ? 1 : 0;
    if (bUrgent !== aUrgent) return bUrgent - aUrgent;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
  });

  const pendingCount = mode.items.filter(i => !i.completed).length;

  return (
    <div className="space-y-4">
      {/* Add new item */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova tarefa..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleAddItem} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tips */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" /> Adicione ⭐ nas notas para urgente
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Ex: "15min", "30min", "1h"
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma tarefa no backlog.</p>
            <p className="text-xs mt-1">Adicione tarefas acima.</p>
          </div>
        ) : (
          sortedItems.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={() => onToggleItem(item.id)}
              onSetNotes={(n) => onSetNotes(item.id, n)}
              onRemove={() => onRemoveItem(item.id)}
              showNotes
            />
          ))
        )}
      </div>

      {/* Counter */}
      {pendingCount > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {pendingCount} {pendingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'}
        </div>
      )}
    </div>
  );
}
