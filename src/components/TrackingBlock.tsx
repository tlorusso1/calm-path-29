import { useState } from 'react';
import { Check, MessageCircle, ChevronRight, User } from 'lucide-react';
import { Project } from '@/types/task';

interface TrackingBlockProps {
  phrase: string;
  projects: Project[];
  onMarkChecked: (id: string) => void;
  onSetNextAction: (id: string, action: string) => void;
  onSkipTracking: () => void;
  allChecked: boolean;
}

export function TrackingBlock({
  phrase,
  projects,
  onMarkChecked,
  onSetNextAction,
  onSkipTracking,
  allChecked,
}: TrackingBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  const currentProject = projects[currentIndex];

  const handleChecked = () => {
    if (currentProject) {
      onMarkChecked(currentProject.id);
      moveToNext();
    }
  };

  const handleAddNote = () => {
    if (currentProject && noteText.trim()) {
      onSetNextAction(currentProject.id, noteText.trim());
      onMarkChecked(currentProject.id);
      setNoteText('');
      setShowNoteInput(false);
      moveToNext();
    }
  };

  const moveToNext = () => {
    if (currentIndex < projects.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowNoteInput(false);
      setNoteText('');
    }
  };

  if (allChecked || projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground text-lg mb-4">
          {projects.length === 0 
            ? 'Nenhum projeto para acompanhar.'
            : 'Todos os projetos verificados hoje.'}
        </p>
        <p className="text-muted-foreground/70 text-sm">
          {phrase}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground mb-2">
          Acompanhamento ({currentIndex + 1}/{projects.length})
        </p>
        <p className="text-muted-foreground/70 text-sm italic">
          "{phrase}"
        </p>
      </div>

      {/* Current Project Card */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-muted/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-medium text-foreground mb-3">
            {currentProject.name}
          </h2>
          
          {currentProject.owner && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <User className="w-4 h-4" />
              <span>Com: {currentProject.owner}</span>
            </div>
          )}
          
          {currentProject.nextAction && (
            <p className="text-sm text-muted-foreground bg-background/50 rounded-lg p-3">
              Última nota: {currentProject.nextAction}
            </p>
          )}
        </div>

        {/* Note Input */}
        {showNoteInput ? (
          <div className="space-y-4 mb-6">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Cobrei fulano, aguardando retorno..."
              autoFocus
              rows={2}
              className="w-full p-4 bg-muted/50 rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoteInput(false)}
                className="flex-1 py-3 px-4 text-muted-foreground rounded-full text-sm transition-all hover:bg-muted/50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="flex-1 py-3 px-4 bg-foreground text-background rounded-full text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          /* Action Buttons */
          <div className="space-y-3">
            <button
              onClick={handleChecked}
              className="w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Verificado
            </button>
            
            <button
              onClick={() => setShowNoteInput(true)}
              className="w-full py-4 px-6 bg-muted/50 text-foreground rounded-full text-base transition-all hover:bg-muted active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Adicionar nota
            </button>
          </div>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={onSkipTracking}
        className="mt-6 py-3 text-muted-foreground text-sm transition-colors hover:text-foreground flex items-center justify-center gap-1"
      >
        Pular acompanhamento
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
