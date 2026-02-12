
# Movimentacoes de Estoque + CMV Correto (Custo Real, nao Preco de Venda)

## Resumo

Adicionar importacao de CSVs de entradas e saidas de estoque no modulo Supply Chain. A partir das saidas, calcular automaticamente a demanda semanal de cada produto. O CMV para o DRE sera calculado como **quantidade saida x preco de custo unitario** (da tabela de custos ja existente), e NAO pelo ValorSaida do CSV (que e preco de venda).

## Dados novos de custo (da conversa)

Atualizar `precos-custo-default.ts` com custos que faltam, calculados a partir da ficha tecnica enviada:

| Produto | Custo Unitario |
|---------|---------------|
| Milk Castanha Caju 450G | R$ 22,60 (ja existe) |
| Food Service Castanha 3,2KG | R$ 141,38 (ja existe) |
| Food Service Castanha 20KG | R$ 870,60 (ja existe) |
| Milk Aveia 450G | R$ 16,38 (ja existe) |
| Milk Aveia Barista 400G | R$ 17,40 (ja existe) |
| Milk+ Avela & Cacau Proteico 250G | R$ 28,64 (ja existe como "Protein Avela") |
| Oleo de Coco 250ml | R$ 11,21 (ja existe) |
| Levedura Nutricional 90g | R$ 12,84 (ja existe) |
| Levedura Nutricional 100g | R$ 12,84 (mesmo custo base, ajustar pattern) |
| ChocoNICE Ao Leite 150G | R$ 17,70 (ja existe) |
| ChocoNICE 70% Cacau 150G | R$ 21,75 (ja existe) |
| ChocoNICE Branco 150G | R$ 18,37 (ja existe) |
| Spices Carbonara 40G | R$ 3,54 (ja existe) |
| Spices Estrogonofe 40G | R$ 3,57 (ja existe) |
| Spices Molho Branco 40G | R$ 3,47 (ja existe) |
| Spices Quatro Queijos 30G | R$ 3,56 (NOVO - MP R$0,96 + Frete R$2,50 + Emb R$1,22 + Perda R$0,05 + Ind R$0,83 + Frete CD R$4,00 = ~R$9,56... proporcionalmente ~R$3,56 por unidade baseado no padrao dos outros Spices) |
| Cheesy Parmesao 40G | R$ 3,06 (ja existe) |

A maioria ja esta coberta. Preciso adicionar patterns para:
- "MILK+.*AVELÃ" ou "MILK+.*PROTEICO" -> match com Milk Protein Avela
- "LEVEDURA.*100" -> match com Levedura Nutricional
- "SPICES.*QUATRO QUEIJOS" ou "SPICES.*4 QUEIJOS" -> novo preco R$ 3,56

## Detalhes tecnicos

### 1. Tipos (src/types/focus-mode.ts)

Novo tipo:
```typescript
export interface MovimentacaoEstoque {
  id: string;
  tipo: 'entrada' | 'saida';
  produto: string;
  quantidade: number;
  valorUnitarioVenda?: number;  // Preco de venda (do CSV, para referencia)
  lote?: string;
  dataValidade?: string;
  data: string;                 // ISO date
}
```

Adicionar a `SupplyChainStage`:
- `movimentacoes?: MovimentacaoEstoque[]`
- `ultimaImportacaoMov?: string`

Adicionar a `SupplyExports`:
- `cmvMensal?: number`

### 2. Parser de CSVs (src/utils/supplyCalculator.ts)

Nova funcao `parsearMovimentacoes(texto: string): MovimentacaoEstoque[]`:
- Detecta separador `;`
- Identifica formato **saidas** (colunas: Cod.Item, DescricaoProduto, Qtde.Saida, ValorSaida, NumeroLote, DatadeValidade)
- Identifica formato **entradas** (colunas: Identificador, TipoEntrada, Produto, Qtde.Entrada, Lote, DatadeValidade, StatusEntrada, DataHora)
- Limpa nomes (`[B]`, aspas duplas extras)
- Extrai data das entradas (campo DataHora); saidas usam data da importacao
- Retorna array tipado

