import { 
  ModeStatus, 
  FocusMode, 
  FinanceiroStage, 
  MarketingStage, 
  SupplyChainStage,
  ChecklistItem,
  FinanceiroExports,
  PreReuniaoGeralStage,
  ReuniaoAdsStage,
  MARGEM_OPERACIONAL,
  DEFAULT_FINANCEIRO_DATA,
  MarketingExports,
  ScoreNegocio,
  SupplyExports,
  Tendencia,
  HistoricoMedias,
} from '@/types/focus-mode';

export { MARGEM_OPERACIONAL };

// Re-export supply calculator functions
export { calculateSupplyExports, processarSupply } from '@/utils/supplyCalculator';

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
  
  // Custo fixo: preferir breakdown detalhado, fallback para campo simples
  let custoFixo: number;
  if (d.custosFixosDetalhados) {
    const cats: (keyof typeof d.custosFixosDetalhados)[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];
    custoFixo = cats.reduce((sum, cat) => {
      return sum + (d.custosFixosDetalhados![cat] || []).reduce((s, item) => s + item.valor, 0);
    }, 0);
  } else {
    custoFixo = parseCurrency(d.custoFixoMensal || '');
  }
  
  const caixaAtual = parseCurrency(d.caixaAtual || '');
  const caixaMinimo = parseCurrency(d.caixaMinimo || '');
  const faturamentoEsperado = parseCurrency(d.faturamentoEsperado30d || '') || faturamento; // Fallback para faturamento atual
  
  // NOVO: Separação Marketing Estrutural vs Ads Base
  // Prioridade: puxar do breakdown de custos fixos (categoria marketing)
  // Fallback: campo manual marketingEstrutural ou marketingBase
  let marketingEstrutural: number;
  if (d.custosFixosDetalhados?.marketing && d.custosFixosDetalhados.marketing.length > 0) {
    marketingEstrutural = d.custosFixosDetalhados.marketing.reduce((s, i) => s + i.valor, 0);
  } else {
    marketingEstrutural = parseCurrency(d.marketingEstrutural || d.marketingBase || '');
  }
  const adsBase = parseCurrency(d.adsBase || '');
  
  // Impostos configuráveis (default 16%)
  const impostoPercent = d.impostoPercentual ?? 0.16;
  const impostosCalculados = faturamento * impostoPercent;
  
  // Total defasados (impostos automáticos + outros inputs manuais)
  const defasados = d.custosDefasados;
  const totalDefasados = impostosCalculados + (defasados ? (
    parseCurrency(defasados.adsCartaoAnterior || '') +
    parseCurrency(defasados.parcelasEmprestimos || '') +
    parseCurrency(defasados.comprasEstoqueComprometidas || '') +
    parseCurrency(defasados.outrosCompromissos || '')
  ) : 0);
  
  // CAIXA LIVRE REAL (o número que manda)
  const caixaLivreReal = caixaAtual - caixaMinimo - totalDefasados;
  
  // === QUEIMA OPERACIONAL (agora usa Marketing Estrutural, não Ads) ===
  const queimaOperacional = custoFixo + marketingEstrutural;
  const margemEsperada = faturamentoEsperado * MARGEM_OPERACIONAL;
  const resultadoEsperado30d = margemEsperada - queimaOperacional;
  
  // === Fôlego de Caixa ===
  let folegoEmDias: number | null;
  if (caixaLivreReal <= 0) {
    folegoEmDias = 0; // Sem fôlego
  } else if (resultadoEsperado30d >= 0) {
    folegoEmDias = null; // Infinito - operação se sustenta
  } else {
    // Resultado negativo: calcular fôlego
    folegoEmDias = Math.round((caixaLivreReal / Math.abs(resultadoEsperado30d)) * 30);
  }
  
  // === Alerta de Risco 30d (simplificado) ===
  let alertaRisco30d: 'verde' | 'amarelo' | 'vermelho';
  if (caixaLivreReal <= 0) {
    alertaRisco30d = 'vermelho';
  } else if (resultadoEsperado30d < 0) {
    alertaRisco30d = 'amarelo';
  } else {
    alertaRisco30d = 'verde';
  }
  
  // Resultado do mês (referência contábil, não manda)
  const margemGerada = faturamento * MARGEM_OPERACIONAL;
  const resultadoMes = margemGerada - custoFixo - marketingEstrutural;
  
  // Status baseado em Caixa Livre (não resultado!)
  let statusFinanceiro: 'estrategia' | 'atencao' | 'sobrevivencia';
  if (caixaLivreReal <= 0) statusFinanceiro = 'sobrevivencia';
  else if (caixaLivreReal < 30000) statusFinanceiro = 'atencao';
  else statusFinanceiro = 'estrategia';
  
  // === NOVO CÁLCULO DE ADS COM TETO E TRAVAS ===
  
  // TETO ABSOLUTO: Ads nunca passa de 10% do faturamento esperado
  const tetoAdsAbsoluto = faturamentoEsperado * 0.10;
  
  // Verificar travas para incremento
  let motivoBloqueioAds: string | null = null;
  let adsIncremental = 0;
  
  const podeCrescerAds = 
    caixaLivreReal > 0 &&
    alertaRisco30d !== 'vermelho';
  
  if (podeCrescerAds) {
    // Percentual baseado no status financeiro
    let incrementoPercent = 0;
    if (statusFinanceiro === 'estrategia') incrementoPercent = 0.20; // +20%
    else if (statusFinanceiro === 'atencao') incrementoPercent = 0.10; // +10%
    // sobrevivencia = 0%
    
    adsIncremental = adsBase * incrementoPercent;
  } else {
    motivoBloqueioAds = alertaRisco30d === 'vermelho' 
      ? 'Bloqueado: Alerta de risco vermelho'
      : caixaLivreReal <= 0 
      ? 'Bloqueado: Caixa Livre negativo'
      : null;
  }
  
  // Aplicar teto absoluto
  const adsTotal = Math.min(adsBase + adsIncremental, tetoAdsAbsoluto);
  const adsMaximoPermitido = adsTotal;
  
  // Recalcular incremental após aplicar teto
  const adsIncrementalReal = Math.max(0, adsMaximoPermitido - adsBase);
  
  // Score para termômetro (0-100)
  const scoreFinanceiro = calcScoreFinanceiro(caixaLivreReal);
  
  // Projeção 30/60/90 (legado, mantido para compatibilidade)
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
    adsBase,
    adsIncremental: adsIncrementalReal,
    scoreFinanceiro,
    resultadoMes,
    totalDefasados,
    // Exports V2
    queimaOperacional,
    faturamentoEsperado,
    resultadoEsperado30d,
    folegoEmDias,
    alertaRisco30d,
    // NOVOS: Ads com teto e travas
    tetoAdsAbsoluto,
    motivoBloqueioAds,
    marketingEstrutural,
  };
}

