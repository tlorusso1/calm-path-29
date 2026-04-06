// ============= Constantes Globais =============
export const MARGEM_OPERACIONAL = 0.40; // 40% - premissa fixa do negócio

// Modalidades que representam Capital de Giro (não impactam meta de faturamento)
// Contas atreladas a fornecedores dessas modalidades não entram no cálculo da meta
export const MODALIDADES_CAPITAL_GIRO = [
  'CUSTOS DE PRODUTO VENDIDO', // Compra matéria-prima, embalagens, estoque
];

// ============= Tipos Base =============
export type FocusModeId = 
  | 'financeiro'
  | 'marketing'
  | 'supplychain'
  | 'pre-reuniao-geral'
  | 'reuniao-ads'
  | 'pre-reuniao-verter'
  | 'tasks';

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

// ============= Contas Bancárias Detalhadas =============
export interface ContaBancaria {
  saldo: string;
  cdb?: string;        // Para Itaú
  aReceber?: string;   // Para gateways
  disponivel?: string; // Para Mercado Pago
}

export interface FinanceiroContas {
  itauNiceFoods: ContaBancaria;
  itauNiceEcom: ContaBancaria;
  asaas: ContaBancaria;
  nuvem: ContaBancaria;
  pagarMe: ContaBancaria;
  mercadoPagoEcom: ContaBancaria;
}

// ============= Fornecedores para DRE =============
export interface Fornecedor {
  id: string;
  nome: string;
  modalidade: string;       // Ex: "DESPESAS ADMINISTRATIVAS"
  grupo: string;            // Ex: "Serviços de Consultoria Operacional"
  categoria: string;        // Ex: "Assessoria Contábil"
  cnpj?: string;
  chavePix?: string;
  aliases?: string[];       // Nomes alternativos (para match)
  naturezaPadrao?: ContaFluxoNatureza; // Natureza padrão para este fornecedor (operacional ou capitalGiro)
}

// ============= Custos Fixos Detalhados =============
export type CustoFixoTipo = 'fixo' | 'variavel' | 'cortavel';
export type CustoFixoCategoriaId = 'pessoas' | 'software' | 'marketing' | 'servicos' | 'armazenagem' | 'emprestimos';

export interface CustoFixoItem {
  id: string;
  nome: string;
  valor: number;
  tipo: CustoFixoTipo;
  notas?: string;
}

// Empréstimo com dados completos
export interface Emprestimo {
  id: string;
  empresa: string;              // NICE FOODS ECOMMERCE LTDA ou NICE FOODS LTDA
  banco: string;                // Itaú, Receita Federal, etc.
  produto: string;              // PRONAMPE 2025, PEAC FGI, SIMPLES NACIONAL, etc.
  valorContratado: number;
  saldoDevedor: number;
  taxaJurosAnual: number;       // % anual
  taxaJurosMensal: number;      // % mensal
  parcelasRestantes: number;
  parcelasTotais: number;
  parcelaMedia: number;
  diaVencimento: number;        // Dia do mês
  vencimentoFinal: string;      // Ex: "abr.2029"
  primeiraParcelaData?: string; // Ex: "mai.2026"
  carencia?: string;            // Ex: "12 meses", "3 meses"
  notas?: string;
}

export interface CustosFixosDetalhados {
  pessoas: CustoFixoItem[];
  software: CustoFixoItem[];
  marketing: CustoFixoItem[];  // Marketing ESTRUTURAL (não Ads)
  servicos: CustoFixoItem[];
  armazenagem: CustoFixoItem[];
  emprestimos?: Emprestimo[];  // Empréstimos com estrutura diferenciada
}

// ============= Contas a Pagar/Receber (Fluxo de Caixa) =============
export type ContaFluxoTipo = 'pagar' | 'receber' | 'intercompany' | 'aplicacao' | 'resgate' | 'cartao';
export type ContaFluxoSubtipo = 'cdb' | 'trust' | 'renda_fixa' | 'lci' | 'lca' | 'tesouro' | 'outro';

// Natureza da saída: operacional (impacta meta) vs capitalGiro (não impacta meta)
export type ContaFluxoNatureza = 'operacional' | 'capitalGiro';

// Contas bancárias disponíveis para seleção
export const CONTAS_BANCARIAS_OPCOES = [
  'ITAU - NICE FOODS',
  'ITAU - NICE ECOM',
  'MERCADO LIVRE - NICE ECOM',
] as const;

