

## Gráficos de Saída por Produto na aba Análise

### O que será adicionado

Na aba **Análise** do Supply Chain, adicionar dois gráficos visuais acima da tabela existente:

1. **Gráfico de Saídas Semanais (barras empilhadas)** — Mostra o volume total de saídas por semana, com cada produto como uma fatia colorida da barra. Permite ver se o total está subindo ou descendo, e qual produto puxa mais.

2. **Mix de Produtos (% do total)** — Barras horizontais mostrando a participação de cada produto no total de saídas dos últimos 30 dias. Ex: "MILK AVEIA — 35%", "SPICES CARBONARA — 22%", etc.

### Como funciona

- Os dados já existem: `MovimentacaoEstoque[]` com `tipo`, `produto`, `quantidade` e `data`
- Agrupar saídas por semana (ISO week) e por produto
- Usar CSS puro (barras div) — sem biblioteca de gráficos externa — consistente com o `CoberturaChart`

### Layout visual

```text
📈 Saídas por Semana
┌──────────────────────────────────────────┐
│ Sem 10  ████████████████████████  480 un │
│ Sem 11  ██████████████████████████ 520 un│
│ Sem 12  ████████████████████  420 un     │
│ Sem 13  ██████████████████████████████ 600│
└──────────────────────────────────────────┘
  ▲ cada cor = um produto (legenda abaixo)

📊 Mix de Produtos (últimos 30d)
┌──────────────────────────────────────────┐
│ MILK AVEIA 1L                            │
│ ██████████████████████████████████  35%  │
│ SPICES CARBONARA                         │
│ ██████████████████████  22%              │
│ ...                                      │
└──────────────────────────────────────────┘
```

### Mudanças técnicas

**Novo componente `src/components/SaidasChart.tsx`:**
- Recebe `movimentacoes: MovimentacaoEstoque[]`
- Agrupa saídas por semana ISO e por produto
- Renderiza barras empilhadas coloridas (CSS puro) com legenda
- Renderiza barras horizontais de % por produto (reutilizando padrão do CoberturaChart)

**`src/components/modes/SupplyChainMode.tsx`:**
- Importar e renderizar `SaidasChart` no início da `TabsContent value="analise"`, antes da tabela existente

