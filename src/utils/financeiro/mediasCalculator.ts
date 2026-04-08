import { ContaFluxo } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, subDays, isWithinInterval, startOfDay } from 'date-fns';

// Custos variáveis padrão do negócio
export const CUSTOS_VARIAVEIS = {
  imposto: 0.16,           // 16% do valor da venda
  fulfillment: 4.90,       // R$ por pedido
  devolucoes: 0.02,        // 2% do valor da venda
  embalagem: 5.00,         // R$ por envio
  // taxaCartao removida: extrato bancário já mostra valor líquido (pós-taxa gateway)
  // Frete: calculado via conciliação (soma Jadlog+Mandae)
} as const;

// Padrões para identificar frete na conciliação
const PATTERNS_FRETE = [
  /jadlog/i,
  /mandae/i,
  /manda[eê]/i,
  /correios/i,
  /sedex/i,
  /pac\b/i,
];

const TIPOS_ENTRADA = ['receber', 'resgate'];
const TIPOS_SAIDA = ['pagar', 'aplicacao', 'cartao'];

export interface MediasConciliadas {
  mediaEntradaDia: number;
  mediaSaidaDia: number;
  diasConciliados: number;
  totalEntradas: number;
  totalSaidas: number;
  freteTotalPeriodo: number;
  fretePorPedido: number;
}

/**
 * Calcula médias unificadas baseadas na conciliação bancária.
 * Fonte única de verdade para todos os componentes.
 */
export function calcularMediasConciliadas(
  contasFluxo: ContaFluxo[],
  diasJanela: number = 90
): MediasConciliadas {
  const hoje = startOfDay(new Date());
  const inicio = subDays(hoje, diasJanela);

  const lancamentosPagos = contasFluxo.filter(c => {
    if (!c.pago) return false;
    try {
      const data = parseISO(c.dataVencimento);
      return isWithinInterval(data, { start: inicio, end: hoje });
    } catch {
      return false;
    }
  });

  let totalEntradas = 0;
  let totalSaidas = 0;
  let freteTotalPeriodo = 0;

  for (const lanc of lancamentosPagos) {
    const valor = parseValorFlexivel(lanc.valor);
    if (TIPOS_ENTRADA.includes(lanc.tipo)) {
      totalEntradas += valor;
    } else if (TIPOS_SAIDA.includes(lanc.tipo)) {
      totalSaidas += valor;
      // Detectar frete
      const desc = lanc.descricao || '';
      if (PATTERNS_FRETE.some(p => p.test(desc))) {
        freteTotalPeriodo += valor;
      }
    }
  }

  const diasComDados = new Set(lancamentosPagos.map(l => l.dataVencimento)).size;
  const diasParaMedia = Math.max(diasComDados, 30);

  // Estimar pedidos do período (entradas / ticket médio aprox)
  // Fallback: usar contagem de entradas tipo 'receber'
  const numEntradas = lancamentosPagos.filter(l => l.tipo === 'receber').length;
  const fretePorPedido = numEntradas > 0 ? freteTotalPeriodo / numEntradas : 0;

  return {
    mediaEntradaDia: totalEntradas / diasParaMedia,
    mediaSaidaDia: totalSaidas / diasParaMedia,
    diasConciliados: diasComDados,
    totalEntradas,
    totalSaidas,
    freteTotalPeriodo,
    fretePorPedido,
  };
}

/**
 * Calcula CMV Real completo com todos os custos variáveis
 */
export function calcularCMVReal(params: {
  receitaBruta: number;
  cmvProduto: number;
  ticketMedio: number;
  fretePorPedido?: number;
  overrides?: Partial<typeof CUSTOS_VARIAVEIS>;
}) {
  const { receitaBruta, cmvProduto, ticketMedio, fretePorPedido = 0, overrides = {} } = params;
  if (receitaBruta <= 0) return null;

  const cv = { ...CUSTOS_VARIAVEIS, ...overrides };
  const numPedidos = ticketMedio > 0 ? receitaBruta / ticketMedio : 0;

  const impostos = receitaBruta * cv.imposto;
  const devolucoesValor = receitaBruta * cv.devolucoes;
  const fulfillmentTotal = numPedidos * cv.fulfillment;
  const embalagemTotal = numPedidos * cv.embalagem;
  const freteTotal = numPedidos * fretePorPedido;

  const totalVariaveis = impostos + devolucoesValor + fulfillmentTotal + embalagemTotal + freteTotal;
  const cmvRealTotal = cmvProduto + totalVariaveis;
  const margemContribuicao = receitaBruta - cmvRealTotal;
  const margemPercentual = margemContribuicao / receitaBruta;

  return {
    receitaBruta,
    cmvProduto,
    impostos,
    devolucoesValor,
    fulfillmentTotal,
    embalagemTotal,
    freteTotal,
    totalVariaveis,
    cmvRealTotal,
    margemContribuicao,
    margemPercentual,
    numPedidos: Math.round(numPedidos),
  };
}
