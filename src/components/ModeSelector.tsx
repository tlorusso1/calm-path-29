import { FocusModeId, FocusMode, MODE_CONFIGS } from '@/types/focus-mode';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  onSelectMode: (modeId: FocusModeId) => void;
  canAccess?: (modeId: FocusModeId) => boolean;
}

const MODE_ORDER: FocusModeId[] = [
  'financeiro',
  'marketing',
  'supplychain',
  'pre-reuniao-geral',
  'reuniao-ads',
  'pre-reuniao-verter',
  'tasks',
];

export function ModeSelector({ activeMode, modes, onSelectMode, canAccess }: ModeSelectorProps) {
  // Filtra módulos por permissão
  const visibleModes = MODE_ORDER.filter(modeId => !canAccess || canAccess(modeId));

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {visibleModes.map((modeId) => {
            const config = MODE_CONFIGS[modeId];
            const mode = modes[modeId];
            const isActive = activeMode === modeId;
            
            // Color states: neutral (default), in-progress (yellow), completed (green)
            const getStatusStyles = () => {
              if (isActive) {
                return "bg-foreground text-background";
              }
              
              switch (mode.status) {
                case 'completed':
                  return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
                case 'in-progress':
                  return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
                default:
                  return "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground";
              }
            };
            
            return (
              <button
                key={modeId}
                onClick={() => onSelectMode(modeId)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border border-transparent",
                  getStatusStyles()
                )}
              >
                <span>{config.icon}</span>
                <span className="hidden sm:inline">{config.title}</span>
                
                {/* Status indicator dot for mobile */}
                {mode.status === 'completed' && (
                  <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                {mode.status === 'in-progress' && !isActive && (
                  <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-yellow-500" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Legend - subtle */}
        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted border border-border" />
            Neutro
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Em andamento
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Concluído
          </span>
        </div>
      </div>
    </header>
  );
}
