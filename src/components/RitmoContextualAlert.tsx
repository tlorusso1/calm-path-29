import { Alert, AlertDescription } from '@/components/ui/alert';
import { RitmoTaskId } from '@/types/focus-mode';

interface RitmoContextualAlertProps {
  taskId: RitmoTaskId;
  status: 'ok' | 'pendente';
}

const messages: Record<RitmoTaskId, string> = {
  'caixa': '⚠️ Caixa não atualizado hoje — números podem estar imprecisos.',
  'contas-hoje': '⚠️ Você ainda não conferiu vencimentos de hoje.',
  'decisao': '❌ Defina a decisão da semana para liberar Ads e calcular limites.',
  'conciliacao': '⚠️ Conciliação bancária pendente — revise nesta semana.',
  'premissas': '⚠️ Premissas do mês não revisadas — custo fixo pode estar desatualizado.',
};

export function RitmoContextualAlert({ taskId, status }: RitmoContextualAlertProps) {
  if (status === 'ok') return null;

  return (
    <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 mb-4">
      <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
        {messages[taskId]}
      </AlertDescription>
    </Alert>
  );
}
