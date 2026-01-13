import { Coffee, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  phrase: string;
  blockTitle: string;
  allSkipped?: boolean;
  onResetSkipped?: () => void;
}

export function EmptyState({ phrase, blockTitle, allSkipped, onResetSkipped }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <Coffee className="w-8 h-8 text-muted-foreground mb-6" />
      
      <p className="text-sm text-muted-foreground mb-4 tracking-wide">
        {blockTitle}
      </p>
      
      <h1 className="text-2xl md:text-3xl font-light text-foreground text-center leading-relaxed max-w-md mb-4">
        {allSkipped ? 'Tudo adiado por agora.' : 'Nada pendente agora.'}
      </h1>
      
      <p className="text-muted-foreground text-center max-w-xs mb-6">
        {allSkipped 
          ? 'Você pulou todas as tarefas disponíveis. Que tal voltar a elas?'
          : phrase
        }
      </p>

      {allSkipped && onResetSkipped && (
        <button
          onClick={onResetSkipped}
          className="flex items-center justify-center gap-2 py-3 px-6 text-foreground border border-border rounded-full text-sm transition-all hover:bg-muted active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          Voltar às tarefas
        </button>
      )}
    </div>
  );
}
