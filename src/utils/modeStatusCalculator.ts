import { 
  ModeStatus, 
  FocusMode, 
  FinanceiroStage, 
  MarketingStage, 
  SupplyChainStage,
  ChecklistItem,
  FinanceiroExports,
  PreReuniaoGeralStage,
  PreReuniaoAdsStage,
  ReuniaoAdsStage,
  MARGEM_OPERACIONAL,
  DEFAULT_FINANCEIRO_DATA,
} from '@/types/focus-mode';

export { MARGEM_OPERACIONAL };

// ============= Utilitários =============
export const parseCurrency = (value: string): number => {
  const cleaned = value
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

// ============= Calculador Principal do Financeiro V2 =============
export function calculateFinanceiroV2(data?: FinanceiroStage): FinanceiroExports {
  const d = data ?? DEFAULT_FINANCEIRO_DATA;
  
  // Parse valores básicos
  const faturamento = parseCurrency(d.faturamentoMes || '');
  const custoFixo = parseCurrency(d.custoFixoMensal || '');
  const marketingBase = parseCurrency(d.marketingBase || '');
  const caixaAtual = parseCurrency(d.caixaAtual || '');
  const caixaMinimo = parseCurrency(d.caixaMinimo || '');
  
  // Total defasados
  const defasados = d.custosDefasados;
  const totalDefasados = defasados ? (
    parseCurrency(defasados.impostosProximoMes || '') +
    parseCurrency(defasados.adsCartaoAnterior || '') +
    parseCurrency(defasados.parcelasEmprestimos || '') +
    parseCurrency(defasados.comprasEstoqueComprometidas || '') +
    parseCurrency(defasados.outrosCompromissos || '')
  ) : 0;
  
  // CAIXA LIVRE REAL (o número que manda)
  const caixaLivreReal = caixaAtual - caixaMinimo - totalDefasados;
  
  // Resultado do mês (referência apenas, não manda)
  const margemGerada = faturamento * MARGEM_OPERACIONAL;
  const resultadoMes = margemGerada - custoFixo - marketingBase;
  
  // Status baseado em Caixa Livre (não resultado!)
  let statusFinanceiro: 'estrategia' | 'atencao' | 'sobrevivencia';
  if (caixaLivreReal <= 0) statusFinanceiro = 'sobrevivencia';
  else if (caixaLivreReal < 30000) statusFinanceiro = 'atencao';
  else statusFinanceiro = 'estrategia';
  
  // Ads baseado em Caixa Livre (10%/20%/30% conforme faixas)
  let adsPercent = 0;
  if (caixaLivreReal > 0) {
    if (caixaLivreReal <= 30000) adsPercent = 0.10;
    else if (caixaLivreReal <= 60000) adsPercent = 0.20;
    else adsPercent = 0.30;
  }
  
  const adsIncremental = caixaLivreReal > 0 ? caixaLivreReal * adsPercent : 0;
  const adsMaximoPermitido = marketingBase + adsIncremental;
  
  // Score para termômetro (0-100)
  const scoreFinanceiro = calcScoreFinanceiro(caixaLivreReal);
  
  // Projeção 30/60/90
  const projecao30 = caixaAtual + resultadoMes - totalDefasados;
  const projecao60 = projecao30 + resultadoMes - totalDefasados;
  const projecao90 = projecao60 + resultadoMes - totalDefasados;
  
  const risco30d = projecao30 >= caixaMinimo ? 'verde' : projecao30 >= 0 ? 'amarelo' : 'vermelho';
  const risco60d = projecao60 >= caixaMinimo ? 'verde' : projecao60 >= 0 ? 'amarelo' : 'vermelho';
  const risco90d = projecao90 >= caixaMinimo ? 'verde' : projecao90 >= 0 ? 'amarelo' : 'vermelho';
  
  return {
    caixaLivreReal,
    statusFinanceiro,
    risco30d,
    risco60d,
    risco90d,
    adsMaximoPermitido,
    adsBase: marketingBase,
    adsIncremental,
    scoreFinanceiro,
    resultadoMes,
    totalDefasados,
  };
}

function calcScoreFinanceiro(caixaLivre: number): number {
  if (caixaLivre <= 0) return 0;
  if (caixaLivre < 30000) return Math.round((caixaLivre / 30000) * 50);
  if (caixaLivre < 60000) return 50 + Math.round(((caixaLivre - 30000) / 30000) * 30);
  return Math.min(100, 80 + Math.round(((caixaLivre - 60000) / 40000) * 20));
}

// ============= Termômetro de Risco Combinado =============
export function calcTermometroRisco(
  financeiroExports: FinanceiroExports,
  coberturaEstoque: string | null,
  roasMedio: string,
  cpaMedio: string,
  ticketMedio: string
): { score: number; status: 'saudavel' | 'atencao' | 'risco' } {
  // Pesos: Financeiro 40%, Estoque 30%, Demanda 30%
  const scoreFinanceiro = financeiroExports.scoreFinanceiro;
  
  const scoreEstoque = coberturaEstoque === 'mais30' ? 90 :
                       coberturaEstoque === '15a30' ? 65 :
                       coberturaEstoque === 'menos15' ? 25 : 50;
  
  // Demanda
  const roas = parseFloat(roasMedio) || 0;
  const cpa = parseCurrency(cpaMedio);
  const ticket = parseCurrency(ticketMedio);
  const cpaMax = ticket * MARGEM_OPERACIONAL;
  const cpaPercent = cpaMax > 0 ? (cpa / cpaMax) * 100 : 100;
  
  const roasScore = roas >= 3 ? 100 : roas >= 2 ? 50 + ((roas - 2) * 50) : (roas / 2) * 50;
  const cpaScore = cpaPercent <= 80 ? 100 : cpaPercent <= 100 ? 50 : 0;
  const scoreDemanda = Math.round((roasScore * 0.6) + (cpaScore * 0.4));
  
  const scoreTotal = Math.round(
    (scoreFinanceiro * 0.40) + (scoreEstoque * 0.30) + (scoreDemanda * 0.30)
  );
  
  const status = scoreTotal >= 70 ? 'saudavel' : scoreTotal >= 40 ? 'atencao' : 'risco';
  return { score: scoreTotal, status };
}

// ============= Leitura Combinada Automática =============
export function getLeituraCombinada(
  statusFinanceiro: string,
  coberturaEstoque: string | null,
  roasStatus: 'verde' | 'amarelo' | 'vermelho'
): string {
  if (statusFinanceiro === 'sobrevivencia') 
    return 'Modo sobrevivência. Foco total em caixa.';
  
  const estoqueOk = coberturaEstoque === 'mais30' || coberturaEstoque === '15a30';
  
  if (statusFinanceiro === 'estrategia' && estoqueOk && roasStatus === 'verde') 
    return 'Caixa e estoque saudáveis. Pode acelerar.';
  if (statusFinanceiro === 'estrategia' && !estoqueOk) 
    return 'Caixa permite, estoque limita. Crescer com cautela.';
  if (statusFinanceiro === 'estrategia' && roasStatus !== 'verde') 
    return 'Caixa permite, performance precisa melhorar.';
  if (statusFinanceiro === 'atencao') 
    return 'Atenção no caixa. Manter estabilidade.';
  
  return 'Avaliar com cuidado antes de decidir.';
}

// ============= Status do ROAS =============
export function getRoasStatus(roas: number): 'verde' | 'amarelo' | 'vermelho' {
  if (roas >= 3) return 'verde';
  if (roas >= 2) return 'amarelo';
  return 'vermelho';
}

// ============= Status do CPA =============
export function getCpaStatus(cpa: number, ticketMedio: number): 'verde' | 'amarelo' | 'vermelho' {
  const cpaMax = ticketMedio * MARGEM_OPERACIONAL;
  if (cpaMax <= 0) return 'vermelho';
  const percent = (cpa / cpaMax) * 100;
  if (percent <= 80) return 'verde';
  if (percent <= 100) return 'amarelo';
  return 'vermelho';
}

// ============= Marketing Status Simplificado =============
export function calculateMarketingStatusSimples(verificacoes?: MarketingStage['verificacoes']): 
  { status: 'saudavel' | 'fragil' | 'dependente'; checks: number } {
  if (!verificacoes) return { status: 'dependente', checks: 0 };
  
  const checks = Object.values(verificacoes).filter(Boolean).length;
  
  if (checks >= 4) return { status: 'saudavel', checks };
  if (checks >= 2) return { status: 'fragil', checks };
  return { status: 'dependente', checks };
}

// ============= Termômetro Orgânico =============
export interface MarketingOrganicoResult {
  scoreOrganico: number;
  statusOrganico: 'forte' | 'medio' | 'fraco';
  recomendacaoAds: string;
  detalhes: {
    emailScore: number;
    influencerScore: number;
    socialScore: number;
  };
  // Sessões do Site
  scoreSessoes: number;
  statusSessoes: 'forte' | 'neutro' | 'fraco';
  // Score de Demanda Combinado
  scoreDemanda: number;
  statusDemanda: 'forte' | 'neutro' | 'fraco';
  leituraDemanda: string;
}

export function calculateMarketingOrganico(organico?: MarketingStage['organico']): MarketingOrganicoResult {
  if (!organico) {
    return {
      scoreOrganico: 0,
      statusOrganico: 'fraco',
      recomendacaoAds: 'Ads compensa: mais topo de funil e remarketing',
      detalhes: { emailScore: 0, influencerScore: 0, socialScore: 0 },
      scoreSessoes: 0,
      statusSessoes: 'fraco',
      scoreDemanda: 0,
      statusDemanda: 'fraco',
      leituraDemanda: 'Sem dados suficientes para avaliar demanda.',
    };
  }
  
  // E-mail: enviado + clique/venda = 30 pontos
  const emailEnviados = parseInt(organico.emailEnviados) || 0;
  const emailScore = (emailEnviados > 0 && organico.emailGerouClique) ? 30 : 0;
  
  // Influencer: conteúdo no ar + link ativo = 30 pontos
  const influencersAtivos = organico.influencers.filter(
    inf => inf.conteudoNoAr && inf.linkCupomAtivo
  ).length;
  const influencerScore = influencersAtivos > 0 ? 30 : 0;
  
  // Social: alcance >= média = 40 pontos
  const alcanceTotal = parseCurrency(organico.alcanceTotal);
  const alcanceMedia = parseCurrency(organico.alcanceMediaSemanas);
  const socialScore = (alcanceTotal > 0 && alcanceTotal >= alcanceMedia) ? 40 : 
                      (alcanceTotal > 0 && alcanceTotal >= alcanceMedia * 0.7) ? 20 : 0;
  
  const scoreOrganico = emailScore + influencerScore + socialScore;
  
  // ========== SESSÕES DO SITE (NOVO) ==========
  const sessoesSemana = parseCurrency(organico.sessoesSemana || '');
  const sessoesMedia = parseCurrency(organico.sessoesMedia30d || '');
  
  let scoreSessoes: number;
  let statusSessoes: 'forte' | 'neutro' | 'fraco';
  
  if (sessoesMedia <= 0 || sessoesSemana <= 0) {
    // Sem dados
    scoreSessoes = 50; // Neutro por padrão
    statusSessoes = 'neutro';
  } else {
    const variacao = ((sessoesSemana - sessoesMedia) / sessoesMedia) * 100;
    
    if (variacao >= 10) {
      scoreSessoes = 100;
      statusSessoes = 'forte';
    } else if (variacao >= -10) {
      scoreSessoes = 70;
      statusSessoes = 'neutro';
    } else {
      scoreSessoes = 40;
      statusSessoes = 'fraco';
    }
  }
  
  // Status baseado no score orgânico
  let statusOrganico: 'forte' | 'medio' | 'fraco';
  let recomendacaoAds: string;
  
  if (scoreOrganico >= 70) {
    statusOrganico = 'forte';
    recomendacaoAds = 'Ads pode focar em remarketing. Menos pressão em topo de funil.';
  } else if (scoreOrganico >= 40) {
    statusOrganico = 'medio';
    recomendacaoAds = 'Ads mantém estrutura atual. Testes pontuais.';
  } else {
    statusOrganico = 'fraco';
    recomendacaoAds = 'Ads compensa: mais topo de funil e remarketing.';
  }
  
  // ========== SCORE DE DEMANDA COMBINADO ==========
  // Orgânico: 60% (já calculado 0-100) + Sessões: 40%
  const scoreDemanda = Math.round((scoreOrganico * 0.6) + (scoreSessoes * 0.4));
  
  let statusDemanda: 'forte' | 'neutro' | 'fraco';
  if (scoreDemanda >= 70) statusDemanda = 'forte';
  else if (scoreDemanda >= 40) statusDemanda = 'neutro';
  else statusDemanda = 'fraco';
  
  // Leitura inteligente baseada na combinação
  const leituraDemanda = getLeituraDemanda(statusOrganico, statusSessoes);
  
  return {
    scoreOrganico,
    statusOrganico,
    recomendacaoAds,
    detalhes: { emailScore, influencerScore, socialScore },
    scoreSessoes,
    statusSessoes,
    scoreDemanda,
    statusDemanda,
    leituraDemanda,
  };
}

// Leitura inteligente da combinação Orgânico + Sessões
function getLeituraDemanda(
  statusOrganico: 'forte' | 'medio' | 'fraco',
  statusSessoes: 'forte' | 'neutro' | 'fraco'
): string {
  // Orgânico forte
  if (statusOrganico === 'forte' && statusSessoes === 'forte') {
    return 'Demanda orgânica forte confirmada. Ads pode apoiar, não carregar.';
  }
  if (statusOrganico === 'forte' && statusSessoes === 'neutro') {
    return 'Orgânico bom, sessões estáveis. Manter estrutura.';
  }
  if (statusOrganico === 'forte' && statusSessoes === 'fraco') {
    return 'Orgânico bom mas sessões caindo. Verificar sazonalidade ou oferta.';
  }
  
  // Orgânico médio
  if (statusOrganico === 'medio' && statusSessoes === 'forte') {
    return 'Sessões crescendo sem orgânico forte. Pode ser Ads ou marca. Investigar.';
  }
  if (statusOrganico === 'medio' && statusSessoes === 'neutro') {
    return 'Demanda estável. Sem urgência, sem folga.';
  }
  if (statusOrganico === 'medio' && statusSessoes === 'fraco') {
    return 'Perda de interesse. Revisar oferta antes de escalar Ads.';
  }
  
  // Orgânico fraco
  if (statusOrganico === 'fraco' && statusSessoes === 'forte') {
    return 'Ads está carregando a demanda sozinho. Cuidado ao cortar.';
  }
  if (statusOrganico === 'fraco' && statusSessoes === 'neutro') {
    return 'Orgânico fraco, sessões estáveis. Ads sustentando.';
  }
  
  // Ambos fracos
  return 'Demanda geral fraca. Não escalar. Revisar oferta e timing.';
}

// ============= Calculadores de Status por Modo =============

/**
 * Status do Financeiro V2 baseado no checklist diário
 */
export function calculateFinanceiroStatus(data?: FinanceiroStage): ModeStatus {
  if (!data) return 'neutral';
  
  // V2: baseado no checklist diário
  const daily = data.checklistDiario;
  if (daily) {
    const allDailyDone = daily.atualizouCaixa && 
                         daily.olhouResultado && 
                         daily.decidiu;
    
    if (allDailyDone) return 'completed';
    if (daily.atualizouCaixa || daily.olhouResultado) return 'in-progress';
  }
  
  // Fallback para compatibilidade com dados antigos
  const hasOldData = 
    (data.caixaNiceFoods ?? '').trim() !== '' ||
    (data.caixaEcommerce ?? '').trim() !== '' ||
    (data.caixaAtual ?? '').trim() !== '';
  
  if (hasOldData) return 'in-progress';
  
  return 'neutral';
}

/**
 * Status do Marketing simplificado
 */
export function calculateMarketingStatus(data?: MarketingStage): ModeStatus {
  if (!data) return 'neutral';
  
  const { status } = calculateMarketingStatusSimples(data.verificacoes);
  
  if (status === 'saudavel') return 'completed';
  if (status === 'fragil') return 'in-progress';
  return 'neutral';
}

/**
 * Status do Supply Chain
 */
export function calculateSupplyChainStatus(data?: SupplyChainStage): ModeStatus {
  if (!data) return 'neutral';
  
  const ritmoAtual = data.ritmoAtual ?? 'semanal';
  const ritmo = data[ritmoAtual];
  
  if (!ritmo) return 'neutral';
  
  const checks = Object.values(ritmo).filter(Boolean).length;
  const total = Object.keys(ritmo).length;
  
  if (checks === 0) return 'neutral';
  if (checks === total) return 'completed';
  return 'in-progress';
}

/**
 * Status de modos com checklist genérico
 */
export function calculateChecklistStatus(items?: ChecklistItem[]): ModeStatus {
  if (!items || items.length === 0) return 'neutral';
  
  const completed = items.filter(i => i.completed).length;
  if (completed === 0) return 'neutral';
  if (completed === items.length) return 'completed';
  return 'in-progress';
}

/**
 * Status da Pre-Reunião Geral
 */
export function calculatePreReuniaoGeralStatus(data?: PreReuniaoGeralStage): ModeStatus {
  if (!data) return 'neutral';
  if (data.decisaoSemana) return 'completed';
  if (data.estoque.coberturaMedia || data.estoque.statusCompras) return 'in-progress';
  return 'neutral';
}

/**
 * Status da Pre-Reunião Ads
 */
export function calculatePreReuniaoAdsStatus(data?: PreReuniaoAdsStage): ModeStatus {
  if (!data) return 'neutral';
  if (data.decisaoSemana) return 'completed';
  const hasInputs = data.roasMedio7d || data.cpaMedio || data.ticketMedio;
  if (hasInputs) return 'in-progress';
  return 'neutral';
}

/**
 * Status da Reunião Ads
 */
export function calculateReuniaoAdsStatus(data?: ReuniaoAdsStage): ModeStatus {
  if (!data) return 'neutral';
  if (data.registroDecisao?.trim()) return 'completed';
  if (data.acoes.length > 0) return 'in-progress';
  return 'neutral';
}

/**
 * Calculador principal de status por modo
 */
export function calculateModeStatus(mode: FocusMode): ModeStatus {
  switch (mode.id) {
    case 'financeiro':
      return calculateFinanceiroStatus(mode.financeiroData);
    case 'marketing':
      return calculateMarketingStatus(mode.marketingData);
    case 'supplychain':
      return calculateSupplyChainStatus(mode.supplyChainData);
    case 'pre-reuniao-geral':
      return calculatePreReuniaoGeralStatus(mode.preReuniaoGeralData);
    case 'pre-reuniao-ads':
      return calculatePreReuniaoAdsStatus(mode.preReuniaoAdsData);
    case 'reuniao-ads':
      return calculateReuniaoAdsStatus(mode.reuniaoAdsData);
    case 'backlog':
      return 'neutral'; // Backlog não usa status automático
    default:
      return calculateChecklistStatus(mode.items);
  }
}
