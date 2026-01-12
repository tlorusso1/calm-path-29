import { Task } from '@/types/task';
import { Check, ArrowRight } from 'lucide-react';

interface CurrentTaskProps {
  task: Task;
  phrase: string;
  onComplete: () => void;
  onSkip: () => void;
  showSkip?: boolean;
}

export function CurrentTask({ task, phrase, onComplete, onSkip, showSkip = true }: CurrentTaskProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <p className="text-sm text-muted-foreground mb-8 tracking-wide">
        {phrase}
      </p>
      
      <h1 className="text-2xl md:text-3xl font-light text-foreground text-center leading-relaxed max-w-md mb-16">
        {task.text}
      </h1>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={onComplete}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Check className="w-5 h-5" />
          Concluído
        </button>
        
        {showSkip && (
          <button
            onClick={onSkip}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 text-muted-foreground rounded-full text-base transition-all hover:bg-muted active:scale-[0.98]"
          >
            Não posso agora
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
