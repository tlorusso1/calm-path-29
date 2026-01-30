// ============= Constantes Globais =============
export const MARGEM_OPERACIONAL = 0.40; // 40% - premissa fixa do negócio

// ============= Tipos Base =============
export type FocusModeId = 
  | 'financeiro'
  | 'marketing'
  | 'supplychain'
  | 'pre-reuniao-geral'
  | 'pre-reuniao-ads'
  | 'reuniao-ads'
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

// ============= Financeiro V2 =============
export interface FinanceiroStage {
  // INPUTS BÁSICOS
  faturamentoMes: string;
  custoFixoMensal: string;
  caixaAtual: string;
  caixaMinimo: string;
  
  // NOVO: Marketing Estrutural (custo fixo) vs Ads Base (tráfego pago)
  marketingEstrutural: string;  // Agência, influencers, conteúdo, ferramentas
  adsBase: string;              // Mínimo para manter campanhas vivas
  
  // NOVO: Faturamento Esperado próximos 30 dias (cenário conservador)
  faturamentoEsperado30d: string;
  
  // CUSTOS DEFASADOS (novidade crítica)
  custosDefasados: {
    impostosProximoMes: string;
    adsCartaoAnterior: string;
    parcelasEmprestimos: string;
    comprasEstoqueComprometidas: string;
    outrosCompromissos: string;
  };
  
  // DEPRECATED: mantido para compatibilidade com dados existentes
  marketingBase?: string;
  
  // CHECKLISTS POR FREQUÊNCIA
  checklistDiario: {
    atualizouCaixa: boolean;
    olhouResultado: boolean;
    decidiu: boolean;
  };
  
  checklistSemanal: {
    dda: boolean;
    emails: boolean;
    whatsapp: boolean;
    agendouVencimentos: boolean;
    atualizouCaixaMinimo: boolean;
  };
  
  checklistMensal: {
    atualizouFaturamento: boolean;
    revisouCustoFixo: boolean;
    revisouMarketingBase: boolean;
    atualizouDefasados: boolean;
    comparouPrevistoRealizado: boolean;
  };
  
  // DEPRECATED (compatibilidade com dados existentes)
  caixaNiceFoods?: string;
  caixaEcommerce?: string;
  entradaMediaConservadora?: string;
  entradasGarantidas?: string;
  custosFixosMensais?: string;
  operacaoMinima?: string;
  impostosEstimados?: string;
  vencimentos?: { dda: boolean; email: boolean; whatsapp: boolean; planilha: boolean; };
  itensVencimento?: ChecklistItem[];
  agendamentoConfirmado?: boolean;
  decisaoPagar?: string;
  decisaoSegurar?: string;
  decisaoRenegociar?: string;
}

// Interface de Exports do Financeiro (para outros modos)
export interface FinanceiroExports {
  caixaLivreReal: number;
  statusFinanceiro: 'estrategia' | 'atencao' | 'sobrevivencia';
  risco30d: 'verde' | 'amarelo' | 'vermelho';
  risco60d: 'verde' | 'amarelo' | 'vermelho';
  risco90d: 'verde' | 'amarelo' | 'vermelho';
  adsMaximoPermitido: number;
  adsBase: number;
  adsIncremental: number;
  scoreFinanceiro: number;
  resultadoMes: number;
  totalDefasados: number;
  // NOVOS EXPORTS FINANCEIRO V2
  queimaOperacional: number;
  faturamentoEsperado: number;
  resultadoEsperado30d: number;
  folegoEmDias: number | null;  // null = infinito (operação se sustenta)
  alertaRisco30d: 'verde' | 'amarelo' | 'vermelho';
  // NOVOS: Ads com teto e travas
  tetoAdsAbsoluto: number;         // 10% do faturamento esperado
  motivoBloqueioAds: string | null; // Motivo se incremento bloqueado
  marketingEstrutural: number;     // Marketing estrutural (custo fixo)
}

