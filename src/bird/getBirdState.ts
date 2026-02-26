import { FinancialState } from "../finance-core/getFinancialState"

export type BirdState = {
  state: "safe" | "attention" | "risk"
  runwayDays: number
  mainRisk: string
  decision: string
}

export function getBirdState(
  financial: FinancialState,
  burnRatePerDay: number
): BirdState {
  const runway =
    burnRatePerDay > 0
      ? financial.cashNow.value / burnRatePerDay
      : Infinity

  if (runway < 30) {
    return {
      state: "risk",
      runwayDays: Math.floor(runway),
      mainRisk: "Caixa insuficiente",
      decision: "Cortar custos ou aumentar vendas imediatamente",
    }
  }

  if (runway < 60) {
    return {
      state: "attention",
      runwayDays: Math.floor(runway),
      mainRisk: "Pressão de caixa",
      decision: "Evitar novos gastos e acompanhar diariamente",
    }
  }

  return {
    state: "safe",
    runwayDays: Math.floor(runway),
    mainRisk: "Nenhum crítico",
    decision: "Operação saudável, foco em eficiência",
  }
}
