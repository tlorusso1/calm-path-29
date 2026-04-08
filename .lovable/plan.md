

## Automatizar Faturamento por Canal: Conciliação + Movimentações

### Objetivo
Substituir inputs manuais por dados reais, usando duas fontes complementares:
- **Conciliação bancária** (contasFluxo `tipo === 'receber'`): faturamento líquido real por canal, classificado via `contaOrigem`
- **Movimentações de estoque** (saídas): faturamento bruto por canal, com novo campo `canal` na importação

### Mudanças

#### A. Adicionar campo `canal` nas movimentações (`src/types/focus-mode.ts`)
- Novo campo opcional em `MovimentacaoEstoque`: `canal?: 'b2b' | 'ecomNuvem' | 'ecomShopee' | 'ecomAssinaturas'`

#### B. Seletor de canal na importação de movimentações (`SupplyChainMode.tsx`)
- Na aba "Mov.", adicionar um `Select` para o usuário escolher o canal antes de importar
- O canal selecionado é aplicado a todas as movimentações daquela importação

#### C. Classificação automática via contaOrigem (`FaturamentoCanaisCard.tsx`)
Regras de mapeamento das `contasFluxo` (entradas, `tipo === 'receber'`, mês atual):
| contaOrigem | Canal |
|---|---|
| `ITAU - NICE FOODS` (sem "ECOM") | B2B |
| `ITAU - NICE ECOM`, `Pagar.me`, `Nuvemshop` | ECOM-NUVEM |
| `MERCADO LIVRE` | ECOM-SHOPEE |
| `Asaas` | ECOM-ASSINATURAS |

#### D. Refatorar `FaturamentoCanaisCard` para modo automático
- Receber `contasFluxo` e `movimentacoes` como props (além dos inputs manuais existentes)
- Calcular valores automáticos por canal a partir das duas fontes
- Mostrar **duas linhas por canal**: "Líquido (banco)" e "Bruto (mov.)" 
- Manter inputs manuais como override opcional (se preenchido, usa manual; senão, automático)
- Projeção mensal baseada nos dados automáticos quando disponíveis

#### E. Passar dados no `FinanceiroMode.tsx`
- Passar `contasFluxo` e `supplyExports.movimentacoes` para o `FaturamentoCanaisCard`

### Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | `canal` em MovimentacaoEstoque |
| `src/components/modes/SupplyChainMode.tsx` | Select de canal na importação de movimentações |
| `src/utils/movimentacoesParser.ts` | Aceitar canal como parâmetro no parse |
| `src/components/financeiro/FaturamentoCanaisCard.tsx` | Lógica automática via contaOrigem + movimentações, dual view |
| `src/components/modes/FinanceiroMode.tsx` | Passar contasFluxo e movimentações ao card |

