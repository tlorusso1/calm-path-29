# Reestruturação: Marketing Estrutural vs Ads (Tráfego Pago)

## Status: ✅ IMPLEMENTADO

---

## O Problema Resolvido

O sistema antigo tratava "Marketing Base" como Ads, permitindo investimento em tráfego pago crescer automaticamente com base no Caixa Livre Real sem limite.

### Lógica antiga (problemática):
```text
adsIncremental = caixaLivreReal * (10% a 30%)
adsMaximoPermitido = marketingBase + adsIncremental
```

Com Caixa Livre de R$ 79.000, permitia Ads de até R$ 30.000+ - sem considerar faturamento.

---

## A Solução Implementada

### 1. Separação em Dois Conceitos

| Campo | Natureza | Onde entra |
|-------|----------|------------|
| **Marketing Estrutural** | Custo fixo (agência, influencers, conteúdo, ferramentas) | Queima Operacional |
| **Ads Base** | Tráfego pago mínimo para campanhas vivas | Cálculo de Ads |

### 2. Nova Regra de Teto para Ads

```text
Ads Total ≤ 10% do Faturamento Esperado (30d)
```

### 3. Nova Fórmula de Ads Incremental

O incremento só acontece se TODAS forem verdadeiras:
- Caixa Livre Real > 0
- alertaRisco30d ≠ vermelho

Percentuais de incremento sobre Ads Base:

| Status Financeiro | Incremento |
|-------------------|------------|
| Sobrevivência | 0% |
| Atenção | +10% |
| Estratégia | +20% |

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | ✅ Adicionado `marketingEstrutural` e `adsBase`, novos exports |
| `src/utils/modeStatusCalculator.ts` | ✅ Nova lógica de cálculo com teto e travas |
| `src/components/modes/FinanceiroMode.tsx` | ✅ Inputs separados + card de limites de Ads |
| `src/components/modes/PreReuniaoAdsMode.tsx` | ✅ Card reformulado com detalhes de Ads |
| `src/components/ScoreNegocioCard.tsx` | ✅ Novo pilar de Ads no termômetro |

---

## Migração de Dados

O sistema mantém compatibilidade com dados existentes:
```typescript
const marketingEstrutural = parseCurrency(d.marketingEstrutural || d.marketingBase || '');
const adsBase = parseCurrency(d.adsBase || '');
```

---

## Exemplo com Números Reais

**Entradas:**
- Faturamento esperado: R$ 130.000
- Marketing estrutural: R$ 7.000
- Ads base: R$ 4.000
- Status: Estratégia

**Cálculos:**
- Teto absoluto: R$ 130.000 × 10% = **R$ 13.000**
- Incremento: R$ 4.000 × 20% = R$ 800
- Ads máximo: min(R$ 4.800, R$ 13.000) = **R$ 4.800**

---

## Resultado

1. ✅ Ads NUNCA ultrapassa 10% do faturamento esperado
2. ✅ Marketing Estrutural entra na queima operacional
3. ✅ Ads Base separado e controlado
4. ✅ Incremento proporcional ao status financeiro
5. ✅ Travas automáticas impedem escala em risco
6. ✅ Termômetro semanal reflete nova estrutura
