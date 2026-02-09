

# Correcao de Layout: Conciliacao e ContaItem

## Problemas Identificados

### 1. Conciliacao Bancaria - Toggle de Natureza invisivel
O seletor de natureza esta presente no codigo mas aparece como um icone cortado/ilegivel na tela. Na screenshot, aparece como um circulo marrom truncado ("🔵..."). Isso ocorre porque todos os seletores (Tipo + Natureza + Fornecedor + Botoes) estao comprimidos em uma unica linha horizontal.

### 2. ContaItem Desktop - Texto truncado
Descricoes como "USIBRAS U..." estao cortadas mesmo em telas grandes. O `truncate` com `sm:max-w-[400px]` limita o texto desnecessariamente.

### 3. ContaItem Mobile - Layout quebrado
No mobile, os valores monetarios e badges sobrepoe o texto. Os numeros do resumo de saidas/entradas/saldo tambem estao sobrepostos ("R$ 113.50R$57.140,56").

## Solucao

### Arquivo: `src/components/financeiro/ConciliacaoSection.tsx` (ReviewItem)

Reorganizar o layout do ReviewItem para 3 linhas em vez de 2:

```
Linha 1: Descricao completa + Valor (ja existe)
Linha 2: Data + Tipo + Natureza  
Linha 3: Fornecedor + Botoes (Add / X)
```

Mudancas:
- Separar a linha 2 atual em duas linhas distintas
- Natureza aparece SEMPRE para TODOS os tipos (nao apenas pagar/cartao), pois o usuario pediu "em todos"
- Fornecedor fica em linha propria com mais espaco
- Remover a condicao `selectedTipo === 'pagar' || selectedTipo === 'cartao'` do seletor de Natureza para mostrar em todos

### Arquivo: `src/components/financeiro/ContaItem.tsx`

**Desktop:**
- Remover `sm:max-w-[400px] lg:max-w-[500px]` da descricao, deixar `flex-1` natural
- Descrição usa `truncate` apenas no mobile, no desktop mostra completa com `sm:whitespace-normal sm:overflow-visible`

**Mobile:**
- Forcar layout de 3 linhas claras:
  - Linha 1: Data + Descricao (sem truncar tanto)
  - Linha 2: Badges (tipo, natureza, status)  
  - Linha 3: Valor + botoes de acao
- Reduzir gap e usar `text-xs` consistente

### Arquivo: `src/components/financeiro/ContasFluxoSection.tsx` (se necessario)

Verificar se o resumo de saidas/entradas/saldo no mobile tem espacamento adequado para nao sobrepor os numeros.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Reorganizar ReviewItem em 3 linhas; mostrar natureza para todos os tipos |
| `src/components/financeiro/ContaItem.tsx` | Expandir descricao no desktop; reorganizar mobile em 3 linhas |

