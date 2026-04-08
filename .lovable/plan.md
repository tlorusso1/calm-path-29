

## Ajustes: Taxa Cartão, Intercompany Cross-Conta, Preço Médio no Supply, Faturamento por Canal Automático

### 1. Remover taxa de cartão do CMV Real

**Problema**: O extrato bancário já mostra o valor líquido (após taxa do gateway). Incluir 6% de taxa de cartão como custo variável é contar duas vezes.

**Mudança**: Em `mediasCalculator.ts` e `UnitEconomicsSKU.tsx`, remover `taxaCartao` dos custos variáveis. Manter apenas: imposto (16%), fulfillment (R$4,90), devoluções (2%), embalagem (R$5,00), frete.

Adicionar um campo opcional `receitaBruta` (faturamento bruto real do canal) para calcular a diferença entre bruto e líquido como "taxa de gateway" se o usuário quiser no futuro.

### 2. Intercompany cross-conta (pós-processamento)

**Problema atual**: A detecção de intercompany ocorre apenas dentro de um mesmo extrato (edge function). Quando importo extrato da conta A e depois da conta B, os pares não são detectados.

**Mudança**: Adicionar lógica de detecção intercompany **no front-end**, no `ConciliacaoSection.tsx`, rodando sobre todo o histórico de `contasFluxo`:
- Ao importar um novo extrato, varrer todas as contas existentes
- Regra: mesmo valor absoluto (±0.01), datas iguais ou ±1 dia, contas de origem diferentes, um é entrada e outro é saída
- Marcar ambos como `intercompany` automaticamente
- Mostrar toast com quantos pares detectados
- Permitir desfazer (botão na UI)

### 3. Card "Preço Médio por SKU" no Supply Chain

**Novo componente**: `src/components/PrecoMedioSKUCard.tsx`

Tabela com dados vindos de `calcularDadosPorSKU()`:
- SKU | Qtd Vendida (90d) | Receita Total | Preço Médio Venda | Custo Unitário | Markup
- Ordenado por receita total

Adicionar na aba "Análise" do `SupplyChainMode.tsx`.

### 4. Faturamento por Canal automatizado (das movimentações)

**Problema**: `FaturamentoCanaisCard` usa inputs manuais. O usuário quer que venha das movimentações de estoque automaticamente.

**Mudança**: Usar os dados de saídas do Supply Chain. As movimentações já têm campo para origem/canal (ou pode-se inferir do tipo de saída). 

**Abordagem**: Como as movimentações não têm campo "canal" explícito, criar mapeamento baseado no campo `lote` ou `destino` das saídas, ou adicionar um campo `canal` nas movimentações. Na prática, o mais viável:
- Calcular faturamento total das movimentações (já existe em `calcularReceitaBruta`)
- Permitir quebra por canal se houver informação disponível
- Se não houver canal nas movimentações, manter o input manual mas pré-preencher o total como referência

---

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/financeiro/mediasCalculator.ts` | Remover `taxaCartao` dos custos variáveis |
| `src/components/financeiro/UnitEconomicsSKU.tsx` | Remover linha de meio de pagamento |
| `src/components/financeiro/CMVGerencialCard.tsx` | Remover taxa cartão do breakdown |
| `src/components/financeiro/ConciliacaoSection.tsx` | Lógica intercompany cross-conta pós-importação |
| `src/components/PrecoMedioSKUCard.tsx` | Novo card de preço médio por SKU |
| `src/components/modes/SupplyChainMode.tsx` | Integrar card de preço médio na aba Análise |
| `src/components/financeiro/FaturamentoCanaisCard.tsx` | Receber dados das movimentações como fallback automático |
| `src/components/modes/FinanceiroMode.tsx` | Passar dados de movimentações ao FaturamentoCanaisCard |