export interface ContaFluxo {
  id: string;
  tipo: ContaFluxoTipo;  
  // pagar: despesa normal
  // receber: receita normal
  // intercompany: transferências entre CNPJs (afeta caixa, não DRE)
  // aplicacao: aplicação financeira (saída de caixa, não é despesa)
  // resgate: resgate de aplicação (entrada de caixa, não é receita operacional)
  subtipo?: ContaFluxoSubtipo;
  descricao: string;
  valor: string;
  dataVencimento: string;  // ISO date (YYYY-MM-DD)
  pago?: boolean;
  agendado?: boolean;  // Indica se foi agendado no banco (auto-baixa no vencimento)
  // Novos campos para DRE/Conciliação
  fornecedorId?: string;    // Referência ao fornecedor
  categoria?: string;       // Categoria para DRE
  conciliado?: boolean;     // Flag: veio de conciliação bancária
  lancamentoConciliadoId?: string; // ID da conta original que foi conciliada automaticamente
  // Natureza financeira - determina se impacta meta de faturamento
  natureza?: ContaFluxoNatureza; // undefined = operacional (default)
  // Projeção automática de receita por canal
  projecao?: boolean;        // true = conta fictícia gerada automaticamente
  canalOrigem?: string;      // 'b2b' | 'ecomNuvem' | 'ecomShopee' | 'ecomAssinaturas'
  // Dados do documento fiscal / pagamento
  codigoBarrasPix?: string;  // Código de barras ou PIX copia-e-cola
  numeroNF?: string;         // Número da Nota Fiscal
  chaveDanfe?: string;       // Chave de acesso DANFE (44 dígitos)
  // Anexos (PDFs, imagens)
  anexos?: ContaAnexo[];
  // Conta bancária de origem
  contaOrigem?: string;      // Ex: "ITAU - NICE FOODS", "ITAU - NICE ECOM"
}

export interface ContaAnexo {
  id: string;
  nome: string;       // Nome original do arquivo
  url: string;        // URL assinada ou caminho no storage
  path: string;       // Caminho no bucket (para gerar URL assinada e deletar)
  tipo: string;       // MIME type
  tamanho: number;    // Bytes
  criadoEm: string;   // ISO date
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
  forecastSyncDate?: string; // data (YYYY-MM-DD) da última sincronização automática
  
  // NOVO: Contas Bancárias Detalhadas
  contas?: FinanceiroContas;
  
  // NOVO: Faturamento do mês anterior (base para cálculo de impostos)
  faturamentoMesAnterior?: string;
  
  // CUSTOS DEFASADOS (novidade crítica) - DEPRECATED: usar contasFluxo
  custosDefasados: {
    impostosProximoMes: string;
    adsCartaoAnterior: string;
    parcelasEmprestimos: string;
    comprasEstoqueComprometidas: string;
    outrosCompromissos: string;
  };
  
  // NOVO: Impostos configuráveis
  impostoPercentual?: number;  // default 0.16 (16%)
  impostoOverrideMotivo?: string;
  
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
  
  // NOVO: Contas a Pagar/Receber para fluxo de caixa preciso
  contasFluxo?: ContaFluxo[];
  
  // NOVO: Custos Fixos Detalhados (breakdown por categoria)
  custosFixosDetalhados?: CustosFixosDetalhados;
  
  // NOVO: Lista de fornecedores para DRE/classificação
  fornecedores?: Fornecedor[];
  
  // NOVO: Faturamento por Canal (B2B, Nuvem, Shopee, Assinaturas)
  faturamentoCanais?: {
    b2b: string;
    ecomNuvem: string;
    ecomShopee: string;
    ecomAssinaturas: string;
  };
  
  // NOVO: Sugestões geradas por IA
  sugestoesIA?: {
    sugestoes: {
      tipo: 'urgente' | 'custo' | 'vendas' | 'estoque' | 'marketing';
      titulo: string;
      descricao: string;
      impactoEstimado?: string;
    }[];
    geradoEm: string;
    contextoHash: string;
  };
  
  // NOVO: Mapeamentos descrição→fornecedor para conciliação automática
  mapeamentosDescricao?: MapeamentoDescricaoFornecedor[];
  