// ============= Score Semanal do Negócio =============
export interface ScoreNegocio {
  total: number;
  status: 'saudavel' | 'atencao' | 'risco';
  financeiro: { score: number; alertaRisco: 'verde' | 'amarelo' | 'vermelho' };
  estoque: { score: number; cobertura: string };
  demanda: { score: number; tendencia: string };
}

// ============= Pre-Reunião Geral =============
export interface PreReuniaoGeralStage {
  estoque: {
    top3Percentual: string;
    coberturaMedia: 'menos15' | '15a30' | 'mais30' | null;
    statusCompras: 'pendente' | 'em_producao' | 'ok' | null;
  };
  decisaoSemana: 'preservar_caixa' | 'repor_estoque' | 
                 'crescer_controlado' | 'crescer_agressivo' | null;
  registroDecisao: string;
}

// ============= Pre-Reunião Ads =============
export interface PreReuniaoAdsStage {
  roasMedio7d: string;
  roasMedio14d: string;
  roasMedio30d: string;
  cpaMedio: string;
  ticketMedio: string;
  gastoAdsAtual: string;
  decisaoSemana: 'escalar' | 'manter' | 'reduzir' | null;
}

// ============= Reunião Ads (NOVO) =============
export interface ReuniaoAdsAcao {
  id: string;
  tipo: 'escalar' | 'pausar' | 'testar' | 'otimizar';
  descricao: string;
}

export interface ReuniaoAdsStage {
  orcamentoDiario: string;
  orcamentoSemanal: string;
  distribuicaoMeta: string;
  distribuicaoGoogle: string;
  roasMinimoAceitavel: string;
  cpaMaximoAceitavel: string;
  metricasMeta: { roas: string; cpa: string; spend: string; receita: string };
  metricasGoogle: { roas: string; cpa: string; spend: string; receita: string };
  acoes: ReuniaoAdsAcao[];
  registroDecisao: string;
}

// ============= Marketing (Simplificado) =============
export interface MarketingInfluencer {
  id: string;
  nome: string;
  conteudoNoAr: boolean;
  alcanceEstimado: string;
  linkCupomAtivo: boolean;
}

export interface MarketingOrganico {
  // E-mail
  emailEnviados: string;
  emailAbertura: string;
  emailGerouClique: boolean;
  
  // Influencers
  influencers: MarketingInfluencer[];
  
  // Conteúdo / Social
  postsPublicados: string;
  alcanceTotal: string;
  alcanceMediaSemanas: string;
  postAcimaDaMedia: boolean;
  taxaEngajamento: string;
  
  // Sessões do Site (NOVO - validação final da demanda)
  sessoesSemana: string;
  sessoesMedia30d: string;
}

export interface MarketingExports {
  scoreOrganico: number;
  statusOrganico: 'forte' | 'medio' | 'fraco';
  recomendacaoAds: string;
  // Score de Demanda (inclui sessões)
  scoreDemanda: number;
  statusDemanda: 'forte' | 'neutro' | 'fraco';
  scoreSessoes: number;
  statusSessoes: 'forte' | 'neutro' | 'fraco';
}

export interface MarketingStage {
  verificacoes: {
    campanhasAtivas: boolean;
    remarketingRodando: boolean;
    conteudoPublicado: boolean;
    emailEnviado: boolean;
    influencersVerificados: boolean;
  };
  
  // Termômetro Orgânico (NOVO)
  organico?: MarketingOrganico;
  
  // DEPRECATED (compatibilidade)
  mesFechouPositivo?: boolean | null;
  verbaAds?: string;
  focoSemana?: string;
  naoFazerSemana?: string;
  decisaoSemana?: 'manter' | 'ajuste' | 'pausar' | null;
  observacaoDecisao?: string;
}

// ============= Supply Chain V2 =============
export type SupplyChainRitmo = 'semanal' | 'quinzenal' | 'mensal';

// Tipos de Estoque
export type TipoEstoque = 
  | 'produto_acabado' 
  | 'embalagem' 
  | 'insumo' 
  | 'materia_prima';

