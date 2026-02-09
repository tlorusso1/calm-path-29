
# Melhorar Match da Conciliacao e Visibilidade dos Resultados

## Problema 1: Contas de Folha nao conciliam automaticamente

As contas tipo "Folha: Gabrielle - CLT" com vencimento 06/02 tem 3 dias de atraso. O match exato exige data +/- 2 dias, entao falha. O match por descricao exige +/- 5 dias E 50% de similaridade de tokens -- "SISPAG GABRIELLE" vs "Folha: Gabrielle - CLT" pode nao atingir 50% porque os tokens sao diferentes (SISPAG vs Folha, CLT vs nada no extrato).

### Correcoes no match

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**

1. **Aumentar tolerancia de data no match exato** (funcao `encontrarMatch`, linha 91):
   - De `pagar: 2 dias` para `pagar: 5 dias` -- contas a pagar frequentemente sao pagas com atraso
   - Manter `receber: 1 dia`

2. **Reduzir threshold de similaridade** (funcao `encontrarMatchPorDescricao`, linha 161):
   - De `0.5` (50%) para `0.3` (30%) -- porque descricoes de extrato sao muito abreviadas vs descricoes manuais
   - Aumentar tolerancia de data de 5 para 7 dias

3. **Adicionar match por nome proprio**: Nova logica que extrai nomes proprios (palavras com 4+ letras, capitalizadas) e tenta match. Se o extrato diz "SISPAG GABRIELLE" e a conta diz "Folha: Gabrielle", o nome "GABRIELLE" em comum ja seria suficiente para vincular.

## Problema 2: Onde ver o resultado da conciliacao?

Atualmente a conciliacao faz 3 coisas:
- Marca contas existentes como pagas (badge "Conciliado auto")
- Adiciona lancamentos novos como historico pago
- Gera um Snapshot Mensal (total entradas/saidas do mes)

O usuario pode ver os resultados em:
- **Contas a Pagar/Receber**: contas baixadas aparecem no historico (colapsavel) com badge "Conciliado auto"
- **Snapshots Mensais**: na secao de Analise, mostra totais conciliados por mes
- **DRE**: lancamentos pagos alimentam o demonstrativo de resultado

Nao ha mudanca de codigo necessaria aqui -- ja funciona. Mas podemos melhorar a visibilidade:

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**

4. **Melhorar o resumo pos-conciliacao**: Apos conciliar, mostrar um toast mais detalhado com:
   - Quantas contas foram baixadas automaticamente
   - Quantos lancamentos novos adicionados ao historico
   - Link rapido para ver o Snapshot Mensal atualizado

## Resumo tecnico

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Aumentar tolerancia de data para pagar (2->5 dias), reduzir threshold similaridade (50%->30%), adicionar match por nome proprio, melhorar toast pos-conciliacao |
