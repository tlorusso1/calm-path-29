import { useState } from 'react';
import { Archive, X, Trash2 } from 'lucide-react';
import { Task } from '@/types/task';

interface BacklogAccessProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
}

export function BacklogAccess({ tasks, onDeleteTask }: BacklogAccessProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
        aria-label="Ver backlog"
      >
        <Archive className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-40 animate-fade-in overflow-auto">
      <div className="p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-medium text-foreground">Backlog</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nada anotado ainda.
          </p>
        ) : (
          <div className="space-y-8">
            {pendingTasks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                  Pendentes ({pendingTasks.length})
                </p>
                <div className="space-y-2">
                  {pendingTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl"
                    >
                      <p className="flex-1 text-foreground">{task.text}</p>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {completedTasks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                  Concluídas ({completedTasks.length})
                </p>
                <div className="space-y-2">
                  {completedTasks.slice(0, 10).map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl"
                    >
                      <p className="flex-1 text-muted-foreground line-through">
                        {task.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
