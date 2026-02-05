

# PLANO TÉCNICO FINAL: Ritmo + Governança + Painel de Avião
## Implementação de "Expectativa de Hoje" - Versão Final

---

## 1. OBJETIVO DO PLANO

Criar uma camada transversal chamada **"Ritmo & Expectativa"** que:
- Define claramente o que é esperado **hoje** (diário/semanal/mensal)
- Mostra esse status em **um único lugar visual** (top bar)
- Fornece **avisos contextuais** em cada tela
- **Não adiciona complexidade visual** ou notificações agressivas

---

## 2. ESTRUTURA TÉCNICA

### 2.1 Adicionar Timestamps no Estado (TIPO: Interface)

**Arquivo:** `src/types/focus-mode.ts`

Adicionar nova interface:
```typescript
export interface RitmoTimestamps {
  lastCaixaUpdate?: string;           // ISO date (YYYY-MM-DD)
  lastContasAPagarCheck?: string;     // Marcar como "visto hoje"
  lastConciliacaoCheck?: string;      // Revisar 1x/semana
  lastPremissasReview?: string;       // Revisar no início do mês
}

export interface UserRitmoExpectativa {
  // Status
  statusRitmo: 'ok' | 'atencao' | 'pendente';
  
  // Tarefas por frequência
  hojePrecisaDeAtencao: boolean;
  tarefasHoje: {
    id: 'caixa' | 'contas-hoje' | 'decisao' | 'conciliacao' | 'premissas';
    titulo: string;
    status: 'ok' | 'pendente';
    frequencia: 'diario' | 'semanal' | 'mensal';
  }[];
  
  // Resumo para UI
  totalPendentes: number;
  pendentesHoje: number;
  pendentesEstaSemana: number;
}
```

Integrar no `FocusModeState`:
```typescript
export interface FocusModeState {
  date: string;
  weekStart: string;
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
  
  // NOVO:
  timestamps?: RitmoTimestamps;  // Rastrear quando cada tarefa foi feita
}
```

---

### 2.2 Criar Função de Cálculo (TIPO: Utilitário)

**Arquivo:** `src/utils/ritmoCalculator.ts` (NOVO)

```typescript
export function getRitmoExpectativa(
  state: FocusModeState,
  financeiroData?: FinanceiroStage
): UserRitmoExpectativa {
  const today = getTodayDate();
  const timestamps = state.timestamps ?? {};
  const tarefasHoje: any[] = [];
  let pendentes = 0;
  
  // ===== DIÁRIO =====
  // 1. Caixa atualizado HOJE?
  const caixaOk = timestamps.lastCaixaUpdate === today;
  tarefasHoje.push({
    id: 'caixa',
    titulo: 'Caixa atualizado',
    status: caixaOk ? 'ok' : 'pendente',
    frequencia: 'diario',
  });
  if (!caixaOk) pendentes++;
  
  // 2. Contas a pagar de HOJE conferidas?
  const contasHojeOk = timestamps.lastContasAPagarCheck === today;
  tarefasHoje.push({
    id: 'contas-hoje',
    titulo: 'Contas de hoje revisadas',
    status: contasHojeOk ? 'ok' : 'pendente',
    frequencia: 'diario',
  });
  if (!contasHojeOk) pendentes++;
  
  // ===== SEMANAL =====
  // 3. Decisão da Semana existe?
  const decisaoOk = !!state.modes['pre-reuniao-geral']?.preReuniaoGeralData?.decisaoSemana;
  tarefasHoje.push({
    id: 'decisao',
    titulo: 'Decisão da Semana definida',
    status: decisaoOk ? 'ok' : 'pendente',
    frequencia: 'semanal',
  });
  if (!decisaoOk) pendentes++;
  
  // 4. Conciliação revisada nesta semana?
  const conciliacaoOk = timestamps.lastConciliacaoCheck && 
    isWithinThisWeek(timestamps.lastConciliacaoCheck, state.weekStart);
  tarefasHoje.push({
    id: 'conciliacao',
    titulo: 'Conciliação bancária revisada',
    status: conciliacaoOk ? 'ok' : 'pendente',
    frequencia: 'semanal',
  });
  if (!conciliacaoOk) pendentes++;
  
  // ===== MENSAL =====
  // 5. Premissas revisadas neste mês?
  const premissasOk = timestamps.lastPremissasReview && 
    isThisMonth(timestamps.lastPremissasReview);
  tarefasHoje.push({
    id: 'premissas',
    titulo: 'Premissas revisadas (custo fixo, marketing, etc)',
    status: premissasOk ? 'ok' : 'pendente',
    frequencia: 'mensal',
  });
  if (!premissasOk) pendentes++;
  
  // Calcular status geral
  const statusRitmo = pendentes === 0 ? 'ok' : pendentes <= 2 ? 'atencao' : 'pendente';
  
  // Contar pendentes por frequência
  const pendentesHoje = tarefasHoje.filter(
    t => t.frequencia === 'diario' && t.status === 'pendente'
  ).length;
  
  const pendentesEstaSemana = tarefasHoje.filter(
    t => (t.frequencia === 'diario' || t.frequencia === 'semanal') && t.status === 'pendente'
  ).length;
  
  return {
    statusRitmo,
    hojePrecisaDeAtencao: pendentesHoje > 0,
    tarefasHoje,
    totalPendentes: pendentes,
    pendentesHoje,
    pendentesEstaSemana,
  };
}

// Helpers
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function isWithinThisWeek(date: string, weekStart: string): boolean {
  const dateObj = new Date(date);
  const weekStartObj = new Date(weekStart);
  const daysAgo = (new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo <= 7 && dateObj >= weekStartObj;
}

function isThisMonth(date: string): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  return dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
}
```

