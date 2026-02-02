
# Plano: Alertas de Aceleração de Vendas e Melhorias na Visão Executiva

## Resumo das Alterações

O usuário solicitou três melhorias no módulo Supply Chain:

1. **Novo alerta "Acelerar Vendas"**: Identificar itens cuja validade é inferior ao tempo de cobertura (produto vai vencer antes de acabar o estoque)
2. **Itens Amarelos na Visão Executiva**: Mostrar itens com cobertura baixa (status amarelo) além dos críticos
3. **Lista de Estoque Maior e Ordenada**: Aumentar o tamanho do bloco de estoque atual e ordenar por quantidade (menor → maior)

---

## Alterações Detalhadas

### 1. Novo Alerta: "Acelerar Vendas"

**Problema identificado**: Quando um item tem validade de 45 dias mas cobertura de 60 dias, significa que o produto vai vencer antes de ser totalmente vendido. Isso requer ação comercial (promoção, combo, etc.) para evitar perdas.

**Lógica**:
```
Se diasAteVencimento < coberturaDias → precisa acelerar venda
```

**Visual na Visão Executiva**:
```
🔥 Acelerar Vendas
• Granola Tradicional (vence: 45d, estoque: 60d)
• Mix de Castanhas (vence: 30d, estoque: 50d)
```

O sistema vai calcular para cada item:
- Dias até vencimento
- Cobertura em dias (tempo para acabar o estoque)
- Se validade < cobertura → alerta

---

### 2. Itens Amarelos na Visão Executiva

**Situação atual**: A visão executiva só mostra itens com status vermelho (ruptura iminente).

**Nova estrutura dos alertas**:
1. Ruptura Iminente (vermelho) - já existe
2. **Cobertura Baixa (amarelo) - NOVO**
3. **Acelerar Vendas (laranja) - NOVO**
4. Vencimento Crítico (<30d) - já existe
5. Vencendo em Breve (30-60d) - já existe
6. Atenção Vencimento (60-90d) - já existe

**Visual**:
```
⚠️ Cobertura Baixa (Atenção)
• Pote 500ml (22d)
• Açúcar Demerara (35d)
```

---

### 3. Lista de Estoque Maior e Ordenada

**Alterações**:

1. **Aumentar altura do bloco**: De `h-[350px]` para `h-[500px]` quando houver mais de 5 itens

2. **Ordenação por quantidade**: Do que tem menos para o que tem mais

```typescript
// Ordenar por quantidade (menor primeiro)
const itensOrdenados = [...itensProcessados].sort(
  (a, b) => a.quantidade - b.quantidade
);
```

---

## Arquivo Modificado

**`src/components/modes/SupplyChainMode.tsx`**

### Mudança 1: Adicionar lógica de itens amarelos e acelerar vendas (na Visão Executiva, após "Ruptura Iminente")

Será inserido após a seção "Ruptura Iminente" (linha ~296):

- Seção "Cobertura Baixa (Atenção)" com itens amarelos
- Seção "Acelerar Vendas" com itens que vencem antes de acabar

### Mudança 2: Aumentar altura do ScrollArea (linha 476)

De:
```tsx
<ScrollArea className={cn(itensProcessados.length > 5 ? "h-[350px]" : "h-auto")}>
```

Para:
```tsx
<ScrollArea className={cn(itensProcessados.length > 5 ? "h-[500px]" : "h-auto")}>
```

### Mudança 3: Ordenar itens por quantidade (linha 478)

De:
```tsx
{itensProcessados.map((item) => {
```

Para:
```tsx
{[...itensProcessados].sort((a, b) => a.quantidade - b.quantidade).map((item) => {
```

---

## Resultado Esperado

Após a implementação:

1. Gestor verá quais itens precisam de ação comercial para evitar perdas por vencimento
2. Itens em atenção (amarelo) aparecerão na visão executiva, permitindo antecipar reposições
3. A lista de estoque será maior e mostrará primeiro os itens com menos quantidade, facilitando identificar o que precisa de reposição
