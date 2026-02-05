
# Plano: Correções de UX e Clarificação

## Problemas Identificados

### 1. "Faturamento/mês" - Confuso
**Arquivo:** `src/components/modes/FinanceiroMode.tsx` (linha 281)

**Problema:** O label "Faturamento/mês" não deixa claro se é:
- Faturamento do mês anterior (referência contábil)
- Faturamento acumulado do mês atual

**Solução:** Alterar para label mais claro com tooltip explicativo:
- Label: "Faturamento mês atual (acumulado)"
- Adicionar sublabel: "Total faturado até hoje no mês corrente"

---

### 2. Marketing Estrutural Duplicado
**Arquivo:** `src/components/modes/FinanceiroMode.tsx` (linha 308-319)

**Problema:** O campo "Marketing estrutural" aparece na seção "Dados Base" (topo), mas provavelmente também está incluído dentro dos Custos Fixos Detalhados na categoria "marketing".

**Análise:**
- Em `CustosFixosCard.tsx` existe categoria "marketing" nos custos fixos detalhados
- O campo separado no topo gera confusão e possível duplicação

**Solução:**
1. Remover o campo "Marketing estrutural" da seção "Dados Base"
2. Puxar o valor automaticamente da categoria `custosFixosDetalhados.marketing`
3. Exibir como "leitura" (readonly) calculada do breakdown de custos

Alteração em `modeStatusCalculator.ts`:
```typescript
// Buscar marketing estrutural do breakdown de custos fixos
const marketingEstrutural = d.custosFixosDetalhados?.marketing
  ? d.custosFixosDetalhados.marketing.reduce((s, i) => s + i.valor, 0)
  : parseCurrency(d.marketingEstrutural || d.marketingBase || '');
```

---

### 3. Erro na Conciliação Bancária
**Análise dos Network Requests:**
- Request 1: `POST extract-extrato` → "Error: Load failed"
- Request 2: Retry também falhou

**Causa provável:** O texto do extrato estava muito grande (muitas linhas) e pode ter causado timeout ou truncamento.

**Soluções:**
1. Aumentar timeout no cliente (adicionar AbortController com timeout maior)
2. Mostrar mensagem de erro mais amigável ao usuário
3. Sugerir dividir o extrato em partes menores se falhar

**Arquivo:** `src/components/financeiro/ConciliacaoSection.tsx`
```typescript
// Adicionar tratamento de erro mais robusto
if (error) {
  if (error.message?.includes('Load failed')) {
    toast.error('Falha na conexão. Tente novamente ou cole menos linhas.');
  } else {
    toast.error('Erro ao processar extrato. Tente novamente.');
  }
  return;
}
```

---

### 4. "Ads Máx/semana" deveria ser "Ads Máx/mês"
**Arquivo:** `src/components/financeiro/ExecutiveResume.tsx` (linha 136)

**Problema:** O label diz "Ads Máx/semana" mas o cálculo é baseado em 10% do faturamento mensal, não semanal.

**Análise do cálculo em `modeStatusCalculator.ts` (linha 122):**
```typescript
const tetoAdsAbsoluto = faturamentoEsperado * 0.10;
```
O `faturamentoEsperado` é de 30 dias, então o teto é **mensal**, não semanal.

**Solução:** Corrigir o label para "Ads Máx/mês"

Linha 136:
```typescript
<p className="text-xs text-muted-foreground uppercase tracking-wide">Ads Máx/mês</p>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/modes/FinanceiroMode.tsx` | Clarificar label "Faturamento/mês", remover campo duplicado Marketing Estrutural |
| `src/utils/modeStatusCalculator.ts` | Puxar Marketing Estrutural do breakdown de custos fixos |
| `src/components/financeiro/ExecutiveResume.tsx` | Corrigir label para "Ads Máx/mês" |
| `src/components/financeiro/ConciliacaoSection.tsx` | Melhorar tratamento de erro de rede |

---

## Resumo Visual

**Antes:**
```
Dados Base
├── Faturamento/mês          <- Confuso
├── Marketing estrutural     <- DUPLICADO com custos fixos
└── ...

Executive Resume
└── Ads Máx/semana          <- ERRADO (é mensal)
```

**Depois:**
```
Dados Base
├── Faturamento mês atual (acumulado)    <- CLARO
├── [REMOVIDO - puxar de Custos Fixos]
└── ...

Executive Resume
└── Ads Máx/mês             <- CORRETO
```