  // Chaves de grupos de duplicatas dispensados pelo usuário (persistido)
  duplicatasDispensadas?: string[];
  
  // NOVO: Snapshots mensais (gerados após conciliação)
  snapshotsMensais?: {
    mesAno: string;
    entradas: number;
    saidas: number;
    saldo: number;
    geradoEm: string;
  }[];
}

// Mapeamento de descrições bancárias para fornecedores
export interface MapeamentoDescricaoFornecedor {
  padrao: string;        // Padrão normalizado da descrição (ex: "BOLETO PAGO RNX FIDC")
  fornecedorId: string;  // ID do fornecedor associado
  criadoEm: string;      // ISO date
}

// Helpers para mapeamento de descrições
export function extrairPadraoDescricao(descricao: string): string {
  return descricao
    .replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, '')  // Remove datas
    .replace(/R\$[\s\d.,]+/g, '')               // Remove valores
    .replace(/\d{5,}/g, '')                     // Remove IDs longos
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 50); // Limita tamanho
}

export function encontrarMapeamento(
  descricao: string, 
  mapeamentos: MapeamentoDescricaoFornecedor[]
): string | null {
  if (!mapeamentos?.length) return null;
  const padrao = extrairPadraoDescricao(descricao);
  if (padrao.length < 5) return null;
  
  const match = mapeamentos.find(m => 
    padrao.includes(m.padrao) || m.padrao.includes(padrao)
  );
  return match?.fornecedorId || null;
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

// ============= Reunião Ads (CONSOLIDADO - Performance + Execução) =============
export interface ReuniaoAdsAcao {
  id: string;
  tipo: 'escalar' | 'pausar' | 'testar' | 'otimizar';
  descricao: string;
}

export interface ReuniaoAdsStage {
  // Performance (antiga Pré-Reunião Ads)
  roasMedio7d: string;
  roasMedio14d: string;
  roasMedio30d: string;
  cpaMedio: string;
  ticketMedio: string;
  gastoAdsAtual: string;
  decisaoSemana: 'escalar' | 'manter' | 'reduzir' | null;
  
  // Execução (antiga Reunião Ads)
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
  codigoCupom?: string;  // NOVO: Código do cupom
}

// Interface para Médias 90D do Marketing
export interface Marketing90DMedias {
  // Email
  emailEnviados: string;
  emailAbertura: string;
  emailConversoes: string;
  // Social
  postsPublicados: string;
  taxaEngajamento: string;
  alcanceTotal: string;
  // Pedidos
  pedidosSemana: string;
}

export interface MarketingOrganico {
  // E-mail - SEMANA
  emailEnviados: string;
  emailAbertura: string;
  emailConversoes?: string;  // NOVO: % Conversões
  emailGerouClique: boolean;
  
  // Influencers
  influencers: MarketingInfluencer[];
  
  // Conteúdo / Social - SEMANA
  postsPublicados: string;
  alcanceTotal: string;
  alcanceMediaSemanas: string;
  postAcimaDaMedia: boolean;
  postLinkDestaque?: string;  // NOVO: Link do post destaque
  taxaEngajamento: string;
  
  // Sessões do Site (validação da demanda)
  sessoesSemana: string;
  sessoesMedia30d: string;
  
  // Pedidos da Semana
  pedidosSemana: string;
  pedidosMedia90d?: string;  // NOVO: Média 90D de pedidos
  
  // NOVO: Médias 90D (preenchimento manual no início, depois calculado)
  media90d?: Marketing90DMedias;
}

export type Tendencia = 'acima' | 'media' | 'abaixo';

export interface MarketingExports {
  scoreOrganico: number;
  statusOrganico: 'forte' | 'medio' | 'fraco';
  recomendacaoAds: string;
  // Score de Demanda (agora relativo ao histórico)
  scoreDemanda: number;
  statusDemanda: 'forte' | 'neutro' | 'fraco';
  scoreSessoes: number;
  statusSessoes: 'forte' | 'neutro' | 'fraco';
  // NOVO: Tendências por pilar (comparação com histórico)
  tendenciaOrganico: Tendencia;
  tendenciaSessoes: Tendencia;
  tendenciaPedidos: Tendencia;
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
  | 'acessorio'
  | 'brinde'
  | 'material_pdv'
  | 'embalagem' 
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
  precoCusto?: number;     // Preço de custo unitário (R$)
  localizacao?: string;    // Depósito/fábrica onde o item está
  custoProducao?: number;  // Custo para produzir 1 unidade do produto acabado (R$)
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

// Movimentações de Estoque (Entradas e Saídas)
export interface MovimentacaoEstoque {
  id: string;
  tipo: 'entrada' | 'saida';
  produto: string;
  quantidade: number;
  valorUnitarioVenda?: number;  // Preço de venda (do CSV, para referência)
  lote?: string;
  dataValidade?: string;
  data: string;                 // ISO date
}

// Exports para outros módulos (Pre-Reunião Geral, Score)
export interface ForecastItem {
  nome: string;
  tipo: TipoEstoque;
  saidaSemanal: number;
  estoqueAtual: number;
  coberturaDias: number;
  precisaProduzir: number;   // para atingir meta de cobertura
  custoProducaoUnit?: number; // custo para produzir 1 un
  investimentoNecessario?: number; // precisaProduzir * custoProducao
}

export interface ForecastSemana {
  semanaLabel: string;        // ex: "S10 MAR"
  receitaReal: number;
  cmvReal: number;
  inicioSemana: string;       // ISO date
}

export interface SupplyForecast {
  receitaProjetada30d: number;   // receita bruta projetada (30 dias)
  cmvProjetado30d: number;       // CMV projetado (30 dias)
  margemProjetada: number;       // % margem
  investimentoProducao: number;  // total R$ necessário para produzir
  itens: ForecastItem[];         // detalhe por produto
  breakdownSemanal?: ForecastSemana[];  // últimas 12 semanas de receita/CMV real
}

export interface SupplyExports {
  statusEstoque: 'verde' | 'amarelo' | 'vermelho';
  coberturaProdutosDias: number | null;
  coberturaEmbalagensDias: number | null;
  riscoRuptura: boolean;
  riscoVencimento: boolean;
  scorePilar: number;  // 0-30 para Score Negócio
  cmvMensal?: number;  // CMV calculado por saídas x custo unitário
  receitaBrutaSupply?: number;  // Receita bruta (soma ValorSaída)
  forecast?: SupplyForecast;
}

// ============= Ficha Técnica (BOM) =============
export interface FichaTecnicaIngrediente {
  insumoNome: string;
  quantidade: number;  // Quantidade necessária por unidade produzida
  unidade: string;     // 'kg', 'un', 'g', 'ml', 'L'
}

export interface FichaTecnica {
  produtoAcabadoNome: string;
  ingredientes: FichaTecnicaIngrediente[];
}

// ============= Orçamentos =============
export type OrcamentoTipo = 'embalagem' | 'materia_prima' | 'mao_de_obra';

export interface OrcamentoItem {
  nome: string;
  quantidade?: number;
  unidade?: string;
  valorUnitario?: number;
  valorTotal?: number;
  comprado?: boolean;
  qtdComprada?: number;
  valorUnitarioReal?: number;
  dataCompra?: string;
  frete?: number;              // valor do frete (0 se embutido)
}

export interface Orcamento {
  id: string;
  fornecedor: string;
  tipo: OrcamentoTipo;
  dataOrcamento?: string;        // ISO date
  prazoEntrega?: string;         // Ex: "15 dias úteis"
  condicaoPagamento?: string;    // Ex: "30/60/90"
  itens: OrcamentoItem[];
  valorTotal?: number;
  confianca?: number;            // 0-1
  createdAt: string;             // ISO datetime
  anexoPath?: string;            // path no storage
  produtoVinculado?: string;     // nome do produto acabado vinculado
}

// Estado do módulo Supply Chain
export interface SupplyChainStage {
  // V2: Input de Demanda
  demandaSemanalMedia: number;  // Pedidos/semana (base para cálculos)
  
  // V2: Itens do Estoque
  itens: ItemEstoque[];
  
  // V2: Resumo (calculado)
  resumo?: SupplyResumo;
  
  // V3: Movimentações de estoque
  movimentacoes?: MovimentacaoEstoque[];
  ultimaImportacaoMov?: string;
  
  // V4: Fichas Técnicas (BOM)
  fichasTecnicas?: FichaTecnica[];
  
  // V4: Datas estimadas de produção (chave = nome normalizado do produto)
  datasProducao?: Record<string, string>;
  
  // V5: Orçamentos
  orcamentos?: Orcamento[];
  
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
  emFoco?: boolean;  // Indica se está sendo trabalhada agora
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
  reuniaoAdsData?: ReuniaoAdsStage;
  completedAt?: string;
}

// ============= Ritmo & Expectativa =============
export interface RitmoTimestamps {
  lastCaixaUpdate?: string;           // ISO date (YYYY-MM-DD)
  lastContasAPagarCheck?: string;     // Marcar como "visto hoje"
  lastConciliacaoCheck?: string;      // Revisar 1x/semana
  lastPremissasReview?: string;       // Revisar no início do mês
}

export type RitmoTaskId = 'caixa' | 'contas-hoje' | 'decisao' | 'conciliacao' | 'premissas';
export type RitmoFrequencia = 'diario' | 'semanal' | 'mensal';

export interface RitmoTask {
  id: RitmoTaskId;
  titulo: string;
  status: 'ok' | 'pendente';
  frequencia: RitmoFrequencia;
}

export interface UserRitmoExpectativa {
  statusRitmo: 'ok' | 'atencao' | 'pendente';
  hojePrecisaDeAtencao: boolean;
  tarefasHoje: RitmoTask[];
  totalPendentes: number;
  pendentesHoje: number;
  pendentesEstaSemana: number;
}

export interface FocusModeState {
  date: string;
  weekStart: string;
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
  timestamps?: RitmoTimestamps;
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
  'reuniao-ads': {
    id: 'reuniao-ads',
    icon: '🎯',
    title: 'Reunião Ads',
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
  tasks: {
    id: 'tasks',
    icon: '📋',
    title: 'Tasks',
    fixedText: 'Se não couber hoje, fica para outro dia. Isso é decisão, não atraso.',
    frequency: 'daily',
  },
};

// ============= Checklists Padrão =============
export const DEFAULT_CHECKLISTS: Record<FocusModeId, Omit<ChecklistItem, 'id' | 'completed'>[]> = {
  financeiro: [],
  marketing: [],
  supplychain: [],
  'pre-reuniao-geral': [],
  'reuniao-ads': [],
  'pre-reuniao-verter': [
    { text: 'Indicadores atualizados' },
    { text: 'Caixa e dívida atual' },
    { text: 'Pipeline de interessados' },
    { text: 'Pontos de atenção da semana' },
  ],
  tasks: [],
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

export const DEFAULT_FINANCEIRO_CONTAS: FinanceiroContas = {
  itauNiceFoods: { saldo: '', cdb: '' },
  itauNiceEcom: { saldo: '', cdb: '' },
  asaas: { saldo: '', aReceber: '' },
  nuvem: { saldo: '', aReceber: '' },
  pagarMe: { saldo: '', aReceber: '' },
  mercadoPagoEcom: { saldo: '', disponivel: '' },
};

export const DEFAULT_MARKETING_90D: Marketing90DMedias = {
  emailEnviados: '',
  emailAbertura: '',
  emailConversoes: '',
  postsPublicados: '',
  taxaEngajamento: '',
  alcanceTotal: '',
  pedidosSemana: '',
};

export const DEFAULT_MARKETING_ORGANICO: MarketingOrganico = {
  emailEnviados: '',
  emailAbertura: '',
  emailConversoes: '',
  emailGerouClique: false,
  influencers: [],
  postsPublicados: '',
  alcanceTotal: '',
  alcanceMediaSemanas: '',
  postAcimaDaMedia: false,
  postLinkDestaque: '',
  taxaEngajamento: '',
  sessoesSemana: '',
  sessoesMedia30d: '',
  pedidosSemana: '',
  pedidosMedia90d: '',
  media90d: DEFAULT_MARKETING_90D,
};

// ============= Interface de Médias Históricas =============
export interface HistoricoMedias {
  scoreOrganico: number;
  sessoesSemana: number;
  pedidosSemana: number;
  temDados: boolean;
}

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

// ============= Reunião Ads Default (CONSOLIDADO) =============
export const DEFAULT_REUNIAO_ADS_DATA: ReuniaoAdsStage = {
  // Performance
  roasMedio7d: '',
  roasMedio14d: '',
  roasMedio30d: '',
  cpaMedio: '',
  ticketMedio: '',
  gastoAdsAtual: '',
  decisaoSemana: null,
  // Execução
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
