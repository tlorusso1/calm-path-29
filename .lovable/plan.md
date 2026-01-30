

# Histórico de Métricas — Série Temporal Comparável

## Objetivo

Guardar as métricas-chave de cada semana para permitir análise de tendência ao longo de meses: "Estou melhor ou pior do que há 4 semanas?"

---

## O Que Será Salvo (Snapshot Semanal)

Toda segunda-feira, antes de resetar os dados semanais, o sistema salva automaticamente:

| Categoria | Métricas Salvas |
|-----------|-----------------|
| **Financeiro** | caixaLivreReal, statusFinanceiro, scoreFinanceiro, resultadoMes, totalDefasados, adsMaximo |
| **Ads** | roasMedio7d, cpaMedio, ticketMedio, gastoAds, decisaoSemana |
| **Demanda** | scoreDemanda, statusDemanda, scoreSessoes, sessoesSemana |
| **Organico** | scoreOrganico, statusOrganico |
| **Decisao** | prioridadeSemana, registroDecisao |

---

## Arquitetura

```text
focus_mode_states (atual)
       |
       | Snapshot automático toda segunda
       v
weekly_snapshots (NOVA TABELA)
       |
       | 1 registro por semana por usuário
       v
Visualização de tendência
```

---

## Mudanças no Banco

### Nova Tabela: `weekly_snapshots`

```sql
CREATE TABLE weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Financeiro
  caixa_livre_real NUMERIC,
  status_financeiro TEXT,
  score_financeiro INTEGER,
  resultado_mes NUMERIC,
  total_defasados NUMERIC,
  ads_maximo NUMERIC,
  
  -- Ads
  roas_medio NUMERIC,
  cpa_medio NUMERIC,
  ticket_medio NUMERIC,
  gasto_ads NUMERIC,
  decisao_ads TEXT,
  
  -- Demanda
  score_demanda INTEGER,
  status_demanda TEXT,
  score_sessoes INTEGER,
  sessoes_semana NUMERIC,
  
  -- Organico
  score_organico INTEGER,
  status_organico TEXT,
  
  -- Decisao
  prioridade_semana TEXT,
  registro_decisao TEXT,
  
  UNIQUE(user_id, week_start)
);
```

### RLS Policies

```sql
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON weekly_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON weekly_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Mudanças no Codigo

### 1. Hook `useFocusModes.ts`

Adicionar funcao `saveWeeklySnapshot`:

```typescript
const saveWeeklySnapshot = useCallback(async (prevWeekStart: string) => {
  if (!user) return;
  
  const finExports = calculateFinanceiroV2(state.modes.financeiro.financeiroData);
  const preAds = state.modes['pre-reuniao-ads'].preReuniaoAdsData;
  const preGeral = state.modes['pre-reuniao-geral'].preReuniaoGeralData;
  const marketing = state.modes.marketing.marketingData;
  const organico = calculateMarketingOrganico(marketing?.organico);
  
  const snapshot = {
    user_id: user.id,
    week_start: prevWeekStart,
    caixa_livre_real: finExports.caixaLivreReal,
    status_financeiro: finExports.statusFinanceiro,
    score_financeiro: finExports.scoreFinanceiro,
    resultado_mes: finExports.resultadoMes,
    total_defasados: finExports.totalDefasados,
    ads_maximo: finExports.adsMaximoPermitido,
    roas_medio: parseFloat(preAds?.roasMedio7d || '0'),
    cpa_medio: parseCurrency(preAds?.cpaMedio || ''),
    ticket_medio: parseCurrency(preAds?.ticketMedio || ''),
    gasto_ads: parseCurrency(preAds?.gastoAdsAtual || ''),
    decisao_ads: preAds?.decisaoSemana,
    score_demanda: organico.scoreDemanda,
    status_demanda: organico.statusDemanda,
    score_sessoes: organico.scoreSessoes,
    sessoes_semana: parseCurrency(marketing?.organico?.sessoesSemana || ''),
    score_organico: organico.scoreOrganico,
    status_organico: organico.statusOrganico,
    prioridade_semana: preGeral?.decisaoSemana,
    registro_decisao: preGeral?.registroDecisao,
  };
  
  await supabase.from('weekly_snapshots').upsert([snapshot], {
    onConflict: 'user_id,week_start'
  });
}, [user, state]);
```

### 2. Modificar `processLoadedState`

Antes de resetar os modos semanais, disparar o snapshot:

```typescript
// Reset weekly modes if new week
if (state.weekStart !== currentWeekStart) {
  // SALVAR SNAPSHOT ANTES DE RESETAR
  await saveWeeklySnapshot(state.weekStart);
  
  // Resetar modos semanais
  (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
    if (MODE_CONFIGS[id].frequency === 'weekly') {
      updatedModes[id] = createDefaultMode(id);
    }
  });
}
```

### 3. Novo Hook: `useWeeklyHistory.ts`

```typescript
export function useWeeklyHistory(weeks: number = 12) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WeeklySnapshot[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('weekly_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(weeks)
      .then(({ data }) => setHistory(data || []));
  }, [user, weeks]);
  
  return history;
}
```

### 4. Componente de Visualizacao (Futuro)

Componente simples com graficos de tendencia usando Recharts (ja instalado):

- Linha temporal de Caixa Livre Real
- Linha temporal de Score de Demanda
- Linha temporal de ROAS
- Indicadores de decisao por semana

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useWeeklyHistory.ts` | Hook para buscar historico |
| `src/components/HistoryDashboard.tsx` | Visualizacao de tendencias (fase 2) |

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/hooks/useFocusModes.ts` | Adicionar `saveWeeklySnapshot` e chamar antes do reset |
| `src/types/focus-mode.ts` | Adicionar interface `WeeklySnapshot` |

---

## Ordem de Implementacao

1. **Migracao SQL** — Criar tabela `weekly_snapshots` com RLS
2. **`src/types/focus-mode.ts`** — Adicionar interface `WeeklySnapshot`
3. **`src/hooks/useFocusModes.ts`** — Funcao de snapshot e integracao no reset
4. **`src/hooks/useWeeklyHistory.ts`** — Hook para buscar historico
5. **(Futuro)** Dashboard visual com graficos

---

## Resumo

| Pergunta | Resposta |
|----------|----------|
| **Quando reseta?** | Diario: todo dia. Semanal: toda segunda. |
| **O que salva?** | Snapshot com metricas-chave antes de cada reset semanal |
| **Onde fica?** | Nova tabela `weekly_snapshots` |
| **Pra que serve?** | Comparar tendencia ao longo de meses |

