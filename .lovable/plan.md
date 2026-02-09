

# Corrigir Vinculacao por Tipo e Dropdowns Ilegiveis

## Problema 1: Vincular mostra contas do tipo errado

Quando um recebimento (tipo `receber`) vai para revisao, o botao "Vincular a conta aberta" mostra contas a pagar em vez de contas a receber. Falta filtrar por tipo.

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`** (VincularContaAberta, linhas 938-947)

Adicionar filtro por tipo no `contasSimilares`:
- Se `lancamento.tipo === 'receber'`, mostrar apenas contas com `tipo === 'receber'`
- Se `lancamento.tipo === 'pagar'` ou `'cartao'`, mostrar apenas contas com `tipo === 'pagar'` ou `'cartao'`

## Problema 2: Dropdowns ilegiveis (texto cortado, sem fundo visivel)

Os Select de Tipo e Natureza no ReviewItem tem largura fixa pequena e o conteudo do dropdown pode ficar sem contraste.

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`** (ReviewItem, linhas 855-876)

- Trocar `w-[110px]` por `w-auto min-w-[120px]` nos SelectTrigger
- Adicionar `className="z-[200] bg-popover"` e `position="popper"` nos SelectContent para garantir visibilidade e fundo solido

## Problema 3: Recebimentos devem mostrar categorias DRE corretas

No painel de revisao, recebimentos devem ser classificados como "Clientes Nacionais (B2B)" ou "Clientes Nacionais (B2C)" na DRE. Alem disso, se a descricao conter "SHPP" ou "SHOPEE", ja pode ser auto-vinculado a Shopee (B2C).

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**

- Na funcao `encontrarMatch` ou `encontrarMatchPorDescricao`, adicionar regra especifica: se a descricao do lancamento contem "SHPP" ou "SHOPEE", tentar match com contas abertas que tambem contenham "SHPP" ou "SHOPEE" na descricao (independente de valor similar), priorizando contas a receber
- Isso funciona como um "match por canal" antes do match por valor

**Arquivo: `supabase/functions/extract-extrato/index.ts`**

- Adicionar regex de fallback: se descricao contem `SHPP|SHOPEE`, classificar automaticamente como `receber` (garantia extra)

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Filtrar VincularContaAberta por tipo + melhorar dropdowns (z-index, largura, fundo) + match por canal SHPP/SHOPEE |
| `supabase/functions/extract-extrato/index.ts` | Regex fallback para SHPP/SHOPEE como `receber` |

