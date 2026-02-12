
# Movimentacoes de Estoque + CMV Correto (Custo Real, nao Preco de Venda)

## Status: ✅ IMPLEMENTADO

## Resumo

Importacao de CSVs de entradas e saidas de estoque no modulo Supply Chain. A partir das saidas, calcula automaticamente a demanda semanal de cada produto. O CMV para o DRE e calculado como **quantidade saida x preco de custo unitario** (da tabela de custos ja existente), e NAO pelo ValorSaida do CSV (que e preco de venda).

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/types/focus-mode.ts` | Adicionado `MovimentacaoEstoque`, campos em `SupplyChainStage` e `SupplyExports` |
| `src/data/precos-custo-default.ts` | Adicionado patterns faltantes (Milk+ Proteico, Levedura 100g, Quatro Queijos) |
| `src/utils/movimentacoesParser.ts` | **NOVO** - `parsearMovimentacoes`, `calcularDemandaSemanalPorItem`, `calcularCMVPorSaidas` |
| `src/utils/supplyCalculator.ts` | `calculateSupplyExports` agora inclui `cmvMensal` |
| `src/components/modes/SupplyChainMode.tsx` | Nova aba "Movimentacoes" + card resumo CMV na visao executiva |
| `src/components/financeiro/DRESection.tsx` | Usa CMV do Supply quando disponivel (badge SUPPLY) |
| `src/components/modes/FinanceiroMode.tsx` | Passa `cmvSupply` para DRESection |
| `src/components/ModeContent.tsx` | Passa `supplyExports` para FinanceiroMode |
| `src/pages/Index.tsx` | Passa `supplyExports` para ModeContent |