function calcScoreFinanceiro(caixaLivre: number): number {
  if (caixaLivre <= 0) return 0;
  if (caixaLivre < 30000) return Math.round((caixaLivre / 30000) * 50);
  if (caixaLivre < 60000) return 50 + Math.round(((caixaLivre - 30000) / 30000) * 30);
  return Math.min(100, 80 + Math.round(((caixaLivre - 60000) / 40000) * 20));
}

// Score Semanal V2 que aceita SupplyExports diretamente
export function calcScoreNegocioV2(
  financeiroExports: FinanceiroExports,
  supplyExports: SupplyExports | null,
  marketingExports: MarketingExports
): ScoreNegocio {
  // === PILAR 1: FINANCEIRO (0-40 pontos) ===
  let scoreFinanceiroPilar: number;
  const { caixaLivreReal, alertaRisco30d } = financeiroExports;
  
  if (caixaLivreReal <= 0) {
    scoreFinanceiroPilar = 0;
  } else if (alertaRisco30d === 'vermelho') {
    scoreFinanceiroPilar = 10;
  } else if (alertaRisco30d === 'amarelo') {
    scoreFinanceiroPilar = 25;
  } else {
    scoreFinanceiroPilar = 40;
  }
  
  // === PILAR 2: ESTOQUE (0-30 pontos) - AGORA USA SUPPLY EXPORTS ===
  let scoreEstoquePilar: number;
  let coberturaLabel: string;
  
  if (supplyExports) {
    // Usar dados calculados do Supply
    scoreEstoquePilar = supplyExports.scorePilar;
    
    if (supplyExports.coberturaProdutosDias !== null) {
      if (supplyExports.coberturaProdutosDias >= 30) {
        coberturaLabel = `${supplyExports.coberturaProdutosDias}d (OK)`;
      } else if (supplyExports.coberturaProdutosDias >= 15) {
        coberturaLabel = `${supplyExports.coberturaProdutosDias}d (Atenção)`;
      } else {
        coberturaLabel = `${supplyExports.coberturaProdutosDias}d (Crítico)`;
      }
    } else {
      coberturaLabel = 'sem dados';
    }
  } else {
    // Fallback - sem dados
    scoreEstoquePilar = 15;
    coberturaLabel = 'sem dados';
  }
  
  // === PILAR 3: DEMANDA (0-30 pontos) ===
  let scoreDemandaPilar: number;
  let tendenciaLabel: string;
  
  const sessoesForte = marketingExports.statusSessoes === 'forte';
  const sessoesNeutro = marketingExports.statusSessoes === 'neutro';
  
  const demandaForte = marketingExports.statusDemanda === 'forte';
  const demandaNeutro = marketingExports.statusDemanda === 'neutro';
  
  if (sessoesForte && demandaForte) {
    scoreDemandaPilar = 30;
    tendenciaLabel = 'Sessões ↑ + Demanda forte';
  } else if (sessoesForte || demandaForte) {
    scoreDemandaPilar = 20;
    tendenciaLabel = sessoesForte ? 'Sessões ↑' : 'Demanda ok';
  } else if (sessoesNeutro || demandaNeutro) {
    scoreDemandaPilar = 10;
    tendenciaLabel = 'Estável';
  } else {
    scoreDemandaPilar = 5;
    tendenciaLabel = 'Demanda fraca';
  }
  
  // === SCORE TOTAL ===
  const total = scoreFinanceiroPilar + scoreEstoquePilar + scoreDemandaPilar;
  
  // === STATUS FINAL ===
  const status: ScoreNegocio['status'] = 
    total >= 70 ? 'saudavel' :
    total >= 40 ? 'atencao' : 'risco';
  
  return {
    total,
    status,
    financeiro: { 
      score: scoreFinanceiroPilar, 
      alertaRisco: alertaRisco30d 
    },
    estoque: { 
      score: scoreEstoquePilar, 
      cobertura: coberturaLabel 
    },
    demanda: { 
      score: scoreDemandaPilar, 
      tendencia: tendenciaLabel 
    },
  };
}

