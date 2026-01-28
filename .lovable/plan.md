

# Reestruturacao do Modo Backlog (Tarefas + Ideias)

## Resumo

Transformar o modo Backlog em um sistema de protecao mental com dois blocos distintos: Tarefas (com capacidade do dia) e Ideias (deposito mental sem obrigacao).

---

## Nova Estrutura do Backlog

```text
+------------------------------------------+
|  CAPACIDADE DO DIA                       |
|                                          |
|  Tempo disponível hoje: [___] horas      |
|                                          |
|  Tarefas de HOJE: 2h 30min               |
|                                          |
|  [========🟢========] Cabe no dia        |
|  ou                                      |
|  [==========🟡======] Estourando         |
|  ou                                      |
|  [==============🔴==] Passou do limite   |
|                                          |
|  "Se não couber hoje, fica para outro    |
|   dia. Isso é decisão, não atraso."      |
|                                          |
+------------------------------------------+
|                                          |
|  📋 BACKLOG DE TAREFAS                   |
|                                          |
|  [+ Adicionar tarefa]                    |
|                                          |
|  +--------------------------------------+|
|  | Tarefa X                         [x] ||
|  | ⏱️ 30min  ⭐ Urgente                  ||
|  | 🗓️ [Hoje] [Próximo] [Mais pra frente]||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
|                                          |
|  💡 BACKLOG DE IDEIAS                    |
|                                          |
|  "Ideia não é tarefa.                    |
|   Registrar já é suficiente."            |
|                                          |
|  [+ Adicionar ideia]                     |
|                                          |
|  +--------------------------------------+|
|  | Ideia livre aqui...              [x] ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

---

## Alteracoes nos Arquivos

### 1. `src/types/focus-mode.ts`

Adicionar novas interfaces para o Backlog:

```typescript
// Backlog Task item
export type BacklogQuandoFazer = 'hoje' | 'proximo' | 'depois';
export type BacklogTempoEstimado = '15min' | '30min' | '1h' | '2h' | '+2h';

export interface BacklogTarefa {
  id: string;
  descricao: string;
  tempoEstimado: BacklogTempoEstimado;
  urgente: boolean;
  quandoFazer: BacklogQuandoFazer;
  completed: boolean;
}

export interface BacklogIdeia {
  id: string;
  texto: string;
}

export interface BacklogStage {
  // Capacidade do dia
  tempoDisponivelHoje: number; // em minutos
  
  // Listas
  tarefas: BacklogTarefa[];
  ideias: BacklogIdeia[];
}
```

Atualizar `FocusMode`:

```typescript
export interface FocusMode {
  // ... campos existentes
  backlogData?: BacklogStage;
}
```

Adicionar default:

```typescript
export const DEFAULT_BACKLOG_DATA: BacklogStage = {
  tempoDisponivelHoje: 480, // 8 horas default
  tarefas: [],
  ideias: [],
};
```

---

### 2. `src/hooks/useFocusModes.ts`

Atualizar `createDefaultMode`:

```typescript
if (id === 'backlog') {
  mode.backlogData = { ...DEFAULT_BACKLOG_DATA };
}
```

**IMPORTANTE**: Nao resetar backlog diariamente - manter dados persistentes.

Adicionar funcoes especificas:

```typescript
// Backlog-specific functions
const updateBacklogData = useCallback((data: Partial<BacklogStage>) => {
  // Update tempoDisponivelHoje
}, []);

const addBacklogTarefa = useCallback((tarefa: Omit<BacklogTarefa, 'id'>) => {
  // Add new task
}, []);

const updateBacklogTarefa = useCallback((id: string, data: Partial<BacklogTarefa>) => {
  // Update task (tempo, urgente, quandoFazer, completed)
}, []);

const removeBacklogTarefa = useCallback((id: string) => {
  // Remove task
}, []);

const addBacklogIdeia = useCallback((texto: string) => {
  // Add new idea
}, []);

const removeBacklogIdeia = useCallback((id: string) => {
  // Remove idea
}, []);
```

---

### 3. `src/components/modes/BacklogMode.tsx`

Reescrever completamente com a nova estrutura:

#### Secao 1: Capacidade do Dia (fixa no topo)

- Input numerico para definir horas disponiveis
- Calculo automatico do tempo das tarefas marcadas como "Hoje"
- Barra de progresso visual com cores:
  - Verde: usado < 80% do disponivel
  - Amarelo: usado entre 80% e 100%
  - Vermelho: usado > 100%
- Texto ancora fixo

#### Funcao de conversao de tempo:

```typescript
const TEMPO_EM_MINUTOS: Record<BacklogTempoEstimado, number> = {
  '15min': 15,
  '30min': 30,
  '1h': 60,
  '2h': 120,
  '+2h': 180, // considerar 3h para calculo
};

const calcularTempoHoje = (tarefas: BacklogTarefa[]): number => {
  return tarefas
    .filter(t => t.quandoFazer === 'hoje' && !t.completed)
    .reduce((acc, t) => acc + TEMPO_EM_MINUTOS[t.tempoEstimado], 0);
};

