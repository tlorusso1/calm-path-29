

# Vincular SHPP com contas SHOPEE independente de valor

## Problema

A lista "Vincular a conta aberta" filtra contas por valor similar (+-30%). Quando o lancamento do extrato e SHPP (ex: R$ 2.500) e a projecao ECOM-SHOPEE e R$ 1.875, a diferenca pode ultrapassar 30% e a conta nao aparece na lista.

## Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`** (funcao `VincularContaAberta`, linhas 966-986)

Adicionar regra extra no filtro `contasSimilares`: se a descricao do lancamento contem "SHPP" ou "SHOPEE", incluir tambem contas cuja descricao contenha "SHOPEE" -- mesmo que o valor nao esteja dentro dos 30% de tolerancia. Isso garante que as projecoes ECOM-SHOPEE aparecam como opcao de vinculacao.

Logica atualizada:

```text
Para cada conta aberta, incluir se:
  1. Tipo compativel (receber com receber, pagar com pagar) [ja existe]
  2. E uma das condicoes:
     a. Valor similar (+-30%) [ja existe]
     b. OU descricao do lancamento contem SHPP/SHOPEE E descricao da conta contem SHOPEE [NOVO]
```

## Detalhes tecnicos

Na linha 982-985 do `contasSimilares`, trocar a verificacao pura de valor por:

```
const valorSimilar = diff <= 0.30;
const matchCanal = /SHPP|SHOPEE/i.test(lancamento.descricao) && /SHOPEE/i.test(c.descricao);
return valorSimilar || matchCanal;
```

Apenas 1 arquivo afetado: `src/components/financeiro/ConciliacaoSection.tsx`
