

## Problema

O botão "Compartilhar" está usando `window.location.origin` (linha 352 do SupplyChainMode), que retorna a URL do preview/Lovable em vez do domínio customizado.

O link precisa apontar para: `https://intranet.tasks-thiago-edition.nicefoods.com.br/estoques/{userId}`

## Solução

Em `src/components/modes/SupplyChainMode.tsx`, linha 352, trocar para usar o domínio customizado:

```typescript
// De:
const link = `${window.location.origin}/estoques/${user.id}`;

// Para:
const link = `https://intranet.tasks-thiago-edition.nicefoods.com.br/estoques/${user.id}`;
```

Mudança de 1 linha, apenas no arquivo `src/components/modes/SupplyChainMode.tsx`.

