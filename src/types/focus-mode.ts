export type FocusModeId = 
  | 'financeiro'
  | 'marketing'
  | 'supplychain'
  | 'pre-reuniao-geral'
  | 'pre-reuniao-ads'
  | 'pre-reuniao-verter'
  | 'backlog';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  classification?: 'A' | 'B' | 'C';
  decision?: 'pagar' | 'segurar' | 'renegociar' | string;
  notes?: string;
}

export interface FocusMode {
  id: FocusModeId;
  icon: string;
  title: string;
  fixedText: string;
  items: ChecklistItem[];
  completedAt?: string;
}

export interface FocusModeState {
  date: string;
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
}

export const MODE_CONFIGS: Record<FocusModeId, Omit<FocusMode, 'items' | 'completedAt'>> = {
  financeiro: {
    id: 'financeiro',
    icon: '💰',
    title: 'Financeiro',
    fixedText: 'Financeiro se decide. Não se reage.',
  },
  marketing: {
    id: 'marketing',
    icon: '📣',
    title: 'Marketing',
    fixedText: 'Ads respondem ao caixa, não ao medo.',
  },
  supplychain: {
    id: 'supplychain',
    icon: '🚚',
    title: 'Supply Chain',
    fixedText: 'Compra errada vira caixa parado.',
  },
  'pre-reuniao-geral': {
    id: 'pre-reuniao-geral',
    icon: '🧠',
    title: 'Pré-Reunião Geral',
    fixedText: 'Somente fatos. Opiniões ficam de fora.',
  },
  'pre-reuniao-ads': {
    id: 'pre-reuniao-ads',
    icon: '🎯',
    title: 'Pré-Reunião Ads',
    fixedText: 'Ads respondem ao caixa, não ao medo.',
  },
  'pre-reuniao-verter': {
    id: 'pre-reuniao-verter',
    icon: '📈',
    title: 'Pré-Reunião Verter',
    fixedText: 'Venda da empresa é estratégia, não urgência.',
  },
  backlog: {
    id: 'backlog',
    icon: '📥',
    title: 'Backlog',
    fixedText: 'Backlog é onde o cérebro descansa.',
  },
};

export const DEFAULT_CHECKLISTS: Record<FocusModeId, Omit<ChecklistItem, 'id' | 'completed'>[]> = {
  financeiro: [
    { text: 'Caixa atual' },
    { text: 'O que vence nos próximos 7 dias' },
  ],
  marketing: [
    { text: 'Quanto sobrou no mês anterior?' },
    { text: 'Quanto está liberado para Ads agora?' },
    { text: 'Remarketing está ativo?' },
    { text: 'Algum teste pequeno cabe?' },
  ],
  supplychain: [
    { text: 'Estoque atual (baixo / ok / alto)' },
    { text: 'Produções em andamento' },
    { text: 'Compras necessárias nos próximos 30 dias' },
    { text: 'Algo que pode esperar?' },
  ],
  'pre-reuniao-geral': [
    { text: 'Caixa atual' },
    { text: 'Faturamento recente' },
    { text: 'Estoques' },
    { text: 'Produções' },
    { text: 'Prazos críticos (7 dias)' },
  ],
  'pre-reuniao-ads': [
    { text: 'Resultado do mês anterior' },
    { text: 'Verba liberada para Ads' },
    { text: 'Campanhas ativas' },
    { text: 'Remarketing ok?' },
    { text: 'O que NÃO vamos mexer' },
  ],
  'pre-reuniao-verter': [
    { text: 'Indicadores atualizados' },
    { text: 'Caixa e dívida atual' },
    { text: 'Pipeline de interessados' },
    { text: 'Pontos de atenção da semana' },
  ],
  backlog: [],
};