---

### 2.3 Integrar Timestamps no Hook (TIPO: Adição ao useFocusModes.ts)

**Modificar:** `src/hooks/useFocusModes.ts`

Adicionar funções para atualizar timestamps:

```typescript
// Nova função dentro do hook:
const updateTimestamp = useCallback((key: keyof RitmoTimestamps) => {
  setState(prev => ({
    ...prev,
    timestamps: {
      ...(prev.timestamps ?? {}),
      [key]: getTodayDate(),
    },
  }));
}, []);

// Exportar no retorno:
return {
  // ... existing exports
  updateTimestamp,
  getRitmoExpectativa: () => getRitmoExpectativa(state),
};
```

Garantir que timestamps seja incluído na persistência (já está via JSON).

---

### 2.4 Criar RitmoStatusBar (COMPONENTE: Top Bar Global)

**Arquivo:** `src/components/RitmoStatusBar.tsx` (NOVO)

```typescript
interface RitmoStatusBarProps {
  ritmo: UserRitmoExpectativa;
}

export const RitmoStatusBar = ({ ritmo }: RitmoStatusBarProps) => {
  const colorMap = {
    'ok': 'bg-green-50 border-green-200',
    'atencao': 'bg-yellow-50 border-yellow-200',
    'pendente': 'bg-red-50 border-red-200',
  };
  
  const iconMap = {
    'ok': '🟢',
    'atencao': '🟡',
    'pendente': '🔴',
  };
  
  const textMap = {
    'ok': 'Hoje está tudo em dia',
    'atencao': `Faltam ${ritmo.pendentesHoje} tarefas de hoje`,
    'pendente': `${ritmo.totalPendentes} pendências críticas`,
  };
  
  return (
    <div className={`border-b ${colorMap[ritmo.statusRitmo]} px-4 py-2`}>
      <div className="max-w-lg mx-auto flex items-center gap-2 text-sm">
        <span className="text-lg">{iconMap[ritmo.statusRitmo]}</span>
        <span>{textMap[ritmo.statusRitmo]}</span>
      </div>
    </div>
  );
};
```

**Integrar em:** `src/pages/Index.tsx`

```typescript
// Dentro do componente Index:
const ritmo = useMemo(() => getRitmoExpectativa(modes), [modes]);

// Renderizar após Header, antes de ModeSelector:
<RitmoStatusBar ritmo={ritmo} />
```

---

### 2.5 Criar Bloco "O que Precisa de Você Agora" (COMPONENTE: Painel de Avião)

