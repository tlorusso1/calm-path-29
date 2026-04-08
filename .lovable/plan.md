
## O que encontrei

- `Proj 30d` e `Real 4sem` vêm do Supply, não do banco.
- `Proj 30d` é calculado pela média semanal das saídas com preço de venda das movimentações dos últimos até 90 dias e depois extrapolado para 30 dias (`30/7`).
- `Real 4sem` é a soma das últimas 4 semanas reais do breakdown semanal, ou seja, cerca de 28 dias.
- Então sim: o projetado usa uma janela móvel de até 90d e por isso fica mais “suavizado” que o `Real 4sem`.

- Os impostos foram puxados do extrato, sim. Encontrei no histórico lançamentos como:
  - `PAGAMENTOS TRIB COD BARRAS SIMPLES NACIONAL ...`
  - `PAGAMENTOS TRIB COD BARRAS DARF ...`

- O problema é de classificação:
  1. na conciliação, o matcher está pegando o fornecedor genérico `Pagamento`;
  2. isso grava categoria `Material de Uso e Consumo`;
  3. a regra que foi adicionada no DRE só roda quando o lançamento está sem categoria, então ela não corrige esses casos já salvos errado;
  4. além disso, a regra atual de `DARF` só pega quando vem `DARF + INSS`, mas seus extratos vêm só como `DARF`.

## Plano

1. Deixar o Forecast explícito
   - Renomear os labels para:
     - `Proj 30d (média móvel até 90d)`
     - `Real últimas 4 semanas (~28d)`
   - Adicionar texto curto dizendo que ambos usam movimentações de estoque.

2. Corrigir a classificação na entrada
   - Ajustar `matchFornecedor` para priorizar o match mais específico/longo.
   - Impedir que nomes genéricos como `Pagamento` ganhem de descrições tributárias mais específicas.

3. Corrigir o DRE para o histórico já importado
   - Criar um override no DRE para descrições de tributos quando a categoria atual for genérica/errada.
   - Ex.: se a descrição tiver `SIMPLES NACIONAL` e a categoria estiver `Material de Uso e Consumo`, forçar `Simples Nacional (DAS)` na leitura do DRE.
   - Isso corrige os meses já importados sem precisar reimportar.

4. Tratar DARF com segurança
   - `SIMPLES NACIONAL` vai para `DEDUÇÕES`.
   - `FGTS/INSS` vão para `DESPESAS DE PESSOAL`.
   - `DARF` genérico sem complemento não será jogado automaticamente em `DEDUÇÕES`; ficará sob regra explícita e auditável para não distorcer o DRE.

## Arquivos a ajustar

- `src/utils/supplyCalculator.ts`
- `src/components/financeiro/ForecastSupplyCard.tsx`
- `src/utils/fornecedoresParser.ts`
- `src/components/financeiro/ConciliacaoSection.tsx`
- `src/components/financeiro/DRESection.tsx`

## Detalhe técnico

- Forecast atual:
  - `Proj 30d = (receita total da janela / semanas da janela) * (30/7)`
  - `Real 4sem = soma das 4 semanas mais recentes do breakdown`
- Bug dos impostos:
  - eles existem no histórico;
  - hoje estão com categoria errada (`Material de Uso e Consumo`) por match indevido com fornecedor genérico;
  - por isso “somem” de `DEDUÇÕES`.
