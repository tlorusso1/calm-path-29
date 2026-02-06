
# ✅ Implementado: Evitar Duplicação de Despesas - Cartão de Crédito

## Resumo
Novo tipo de lançamento `cartao` para pagamentos consolidados de fatura. Não impacta DRE (despesas detalhadas já entraram individualmente).

## Mudanças Realizadas

1. **`src/types/focus-mode.ts`** - Adicionado `'cartao'` ao tipo `ContaFluxoTipo`
2. **`supabase/functions/extract-extrato/index.ts`** - Detecção automática de `BUSINESS \d{4}-\d{4}` como cartão
3. **`src/components/financeiro/ContaItem.tsx`** - Badge 💳 CARTÃO com cycling
4. **`src/components/financeiro/ContasFluxoSection.tsx`** - Filtro para tipo cartão
5. **`src/components/financeiro/DRESection.tsx`** - Excluído do cálculo de despesas
6. **`src/components/financeiro/ConciliacaoSection.tsx`** - Labels atualizados

## Comportamento

| Tipo | Impacto DRE | Impacto Caixa | Badge |
|------|-------------|---------------|-------|
| pagar | ✅ Despesa | ✅ Saída | 🔴 SAÍDA |
| receber | ✅ Receita | ✅ Entrada | 🟢 ENTRADA |
| intercompany | ❌ Neutro | ✅ Mov. | 🔁 INTER |
| aplicacao | ❌ Neutro | ✅ Saída | 📈 APLIC |
| resgate | ❌ Neutro | ✅ Entrada | 📉 RESG |
| **cartao** | ❌ Neutro | ✅ Saída | 💳 CARTÃO |
