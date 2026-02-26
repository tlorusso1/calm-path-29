export type FinancialValue = {
  value: number
  nature: "real" | "estimated"
  confidence: "high" | "medium" | "low"
  source: "bank" | "invoice" | "history" | "inference"
}
