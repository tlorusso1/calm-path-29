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
  // Caixa separado por empresa
  caixaNiceFoods: string;
  caixaEcommerce: string;
  
  // Verificações simplificadas
  vencimentos: {
    dda: boolean;
    email: boolean;
    whatsapp: boolean;
    planilha: boolean;
  };
  
  // Itens de vencimento
  itensVencimento: ChecklistItem[];
  
  // Agendamento
  agendamentoConfirmado: boolean;
  
  // Decisões como texto livre
  decisaoPagar: string;
  decisaoSegurar: string;
  decisaoRenegociar: string;
}

// Marketing Mode specific structure
export interface MarketingStage {
  // Contexto mensal
  mesFechouPositivo: boolean | null;
  verbaAds: string;
  
  // Foco semanal
  focoSemana: string;
  
  // Checklist de verificacao
  verificacoes: {
    campanhasAtivas: boolean;
    remarketingRodando: boolean;
    conteudoPublicado: boolean;
    emailEnviado: boolean;
    influencersVerificados: boolean;
  };
  
  // O que nao fazer
  naoFazerSemana: string;
  
  // Decisao
  decisaoSemana: 'manter' | 'ajuste' | 'pausar' | null;
  observacaoDecisao: string;
}

// Supply Chain Mode specific structure
export type SupplyChainRitmo = 'semanal' | 'quinzenal' | 'mensal';

export interface SupplyChainStage {
  ritmoAtual: SupplyChainRitmo;
  
  // Semanal
  semanal: {
    saidaEstoque: boolean;
    verificarBling: boolean;
    produtoForaPadrao: boolean;
  };
  
  // Quinzenal
  quinzenal: {
    planejamentoProducao: boolean;
    producaoFazSentido: boolean;
    ajustarSeNecessario: boolean;
  };
  
  // Mensal
  mensal: {
    saidaEstoqueMensal: boolean;
    saldoFinalEstoque: boolean;
    avaliarComportamento: boolean;
  };
}

// Backlog Mode specific structure
export type BacklogQuandoFazer = 'hoje' | 'proximo' | 'depois';
export type BacklogTempoEstimado = '15min' | '30min' | '1h' | '2h' | '+2h';

export interface BacklogTarefa {
  id: string;
  descricao: string;
  tempoEstimado: BacklogTempoEstimado;
  urgente: boolean;
  quandoFazer: BacklogQuandoFazer;
  completed: boolean;
}

export interface BacklogIdeia {
  id: string;
  texto: string;
}

export interface BacklogStage {
  tempoDisponivelHoje: number; // em minutos
  tarefas: BacklogTarefa[];
  ideias: BacklogIdeia[];
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
  marketingData?: MarketingStage;
  supplyChainData?: SupplyChainStage;
  backlogData?: BacklogStage;
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
  caixaNiceFoods: '',
  caixaEcommerce: '',
  vencimentos: {
    dda: false,
    email: false,
    whatsapp: false,
    planilha: false,
  },
  itensVencimento: [],
  agendamentoConfirmado: false,
  decisaoPagar: '',
  decisaoSegurar: '',
  decisaoRenegociar: '',
};

export const DEFAULT_MARKETING_DATA: MarketingStage = {
  mesFechouPositivo: null,
  verbaAds: '',
  focoSemana: '',
  verificacoes: {
    campanhasAtivas: false,
    remarketingRodando: false,
    conteudoPublicado: false,
    emailEnviado: false,
    influencersVerificados: false,
  },
  naoFazerSemana: '',
  decisaoSemana: null,
  observacaoDecisao: '',
};

export const DEFAULT_SUPPLYCHAIN_DATA: SupplyChainStage = {
  ritmoAtual: 'semanal',
  semanal: {
    saidaEstoque: false,
    verificarBling: false,
    produtoForaPadrao: false,
  },
  quinzenal: {
    planejamentoProducao: false,
    producaoFazSentido: false,
    ajustarSeNecessario: false,
  },
  mensal: {
    saidaEstoqueMensal: false,
    saldoFinalEstoque: false,
    avaliarComportamento: false,
  },
};

export const DEFAULT_BACKLOG_DATA: BacklogStage = {
  tempoDisponivelHoje: 480, // 8 horas default
  tarefas: [],
  ideias: [],
};
