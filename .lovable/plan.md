

# Plano de Recuperação e Prevenção de Perda de Dados

## Diagnóstico Confirmado

Os dados foram perdidos devido a um **reset não intencional** durante um deploy/reload. O sistema:
1. Carregou dados completos do Supabase
2. Processou os dados e algo disparou a lógica de reset (linha 154-188 em useFocusModes.ts)
3. Salvou os dados vazios de volta, sobrescrevendo os dados bons

## Dados Recuperáveis (Parcial)

Dos **weekly_snapshots** da semana de 26/01, temos:
- Caixa Livre Real: R$ 80.200
- Status Financeiro: Estratégia
- Score Financeiro: 90
- Total Defasados: R$ 119.800
- Prioridade: Repor Estoque
- Sessões Semana: 5.000

**Os dados detalhados (contas a pagar, custos fixos, tarefas) foram perdidos permanentemente.**

---

## Plano de Implementação: Proteções Anti-Perda

### Fase 1: Backup Automático (CRÍTICO)

**Arquivo:** `src/hooks/useFocusModes.ts`

Adicionar backup antes de qualquer save que tenha dados vazios:

```typescript
// Antes de salvar, verificar se estamos sobrescrevendo dados bons com dados vazios
const saveToSupabase = useCallback(async () => {
  if (!user || !initialLoadDone.current) return;
  
  // PROTEÇÃO: Verificar se estamos tentando salvar dados vazios
  const temDadosFinanceiro = state.modes.financeiro.financeiroData?.caixaAtual ||
                              state.modes.financeiro.financeiroData?.faturamentoMes;
  const temTarefas = state.modes.tasks.backlogData?.tarefas?.length > 0;
  
  // Se NÃO temos dados mas JÁ CARREGAMOS antes, é suspeito
  if (!temDadosFinanceiro && !temTarefas && wasLoadedWithData.current) {
    console.warn('⚠️ Tentativa de salvar dados vazios bloqueada');
    return; // NÃO SALVAR
  }
  
  // ... resto do save
}, [user, state]);
```

### Fase 2: Snapshot Completo (Não apenas Métricas)

**Arquivo:** `src/hooks/useFocusModes.ts`

Ao detectar mudança de semana, salvar o JSON completo dos modos:

```typescript
// Em saveWeeklySnapshot, adicionar campo 'modes_full_backup'
const snapshot = {
  // ... campos existentes
  modes_full_backup: JSON.stringify(modes), // NOVO: Backup completo
};
```

**Migração SQL Necessária:**
```sql
ALTER TABLE weekly_snapshots 
ADD COLUMN modes_full_backup jsonb;
```

### Fase 3: Trava de Segurança no Reset

**Arquivo:** `src/hooks/useFocusModes.ts`

Adicionar confirmação antes de resetar dados com conteúdo:

```typescript
function processLoadedState(state: FocusModeState | null): ProcessResult {
  // ... código existente
  
  // NOVA TRAVA: Se financeiro tem dados, NÃO RESETAR
  if (id === 'financeiro' && state.modes.financeiro?.financeiroData?.contasFluxo?.length > 0) {
    console.log('Preservando financeiro com', state.modes.financeiro.financeiroData.contasFluxo.length, 'contas');
    updatedModes[id] = {
      ...state.modes.financeiro,
      status: calculateModeStatus(state.modes.financeiro),
    };
    continue; // Pular reset
  }
}
```

### Fase 4: Rollback com Optimistic Updates

Implementar o padrão de rollback com snapshot conforme documentação:

```typescript
onMutate: async (updatedState) => {
  // Snapshot antes de mudar
  const previousState = queryClient.getQueryData(['focus-modes']);
  return { previousState };
},
onError: (err, variables, context) => {
  // Rollback se falhar
  if (context?.previousState) {
    setState(context.previousState);
  }
  toast.error('Erro ao salvar. Dados restaurados.');
}
```

---

## Ordem de Implementação

| # | Item | Impacto | Arquivos |
|---|------|---------|----------|
| 1 | Trava anti-save vazio | CRÍTICO | useFocusModes.ts |
| 2 | Migração: modes_full_backup | ALTO | SQL + useFocusModes.ts |
| 3 | Trava de reset com dados | ALTO | useFocusModes.ts |
| 4 | Rollback com optimistic | MÉDIO | useFocusModes.ts |

---

## O Que Você Precisa Refazer

Infelizmente, os seguintes dados precisam ser repreenchidos manualmente:

1. **Financeiro:**
   - Saldos das contas bancárias
   - Contas a pagar/receber cadastradas
   - Faturamento do mês e esperado
   - Custos fixos detalhados

2. **Tasks:**
   - Todas as tarefas e ideias

3. **Marketing:**
   - Métricas de orgânico (emails, sessões, pedidos)

4. **Supply Chain:**
   - Itens de estoque

Posso começar implementando as proteções imediatamente para evitar que isso aconteça novamente?

