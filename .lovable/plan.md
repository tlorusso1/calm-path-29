

# Corrigir Regra de Classificacao Intercompany

## Problema

Hoje, qualquer lancamento com "NICE FOODS" na descricao e automaticamente marcado como `intercompany`. Isso esta errado porque uma transferencia de cliente que mencione "NICE" pode ser uma entrada real de receita.

A regra correta e: **so marcar como INTER quando existem 2 lancamentos de mesmo valor no mesmo extrato** (um debito e um credito), pois isso indica que o dinheiro saiu de uma conta e entrou na outra dentro do mesmo grupo.

## Onde mudar

### 1. Edge Function: `supabase/functions/extract-extrato/index.ts`

**Prompt da IA (linha 31):** Alterar a instrucao para a IA nao classificar como `intercompany` automaticamente. Remover a regra baseada em nome e instruir: "Classificar como pagar ou receber normalmente. A deteccao de intercompany sera feita apos o processamento."

**Regex fallback (linha 168-170):** Remover a regra `if (/SISPAG NICE FOODS ECOM/i.test(desc)) tipo = "intercompany"`. Transacoes com NICE devem entrar como `pagar` ou `receber` normalmente.

**Nova logica pos-processamento (apos linha 188):** Adicionar funcao `detectarIntercompany(lancamentos)` que:
- Agrupa lancamentos por valor absoluto
- Se encontrar 2 lancamentos com mesmo valor (um debito/saida e um credito/entrada), marca ambos como `intercompany`
- Tolerancia de R$ 0,01 no valor

```text
Exemplo:
  - "SISPAG NICE FOODS ECOM" -R$ 5.000  (saida)
  - "TED NICE FOODS"         +R$ 5.000  (entrada)
  -> Ambos viram intercompany
  
  - "PIX NICE FOODS"         +R$ 3.200  (entrada, sem par)
  -> Permanece como 'receber' (pode ser venda real)
```

### 2. Frontend: `src/components/financeiro/ConciliacaoSection.tsx`

Nenhuma mudanca necessaria no frontend. A classificacao ja vem correta da edge function. O painel de revisao permite reclassificar manualmente se necessario.

## Resumo

| Arquivo | Acao |
|---------|------|
| `supabase/functions/extract-extrato/index.ts` | Remover regex NICE=intercompany, atualizar prompt IA, adicionar deteccao por pares de mesmo valor |