**Arquivo:** `src/components/RitmoDashboard.tsx` (NOVO)

```typescript
interface RitmoDashboardProps {
  ritmo: UserRitmoExpectativa;
  onNavigateTo: (section: string) => void;
}

export const RitmoDashboard = ({ ritmo, onNavigateTo }: RitmoDashboardProps) => {
  const grouped = {
    diario: ritmo.tarefasHoje.filter(t => t.frequencia === 'diario'),
    semanal: ritmo.tarefasHoje.filter(t => t.frequencia === 'semanal'),
    mensal: ritmo.tarefasHoje.filter(t => t.frequencia === 'mensal'),
  };
  
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📋 O que precisa de você agora</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {grouped.diario.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-1">Hoje:</p>
            {grouped.diario.map(t => (
              <div key={t.id} className="flex gap-2 items-start">
                <span>{t.status === 'ok' ? '✓' : '⚠️'}</span>
                <button 
                  onClick={() => onNavigateTo(t.id)}
                  className="text-left hover:underline"
                >
                  {t.titulo}
                </button>
              </div>
            ))}
          </div>
        )}
        
        {grouped.semanal.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-1">Esta semana:</p>
            {grouped.semanal.map(t => (
              <div key={t.id} className="flex gap-2 items-start">
                <span>{t.status === 'ok' ? '✓' : '✗'}</span>
                <button 
                  onClick={() => onNavigateTo(t.id)}
                  className="text-left hover:underline"
                >
                  {t.titulo}
                </button>
              </div>
            ))}
          </div>
        )}
        
        {grouped.mensal.length > 0 && (
          <div>
            <p className="font-semibold text-xs mb-1">Este mês:</p>
            {grouped.mensal.map(t => (
              <div key={t.id} className="flex gap-2 items-start">
                <span>{t.status === 'ok' ? '✓' : '✗'}</span>
                <button 
                  onClick={() => onNavigateTo(t.id)}
                  className="text-left hover:underline"
                >
                  {t.titulo}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

### 2.6 Adicionar Avisos Contextuais (PADRÃO: Componente Reutilizável)

**Arquivo:** `src/components/RitmoContextualAlert.tsx` (NOVO)

Componente que mostra um aviso baseado no contexto:

```typescript
interface RitmoContextualAlertProps {
  taskId: 'caixa' | 'contas-hoje' | 'decisao' | 'conciliacao' | 'premissas';
  status: 'ok' | 'pendente';
}

export const RitmoContextualAlert = ({ taskId, status }: RitmoContextualAlertProps) => {
  if (status === 'ok') return null;
  
  const messages: Record<string, string> = {
    'caixa': '⚠️ Caixa não atualizado hoje — números podem estar imprecisos.',
    'contas-hoje': '⚠️ Você ainda não conferiu vencimentos de hoje.',
    'decisao': '❌ Defina a decisão da semana para liberar Ads e calcular limites.',
    'conciliacao': '⚠️ Conciliação bancária pendente — revise nesta semana.',
    'premissas': '⚠️ Premissas do mês não revisadas — custo fixo pode estar desatualizado.',
  };
  
  return (
    <Alert variant="default" className="bg-amber-50 border-amber-200 mb-4">
      <AlertDescription className="text-sm">
        {messages[taskId]}
      </AlertDescription>
    </Alert>
  );
};
```

**Integrar em:**
- `src/components/modes/FinanceiroMode.tsx` → no topo, para `caixa` e `contas-hoje`
- `src/components/modes/ReuniaoAdsMode.tsx` → para `decisao`
- Outros modos conforme necessário

---

## 3. INTEGRAÇÃO NA UI

### 3.1 Layout da Página Principal

```text
Header (Logo + Theme + Logout)
|
RitmoStatusBar ← NEW (🟢 Hoje está tudo em dia / 🟡 Faltam 2 tarefas / 🔴 ...)
|
ModeSelector (abas dos 7 modos)
|
Main Content:
  ├─ Se activeMode = null:
  │  └─ NoModeSelected + RitmoDashboard ← NEW
  └─ Se activeMode = modo:
     └─ ModeContent + avisos contextuais
