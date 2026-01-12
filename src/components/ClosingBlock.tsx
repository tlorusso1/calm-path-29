import { useState } from 'react';
import { Moon } from 'lucide-react';

interface ClosingBlockProps {
  phrase: string;
  criticalCompleted: boolean;
  openItems: string;
  onSetOpenItems: (text: string) => void;
  onCloseDay: () => void;
  dayClosed: boolean;
}

export function ClosingBlock({ 
  phrase, 
  criticalCompleted, 
  openItems, 
  onSetOpenItems, 
  onCloseDay,
  dayClosed 
}: ClosingBlockProps) {
  const [localOpenItems, setLocalOpenItems] = useState(openItems);
  const [answered, setAnswered] = useState(false);

  if (dayClosed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
        <Moon className="w-8 h-8 text-muted-foreground mb-6" />
        <h1 className="text-2xl md:text-3xl font-light text-foreground text-center leading-relaxed max-w-md mb-4">
          Dia encerrado.
        </h1>
        <p className="text-muted-foreground text-center">
          {phrase}
        </p>
      </div>
    );
  }

  const handleCloseDay = () => {
    onSetOpenItems(localOpenItems);
    onCloseDay();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <Moon className="w-6 h-6 text-muted-foreground mb-6" />
      
      <p className="text-sm text-muted-foreground mb-4 tracking-wide">
        Encerramento
      </p>
      
      <h1 className="text-xl md:text-2xl font-light text-foreground text-center leading-relaxed max-w-md mb-12">
        {phrase}
      </h1>
      
      {!answered ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-foreground mb-6">
            A ação principal do dia foi feita?
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => setAnswered(true)}
              className="flex-1 py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Sim
            </button>
            <button
              onClick={() => setAnswered(true)}
              className="flex-1 py-4 px-6 bg-muted text-foreground rounded-full text-base transition-all hover:bg-muted/80 active:scale-[0.98]"
            >
              Não
            </button>
          </div>
          
          {!criticalCompleted && (
            <p className="text-center text-muted-foreground text-sm mt-4">
              Tudo bem. Amanhã a gente continua.
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Algo ficou aberto?
            </p>
            <textarea
              value={localOpenItems}
              onChange={(e) => setLocalOpenItems(e.target.value)}
              placeholder="Opcional..."
              rows={3}
              className="w-full p-4 bg-muted/50 rounded-2xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-foreground/10 transition-all resize-none"
            />
          </div>
          
          <button
            onClick={handleCloseDay}
            className="w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Encerrar o dia
          </button>
        </div>
      )}
    </div>
  );
}