// Item individual de estoque
export interface ItemEstoque {
  id: string;
  nome: string;
  tipo: TipoEstoque;
  quantidade: number;
  unidade: string;
  demandaSemanal?: number;  // Consumo específico do item por semana
  dataValidade?: string;   // ISO date string
  // Calculados automaticamente
  coberturaDias?: number;
  status?: 'verde' | 'amarelo' | 'vermelho';
}

// Resumo calculado do Supply
export interface SupplyResumo {
  coberturaProdutos: number | null;
  coberturaEmbalagens: number | null;
  coberturaInsumos: number | null;
  statusGeral: 'verde' | 'amarelo' | 'vermelho';
  riscoRuptura: boolean;
  riscoVencimento: boolean;
  itensVencendo: string[];
  itensCriticos: string[];
}

// Exports para outros módulos (Pre-Reunião Geral, Score)
export interface SupplyExports {
  statusEstoque: 'verde' | 'amarelo' | 'vermelho';
  coberturaProdutosDias: number | null;
  coberturaEmbalagensDias: number | null;
  riscoRuptura: boolean;
  riscoVencimento: boolean;
  scorePilar: number;  // 0-30 para Score Negócio
}

// Estado do módulo Supply Chain
export interface SupplyChainStage {
  // V2: Input de Demanda
  demandaSemanalMedia: number;  // Pedidos/semana (base para cálculos)
  
  // V2: Itens do Estoque
  itens: ItemEstoque[];
  
  // V2: Resumo (calculado)
  resumo?: SupplyResumo;
  
  // Checklists legados (manter compatibilidade)
  ritmoAtual: SupplyChainRitmo;
  semanal: {
    saidaEstoque: boolean;
    verificarBling: boolean;
    produtoForaPadrao: boolean;
  };
  
  quinzenal: {
    planejamentoProducao: boolean;
    producaoFazSentido: boolean;
    ajustarSeNecessario: boolean;
  };
  
  mensal: {
    saidaEstoqueMensal: boolean;
    saldoFinalEstoque: boolean;
    avaliarComportamento: boolean;
  };
}

// ============= Backlog =============
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
  tempoDisponivelHoje: number;
  tarefas: BacklogTarefa[];
  ideias: BacklogIdeia[];
}

// ============= Focus Mode Principal =============
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
  preReuniaoGeralData?: PreReuniaoGeralStage;
  preReuniaoAdsData?: PreReuniaoAdsStage;
  reuniaoAdsData?: ReuniaoAdsStage;
  completedAt?: string;
}

export interface FocusModeState {
  date: string;
  weekStart: string;
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
}

