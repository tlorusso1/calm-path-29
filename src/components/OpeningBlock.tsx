import { useState } from 'react';
import { Task } from '@/types/task';
import { Sparkles } from 'lucide-react';

interface OpeningBlockProps {
  phrase: string;
  suggestedTask: Task | null;
  onSelectCritical: (taskId: string) => void;
  onCreateCritical: (text: string) => void;
}

export function OpeningBlock({ phrase, suggestedTask, onSelectCritical, onCreateCritical }: OpeningBlockProps) {
  const [customTask, setCustomTask] = useState('');
  const [showInput, setShowInput] = useState(!suggestedTask);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTask.trim()) {
      onCreateCritical(customTask.trim());
      setCustomTask('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <Sparkles className="w-6 h-6 text-muted-foreground mb-6" />
      
      <p className="text-sm text-muted-foreground mb-4 tracking-wide">
        Abertura do dia
      </p>
      
      <h1 className="text-2xl md:text-3xl font-light text-foreground text-center leading-relaxed max-w-md mb-12">
        {phrase}
      </h1>
      
      {suggestedTask && !showInput && (
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => onSelectCritical(suggestedTask.id)}
            className="w-full p-5 bg-muted/50 rounded-2xl text-left transition-all hover:bg-muted active:scale-[0.99]"
          >
            <p className="text-xs text-muted-foreground mb-2">Sugestão</p>
            <p className="text-lg text-foreground">{suggestedTask.text}</p>
          </button>
          
          <button
            onClick={() => setShowInput(true)}
            className="w-full py-3 text-muted-foreground text-sm transition-all hover:text-foreground"
          >
            Escolher outra coisa
          </button>
        </div>
      )}
      
      {showInput && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <input
            type="text"
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            placeholder="O que é crítico hoje?"
            autoFocus
            className="w-full p-4 bg-muted/50 rounded-2xl text-foreground placeholder:text-muted-foreground text-lg outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
          />
          
          <button
            type="submit"
            disabled={!customTask.trim()}
            className="w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            Esse é o foco do dia
          </button>
          
          {suggestedTask && (
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="w-full py-3 text-muted-foreground text-sm transition-all hover:text-foreground"
            >
              Ver sugestão
            </button>
          )}
        </form>
      )}
    </div>
  );
}
