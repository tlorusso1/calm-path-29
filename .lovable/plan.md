

## Mostrar condição de pagamento na compra

### Problema
1. A condição de pagamento extraída pelo OCR aparece no header do orçamento, mas pode não ter sido detectada
2. Quando marca como "Comprado", não há campo para registrar/editar a condição de pagamento real

### Solução

**`src/types/focus-mode.ts`**
- Adicionar `condicaoPagamentoReal?: string` ao `OrcamentoItem`

**`src/components/OrcamentosTab.tsx`**
1. Na seção do header do orçamento (linha ~299), tornar a condição de pagamento editável (Input em vez de texto estático), para que o usuário possa preencher mesmo que a IA não tenha extraído
2. Na seção "Valores reais pagos" (linhas 370-426), adicionar um campo de texto "Cond. pgto:" para registrar a condição de pagamento efetiva da compra (ex: "à vista", "30/60 DDL")

### Resultado
- Condição de pagamento sempre visível e editável no orçamento
- Ao marcar como comprado, pode registrar a condição real usada na negociação

