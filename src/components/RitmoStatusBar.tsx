import { UserRitmoExpectativa } from '@/types/focus-mode';

interface RitmoStatusBarProps {
  ritmo: UserRitmoExpectativa;
}

export function RitmoStatusBar({ ritmo }: RitmoStatusBarProps) {
  const colorMap = {
    ok: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    atencao: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    pendente: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const textColorMap = {
    ok: 'text-green-800 dark:text-green-200',
    atencao: 'text-yellow-800 dark:text-yellow-200',
    pendente: 'text-red-800 dark:text-red-200',
  };

  const iconMap = {
    ok: '🟢',
    atencao: '🟡',
    pendente: '🔴',
  };

  const getText = () => {
    if (ritmo.statusRitmo === 'ok') return 'Hoje está tudo em dia';
    if (ritmo.statusRitmo === 'atencao') {
      if (ritmo.pendentesHoje > 0) {
        return `Faltam ${ritmo.pendentesHoje} tarefa${ritmo.pendentesHoje > 1 ? 's' : ''} de hoje`;
      }
      return `${ritmo.pendentesEstaSemana} pendência${ritmo.pendentesEstaSemana > 1 ? 's' : ''} esta semana`;
    }
    return `${ritmo.totalPendentes} pendências críticas`;
  };

  return (
    <div className={`border-b ${colorMap[ritmo.statusRitmo]} px-4 py-2`}>
      <div className={`max-w-lg mx-auto flex items-center gap-2 text-sm ${textColorMap[ritmo.statusRitmo]}`}>
        <span className="text-base">{iconMap[ritmo.statusRitmo]}</span>
        <span className="font-medium">{getText()}</span>
      </div>
    </div>
  );
}
