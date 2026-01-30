
# Impostos Automáticos (16%) + Separação de Campos

## O Que Ficou Claro

Faturamento passado e projeção futura são coisas diferentes:

| Campo | Papel | O que alimenta |
|-------|-------|----------------|
| **Faturamento/mês** | Registro do que vendeu | Impostos (16%) para defasados |
| **Faturamento Esperado 30d** | Projeção conservadora | Resultado Esperado + Fôlego |

Isso está correto: faturamento passado não muda previsão de caixa, mas gera imposto que impacta o caixa livre.

---

## Mudanças a Implementar

### 1. Impostos Automáticos no Calculador

**Arquivo:** `src/utils/modeStatusCalculator.ts`

Calcular impostos como 16% do faturamento do mês em vez de usar input manual:

```typescript
// ANTES (linhas 47-55)
const totalDefasados = defasados ? (
  parseCurrency(defasados.impostosProximoMes || '') +
  parseCurrency(defasados.adsCartaoAnterior || '') +
  // ...
) : 0;

// DEPOIS
const impostosCalculados = faturamento * 0.16;

const totalDefasados = defasados ? (
  impostosCalculados +  // Automático: 16% do faturamento
  parseCurrency(defasados.adsCartaoAnterior || '') +
  parseCurrency(defasados.parcelasEmprestimos || '') +
  parseCurrency(defasados.comprasEstoqueComprometidas || '') +
  parseCurrency(defasados.outrosCompromissos || '')
) : impostosCalculados;
```

### 2. UI - Campo de Impostos Vira Display

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`

Na seção de Custos Defasados, trocar o input de impostos por uma linha calculada:

**Antes:**
```
Impostos próximo mês    [input R$ ___]
Ads (cartão anterior)   [input R$ ___]
...
```

**Depois:**
```
Impostos próx. mês (16%)    R$ 11.637,19  <- calculado, sem input
Ads (cartão anterior)       [input R$ ___]
...
```

O valor é exibido com fundo destacado (bg-muted/50) para indicar que é automático.

---

## Fluxo Final

1. Usuário preenche **Faturamento/mês** = R$ 72.732,46
2. Sistema calcula automaticamente **Impostos** = R$ 11.637,19 (16%)
3. Impostos entram no **Total Defasados**
4. Defasados reduzem o **Caixa Livre Real**

Menos um campo para preencher, menos chance de esquecer.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/modeStatusCalculator.ts` | Calcular `impostosCalculados = faturamento × 0.16` |
| `src/components/modes/FinanceiroMode.tsx` | Trocar input por display do valor calculado |
