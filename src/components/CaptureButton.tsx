import { useState } from 'react';
import { Plus, X, FolderPlus } from 'lucide-react';

const CAPTURE_PHRASES = [
  'Anotado. Não é pra agora.',
  'Guardado pra depois.',
  'Isso não é agora.',
  'Não precisa decidir agora.',
];

const PROJECT_PHRASES = [
  'Projeto registrado.',
  'Pronto pra acompanhar.',
  'Anotado no radar.',
];

interface CaptureButtonProps {
  onCapture: (text: string) => void;
  onCreateProject?: (name: string, owner?: string) => void;
}

export function CaptureButton({ onCapture, onCreateProject }: CaptureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'task' | 'project'>('task');
  const [text, setText] = useState('');
  const [owner, setOwner] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      if (mode === 'task') {
        onCapture(text.trim());
        const phrase = CAPTURE_PHRASES[Math.floor(Math.random() * CAPTURE_PHRASES.length)];
        setConfirmationPhrase(phrase);
      } else if (onCreateProject) {
        onCreateProject(text.trim(), owner.trim() || undefined);
        const phrase = PROJECT_PHRASES[Math.floor(Math.random() * PROJECT_PHRASES.length)];
        setConfirmationPhrase(phrase);
      }
      
      setText('');
      setOwner('');
      setIsOpen(false);
      setMode('task');
      
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMode('task');
    setText('');
    setOwner('');
  };

  return (
    <>
      {/* Confirmation toast */}
      {showConfirmation && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full text-sm animate-fade-in z-50">
          {confirmationPhrase}
        </div>
      )}

      {/* Capture modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/95 z-40 animate-fade-in">
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-end mb-8">
              <button
                onClick={handleClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              {/* Mode selector */}
              {onCreateProject && (
                <div className="flex gap-2 mb-6 justify-center">
                  <button
                    onClick={() => setMode('task')}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      mode === 'task'
                        ? 'bg-foreground text-background'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tarefa
                  </button>
                  <button
                    onClick={() => setMode('project')}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      mode === 'project'
                        ? 'bg-foreground text-background'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Projeto
                  </button>
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-4 text-center">
                {mode === 'task' ? 'Anotar algo' : 'Novo projeto'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={mode === 'task' ? 'O que você quer lembrar?' : 'Nome do projeto'}
                  autoFocus
                  rows={mode === 'task' ? 4 : 2}
                  className="w-full p-4 bg-muted/50 rounded-2xl text-foreground placeholder:text-muted-foreground text-lg outline-none focus:ring-2 focus:ring-foreground/10 transition-all resize-none"
                />
                
                {mode === 'project' && (
                  <input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Responsável (opcional)"
                    className="w-full p-4 bg-muted/50 rounded-2xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                  />
                )}
                
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                >
                  {mode === 'task' ? 'Guardar' : 'Criar projeto'}
                </button>
              </form>
              
              <p className="text-center text-muted-foreground text-sm mt-8">
                {mode === 'task' 
                  ? 'Vai pro backlog. Não precisa decidir agora.'
                  : 'Aparece no bloco de acompanhamento.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-foreground text-background rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-30"
          aria-label="Anotar algo"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
