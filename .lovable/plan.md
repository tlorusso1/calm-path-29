
# Evitar Duplicação de Despesas - Cartão de Crédito

## Problema
Quando você importa um extrato bancário que contém:
1. **Débito consolidado do cartão**: "BUSINESS 4004-0126" (valor total pago)
2. **Lançamentos individuais detalhados**: cada compra que compõe o cartão

Se ambos forem importados como despesas ("pagar"), o gasto fica duplicado.

## Solução Proposta

Criar um novo tipo de lançamento chamado **"cartao"** que representa o pagamento consolidado do cartão. Este tipo:
- Não entra no cálculo de despesas operacionais (já que os detalhados já entraram)
- Fica visível apenas para controle de fluxo de caixa
- Badge roxo com ícone 💳 para identificar facilmente

### Fluxo de Classificação

```text
Extrato Importado:
┌─────────────────────────────────────────────────────────────────┐
│ BUSINESS 4004-0126     -R$ 15.000,00  ← Marcar como 💳 CARTÃO  │
│ COMPRA IFOOD           -R$    120,00  ← Normal: 🔴 SAÍDA       │
│ COMPRA AMAZON          -R$    450,00  ← Normal: 🔴 SAÍDA       │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘

Resultado no Histórico:
┌─────────────────────────────────────────────────────────────────┐
│ 💳 CARTÃO  BUSINESS 4004-0126     R$ 15.000,00  (não soma DRE) │
│ 🔴 SAÍDA   IFOOD                  R$    120,00  (soma no DRE)  │
│ 🔴 SAÍDA   AMAZON                 R$    450,00  (soma no DRE)  │
└─────────────────────────────────────────────────────────────────┘
```

## Mudanças Técnicas

### 1. Arquivo: `src/types/focus-mode.ts`

Adicionar "cartao" ao tipo ContaFluxoTipo:

```typescript
// Linha 103
export type ContaFluxoTipo = 'pagar' | 'receber' | 'intercompany' | 'aplicacao' | 'resgate' | 'cartao';
```

### 2. Arquivo: `supabase/functions/extract-extrato/index.ts`

**Atualizar system prompt** (linha 28-33):
```typescript
// Adicionar na lista de classificação:
// - "cartao": pagamento consolidado de fatura de cartão de crédito (BUSINESS, VISA, MASTERCARD)
```

**Adicionar enum no tool** (linha 61-66):
```typescript
enum: ["pagar", "receber", "intercompany", "aplicacao", "resgate", "cartao"],
```

**Adicionar detecção automática** (após linha 169):
```typescript
// Detectar pagamento de cartão de crédito
if (/BUSINESS \d{4}-\d{4}|VISA \d{4}|MASTERCARD|FATURA CARTAO/i.test(desc)) {
  tipo = "cartao";
}
```

### 3. Arquivo: `src/components/financeiro/ContaItem.tsx`

Atualizar o `tipoConfig` para incluir cartão:

```typescript
const tipoConfig = {
  pagar: { emoji: '🔴', label: 'SAÍDA', next: 'receber' as ContaFluxoTipo, bg: 'bg-red-100', text: 'text-red-700' },
  receber: { emoji: '🟢', label: 'ENTRADA', next: 'intercompany' as ContaFluxoTipo, bg: 'bg-green-100', text: 'text-green-700' },
  intercompany: { emoji: '🔁', label: 'INTER', next: 'aplicacao' as ContaFluxoTipo, bg: 'bg-blue-100', text: 'text-blue-700' },
  aplicacao: { emoji: '📈', label: 'APLIC', next: 'resgate' as ContaFluxoTipo, bg: 'bg-purple-100', text: 'text-purple-700' },
  resgate: { emoji: '📉', label: 'RESG', next: 'cartao' as ContaFluxoTipo, bg: 'bg-orange-100', text: 'text-orange-700' },
  cartao: { emoji: '💳', label: 'CARTÃO', next: 'pagar' as ContaFluxoTipo, bg: 'bg-slate-100', text: 'text-slate-700' },
};
```

### 4. Arquivo: `src/components/financeiro/ContasFluxoSection.tsx`

Adicionar opção de filtro para "cartao":

```typescript
// Na seção de filtros (linha ~680)
<SelectItem value="cartao">💳 Cartão</SelectItem>
```

### 5. Arquivo: `src/components/financeiro/DRESection.tsx` (se existir)

Excluir lançamentos tipo "cartao" do cálculo de despesas (assim como já faz com intercompany/aplicacao/resgate).

## Comportamento Final

| Tipo | Impacto no DRE | Impacto no Caixa | Badge |
|------|----------------|------------------|-------|
| pagar | ✅ Despesa | ✅ Saída | 🔴 SAÍDA |
| receber | ✅ Receita | ✅ Entrada | 🟢 ENTRADA |
| intercompany | ❌ Neutro | ✅ Movimentação | 🔁 INTER |
| aplicacao | ❌ Neutro | ✅ Saída | 📈 APLIC |
| resgate | ❌ Neutro | ✅ Entrada | 📉 RESG |
| **cartao** | ❌ Neutro | ✅ Saída | 💳 CARTÃO |

## Alternativa Simplificada

Se você preferir não criar um novo tipo, pode simplesmente:
1. Excluir manualmente a linha "BUSINESS 4004-0126" antes de colar o extrato
2. Ou marcar como "intercompany" (que também não impacta DRE)

A vantagem do tipo "cartao" é ter clareza visual e documentação de que aquele débito é pagamento de fatura.
