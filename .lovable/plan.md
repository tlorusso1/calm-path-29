
# Financeiro V2 + Score Semanal do Negocio

## Status: ✅ IMPLEMENTADO

Implementação concluída em 30/01/2026.

---

## Visao Geral

Duas grandes mudancas conectadas:

1. **Financeiro V2** - Separar caixa imediato de sustentacao operacional
2. **Score Semanal** - Painel unico que governa todas as decisoes

---

## PARTE 1: Financeiro V2 — Folego de Caixa

### Novos Conceitos

| Conceito | Calculo | Responde |
|----------|---------|----------|
| Caixa Livre Real | Caixa - Minimo - Defasados | "Quanto posso errar agora?" |
| Queima Operacional | Custo Fixo + Marketing Base | "Quanto custa existir?" |
| Faturamento Esperado 30d | Input manual conservador | "Quanto vou vender no minimo?" |
| Resultado Esperado 30d | (Faturamento x 40%) - Queima | "O negocio se paga?" |
| Folego (dias) | (Caixa Livre / |Resultado|) x 30 | "Quantos dias aguento?" |
| Alerta Risco 30d | Vermelho/Amarelo/Verde | "Qual meu status real?" |

### Regra do Alerta de Risco

```text
Vermelho: Caixa Livre <= 0
Amarelo:  Caixa Livre > 0 E Resultado Esperado < 0
Verde:    Caixa Livre > 0 E Resultado Esperado >= 0
```

### Mudancas em Tipos

**`src/types/focus-mode.ts`**

Adicionar campo em `FinanceiroStage`:

```typescript
faturamentoEsperado30d: string;
```

Adicionar campos em `FinanceiroExports`:

```typescript
queimaOperacional: number;
faturamentoEsperado: number;
resultadoEsperado30d: number;
folegoEmDias: number | null;  // null = infinito
alertaRisco30d: 'verde' | 'amarelo' | 'vermelho';
```

### Mudancas no Calculador

**`src/utils/modeStatusCalculator.ts`**

Atualizar `calculateFinanceiroV2` para calcular:

1. Queima Operacional = custoFixo + marketingBase
2. Faturamento Esperado = parse do input
3. Margem Esperada = faturamentoEsperado x 0.40
4. Resultado Esperado 30d = margem - queima
5. Folego:
   - Se resultado < 0 e caixa > 0: (caixaLivre / |resultado|) x 30
   - Se resultado >= 0: null (infinito)
   - Se caixa <= 0: 0
6. Alerta de Risco baseado nas regras acima

### Mudancas na UI

**`src/components/modes/FinanceiroMode.tsx`**

Adicionar:

1. Input "Faturamento Esperado 30d" com label explicativo
2. Card "Queima Operacional" (custo fixo + marketing)
3. Card "Resultado Esperado + Folego":
   - Margem esperada
   - Queima
   - Resultado (com cor)
   - Folego em dias (ou simbolo infinito)
4. Legenda anti-confusao:
   - "Caixa Livre Real = situacao agora"
   - "Resultado Esperado = futuro proximo"
   - "Nao devem ser somados"

---

## PARTE 2: Score Semanal do Negocio

### Arquitetura

Score de 0-100 dividido em 3 pilares:

| Pilar | Peso | Fonte |
|-------|------|-------|
| Financeiro | 40% | `FinanceiroExports.alertaRisco30d` |
| Estoque | 30% | Cobertura + status compras |
| Demanda | 30% | Sessoes + faturamento por canal |

### Regras de Pontuacao

**Financeiro (0-40 pontos)**

| Situacao | Pontos |
|----------|--------|
| Caixa Livre <= 0 | 0 |
| Caixa > 0, Risco Vermelho | 10 |
| Caixa > 0, Risco Amarelo | 25 |
| Caixa > 0, Risco Verde | 40 |

**Estoque (0-30 pontos)**

| Situacao | Pontos |
|----------|--------|
| < 15 dias cobertura | 0 |
| 15-30 dias | 15 |
| > 30 dias + compras ok | 30 |

**Demanda (0-30 pontos)**

| Situacao | Pontos |
|----------|--------|
| Sessoes DOWN e vendas DOWN | 5 |
| Sessoes OK / vendas DOWN | 10 |
| Sessoes UP / vendas OK | 20 |
| Sessoes UP e vendas UP | 30 |

### Leitura Automatica

| Score | Status | Regra |
|-------|--------|-------|
| 70-100 | Saudavel | Pode crescer |
| 40-69 | Atencao | Crescer com cautela |
| < 40 | Risco | Preservar caixa |

### Decisoes Automaticas

```text
Risco (< 40):
  - Ads NAO escala
  - Compras so essenciais
  - Foco em caixa

Atencao (40-69):
  - Ads so remarketing/fundo
  - Compras seletivas
  - Marketing sem apostas novas

Saudavel (>= 70):
  - Ads pode escalar
  - Estoque pode antecipar
  - Marketing pode testar
```

### Implementacao Tecnica

**Novos Tipos**

```typescript
interface ScoreNegocio {
  total: number;
  status: 'saudavel' | 'atencao' | 'risco';
  financeiro: { score: number; alertaRisco: string };
  estoque: { score: number; cobertura: string };
  demanda: { score: number; tendencia: string };
}
```

**Nova Funcao Calculadora**

```typescript
function calcScoreNegocio(
  financeiroExports: FinanceiroExports,
  estoqueData: PreReuniaoGeralStage['estoque'],
  marketingExports: MarketingExports
): ScoreNegocio
```

**Novo Componente**

`ScoreNegocioCard.tsx` - Card visual com:
- Score total grande
- Barra de progresso colorida
- 3 pilares com scores individuais
- Status textual

**Integracao**

O card aparece no topo de:
- Pre-Reuniao Geral
- Pre-Reuniao Ads
- Reuniao Ads

E alimenta regras de bloqueio automatico.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/types/focus-mode.ts` | Adicionar `faturamentoEsperado30d`, novos exports e interface `ScoreNegocio` |
| `src/utils/modeStatusCalculator.ts` | Atualizar `calculateFinanceiroV2` + criar `calcScoreNegocio` |
| `src/components/modes/FinanceiroMode.tsx` | Novo input + cards de Queima, Resultado e Folego |
| `src/hooks/useFocusModes.ts` | Exportar `scoreNegocio` via useMemo |
| `src/components/ScoreNegocioCard.tsx` | NOVO - Card visual do score |
| `src/components/modes/PreReuniaoGeralMode.tsx` | Usar novo Score em vez do termometro antigo |
| `src/components/modes/PreReuniaoAdsMode.tsx` | Integrar bloqueio pelo Score |

---

## Ordem de Implementacao

1. **Tipos** - Adicionar campos e interfaces
2. **Calculador** - Logica do Financeiro V2 e Score
3. **UI Financeiro** - Input e cards novos
4. **Hook** - Exportar scoreNegocio
5. **Card Score** - Componente visual
6. **Integrar** - Pre-Reunioes usarem o score

---

## Resultado Final

O usuario tera:

- **No Financeiro**: Visao clara de caixa imediato, queima operacional, e quanto tempo aguenta
- **Em todas as abas semanais**: Score unico de 0-100 que governa decisoes
- **Bloqueios automaticos**: Sistema impede decisoes que colocam o negocio em risco
- **Sem autoengano**: Numeros falam, nao opiniao

O fluxo passa a ser:
1. Preenche Financeiro (diario)
2. Preenche Marketing (segunda)
3. Ve o Score no inicio de cada reuniao
4. Score ja diz se pode crescer, segurar ou defender
5. Decisoes sao consequencia, nao discussao
