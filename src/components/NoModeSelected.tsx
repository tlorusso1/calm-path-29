import { MODE_CONFIGS, FocusModeId, UserRitmoExpectativa } from '@/types/focus-mode';
import { RitmoDashboard } from './RitmoDashboard';

interface NoModeSelectedProps {
  lastCompletedMode?: FocusModeId;
  ritmo: UserRitmoExpectativa;
  onNavigateTo: (modeId: FocusModeId) => void;
}

export function NoModeSelected({ lastCompletedMode, ritmo, onNavigateTo }: NoModeSelectedProps) {
  return (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      {/* Ritmo Dashboard - O que precisa de você agora */}
      <RitmoDashboard ritmo={ritmo} onNavigateTo={onNavigateTo} />
      
      {/* Estado atual */}
      <div className="flex flex-col items-center justify-center text-center flex-1">
        <div className="space-y-4">
          <p className="text-4xl">🎯</p>
          
          {lastCompletedMode ? (
            <>
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  {MODE_CONFIGS[lastCompletedMode].icon} {MODE_CONFIGS[lastCompletedMode].title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Concluído por agora.
                </p>
              </div>
              <p className="text-base text-foreground">
                Escolha o próximo modo acima.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-foreground">
                Em que você quer focar agora?
              </p>
              <p className="text-sm text-muted-foreground">
                Escolha um modo acima para começar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
