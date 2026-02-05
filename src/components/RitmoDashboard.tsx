import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRitmoExpectativa, RitmoTaskId, FocusModeId } from '@/types/focus-mode';
import { Check, AlertTriangle, X } from 'lucide-react';

interface RitmoDashboardProps {
  ritmo: UserRitmoExpectativa;
  onNavigateTo: (modeId: FocusModeId) => void;
}

const taskToMode: Record<RitmoTaskId, FocusModeId> = {
  'caixa': 'financeiro',
  'contas-hoje': 'financeiro',
  'decisao': 'pre-reuniao-geral',
  'conciliacao': 'financeiro',
  'premissas': 'financeiro',
};

export function RitmoDashboard({ ritmo, onNavigateTo }: RitmoDashboardProps) {
  const grouped = {
    diario: ritmo.tarefasHoje.filter(t => t.frequencia === 'diario'),
    semanal: ritmo.tarefasHoje.filter(t => t.frequencia === 'semanal'),
    mensal: ritmo.tarefasHoje.filter(t => t.frequencia === 'mensal'),
  };

  const getIcon = (status: 'ok' | 'pendente', frequencia: string) => {
    if (status === 'ok') {
      return <Check className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (frequencia === 'diario') {
      return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    return <X className="h-4 w-4 text-red-500 dark:text-red-400" />;
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📋 O que precisa de você agora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {grouped.diario.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wide">Hoje:</p>
            <div className="space-y-1">
              {grouped.diario.map(t => (
                <div key={t.id} className="flex gap-2 items-center">
                  {getIcon(t.status, t.frequencia)}
                  <button
                    onClick={() => onNavigateTo(taskToMode[t.id])}
                    className="text-left hover:underline text-foreground"
                  >
                    {t.titulo}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {grouped.semanal.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wide">Esta semana:</p>
            <div className="space-y-1">
              {grouped.semanal.map(t => (
                <div key={t.id} className="flex gap-2 items-center">
                  {getIcon(t.status, t.frequencia)}
                  <button
                    onClick={() => onNavigateTo(taskToMode[t.id])}
                    className="text-left hover:underline text-foreground"
                  >
                    {t.titulo}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {grouped.mensal.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wide">Este mês:</p>
            <div className="space-y-1">
              {grouped.mensal.map(t => (
                <div key={t.id} className="flex gap-2 items-center">
                  {getIcon(t.status, t.frequencia)}
                  <button
                    onClick={() => onNavigateTo(taskToMode[t.id])}
                    className="text-left hover:underline text-foreground"
                  >
                    {t.titulo}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
