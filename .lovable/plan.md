

# Correcao: Entradas (receber) devem passar por revisao na conciliacao

## Problema

Na conciliacao bancaria, entradas (`tipo === 'receber'`) sem fornecedor identificado automaticamente sao adicionadas **direto ao historico sem classificacao** (linha 347-358 do `ConciliacaoSection.tsx`). Isso faz com que:

1. Entradas fiquem sem fornecedor e sem categoria
2. No DRE, caiam como "Entradas a Reclassificar" numa modalidade que nao e contabilizada
3. Receitas desaparecam do resultado operacional

O usuario precisa poder classificar TODAS as entradas como B2C, B2B, etc., atribuindo fornecedor e categoria.

## Solucao

### Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`

**1. Enviar entradas sem fornecedor para o painel de revisao**

Alterar a logica na linha 341-358. Em vez de tratar `receber` como caso especial que entra direto, enviar TODOS os lancamentos sem fornecedor para revisao:

```
Antes:
  } else if (lanc.tipo === 'pagar' || lanc.tipo === 'cartao') {
    paraRevisar.push(...)
  } else {
    novos.push(...) // receber entra direto SEM classificacao
  }

Depois:
  } else {
    // TODOS os tipos sem fornecedor vao para revisao
    // (exceto intercompany/aplicacao/resgate que sao automaticos)
    if (['intercompany', 'aplicacao', 'resgate'].includes(lanc.tipo)) {
      novos.push({ ...lanc, pago: true, conciliado: true });
    } else {
      paraRevisar.push({ ...lanc, needsReview: true });
    }
  }
```

Isso garante que `pagar`, `cartao` e `receber` sem fornecedor passem pelo painel de revisao com seletor de fornecedor, tipo e natureza.

**2. Corrigir fallback no DRE**

No arquivo `src/components/financeiro/DRESection.tsx`, ajustar o fallback de modalidade para que entradas sem categoria caiam em `RECEITAS` (nao em `OUTRAS RECEITAS/DESPESAS`):

```
const modalidade = catDRE?.modalidade 
  || (lanc.tipo === 'receber' ? 'RECEITAS' : 'OUTRAS RECEITAS/DESPESAS');
const grupo = catDRE?.grupo 
  || (lanc.tipo === 'receber' ? 'Receitas Diretas' : 'Outras Saidas');
```

Isso garante que mesmo entradas que ainda nao foram reclassificadas aparecam no DRE dentro de Receitas Brutas.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Enviar `receber` sem fornecedor para revisao em vez de adicionar direto |
| `src/components/financeiro/DRESection.tsx` | Fallback de modalidade: entradas sem categoria vao para RECEITAS |

