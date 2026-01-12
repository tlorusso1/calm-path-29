import { Coffee } from 'lucide-react';

interface EmptyStateProps {
  phrase: string;
  blockTitle: string;
}

export function EmptyState({ phrase, blockTitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <Coffee className="w-8 h-8 text-muted-foreground mb-6" />
      
      <p className="text-sm text-muted-foreground mb-4 tracking-wide">
        {blockTitle}
      </p>
      
      <h1 className="text-2xl md:text-3xl font-light text-foreground text-center leading-relaxed max-w-md mb-4">
        Nada pendente agora.
      </h1>
      
      <p className="text-muted-foreground text-center max-w-xs">
        {phrase}
      </p>
    </div>
  );
}
