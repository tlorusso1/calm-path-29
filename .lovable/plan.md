
# Correcao: Toggle de Natureza para Todos os Tipos de Saida

## Problema Identificado

O toggle de natureza (OP / EST) no `ContaItem.tsx` so aparece quando `conta.tipo === 'pagar'`. Porem, transacoes classificadas como **"cartao"** tambem sao saidas operacionais e precisam do toggle. Alem disso, na conciliacao (`ConciliacaoSection.tsx`), o seletor de natureza tambem so aparece para tipo `'pagar'`.

Resumo dos bugs:
1. Tipo `cartao` e `intercompany` sao saidas mas nao mostram o toggle de natureza
2. Itens ja pagos no historico nao permitem reclassificar a natureza (pode ser necessario corrigir erro de classificacao retroativamente)

## Solucao

### 1. Expandir a condicao do toggle em `ContaItem.tsx`

Trocar a condicao de `conta.tipo === 'pagar'` para incluir todos os tipos que representam saida de caixa:

```typescript
const tiposSaida = ['pagar', 'cartao'];
```

- **Toggle interativo** (contas pendentes): mostrar para `tiposSaida.includes(conta.tipo) && !conta.pago`
- **Badge estatico** (contas pagas): mostrar para `tiposSaida.includes(conta.tipo) && conta.pago && conta.natureza === 'capitalGiro'`
- **Toggle editavel no historico**: permitir reclassificacao mesmo em contas pagas (remover a condicao `!conta.pago` do toggle, mantendo o badge estatico apenas como fallback visual)

### 2. Expandir a condicao na conciliacao `ConciliacaoSection.tsx`

O seletor de natureza e o seletor de fornecedor na revisao de conciliacao tambem devem aparecer para tipo `'cartao'`:

```typescript
{(selectedTipo === 'pagar' || selectedTipo === 'cartao') && (
  <Select value={selectedNatureza} ...>
```

Mesma logica para o seletor de fornecedor logo abaixo.

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/financeiro/ContaItem.tsx` | Expandir condicao do toggle de natureza para incluir tipo `cartao`; permitir toggle mesmo em contas pagas |
| `src/components/financeiro/ConciliacaoSection.tsx` | Expandir condicao do seletor de natureza e fornecedor para incluir tipo `cartao` |
