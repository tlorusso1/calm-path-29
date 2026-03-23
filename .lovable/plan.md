

## Problema

Os nomes dos produtos estão truncados (`w-[160px] sm:w-[220px]` com `truncate`) no gráfico de barras horizontais, tornando-os ilegíveis — especialmente no mobile.

## Proposta: Layout empilhado (nome em cima, barra embaixo)

Em vez de nome e barra na mesma linha (que força truncamento), usar **duas linhas por item**:

```text
NICE® MILK - AVEIA BARISTA 1L
████████████████████████████████████  238d

NICE® SPICES - CARBONARA 40G
██████████████                        87d
```

**Vantagens:**
- Nome completo sempre visível, sem truncamento
- Barra ocupa toda a largura disponível → melhor legibilidade visual
- Funciona bem em mobile e desktop
- O valor em dias fica à direita da barra

## Mudanças técnicas

**`src/components/CoberturaChart.tsx`:**
- Trocar layout de `flex items-center` (horizontal) para layout empilhado (vertical por item)
- Linha 1: nome do produto em texto completo (sem `truncate`, sem largura fixa)
- Linha 2: barra + valor em dias
- Manter cores por faixa de risco (verde/amarelo/vermelho)
- Espaçamento entre itens ligeiramente maior (`space-y-3`)