const formatarTempo = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
};
```

#### Secao 2: Backlog de Tarefas

- Input para adicionar nova tarefa
- Lista de tarefas com:
  - Checkbox de concluido
  - Descricao
  - Seletor de tempo estimado (chips: 15min / 30min / 1h / 2h / +2h)
  - Toggle de urgente (estrela)
  - Seletor de quando fazer (chips: Hoje / Proximo / Mais pra frente)
  - Botao de remover
- Ordenacao: urgentes primeiro, depois por "quandoFazer"

#### Secao 3: Backlog de Ideias

- Bloco visualmente distinto (cor de fundo diferente)
- Texto ancora no topo
- Input simples para adicionar ideia
- Lista de ideias (apenas texto + botao remover)
- Sem checkbox, sem tempo, sem urgencia

---

### 4. `src/components/ModeContent.tsx`

Atualizar props e switch case:

```typescript
// Adicionar props
onUpdateBacklogData?: (data: Partial<BacklogStage>) => void;
onAddBacklogTarefa?: (tarefa: Omit<BacklogTarefa, 'id'>) => void;
onUpdateBacklogTarefa?: (id: string, data: Partial<BacklogTarefa>) => void;
onRemoveBacklogTarefa?: (id: string) => void;
onAddBacklogIdeia?: (texto: string) => void;
onRemoveBacklogIdeia?: (id: string) => void;

// Atualizar switch case
case 'backlog':
  return (
    <BacklogMode 
      mode={mode}
      onUpdateBacklogData={onUpdateBacklogData!}
      onAddTarefa={onAddBacklogTarefa!}
      onUpdateTarefa={onUpdateBacklogTarefa!}
      onRemoveTarefa={onRemoveBacklogTarefa!}
      onAddIdeia={onAddBacklogIdeia!}
      onRemoveIdeia={onRemoveBacklogIdeia!}
    />
  );
```

---

### 5. `src/pages/Index.tsx`

Adicionar handlers:

```typescript
const {
  // ... existentes
  updateBacklogData,
  addBacklogTarefa,
  updateBacklogTarefa,
  removeBacklogTarefa,
  addBacklogIdeia,
  removeBacklogIdeia,
} = useFocusModes();
```

---

### 6. Ajuste de Persistencia

**IMPORTANTE**: O backlog NAO deve ser resetado diariamente.

Modificar `loadState()` em `useFocusModes.ts`:

```typescript
// Ao resetar modos diarios, PRESERVAR backlogData
if (state.date !== today) {
  (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
    if (MODE_CONFIGS[id].frequency === 'daily') {
      if (id === 'backlog') {
        // Preservar dados do backlog, apenas resetar status
        updatedModes[id] = {
          ...createDefaultMode(id),
          backlogData: state.modes.backlog?.backlogData ?? DEFAULT_BACKLOG_DATA,
        };
      } else {
        updatedModes[id] = createDefaultMode(id);
      }
      needsUpdate = true;
    }
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar BacklogStage, BacklogTarefa, BacklogIdeia e defaults |
| `src/hooks/useFocusModes.ts` | Adicionar funcoes de backlog e preservar dados |
| `src/components/modes/BacklogMode.tsx` | Reescrever com nova estrutura |
| `src/components/ModeContent.tsx` | Adicionar novas props e case |
| `src/pages/Index.tsx` | Conectar novos handlers |

---

## Detalhes de UI

### Indicador Visual de Capacidade

```text
Tempo disponivel: 8h
Tarefas de hoje: 6h 30min

[████████████████░░░░] 81% - Estourando 🟡
```

Cores:
- `bg-green-500` para < 80%
- `bg-yellow-500` para 80-100%
- `bg-red-500` para > 100%

### Card de Tarefa

```text
+------------------------------------------+
| [x] Revisar contrato do fornecedor   [🗑]|
|                                          |
| ⏱️ [15m] [30m] [1h●] [2h] [+2h]          |
| ⭐ Urgente                               |
| 🗓️ [Hoje●] [Próximo] [Depois]            |
+------------------------------------------+
```

### Bloco de Ideias (visual distinto)

```text
+------------------------------------------+
| 💡 IDEIAS                                |
| "Ideia não é tarefa.                     |
|  Registrar já é suficiente."             |
+------------------------------------------+
| [+ Adicionar ideia...]                   |
+------------------------------------------+
| • Testar novo fornecedor de embalagem [🗑]|
| • App de controle de producao         [🗑]|
+------------------------------------------+
```

Usar `bg-muted/30` ou similar para diferenciar visualmente.

---

## Textos Ancora

Capacidade do dia:
> "Se nao couber hoje, fica para outro dia. Isso e decisao, nao atraso."

Backlog de Ideias:
> "Ideia nao e tarefa. Registrar ja e suficiente."

Titulo do modo:
> "Backlog e onde o cerebro descansa."

---

## Resultado Final

O modo Backlog tera:

1. **Capacidade do dia** - Controle visual de quanto tempo voce tem vs quanto esta alocado
2. **Tarefas** - Com tempo, urgencia e agendamento (Hoje/Proximo/Depois)
3. **Ideias** - Deposito mental sem obrigacao

**Regra principal**: Se nao cabe hoje, nao entra hoje.

**Objetivo**: Reduzir ansiedade provando que tudo esta guardado e o dia cabe dentro do possivel.

