

# Plano: Correcoes e Novas Funcionalidades no Financeiro

## Problema 1: Conciliacoes nao aparecem na UI

### Diagnostico

Na linha 347-364 de `ConciliacaoSection.tsx`, entradas (`receber`) sem fornecedor identificado sao adicionadas diretamente ao array `novos` sem fornecedor e sem categoria. Quando esses lancamentos chegam ao DRE (`DRESection.tsx`, linhas 126-134), recebem a categoria "Entradas a Reclassificar" que pertence a modalidade `OUTRAS RECEITAS/DESPESAS`. Porem, no calculo de totais (linhas 197-207), essa modalidade nao e contabilizada em nenhum total (nao e RECEITAS, nao e DESPESAS puras), entao as entradas desaparecem do resultado.

### Correcao

**Arquivo: `ConciliacaoSection.tsx` (linhas 347-364)**
- Entradas (`receber`) sem fornecedor devem ir para `paraRevisar` em vez de `novos`, igual ao que ja acontece com `pagar` e `cartao`. Somente tipos automaticos (`intercompany`, `aplicacao`, `resgate`) entram direto.

**Arquivo: `DRESection.tsx` (linhas 126-134 e 197-207)**
- Fallback de modalidade: quando `tipo === 'receber'` e nao tem categoria, classificar na modalidade `RECEITAS` (grupo `Receitas Diretas`) em vez de `OUTRAS RECEITAS/DESPESAS`.
- No calculo de totais: incluir entradas dentro de `OUTRAS RECEITAS/DESPESAS` no total de receitas (separar por tipo real do lancamento).

---

## Feature 2: Grafico de Entrada Media Real vs Minima Necessaria

### Novo componente: `EntradaMediaRealChart.tsx`

Grafico de barras simples com apenas 2 barras:
- **Barra Verde**: "Entrada media real/dia" = soma de lancamentos conciliados `tipo === 'receber'` dos ultimos 14 dias / 14
- **Barra Cinza**: "Entrada minima necessaria/dia" = (custos fixos + marketing estrutural + ads base) / dias restantes do mes

Sem projecoes, sem edicao manual. Apenas dados conciliados reais.

Posicionado na secao "METAS" do FinanceiroMode, abaixo do MetaVendasCard.

---

## Feature 3: Separacao Real vs Projetado no Fluxo de Caixa

### Arquivo: `FluxoCaixaDiarioChart.tsx`

Alteracoes visuais (sem mudar calculos):
- Adicionar toggle no topo: `[Ultimos 60d | Proximos 30d]`
- Modo "Ultimos 60d": exibe saldo real baseado em lancamentos pagos/conciliados (linha azul continua)
- Modo "Proximos 30d": comportamento atual (linha azul tracejada para dias estimados, continua para dias com contas conhecidas)

### Arquivo: `FluxoCaixaChart.tsx`

Adicionar label "REAL" ou "PROJECAO" no titulo do card conforme `modoProjecao`.

---

## Feature 4: Baixa Automatica na Conciliacao (ja implementada, verificar)

A baixa automatica de contas a pagar ja foi implementada nas mensagens anteriores. Verificar que o badge "Conciliado automaticamente" esta visivel.

### Arquivo: `ConciliacaoSection.tsx`

- Apos o match por valor (R$ 0,01) e data (2 dias), verificar que a descricao do resultado inclui indicacao visual
- No toast de resultado, indicar quantas contas foram baixadas automaticamente

---

## Feature 5: Snapshot Mensal Automatico

### Sem tabela nova (salvar dentro de `FinanceiroStage`)

Adicionar campo `snapshotsMensais` ao tipo `FinanceiroStage`:

```text
snapshotsMensais: Array<{
  mesAno: string;        // "2026-01", "2026-02"
  entradas: number;      // total entradas conciliadas
  saidas: number;        // total saidas conciliadas
  saldo: number;         // entradas - saidas
  geradoEm: string;      // timestamp
}>
```

### Logica de geracao

No `onConciliar` do `FinanceiroMode.tsx`, apos adicionar lancamentos conciliados, recalcular o snapshot do mes corrente automaticamente iterando todos os lancamentos pagos do mes.

### Exibicao

Novo componente `SnapshotsMensais.tsx` na secao ANALISE: lista simples mostrando cada mes com entradas, saidas e saldo liquido, formatado como:
- Fev/2026: +R$ 45.000 (cor verde ou vermelha conforme saldo)

---

## Feature 6: Labels REAL e PROJECAO nos Titulos

### Arquivos afetados

| Componente | Label |
|------------|-------|
| `FluxoCaixaChart.tsx` | "PROJECAO" quando `modoProjecao=true`, "REAL" quando false |
| `FluxoCaixaDiarioChart.tsx` | "PROJECAO" fixo (sempre usa estimativas) |
| `ExecutiveResume.tsx` | Sem mudanca (ja e calculado) |
| `MetaVendasCard.tsx` | Sem mudanca |
| `DRESection.tsx` | "REAL" fixo (so usa lancamentos pagos) |
| `MargemRealCard.tsx` | "REAL" fixo |
| `EntradaMediaRealChart.tsx` (novo) | "REAL" fixo |

Implementacao: Badge pequeno ao lado do titulo de cada card, sem mudar logica nenhuma.

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Enviar `receber` sem fornecedor para revisao |
| `src/components/financeiro/DRESection.tsx` | Corrigir fallback de modalidade e totais |
| `src/components/financeiro/EntradaMediaRealChart.tsx` | **NOVO** - grafico 2 barras |
| `src/components/financeiro/FluxoCaixaDiarioChart.tsx` | Toggle 60d/30d, separar real vs projetado |
| `src/components/financeiro/FluxoCaixaChart.tsx` | Label REAL/PROJECAO |
| `src/components/financeiro/SnapshotsMensais.tsx` | **NOVO** - lista de snapshots mensais |
| `src/components/modes/FinanceiroMode.tsx` | Integrar novos componentes, gerar snapshots |
| `src/types/focus-mode.ts` | Adicionar `snapshotsMensais` ao `FinanceiroStage` |

