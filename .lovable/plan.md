

# Correcao: Visualizacao de Itens do Estoque

## Problema

Os itens de estoque nao estao sendo exibidos corretamente porque:

1. **ScrollArea com `max-h-[300px]` nao funciona**: O Radix ScrollArea precisa de altura fixa (`h-[300px]`), nao maxima (`max-h-[300px]`)
2. **Viewport nao expande**: O Viewport interno tem `h-full w-full` mas o pai nao tem altura definida, entao o scroll nao ativa

## Solucao

### Arquivo: `src/components/modes/SupplyChainMode.tsx`

Alterar a linha 337 de:

```tsx
<ScrollArea className="max-h-[300px]">
```

Para:

```tsx
<ScrollArea className="h-[300px]">
```

Isso garante que o ScrollArea tenha uma altura fixa, permitindo que o scroll vertical funcione corretamente quando houver mais itens do que cabem na area visivel.

### Alternativa Melhor: Altura Dinamica

Para uma experiencia melhor, usar altura dinamica baseada no numero de itens:

```tsx
<ScrollArea className={cn(
  itensProcessados.length > 5 ? "h-[350px]" : "h-auto"
)}>
```

Isso:
- Mostra todos os itens sem scroll quando ha poucos (<=5)
- Ativa scroll quando ha muitos itens (>5)

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/modes/SupplyChainMode.tsx` | Trocar `max-h-[300px]` por `h-[350px]` ou logica dinamica |

## Resultado Esperado

- Todos os itens de estoque visiveis atraves de scroll vertical
- Scroll bar aparece quando necessario
- Experiencia consistente em todas as telas

