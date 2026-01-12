import { useState } from 'react';
import { Plus, X } from 'lucide-react';

const CAPTURE_PHRASES = [
  'Anotado. Não é pra agora.',
  'Guardado pra depois.',
  'Isso não é agora.',
  'Não precisa decidir agora.',
];

interface CaptureButtonProps {
  onCapture: (text: string) => void;
}

export function CaptureButton({ onCapture }: CaptureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onCapture(text.trim());
      setText('');
      setIsOpen(false);
      
      // Show confirmation
      const phrase = CAPTURE_PHRASES[Math.floor(Math.random() * CAPTURE_PHRASES.length)];
      setConfirmationPhrase(phrase);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
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
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Anotar algo
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="O que você quer lembrar?"
                  autoFocus
                  rows={4}
                  className="w-full p-4 bg-muted/50 rounded-2xl text-foreground placeholder:text-muted-foreground text-lg outline-none focus:ring-2 focus:ring-foreground/10 transition-all resize-none"
                />
                
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="w-full py-4 px-6 bg-foreground text-background rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                >
                  Guardar
                </button>
              </form>
              
              <p className="text-center text-muted-foreground text-sm mt-8">
                Vai pro backlog. Não precisa decidir agora.
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