// Legacy - mantido para compatibilidade
export function calcScoreNegocio(
  financeiroExports: FinanceiroExports,
  estoqueData: PreReuniaoGeralStage['estoque'] | undefined,
  marketingExports: MarketingExports
): ScoreNegocio {
  // === PILAR 1: FINANCEIRO (0-40 pontos) ===
  let scoreFinanceiroPilar: number;
  const { caixaLivreReal, alertaRisco30d } = financeiroExports;
  
  if (caixaLivreReal <= 0) {
    scoreFinanceiroPilar = 0;
  } else if (alertaRisco30d === 'vermelho') {
    scoreFinanceiroPilar = 10;
  } else if (alertaRisco30d === 'amarelo') {
    scoreFinanceiroPilar = 25;
  } else {
    scoreFinanceiroPilar = 40;
  }
  
  // === PILAR 2: ESTOQUE (0-30 pontos) ===
  let scoreEstoquePilar: number;
  let coberturaLabel: string;
  
  const cobertura = estoqueData?.coberturaMedia;
  const comprasOk = estoqueData?.statusCompras === 'ok';
  
  if (cobertura === 'menos15') {
    scoreEstoquePilar = 0;
    coberturaLabel = '<15 dias';
  } else if (cobertura === '15a30') {
    scoreEstoquePilar = 15;
    coberturaLabel = '15-30 dias';
  } else if (cobertura === 'mais30' && comprasOk) {
    scoreEstoquePilar = 30;
    coberturaLabel = '>30 dias + compras ok';
  } else if (cobertura === 'mais30') {
    scoreEstoquePilar = 22;
    coberturaLabel = '>30 dias';
  } else {
    scoreEstoquePilar = 15;
    coberturaLabel = 'sem dados';
  }
  
  // === PILAR 3: DEMANDA (0-30 pontos) ===
  let scoreDemandaPilar: number;
  let tendenciaLabel: string;
  
  const sessoesForte = marketingExports.statusSessoes === 'forte';
  const sessoesNeutro = marketingExports.statusSessoes === 'neutro';
  
  const demandaForte = marketingExports.statusDemanda === 'forte';
  const demandaNeutro = marketingExports.statusDemanda === 'neutro';
  
  if (sessoesForte && demandaForte) {
    scoreDemandaPilar = 30;
    tendenciaLabel = 'Sessões ↑ + Demanda forte';
  } else if (sessoesForte || demandaForte) {
    scoreDemandaPilar = 20;
    tendenciaLabel = sessoesForte ? 'Sessões ↑' : 'Demanda ok';
  } else if (sessoesNeutro || demandaNeutro) {
    scoreDemandaPilar = 10;
    tendenciaLabel = 'Estável';
  } else {
    scoreDemandaPilar = 5;
    tendenciaLabel = 'Demanda fraca';
  }
  
  // === SCORE TOTAL ===
  const total = scoreFinanceiroPilar + scoreEstoquePilar + scoreDemandaPilar;
  
  // === STATUS FINAL ===
  const status: ScoreNegocio['status'] = 
    total >= 70 ? 'saudavel' :
    total >= 40 ? 'atencao' : 'risco';
  
  return {
    total,
    status,
    financeiro: { 
      score: scoreFinanceiroPilar, 
      alertaRisco: alertaRisco30d 
    },
    estoque: { 
      score: scoreEstoquePilar, 
      cobertura: coberturaLabel 
    },
    demanda: { 
      score: scoreDemandaPilar, 
      tendencia: tendenciaLabel 
    },
  };
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
// contextType pode ser 'estoque' (para Pre-Reunião Geral) ou 'organico' (para Pre-Reunião Ads)
export function getLeituraCombinada(
  statusFinanceiro: string,
  contextValue: string | null,
  roasStatus: 'verde' | 'amarelo' | 'vermelho',
  contextType: 'estoque' | 'organico' = 'estoque'
): string {
  if (statusFinanceiro === 'sobrevivencia') 
    return 'Modo sobrevivência. Foco total em caixa.';
  
  if (contextType === 'organico') {
    // Leitura para Pre-Reunião Ads (baseada em orgânico)
    const organicoForte = contextValue === 'forte';
    const organicoMedio = contextValue === 'medio';
    
    if (statusFinanceiro === 'estrategia' && organicoForte && roasStatus === 'verde') 
      return 'Orgânico forte + Ads saudável. Pode focar em remarketing e conversão.';
    if (statusFinanceiro === 'estrategia' && !organicoForte && roasStatus === 'verde') 
      return 'Orgânico fraco. Ads deve compensar com mais topo de funil.';
    if (statusFinanceiro === 'estrategia' && roasStatus !== 'verde') 
      return 'Caixa permite, mas performance de Ads precisa melhorar.';
    if (statusFinanceiro === 'atencao' && organicoForte) 
      return 'Financeiro em atenção, mas orgânico ajuda. Manter cautela.';
    if (statusFinanceiro === 'atencao' && !organicoForte) 
      return 'Financeiro em atenção + orgânico fraco. Evitar escalar.';
    
    return 'Avaliar contexto antes de decidir Ads.';
  }
  
  // Leitura para Pre-Reunião Geral (baseada em estoque)
  const estoqueOk = contextValue === 'mais30' || contextValue === '15a30';
  
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
  // NOVO: Tendências por pilar (comparação com histórico)
  tendenciaOrganico: Tendencia;
  tendenciaSessoes: Tendencia;
  tendenciaPedidos: Tendencia;
}

// ============= Função de Score Relativo ao Histórico =============
function calcularScoreRelativo(
  valorAtual: number, 
  mediaHistorica: number,
  pontosTotais: number
): { score: number; tendencia: Tendencia } {
  // Sem histórico = neutro (50%)
  if (mediaHistorica <= 0) {
    return { score: pontosTotais * 0.5, tendencia: 'media' };
  }
  
  const variacao = ((valorAtual - mediaHistorica) / mediaHistorica) * 100;
  
  if (variacao >= 10) {
    return { score: pontosTotais, tendencia: 'acima' };
  } else if (variacao >= -10) {
    return { score: pontosTotais * 0.7, tendencia: 'media' };
  } else {
    return { score: pontosTotais * 0.4, tendencia: 'abaixo' };
  }
}

export function calculateMarketingOrganico(
  organico?: MarketingStage['organico'],
  historicoMedias?: HistoricoMedias
): MarketingOrganicoResult {
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
      tendenciaOrganico: 'media',
      tendenciaSessoes: 'media',
      tendenciaPedidos: 'media',
    };
  }
  
  // ========== SCORE ORGÂNICO ABSOLUTO (para referência) ==========
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
  
  const scoreOrganicoAbsoluto = emailScore + influencerScore + socialScore;
  
  // Parse valores atuais
  const sessoesSemana = parseCurrency(organico.sessoesSemana || '');
  const pedidosSemana = parseCurrency(organico.pedidosSemana || '');
  
  // ========== CÁLCULO RELATIVO AO HISTÓRICO ==========
  // PILAR 1: ORGÂNICO (30 pontos max)
  const organicoResult = calcularScoreRelativo(
    scoreOrganicoAbsoluto, 
    historicoMedias?.scoreOrganico || 0,
    30
  );
  
  // PILAR 2: SESSÕES (35 pontos max)
  const sessoesResult = calcularScoreRelativo(
    sessoesSemana,
    historicoMedias?.sessoesSemana || 0,
    35
  );
  
  // PILAR 3: PEDIDOS (35 pontos max)
  const pedidosResult = calcularScoreRelativo(
    pedidosSemana,
    historicoMedias?.pedidosSemana || 0,
    35
  );
  
  // SCORE FINAL DE DEMANDA (relativo)
  const scoreDemanda = Math.round(
    organicoResult.score + sessoesResult.score + pedidosResult.score
  );
  
  // Status final
  let statusDemanda: 'forte' | 'neutro' | 'fraco';
  if (scoreDemanda >= 70) statusDemanda = 'forte';
  else if (scoreDemanda >= 40) statusDemanda = 'neutro';
  else statusDemanda = 'fraco';
  
  // Status orgânico (para recomendação de Ads)
  let statusOrganico: 'forte' | 'medio' | 'fraco';
  let recomendacaoAds: string;
  
  if (scoreOrganicoAbsoluto >= 70) {
    statusOrganico = 'forte';
    recomendacaoAds = 'Ads pode focar em remarketing. Menos pressão em topo de funil.';
  } else if (scoreOrganicoAbsoluto >= 40) {
    statusOrganico = 'medio';
    recomendacaoAds = 'Ads mantém estrutura atual. Testes pontuais.';
  } else {
    statusOrganico = 'fraco';
    recomendacaoAds = 'Ads compensa: mais topo de funil e remarketing.';
  }
  
  // Status sessões derivado da tendência
  const statusSessoes: 'forte' | 'neutro' | 'fraco' = 
    sessoesResult.tendencia === 'acima' ? 'forte' :
    sessoesResult.tendencia === 'media' ? 'neutro' : 'fraco';
  
  // Leitura inteligente baseada nas tendências
  const leituraDemanda = getLeituraDemandaRelativa(
    organicoResult.tendencia,
    sessoesResult.tendencia,
    pedidosResult.tendencia
  );
  
  return {
    scoreOrganico: scoreOrganicoAbsoluto,
    statusOrganico,
    recomendacaoAds,
    detalhes: { emailScore, influencerScore, socialScore },
    scoreSessoes: Math.round(sessoesResult.score),
    statusSessoes,
    scoreDemanda,
    statusDemanda,
    leituraDemanda,
    tendenciaOrganico: organicoResult.tendencia,
    tendenciaSessoes: sessoesResult.tendencia,
    tendenciaPedidos: pedidosResult.tendencia,
  };
}