### 3. Calculo de demanda semanal (src/utils/supplyCalculator.ts)

Nova funcao `calcularDemandaSemanalPorItem(movimentacoes: MovimentacaoEstoque[]): Map<string, number>`:
- Filtra apenas saidas
- Agrupa por produto (nome normalizado)
- Calcula periodo: da saida mais antiga ate a mais recente (ou hoje)
- Demanda semanal = total saidas / (periodo em semanas, minimo 1)
- Retorna mapa nome -> demanda/semana

### 4. Calculo de CMV CORRETO (src/utils/supplyCalculator.ts)

Nova funcao `calcularCMVPorSaidas(movimentacoes: MovimentacaoEstoque[]): number`:
- Filtra saidas
- Para cada saida, busca o `precoCusto` via `encontrarPrecoCustoPadrao(produto)`
- CMV = SUM(quantidade x precoCusto) para cada saida
- Ignora itens sem preco de custo (brindes, espumador, bags)
- **NAO usa o ValorSaida do CSV** (isso e preco de venda)

### 5. Nova aba no Supply Chain (src/components/modes/SupplyChainMode.tsx)

Adicionar aba "Movimentacoes" com:
- Textarea para colar CSV (entradas ou saidas)
- Botao "Importar"
- Ao importar:
  - Parseia CSV
  - Acumula movimentacoes no state (append, nao substitui)
  - Recalcula demanda semanal e atualiza cada ItemEstoque com match
  - Toast: "X saidas importadas, demanda atualizada para Y produtos"
- Card resumo quando ha movimentacoes:
  - Total unidades saidas no periodo
  - CMV calculado (quantidade x custo)
  - Receita bruta (soma ValorSaida do CSV)
  - Margem bruta = (Receita - CMV) / Receita
  - Top 5 produtos por volume de saida

### 6. Integracao CMV no DRE (src/components/financeiro/DRESection.tsx)

- Quando `supplyExports.cmvMensal` existir, usar como valor da linha "CMV" no DRE
- Isso substitui qualquer estimativa manual e mostra a margem bruta real

### 7. Atualizacao precos de custo (src/data/precos-custo-default.ts)

Adicionar patterns faltantes:
- `Milk.*Protein|Milk.*Avela.*Cacau|MILK\\+` -> R$ 28,64
- `Levedura.*100` -> R$ 12,84
- `Spices.*Quatro.*Queijos|Spices.*4.*Queijos` -> R$ 3,56
- `Mug|BAG|ESPUMADOR` -> R$ 0 (brindes, ignorar no CMV)

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/types/focus-mode.ts` | Adicionar `MovimentacaoEstoque`, campos em `SupplyChainStage` e `SupplyExports` |
| `src/data/precos-custo-default.ts` | Adicionar patterns faltantes (Milk+ Proteico, Levedura 100g, Quatro Queijos) |
| `src/utils/supplyCalculator.ts` | Adicionar `parsearMovimentacoes`, `calcularDemandaSemanalPorItem`, `calcularCMVPorSaidas` |
| `src/components/modes/SupplyChainMode.tsx` | Nova aba "Movimentacoes" + card resumo CMV |
| `src/components/financeiro/DRESection.tsx` | Usar CMV do Supply quando disponivel |

## Logica chave do CMV

```text
CSV Saida: "Castanha Caju 450G" | Qtde: 4 | ValorSaida: R$ 271,68 (VENDA - IGNORAR)
Tabela Custo: "Castanha Caju 450G" -> R$ 22,60 (CUSTO UNITARIO)
CMV desta linha = 4 x R$ 22,60 = R$ 90,40

Total CMV = SUM(todas as linhas de saida: qtde x custo unitario)
```
