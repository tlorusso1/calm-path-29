
# Plano: Adicionar "FAZENDO AGORA" ao Backlog

## Resumo

Adicionar uma seção de destaque no topo do Backlog que permite ao usuário selecionar uma única tarefa como foco atual. A tarefa em foco aparece separada, destacada visualmente, e fica "travada" até ser concluída ou pausada.

---

## Comportamento da Feature

### Fluxo do Usuário

1. **Iniciar Foco**: Usuário clica no botão "Focar" em qualquer tarefa não concluída
2. **Visual**: Tarefa sobe para seção destacada no topo da página
3. **Exclusividade**: Apenas 1 tarefa pode estar em foco por vez
4. **Concluir**: Ao marcar como concluída, remove o foco automaticamente
5. **Pausar**: Botão para voltar a tarefa para lista normal sem concluir

### UX Proposta

```
┌──────────────────────────────────────┐
│  🎯 FAZENDO AGORA                    │
│  ┌────────────────────────────────┐  │
│  │ Revisar relatório de vendas    │  │
│  │ ⏱️ 30min | 🟢 Hoje             │  │
│  │ [✓ Concluir] [⏸️ Pausar]       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

────────────────────────────────────────

📊 Capacidade do Dia
...

🟢 HOJE (2 tarefas)
...
```

---

## Alterações Técnicas

### 1. Tipo BacklogTarefa (src/types/focus-mode.ts)

Adicionar novo campo:

```typescript
export interface BacklogTarefa {
  id: string;
  descricao: string;
  tempoEstimado: BacklogTempoEstimado;
  urgente: boolean;
  quandoFazer: BacklogQuandoFazer;
  completed: boolean;
  emFoco?: boolean;  // NOVO: indica se está sendo trabalhada agora
}
```

### 2. Hook useFocusModes (src/hooks/useFocusModes.ts)

Adicionar função para definir foco:

```typescript
const setTarefaEmFoco = useCallback((id: string | null) => {
  setState(prev => {
    const currentBacklog = prev.modes.backlog.backlogData ?? {
      tempoDisponivelHoje: 480,
      tarefas: [],
      ideias: [],
    };
    
    return {
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...currentBacklog,
            tarefas: (currentBacklog.tarefas || []).map(t => ({
              ...t,
              emFoco: t.id === id,  // Define foco na tarefa selecionada, remove das outras
            })),
          },
        },
      },
    };
  });
}, []);
```

Modificar `updateBacklogTarefa` para remover foco ao concluir:

```typescript
const updateBacklogTarefa = useCallback((id: string, data: Partial<BacklogTarefa>) => {
  setState(prev => {
    const currentBacklog = prev.modes.backlog.backlogData ?? {...};
    
    return {
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...currentBacklog,
            tarefas: (currentBacklog.tarefas || []).map(t =>
              t.id === id 
                ? { 
                    ...t, 
                    ...data,
                    // Se completando, remove o foco automaticamente
                    emFoco: data.completed ? false : (data.emFoco ?? t.emFoco)
                  } 
                : t
            ),
          },
        },
      },
    };
  });
}, []);
```

### 3. Componente BacklogMode (src/components/modes/BacklogMode.tsx)

**Props adicionais:**

```typescript
interface BacklogModeProps {
  // ... existentes
  onSetTarefaEmFoco: (id: string | null) => void;
}
```

**Nova seção "FAZENDO AGORA":**

```typescript
function FazendoAgoraSection({ 
  tarefa, 
  onConcluir, 
  onPausar 
}: { 
  tarefa: BacklogTarefa; 
  onConcluir: () => void; 
  onPausar: () => void;
}) {
  return (
    <Card className="p-4 border-2 border-primary bg-primary/5 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Target className="h-5 w-5" />
        <h3 className="font-semibold uppercase tracking-wide text-sm">
          Fazendo Agora
        </h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-foreground font-medium">{tarefa.descricao}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>⏱️ {tarefa.tempoEstimado}</span>
          <span>•</span>
          <span className="capitalize">{tarefa.quandoFazer}</span>
          {tarefa.urgente && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onConcluir} className="flex-1 gap-2">
            <CheckCircle className="h-4 w-4" />
            Concluir
          </Button>
          <Button variant="outline" onClick={onPausar} className="gap-2">
            <Pause className="h-4 w-4" />
            Pausar
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

**Integração no componente principal:**

```typescript
export function BacklogMode({ ..., onSetTarefaEmFoco }: BacklogModeProps) {
  const tarefaEmFoco = tarefas.find(t => t.emFoco && !t.completed);
  
  // Filtrar tarefa em foco das listas
  const tarefasHoje = tarefas.filter(t => t.quandoFazer === 'hoje' && !t.emFoco);
  // ... etc
  
  return (
    <div className="space-y-6">
      {/* FAZENDO AGORA - aparece primeiro se houver tarefa em foco */}
      {tarefaEmFoco && (
        <FazendoAgoraSection
          tarefa={tarefaEmFoco}
          onConcluir={() => onUpdateTarefa(tarefaEmFoco.id, { completed: true })}
          onPausar={() => onSetTarefaEmFoco(null)}
        />
      )}
      
      {/* Capacidade do Dia */}
      <Card>...</Card>
      
      {/* Backlog de Tarefas */}
      <div>...</div>
    </div>
  );
}
```

**Botão "Focar" em cada TarefaCard:**

```typescript
function TarefaCard({ tarefa, ..., onSetFoco }: TarefaCardProps) {
  return (
    <Card>
      {/* ... conteúdo existente ... */}
      
      {!tarefa.completed && !tarefa.emFoco && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => onSetFoco(tarefa.id)}
        >
          <Target className="h-3 w-3" />
          Focar
        </Button>
      )}
    </Card>
  );
}
```

### 4. Propagação das Props

**ModeContent.tsx:**

```typescript
interface ModeContentProps {
  // ... existentes
  onSetBacklogTarefaEmFoco?: (id: string | null) => void;
}

// Passar para BacklogMode
<BacklogMode
  // ... existentes
  onSetTarefaEmFoco={onSetBacklogTarefaEmFoco!}
/>
```

**Index.tsx:**

```typescript
const { ..., setTarefaEmFoco } = useFocusModes();

<ModeContent
  // ... existentes
  onSetBacklogTarefaEmFoco={setTarefaEmFoco}
/>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar `emFoco?: boolean` em `BacklogTarefa` |
| `src/hooks/useFocusModes.ts` | Adicionar `setTarefaEmFoco`, ajustar `updateBacklogTarefa` |
| `src/components/modes/BacklogMode.tsx` | Nova seção "FAZENDO AGORA", botão "Focar" nos cards |
| `src/components/ModeContent.tsx` | Propagar nova prop `onSetBacklogTarefaEmFoco` |
| `src/pages/Index.tsx` | Passar `setTarefaEmFoco` para ModeContent |

---

## Detalhes de UX

- **Cor do destaque**: Usa cor primária (`border-primary`, `bg-primary/5`)
- **Ícone**: `Target` (🎯) do lucide-react para representar foco
- **Animação**: Suave ao aparecer/desaparecer (pode usar `animate-fade-in`)
- **Responsivo**: Full width em mobile, mantém proporções em desktop

---

## Persistência

- O campo `emFoco` é persistido automaticamente com o resto do Backlog no Supabase
- Ao recarregar a página, a tarefa em foco permanece destacada
- Diferente de outros modos, o Backlog não reseta diariamente, então o foco persiste entre dias
