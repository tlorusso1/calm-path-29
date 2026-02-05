import { FocusModeState, RitmoTimestamps, UserRitmoExpectativa, RitmoTask } from '@/types/focus-mode';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function isWithinThisWeek(date: string, weekStart: string): boolean {
  const dateObj = new Date(date);
  const weekStartObj = new Date(weekStart);
  const today = new Date();
  const daysAgo = (today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo <= 7 && dateObj >= weekStartObj;
}

function isThisMonth(date: string): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  return dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
}

export function getRitmoExpectativa(state: FocusModeState): UserRitmoExpectativa {
  const today = getTodayDate();
  const timestamps: RitmoTimestamps = state.timestamps ?? {};
  const tarefasHoje: RitmoTask[] = [];
  let pendentes = 0;

  // ===== DIÁRIO =====
  // 1. Caixa atualizado HOJE?
  const caixaOk = timestamps.lastCaixaUpdate === today;
  tarefasHoje.push({
    id: 'caixa',
    titulo: 'Caixa atualizado',
    status: caixaOk ? 'ok' : 'pendente',
    frequencia: 'diario',
  });
  if (!caixaOk) pendentes++;

  // 2. Contas a pagar de HOJE conferidas?
  const contasHojeOk = timestamps.lastContasAPagarCheck === today;
  tarefasHoje.push({
    id: 'contas-hoje',
    titulo: 'Contas de hoje revisadas',
    status: contasHojeOk ? 'ok' : 'pendente',
    frequencia: 'diario',
  });
  if (!contasHojeOk) pendentes++;

  // ===== SEMANAL =====
  // 3. Decisão da Semana existe?
  const decisaoOk = !!state.modes['pre-reuniao-geral']?.preReuniaoGeralData?.decisaoSemana;
  tarefasHoje.push({
    id: 'decisao',
    titulo: 'Decisão da Semana definida',
    status: decisaoOk ? 'ok' : 'pendente',
    frequencia: 'semanal',
  });
  if (!decisaoOk) pendentes++;

  // 4. Conciliação revisada nesta semana?
  const conciliacaoOk = !!(timestamps.lastConciliacaoCheck && 
    isWithinThisWeek(timestamps.lastConciliacaoCheck, state.weekStart));
  tarefasHoje.push({
    id: 'conciliacao',
    titulo: 'Conciliação bancária revisada',
    status: conciliacaoOk ? 'ok' : 'pendente',
    frequencia: 'semanal',
  });
  if (!conciliacaoOk) pendentes++;

  // ===== MENSAL =====
  // 5. Premissas revisadas neste mês?
  const premissasOk = !!(timestamps.lastPremissasReview && 
    isThisMonth(timestamps.lastPremissasReview));
  tarefasHoje.push({
    id: 'premissas',
    titulo: 'Premissas revisadas (custo fixo, marketing)',
    status: premissasOk ? 'ok' : 'pendente',
    frequencia: 'mensal',
  });
  if (!premissasOk) pendentes++;

  // Calcular status geral
  const statusRitmo = pendentes === 0 ? 'ok' : pendentes <= 2 ? 'atencao' : 'pendente';

  // Contar pendentes por frequência
  const pendentesHoje = tarefasHoje.filter(
    t => t.frequencia === 'diario' && t.status === 'pendente'
  ).length;

  const pendentesEstaSemana = tarefasHoje.filter(
    t => (t.frequencia === 'diario' || t.frequencia === 'semanal') && t.status === 'pendente'
  ).length;

  return {
    statusRitmo,
    hojePrecisaDeAtencao: pendentesHoje > 0,
    tarefasHoje,
    totalPendentes: pendentes,
    pendentesHoje,
    pendentesEstaSemana,
  };
}
