import { FinanceiroStage, ContaFluxo, Fornecedor, MARGEM_OPERACIONAL, MODALIDADES_CAPITAL_GIRO } from '@/types/focus-mode';
import { addDays, parseISO, isAfter, isBefore, format, startOfDay } from 'date-fns';
import type { WeeklySnapshot } from '@/types/focus-mode';

/**
 * Verifica se uma conta é Capital de Giro (não impacta meta de faturamento)
 * 
 * Prioridade:
 * 1. Campo `natureza` explícito na conta (se definido)
 * 2. Modalidade do fornecedor atrelado (fallback automático)
 * 3. Se nenhum dos dois: considera despesa operacional
 */
export function isCapitalGiro(
  conta: ContaFluxo,
  fornecedores: Fornecedor[]
): boolean {
  // 1. Se natureza está explícita, usa ela
  if (conta.natureza === 'capitalGiro') return true;
  if (conta.natureza === 'operacional') return false;
  
  // 2. Fallback: verifica modalidade do fornecedor
  if (!conta.fornecedorId) return false;
  
  const fornecedor = fornecedores.find(f => f.id === conta.fornecedorId);
  if (!fornecedor) return false;
  
  return MODALIDADES_CAPITAL_GIRO.includes(fornecedor.modalidade);
}

export interface FluxoCaixaDataPoint {
  semana: string;
  saldo: number;
  cor: 'verde' | 'amarelo' | 'vermelho';
}

// Parser flexível que aceita formato brasileiro (1.234,56) e americano (1234.56)
export function parseValorFlexivel(valor: string): number {
  if (!valor || valor === '') return 0;
  
  let str = String(valor).trim();
  str = str.replace(/[R$\s]/g, '');
  
  // Detectar formato pelo último separador
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Brasileiro: 1.234,56
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Americano: 1,234.56 ou número puro
    str = str.replace(/,/g, '');
  }
  // Senão: número puro
  
  return parseFloat(str) || 0;
}

// Re-export parseCurrency para compatibilidade
export const parseCurrency = parseValorFlexivel;

export interface FluxoCaixaResult {
  dados: FluxoCaixaDataPoint[];
  modoProjecao: boolean;
  numContas: number;
  fonteHistorico: boolean;
  semanasHistorico: number;
}

/**
 * Calcula o fluxo de caixa híbrido:
 * - Se não tem contas detalhadas: usa projeção baseada em médias (ou histórico se disponível)
 * - Se tem contas detalhadas: usa datas reais de vencimento
 */
export function calcularFluxoCaixa(
  data: FinanceiroStage,
  historico: WeeklySnapshot[] = []
): FluxoCaixaResult {
  const contasAtivas = (data.contasFluxo || []).filter(c => !c.pago);
  const temContasDetalhadas = contasAtivas.length > 0;

  if (temContasDetalhadas) {
    return {
      dados: calcularFluxoPreciso(data, contasAtivas),
      modoProjecao: false,
      numContas: contasAtivas.length,
      fonteHistorico: false,
      semanasHistorico: 0,
    };
  } else {
    const { dados, usouHistorico, semanasUsadas } = calcularFluxoProjecaoComHistorico(data, historico);
    return {
      dados,
      modoProjecao: true,
      numContas: 0,
      fonteHistorico: usouHistorico,
      semanasHistorico: semanasUsadas,
    };
  }
}

/**
 * Modo Projeção com suporte a histórico:
 * - Se tem histórico suficiente (2+ semanas): usa média real
 * - Senão: estima baseado em inputs manuais
 */
