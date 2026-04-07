## CMV Real + Unit Economics por SKU + Médias Consistentes

### 1. Modelo de Custos Variáveis (constantes em `types/focus-mode.ts`)

Criar constantes para os custos variáveis padrão:
```
CUSTO_VARIAVEL = {
  taxaCartao: 0.06,        // 6% do valor da venda
  imposto: 0.16,           // 16% do valor da venda
  fulfillment: 4.90,       // R$ por pedido
  devolucoes: 0.02,        // 2% do valor da venda
  embalagem: 5.00,         // R$ por envio
  // Frete: calculado via conciliação (soma Jadlog+Mandae - fretes pagos pelo cliente)
}
```

### 2. Card "Unit Economics por SKU" (novo componente)

**`src/components/financeiro/UnitEconomicsSKU.tsx`**

Para cada produto acabado (do Supply Chain):
- **Preço médio real** = Faturamento total ÷ Qtd vendida (via saídas do Supply)
- **CP (Custo Produto)** = Custo unitário do `precos-custo-default.ts`
- **Despesas variáveis por unidade:**
  - Meio de pagamento: 6% × preço médio
  - Imposto: 16% × preço médio
  - Fulfillment: R$ 4,90 (rateado se pedido tem múltiplos itens)
  - Devoluções: 2% × preço médio
  - Embalagem: R$ 5,00 (rateado)
  - Frete: Total pago (Jadlog+Mandae da conciliação) ÷ total pedidos
- **CMV Real** = CP + todas as despesas variáveis
- **Margem unitária** = Preço médio - CMV Real
- **Margem %** = Margem ÷ Preço médio

Tabela com colunas: SKU | Preço Médio | CP | Variáveis | CMV Real | Margem R$ | Margem %

### 3. Frete via conciliação bancária

- Identificar automaticamente lançamentos de Jadlog e Mandae no histórico conciliado
- Somar como "Custo de Frete Total"
- Dividir pelo total de pedidos do período = custo frete/pedido
- Nota: inclui frete pago pelo cliente (futuro: subtrair com planilha de fretes cobrados)

### 4. Médias unificadas

**Problema:** `EntradaMediaRealChart` e `FluxoCaixaDiarioChart` calculam médias independentemente.

**Solução:** Criar helper `calcularMediasConciliadas()` em `src/utils/financeiro/mediasCalculator.ts`:
- Fonte única: histórico conciliado (`contasFluxo` com `pago: true`)
- Retorna: `{ mediaEntradaDia, mediaSaidaDia, diasConciliados, totalEntradas, totalSaidas }`
- Ambos os componentes usam o mesmo helper

### 5. DRE atualizado

Na seção DRE, abaixo do CMV Produto (SUPPLY), adicionar:
- **(-) Despesas Variáveis**: impostos, taxas, fulfillment, devoluções, frete, embalagem
- **= CMV Real (Gerencial)**: CP + Despesas Variáveis
- **= Margem de Contribuição**: Receita - CMV Real

### Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | Constantes de custos variáveis |
| `src/utils/financeiro/mediasCalculator.ts` | Helper unificado de médias |
| `src/components/financeiro/UnitEconomicsSKU.tsx` | Novo card de margem por SKU |
| `src/components/financeiro/EntradaMediaRealChart.tsx` | Usar helper unificado |
| `src/components/financeiro/FluxoCaixaDiarioChart.tsx` | Usar helper unificado |
| `src/components/financeiro/DRESection.tsx` | CMV Real expandido com variáveis |
