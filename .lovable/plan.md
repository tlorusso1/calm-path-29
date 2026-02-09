
# Plano: Corrigir Parsing de Valores e Melhorar Conciliacao

## Problema 1: Valor "11.178,47" vira "R$ 11,18"

### Causa raiz

A funcao `formatCurrency` em `ContasFluxoSection.tsx` (linha 367-369) usa logica simplista:
```
val.replace(/[^\d,.-]/g, '').replace(',', '.')
```

Para "11.178,47", isso produz "11.178.47", e `parseFloat("11.178.47")` = 11.178.

A funcao `parseValorFlexivel` em `fluxoCaixaCalculator.ts` ja resolve isso corretamente (detecta se virgula ou ponto e o ultimo separador). Basta substituir.

### Correcao

**Arquivo: `src/components/financeiro/ContasFluxoSection.tsx`**
- Substituir a funcao local `formatCurrency` (linha 367-370) para usar `parseValorFlexivel` em vez de parsing manual:
```
const formatCurrency = (val: string): string => {
  const num = parseValorFlexivel(val);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
```

**Arquivo: `src/components/financeiro/ContaItem.tsx`**
- Verificar se `formatCurrency` passada como prop usa a mesma logica (sim, vem do mesmo lugar). A correcao no ContasFluxoSection resolve automaticamente.

---

## Problema 2: Conciliacao nao deu baixa automatica em contas abertas

### Causa raiz

A funcao `encontrarMatch` (linha 55-87 de `ConciliacaoSection.tsx`) filtra por `conta.tipo !== lancamento.tipo`. Ou seja, se o extrato classifica o lancamento como tipo `pagar` e a conta existente tambem e `pagar`, o match funciona. Porem, os pagamentos no extrato podem vir com tipo diferente do esperado (ex: "cartao" vs "pagar").

Alem disso, o match exige que o tipo do lancamento do extrato seja exatamente igual ao tipo da conta aberta. Para saidas, devemos ampliar: se o lancamento e uma saida (pagar/cartao), tentar match com contas a pagar abertas independente do subtipo.

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**
- Na funcao `encontrarMatch`, relaxar o filtro de tipo para saidas: se o lancamento e `pagar` ou `cartao`, fazer match com contas `pagar` ou `cartao` (ambas sao saidas)
- Adicionar tolerancia de tipo para saidas

---

## Problema 3: Nao aparece label "Conciliado automaticamente"

### Causa raiz

Nenhum componente exibe essa informacao. O campo `conciliado: true` e `lancamentoConciliadoId` sao salvos na conta, mas o `ContaItem.tsx` so mostra um badge "conc" pequeno no historico (linha 170-171) e nao diferencia entre conciliacao manual e automatica (baixa de conta existente).

### Correcao

**Arquivo: `src/components/financeiro/ContaItem.tsx`**
- Quando `conta.conciliado === true` E `conta.lancamentoConciliadoId` existe, mostrar badge "Conciliado auto" em azul nas contas marcadas como pagas
- Tornar o badge mais visivel (nao so no historico, mas tambem logo apos a baixa)

---

## Problema 4: Nao da opcao de conciliar manualmente com contas abertas

### Causa raiz

No painel de revisao (`ReviewItem`), nao existe nenhum mecanismo para o usuario vincular um lancamento do extrato a uma conta aberta existente. O usuario so pode adicionar como novo ou ignorar.

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**
- Adicionar no `ReviewItem` um botao "Vincular a conta aberta" que mostra uma lista filtrada de contas nao pagas com valor similar (tolerancia 30%) para o usuario selecionar
- Ao vincular, marcar a conta como paga e conciliada (mesmo fluxo do match automatico)

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ContasFluxoSection.tsx` | Corrigir `formatCurrency` para usar `parseValorFlexivel` |
| `src/components/financeiro/ConciliacaoSection.tsx` | Relaxar tipo no match de saidas + adicionar opcao "Vincular a conta aberta" no ReviewItem |
| `src/components/financeiro/ContaItem.tsx` | Adicionar badge "Conciliado auto" visivel quando `lancamentoConciliadoId` existe |