// ============= Configurações dos Modos =============
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
    fixedText: 'Marketing não é fazer mais. É escolher onde prestar atenção.',
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
    fixedText: 'Alinhamento semanal do negócio.',
    frequency: 'weekly',
  },
  'pre-reuniao-ads': {
    id: 'pre-reuniao-ads',
    icon: '🎯',
    title: 'Pré-Reunião Ads',
    fixedText: 'Ads respondem ao caixa, não ao medo.',
    frequency: 'weekly',
  },
  'reuniao-ads': {
    id: 'reuniao-ads',
    icon: '📊',
    title: 'Reunião Ads',
    fixedText: 'Executa o que foi decidido. Sem improvisos.',
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

// ============= Checklists Padrão =============
export const DEFAULT_CHECKLISTS: Record<FocusModeId, Omit<ChecklistItem, 'id' | 'completed'>[]> = {
  financeiro: [],
  marketing: [],
  supplychain: [],
  'pre-reuniao-geral': [],
  'pre-reuniao-ads': [],
  'reuniao-ads': [],
  'pre-reuniao-verter': [
    { text: 'Indicadores atualizados' },
    { text: 'Caixa e dívida atual' },
    { text: 'Pipeline de interessados' },
    { text: 'Pontos de atenção da semana' },
  ],
  backlog: [],
};

// ============= Defaults por Modo =============
export const DEFAULT_FINANCEIRO_DATA: FinanceiroStage = {
  faturamentoMes: '',
  custoFixoMensal: '',
  marketingEstrutural: '',
  adsBase: '',
  caixaAtual: '',
  caixaMinimo: '',
  faturamentoEsperado30d: '',
  custosDefasados: {
    impostosProximoMes: '',
    adsCartaoAnterior: '',
    parcelasEmprestimos: '',
    comprasEstoqueComprometidas: '',
    outrosCompromissos: '',
  },
  checklistDiario: {
    atualizouCaixa: false,
    olhouResultado: false,
    decidiu: false,
  },
  checklistSemanal: {
    dda: false,
    emails: false,
    whatsapp: false,
    agendouVencimentos: false,
    atualizouCaixaMinimo: false,
  },
  checklistMensal: {
    atualizouFaturamento: false,
    revisouCustoFixo: false,
    revisouMarketingBase: false,
    atualizouDefasados: false,
    comparouPrevistoRealizado: false,
  },
  // Mantido para compatibilidade com dados existentes
  marketingBase: '',
};

export const DEFAULT_MARKETING_ORGANICO: MarketingOrganico = {
  emailEnviados: '',
  emailAbertura: '',
  emailGerouClique: false,
  influencers: [],
  postsPublicados: '',
  alcanceTotal: '',
  alcanceMediaSemanas: '',
  postAcimaDaMedia: false,
  taxaEngajamento: '',
  sessoesSemana: '',
  sessoesMedia30d: '',
};

export const DEFAULT_MARKETING_DATA: MarketingStage = {
  verificacoes: {
    campanhasAtivas: false,
    remarketingRodando: false,
    conteudoPublicado: false,
    emailEnviado: false,
    influencersVerificados: false,
  },
  organico: DEFAULT_MARKETING_ORGANICO,
};

export const DEFAULT_SUPPLYCHAIN_DATA: SupplyChainStage = {
  // V2
  demandaSemanalMedia: 0,
  itens: [],
  resumo: undefined,
  // Legado
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
  tempoDisponivelHoje: 480,
  tarefas: [],
  ideias: [],
};

export const DEFAULT_PREREUNIAO_GERAL_DATA: PreReuniaoGeralStage = {
  estoque: {
    top3Percentual: '',
    coberturaMedia: null,
    statusCompras: null,
  },
  decisaoSemana: null,
  registroDecisao: '',
};

export const DEFAULT_PREREUNIAO_ADS_DATA: PreReuniaoAdsStage = {
  roasMedio7d: '',
  roasMedio14d: '',
  roasMedio30d: '',
  cpaMedio: '',
  ticketMedio: '',
  gastoAdsAtual: '',
  decisaoSemana: null,
};

// ============= Weekly Snapshot (Histórico) =============
export interface WeeklySnapshot {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
  
  // Financeiro
  caixa_livre_real: number | null;
  status_financeiro: string | null;
  score_financeiro: number | null;
  resultado_mes: number | null;
  total_defasados: number | null;
  ads_maximo: number | null;
  
  // Ads
  roas_medio: number | null;
  cpa_medio: number | null;
  ticket_medio: number | null;
  gasto_ads: number | null;
  decisao_ads: string | null;
  
  // Demanda
  score_demanda: number | null;
  status_demanda: string | null;
  score_sessoes: number | null;
  sessoes_semana: number | null;
  
  // Organico
  score_organico: number | null;
  status_organico: string | null;
  
  // Decisao
  prioridade_semana: string | null;
  registro_decisao: string | null;
}

export const DEFAULT_REUNIAO_ADS_DATA: ReuniaoAdsStage = {
  orcamentoDiario: '',
  orcamentoSemanal: '',
  distribuicaoMeta: '70',
  distribuicaoGoogle: '30',
  roasMinimoAceitavel: '3',
  cpaMaximoAceitavel: '',
  metricasMeta: { roas: '', cpa: '', spend: '', receita: '' },
  metricasGoogle: { roas: '', cpa: '', spend: '', receita: '' },
  acoes: [],
  registroDecisao: '',
};
