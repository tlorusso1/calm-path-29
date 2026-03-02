
# Fix: Saída/sem não atualiza + Build Errors

## 1. Corrigir Build Errors (imports quebrados)

**`src/bird/getBirdState.ts` (linha 1)**
- Trocar `../finance-core/getFinancialState` por `../finance-core/src/finance-core/getFinancialState`

**`src/finance-core/src/finance-core/getFinancialState.ts` (linha 1)**
- Trocar `./types` por `../../types`

## 2. Saída/sem não atualiza automaticamente

**`src/components/modes/SupplyChainMode.tsx`**

No `handleColarLista`:
- Trocar matching de nomes de `toLowerCase().trim()` para `normalizarNomeProduto()` (importado de `movimentacoesParser`)
- Apos o loop de upsert dos itens, verificar se `data.movimentacoes` tem dados
- Se sim, chamar `calcularDemandaSemanalPorItem(data.movimentacoes)` e aplicar a demanda nos itens recem-criados/atualizados
- Passar resultado final via `onUpdateSupplyChainData({ itens: itensFinais })`

Isso garante que ao colar estoque, se ja existem movimentacoes importadas, a coluna "saida/sem" e preenchida automaticamente.
