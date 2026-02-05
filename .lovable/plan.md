
# Plano: Ampliar Tamanho dos Boxes na Web

## Problema Identificado

O layout está limitado a `max-w-lg` (~512px) em dois lugares:
1. **Header**: `max-w-4xl` (OK, já é largo)
2. **Conteúdo principal**: `max-w-lg` (muito apertado!)

```
Linha 108: max-w-4xl (header) ✓ OK
Linha 151: max-w-lg (conteúdo) ✗ PROBLEMA
```

## Solução

Aumentar a largura máxima do conteúdo principal de `max-w-lg` (~512px) para `max-w-2xl` (~672px) ou `max-w-3xl` (~768px), mantendo responsivo em mobile.

## Alterações

### Arquivo: `src/pages/Index.tsx`

**Linha 151:**
```typescript
// DE:
<main className="flex-1 flex flex-col max-w-lg mx-auto w-full">

// PARA:
<main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
```

Opções de largura:
- `max-w-lg` = 512px (atual, apertado)
- `max-w-xl` = 576px (pouca diferença)
- `max-w-2xl` = 672px (recomendado)
- `max-w-3xl` = 768px (amplo, boa opção)
- `max-w-4xl` = 896px (igual ao header)

**Recomendação:** `max-w-3xl` para aproveitar melhor telas grandes, mantendo consistência com o header.

## Resumo

| Local | Antes | Depois |
|-------|-------|--------|
| `<main>` linha 151 | `max-w-lg` (~512px) | `max-w-3xl` (~768px) |
