import { FinancialValue } from "./types"

export type FinancialState = {
  cashNow: FinancialValue
  accountsPayable: FinancialValue
  accountsReceivable: FinancialValue
  projectedCash30d: FinancialValue
}

export function getFinancialState(data: {
  bankBalance: number
  payable: number
  receivable: number
  expectedRevenue30d: number
}): FinancialState {
  return {
    cashNow: {
      value: data.bankBalance,
      nature: "real",
      confidence: "high",
      source: "bank",
    },
    accountsPayable: {
      value: data.payable,
      nature: "real",
      confidence: "high",
      source: "invoice",
    },
    accountsReceivable: {
      value: data.receivable,
      nature: "estimated",
      confidence: "medium",
      source: "history",
    },
    projectedCash30d: {
      value:
        data.bankBalance +
        data.receivable -
        data.payable +
        data.expectedRevenue30d,
      nature: "estimated",
      confidence: "medium",
      source: "inference",
    },
  }
}
