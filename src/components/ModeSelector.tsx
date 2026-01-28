import { FocusModeId, MODE_CONFIGS } from '@/types/focus-mode';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  activeMode: FocusModeId | null;
  onSelectMode: (modeId: FocusModeId) => void;
}

const MODE_ORDER: FocusModeId[] = [
  'financeiro',
  'marketing',
  'supplychain',
  'pre-reuniao-geral',
  'pre-reuniao-ads',
  'pre-reuniao-verter',
  'backlog',
];

export function ModeSelector({ activeMode, onSelectMode }: ModeSelectorProps) {
  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {MODE_ORDER.map((modeId) => {
            const config = MODE_CONFIGS[modeId];
            const isActive = activeMode === modeId;
            
            return (
              <button
                key={modeId}
                onClick={() => onSelectMode(modeId)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <span>{config.icon}</span>
                <span className="hidden sm:inline">{config.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