function calcularFluxoProjecaoComHistorico(
  data: FinanceiroStage,
  historico: WeeklySnapshot[]
): { dados: FluxoCaixaDataPoint[]; usouHistorico: boolean; semanasUsadas: number } {
  const caixa = parseValorFlexivel(data.caixaAtual || '');
  const caixaMinimo = parseValorFlexivel(data.caixaMinimo || '');
  
  // Tentar usar histórico (últimas 4 semanas com resultado válido)
  const semanasValidas = historico
    .filter(s => s.resultado_mes != null && s.resultado_mes !== 0)
    .slice(0, 4);
  
  let resultadoSemanal: number;
  let usouHistorico = false;
  let semanasUsadas = 0;
  
  if (semanasValidas.length >= 2) {
    // MODO HISTÓRICO: usa média real das últimas semanas
    usouHistorico = true;
    semanasUsadas = semanasValidas.length;
    
    // resultado_mes é o resultado mensal, dividir por 4 para semanal
    const mediaResultadoMensal = semanasValidas.reduce((acc, s) => 
      acc + (s.resultado_mes || 0), 0) / semanasValidas.length;
    
    resultadoSemanal = mediaResultadoMensal / 4;
  } else {
    // MODO ESTIMADO: usa inputs manuais (comportamento original)
    const faturamentoEsperado = parseCurrency(data.faturamentoEsperado30d || '') || parseCurrency(data.faturamentoMes || '');
    const entradasMensais = faturamentoEsperado * MARGEM_OPERACIONAL;
    
    const custoFixo = parseCurrency(data.custoFixoMensal || '');
    const marketingEstrutural = parseCurrency(data.marketingEstrutural || data.marketingBase || '');
    const adsBase = parseCurrency(data.adsBase || '');
    const saidasMensais = custoFixo + marketingEstrutural + adsBase;
    
    resultadoSemanal = (entradasMensais - saidasMensais) / 4;
  }
  
  // Construir projeção
  const dados: FluxoCaixaDataPoint[] = [];
  
  for (let i = 0; i <= 4; i++) {
    const saldo = caixa + (resultadoSemanal * i);
    dados.push({
      semana: i === 0 ? 'Hoje' : `S${i}`,
      saldo: Math.round(saldo),
      cor: getCor(saldo, caixaMinimo),
    });
  }
  
  return { dados, usouHistorico, semanasUsadas };
}

/**
 * Modo Projeção simples (para compatibilidade)
 */
function calcularFluxoProjecao(data: FinanceiroStage): FluxoCaixaDataPoint[] {
  const { dados } = calcularFluxoProjecaoComHistorico(data, []);
  return dados;
}

/**
 * Modo Preciso: Usa contas a pagar/receber com datas reais
 */
function calcularFluxoPreciso(data: FinanceiroStage, contas: ContaFluxo[]): FluxoCaixaDataPoint[] {
  const caixa = parseCurrency(data.caixaAtual || '');
  const caixaMinimo = parseCurrency(data.caixaMinimo || '');
  
  const hoje = startOfDay(new Date());
  
  // Definir pontos semanais
  const semanas = [
    { semana: 'Hoje', dataInicio: hoje, dataFim: hoje },
    { semana: 'S1', dataInicio: addDays(hoje, 1), dataFim: addDays(hoje, 7) },
    { semana: 'S2', dataInicio: addDays(hoje, 8), dataFim: addDays(hoje, 14) },
    { semana: 'S3', dataInicio: addDays(hoje, 15), dataFim: addDays(hoje, 21) },
    { semana: 'S4', dataInicio: addDays(hoje, 22), dataFim: addDays(hoje, 30) },
  ];
  
  let saldoAcumulado = caixa;
  const dados: FluxoCaixaDataPoint[] = [];
  
  for (const { semana, dataInicio, dataFim } of semanas) {
    // Calcular movimentação do período
    const movimentacao = contas
      .filter(c => {
        const dataVenc = parseISO(c.dataVencimento);
        if (semana === 'Hoje') {
          return format(dataVenc, 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd');
        }
        return (isAfter(dataVenc, dataInicio) || format(dataVenc, 'yyyy-MM-dd') === format(dataInicio, 'yyyy-MM-dd')) 
            && (isBefore(dataVenc, dataFim) || format(dataVenc, 'yyyy-MM-dd') === format(dataFim, 'yyyy-MM-dd'));
      })
      .reduce((acc, c) => {
        const valor = parseCurrency(c.valor);
        return acc + (c.tipo === 'receber' ? valor : -valor);
      }, 0);
    
    // Atualizar saldo (exceto "Hoje" que é o saldo atual)
    if (semana !== 'Hoje') {
      saldoAcumulado += movimentacao;
    }
    
    dados.push({
      semana,
      saldo: Math.round(saldoAcumulado),
      cor: getCor(saldoAcumulado, caixaMinimo),
    });
  }
  
  return dados;
}

/**
 * Determina a cor baseada no saldo vs caixa mínimo
 */
function getCor(saldo: number, caixaMinimo: number): 'verde' | 'amarelo' | 'vermelho' {
  if (saldo <= 0) return 'vermelho';
  if (saldo < caixaMinimo) return 'amarelo';
  return 'verde';
}
