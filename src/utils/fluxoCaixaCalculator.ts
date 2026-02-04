import { FinanceiroStage, ContaFluxo, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseCurrency } from './modeStatusCalculator';
import { addDays, parseISO, isAfter, isBefore, format, startOfDay } from 'date-fns';

export interface FluxoCaixaDataPoint {
  semana: string;
  saldo: number;
  cor: 'verde' | 'amarelo' | 'vermelho';
}

export interface FluxoCaixaResult {
  dados: FluxoCaixaDataPoint[];
  modoProjecao: boolean;
  numContas: number;
}

/**
 * Calcula o fluxo de caixa híbrido:
 * - Se não tem contas detalhadas: usa projeção baseada em médias
 * - Se tem contas detalhadas: usa datas reais de vencimento
 */
export function calcularFluxoCaixa(data: FinanceiroStage): FluxoCaixaResult {
  const contasAtivas = (data.contasFluxo || []).filter(c => !c.pago);
  const temContasDetalhadas = contasAtivas.length > 0;

  if (temContasDetalhadas) {
    return {
      dados: calcularFluxoPreciso(data, contasAtivas),
      modoProjecao: false,
      numContas: contasAtivas.length,
    };
  } else {
    return {
      dados: calcularFluxoProjecao(data),
      modoProjecao: true,
      numContas: 0,
    };
  }
}

/**
 * Modo Projeção: Estima baseado em médias semanais
 */
function calcularFluxoProjecao(data: FinanceiroStage): FluxoCaixaDataPoint[] {
  const caixa = parseCurrency(data.caixaAtual || '');
  const caixaMinimo = parseCurrency(data.caixaMinimo || '');
  
  // Entradas: Faturamento esperado × Margem / 4 semanas
  const faturamentoEsperado = parseCurrency(data.faturamentoEsperado30d || '') || parseCurrency(data.faturamentoMes || '');
  const entradasMensais = faturamentoEsperado * MARGEM_OPERACIONAL;
  
  // Saídas: Custo fixo + Marketing estrutural + Ads base / 4 semanas
  const custoFixo = parseCurrency(data.custoFixoMensal || '');
  const marketingEstrutural = parseCurrency(data.marketingEstrutural || data.marketingBase || '');
  const adsBase = parseCurrency(data.adsBase || '');
  const saidasMensais = custoFixo + marketingEstrutural + adsBase;
  
  // Resultado semanal
  const resultadoSemanal = (entradasMensais - saidasMensais) / 4;
  
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
