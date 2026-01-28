export type FocusModeId = 
  | 'financeiro'
  | 'marketing'
  | 'supplychain'
  | 'pre-reuniao-geral'
  | 'pre-reuniao-ads'
  | 'pre-reuniao-verter'
  | 'backlog';

export type ModeFrequency = 'daily' | 'weekly';
export type ModeStatus = 'neutral' | 'in-progress' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  classification?: 'A' | 'B' | 'C';
  decision?: 'pagar' | 'segurar' | 'renegociar' | string;
  notes?: string;
}

// Financeiro Mode specific structure
export interface FinanceiroStage {
  caixaAtual: string;
  vencimentos: {
    dda: boolean;
    email: boolean;
    whatsapp: boolean;
    cobrancas: boolean;
    planilha: boolean;
  };
  itensVencimento: ChecklistItem[];
  agendamentoConfirmado: boolean;
  decisaoFinal?: 'pagar' | 'segurar' | 'renegociar';
}

export interface FocusMode {
  id: FocusModeId;
  icon: string;
  title: string;
  fixedText: string;
  frequency: ModeFrequency;
  status: ModeStatus;
  items: ChecklistItem[];
  financeiroData?: FinanceiroStage;
  completedAt?: string;
}

export interface FocusModeState {
  date: string;
  weekStart: string;
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
}

export const MODE_CONFIGS: Record<FocusModeId, Omit<FocusMode, 'items' | 'completedAt' | 'status' | 'financeiroData'>> = {
  financeiro: {
    id: 'financeiro',
    icon: '💰',
    title: 'Financeiro',
    fixedText: 'Financeiro se decide. Não se reage.',
    frequency: 'daily',
  },
  marketing: {
    id: 'marketing',
    icon: '📣',
    title: 'Marketing',
    fixedText: 'Ads respondem ao caixa, não ao medo.',
    frequency: 'weekly',
  },
  supplychain: {
    id: 'supplychain',
    icon: '🚚',
    title: 'Supply Chain',
    fixedText: 'Compra errada vira caixa parado.',
    frequency: 'weekly',
  },
  'pre-reuniao-geral': {
    id: 'pre-reuniao-geral',
    icon: '🧠',
    title: 'Pré-Reunião Geral',
    fixedText: 'Somente fatos. Opiniões ficam de fora.',
    frequency: 'weekly',
  },
  'pre-reuniao-ads': {
    id: 'pre-reuniao-ads',
    icon: '🎯',
    title: 'Pré-Reunião Ads',
    fixedText: 'Ads respondem ao caixa, não ao medo.',
    frequency: 'weekly',
  },
  'pre-reuniao-verter': {
    id: 'pre-reuniao-verter',
    icon: '📈',
    title: 'Pré-Reunião Verter',
    fixedText: 'Venda da empresa é estratégia, não urgência.',
    frequency: 'weekly',
  },
  backlog: {
    id: 'backlog',
    icon: '📥',
    title: 'Backlog',
    fixedText: 'Backlog é onde o cérebro descansa.',
    frequency: 'daily',
  },
};

export const DEFAULT_CHECKLISTS: Record<FocusModeId, Omit<ChecklistItem, 'id' | 'completed'>[]> = {
  financeiro: [], // Financeiro uses financeiroData instead
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

export const DEFAULT_FINANCEIRO_DATA: FinanceiroStage = {
  caixaAtual: '',
  vencimentos: {
    dda: false,
    email: false,
    whatsapp: false,
    cobrancas: false,
    planilha: false,
  },
  itensVencimento: [],
  agendamentoConfirmado: false,
  decisaoFinal: undefined,
};
