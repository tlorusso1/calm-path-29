import { MODE_CONFIGS, FocusModeId } from '@/types/focus-mode';

interface NoModeSelectedProps {
  lastCompletedMode?: FocusModeId;
}

export function NoModeSelected({ lastCompletedMode }: NoModeSelectedProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="space-y-6">
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
  );
}