```

### 3.2 Padrão de Aviso em Cada Tela

```typescript
// Dentro de cada modo (exemplo FinanceiroMode):
const ritmo = getRitmoExpectativa(modeState);
const tarefa = ritmo.tarefasHoje.find(t => t.id === 'caixa');

return (
  <>
    <RitmoContextualAlert 
      taskId="caixa" 
      status={tarefa?.status ?? 'ok'} 
    />
    {/* resto do conteúdo */}
  </>
);
```

---

## 4. FLUXO DE INTERAÇÃO DO USUÁRIO

### Dia típico:

1. **Abre o app** → Vê RitmoStatusBar (🟡 Faltam 2 tarefas de hoje)
2. **Não seleciona nenhum modo** → Vê RitmoDashboard (Hoje: ⚠️ Caixa, ⚠️ Contas)
3. **Clica em "Caixa"** → Vai para Financeiro com aviso contextual
4. **Atualiza caixa** → Chama `updateTimestamp('lastCaixaUpdate')`
5. **Volta** → RitmoStatusBar agora mostra (🟡 Faltam 1 tarefa)
6. **Clica em "Contas"** → Vai para Financeiro
7. **Marca como visto** → Chama `updateTimestamp('lastContasAPagarCheck')`
8. **Volta** → RitmoStatusBar agora mostra (🟢 Hoje está tudo em dia)

---

## 5. IMPLEMENTAÇÃO PASSO A PASSO (5 PROMPTS)

| # | Tarefa | Arquivo(s) | Prompt |
|----|--------|-----------|--------|
| 1 | Adicionar tipos + função de cálculo | `src/types/focus-mode.ts`, `src/utils/ritmoCalculator.ts` | `RitmoTimestamps`, `UserRitmoExpectativa`, `getRitmoExpectativa()` |
| 2 | Integrar timestamps no hook | `src/hooks/useFocusModes.ts` | `updateTimestamp()`, exports |
| 3 | Criar componentes visuais | `src/components/RitmoStatusBar.tsx`, `src/components/RitmoDashboard.tsx`, `src/components/RitmoContextualAlert.tsx` | Componentes React |
| 4 | Integrar na página principal | `src/pages/Index.tsx` | Renderizar RitmoStatusBar e RitmoDashboard |
| 5 | Adicionar avisos nos modos | `src/components/modes/FinanceiroMode.tsx`, `ReuniaoAdsMode.tsx`, etc | Inserir `RitmoContextualAlert` |

---

## 6. O QUE NÃO MUDA

- Nenhuma refatoração em `modeStatusCalculator.ts`
- Nenhuma mudança em cálculos financeiros
- Nenhuma nova IA ou prompt
- Checklists existentes **não** desaparecem
- Todos os inputs **continuam funcionando normalmente**

---

## 7. PADRÃO VISUAL FINAL

```
┌────────────────────────────────────────────┐
│  🟢 Hoje está tudo em dia                  │  ← RitmoStatusBar
├────────────────────────────────────────────┤
│  [💰] [📣] [🚚] [🧠] [🎯] [📈] [📋]        │  ← ModeSelector
├────────────────────────────────────────────┤
│                                            │
│  📋 O que precisa de você agora            │  ← RitmoDashboard (se nenhum modo)
│                                            │
│  Hoje:                                     │
│  ✓ Caixa atualizado                        │
│  ⚠️ Contas de hoje revisadas               │
│                                            │
│  Esta semana:                              │
│  ✗ Decisão da Semana definida              │
│  ✓ Conciliação bancária revisada           │
│                                            │
│  Este mês:                                 │
│  ✓ Premissas revisadas                     │
│                                            │
└────────────────────────────────────────────┘
```

---

## 8. RESUMO DE BENEFÍCIOS

✅ **Clareza:** Sabe exatamente o que fazer hoje sem pensar
✅ **Simplicidade:** Sem calendário complexo, sem notificações agressivas
✅ **Foco:** Máximo 5 linhas de "o que precisa agora"
✅ **Sem refatoração:** Tudo novo é apenas adição
✅ **Econômico:** 5 prompts, sem IA, pura lógica

---

