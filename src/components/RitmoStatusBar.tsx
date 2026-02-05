import { useState } from 'react';
import { UserRitmoExpectativa, RitmoTaskId } from '@/types/focus-mode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RitmoStatusBarProps {
  ritmo: UserRitmoExpectativa;
  onNavigateTo?: (modeId: string) => void;
}

// Mapear tarefas de ritmo para modos
const taskToMode: Record<RitmoTaskId, string> = {
  'caixa': 'financeiro',
  'contas-hoje': 'financeiro',
  'decisao': 'reuniao-ads',
  'conciliacao': 'financeiro',
  'premissas': 'financeiro',
};

export function RitmoStatusBar({ ritmo, onNavigateTo }: RitmoStatusBarProps) {
  const [expanded, setExpanded] = useState(false);

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

  // Filtrar tarefas pendentes
  const pendingTasks = ritmo.tarefasHoje.filter(t => t.status === 'pendente');
  const hasPendingTasks = pendingTasks.length > 0;

  const handleTaskClick = (taskId: RitmoTaskId) => {
    if (onNavigateTo) {
      const modeId = taskToMode[taskId];
      onNavigateTo(modeId);
      setExpanded(false);
    }
  };

  return (
    <div className={`border-b ${colorMap[ritmo.statusRitmo]}`}>
      {/* Barra principal clicável */}
      <button
        onClick={() => hasPendingTasks && setExpanded(!expanded)}
        disabled={!hasPendingTasks}
        className={cn(
          'w-full px-4 py-2 flex items-center justify-center gap-2',
          hasPendingTasks && 'cursor-pointer hover:opacity-80 transition-opacity'
        )}
      >
        <div className={`max-w-3xl mx-auto flex items-center gap-2 text-sm ${textColorMap[ritmo.statusRitmo]}`}>
          <span className="text-base">{iconMap[ritmo.statusRitmo]}</span>
          <span className="font-medium">{getText()}</span>
          {hasPendingTasks && (
            expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          )}
        </div>
      </button>

      {/* Lista expandida de pendências */}
      {expanded && hasPendingTasks && (
        <div className={cn(
          'border-t px-4 py-3 space-y-2',
          colorMap[ritmo.statusRitmo].replace('border-b', '')
        )}>
          <div className="max-w-3xl mx-auto">
            <p className={cn('text-xs font-medium mb-2', textColorMap[ritmo.statusRitmo])}>
              Pendências para resolver:
            </p>
            <div className="space-y-1">
              {pendingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm',
                    'bg-white/50 dark:bg-black/20',
                    'hover:bg-white dark:hover:bg-black/40 transition-colors',
                    'flex items-center justify-between gap-2',
                    textColorMap[ritmo.statusRitmo]
                  )}
                >
                  <span>{task.titulo}</span>
                  <span className="text-xs opacity-60">Ir →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