// Leitura inteligente baseada nas tendências relativas
function getLeituraDemandaRelativa(
  tendenciaOrganico: Tendencia,
  tendenciaSessoes: Tendencia,
  tendenciaPedidos: Tendencia
): string {
  // Todos acima
  if (tendenciaOrganico === 'acima' && tendenciaSessoes === 'acima' && tendenciaPedidos === 'acima') {
    return 'Performance excelente. Todos pilares acima do histórico.';
  }
  
  // Pedidos caindo é o mais crítico
  if (tendenciaPedidos === 'abaixo') {
    if (tendenciaSessoes === 'acima' || tendenciaOrganico === 'acima') {
      return 'Atenção: Orgânico/Sessões bons mas pedidos caindo. Verificar conversão.';
    }
    return 'Demanda geral em queda. Revisar oferta antes de escalar Ads.';
  }
  
  // Sessões caindo
  if (tendenciaSessoes === 'abaixo') {
    if (tendenciaPedidos === 'acima') {
      return 'Menos tráfego mas boa conversão. Considerar escalar topo de funil.';
    }
    return 'Tráfego caindo. Verificar sazonalidade ou oferta.';
  }
  
  // Orgânico fraco
  if (tendenciaOrganico === 'abaixo') {
    if (tendenciaSessoes === 'acima' && tendenciaPedidos === 'acima') {
      return 'Ads carregando a demanda. Orgânico precisa de atenção.';
    }
    return 'Orgânico abaixo da média. Ads compensando.';
  }
  
  // Todos na média
  if (tendenciaOrganico === 'media' && tendenciaSessoes === 'media' && tendenciaPedidos === 'media') {
    return 'Demanda estável. Sem urgência, sem folga.';
  }
  
  // Casos mistos positivos
  if (tendenciaPedidos === 'acima') {
    return 'Pedidos acima da média. Boa performance de conversão.';
  }
  
  return 'Demanda dentro do esperado. Monitorar próxima semana.';
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
 * Status do Supply Chain V2
 * Baseado em: ter demanda + ter itens + cobertura
 */
export function calculateSupplyChainStatus(data?: SupplyChainStage): ModeStatus {
  if (!data) return 'neutral';
  
  // V2: baseado em demanda e itens
  if (data.itens && data.itens.length > 0) {
    // Se tem itens, está em progresso ou completo
    if (data.demandaSemanalMedia > 0) {
      // Verificar se todos os itens têm cobertura calculada e não há críticos
      const temCriticos = data.itens.some(item => {
        if (!data.demandaSemanalMedia) return false;
        const demanda = item.demandaSemanal ?? data.demandaSemanalMedia;
        const cobertura = item.quantidade / (demanda / 7);
        const regras: Record<string, { critico: number }> = {
          produto_acabado: { critico: 15 },
          embalagem: { critico: 30 },
          insumo: { critico: 20 },
          materia_prima: { critico: 20 },
        };
        return cobertura < (regras[item.tipo]?.critico ?? 15);
      });
      
      return temCriticos ? 'in-progress' : 'completed';
    }
    return 'in-progress';
  }
  
  // Fallback legado: baseado em checklists
  const ritmoAtual = data.ritmoAtual ?? 'semanal';
  const ritmo = data[ritmoAtual];
  
  if (!ritmo || typeof ritmo !== 'object') return 'neutral';
  
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
 * Status da Reunião Ads (consolidada)
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
    case 'reuniao-ads':
      return calculateReuniaoAdsStatus(mode.reuniaoAdsData);
    case 'tasks':
      return 'neutral'; // Tasks não usa status automático
    default:
      return calculateChecklistStatus(mode.items);
  }
}
