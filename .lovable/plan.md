

# Melhoria: Editar Textos de Tarefas e Ideias no Backlog

## Problema Atual

1. **Tarefas**: O texto da descrição aparece como `<span>` simples (linha 207-211), sem campo para edição. A função `onUpdateTarefa` existe e funciona, mas não está sendo usada para editar o texto.

2. **Ideias**: O texto aparece como `<span>` (linha 313), e **não existe função `onUpdateIdeia`** no sistema. A interface só permite adicionar e remover.

## Solução Proposta

### 1. Tarefas Editáveis

Transformar o texto da tarefa em um campo de input editável inline:

```text
ANTES:
+------------------------------------------+
| [x] Revisar planilha financeira     [🗑]  |
+------------------------------------------+

DEPOIS:
+------------------------------------------+
| [x] [Revisar planilha financeira___] [🗑] |
+------------------------------------------+
```

Comportamento:
- Campo de texto editável diretamente
- Atualiza ao digitar (onChange)
- Mantém estilo de riscado quando completada

### 2. Ideias Editáveis

Criar função de atualização e transformar em input:

```text
ANTES:
+------------------------------------------+
| - Ideia de novo sabor                [🗑] |
+------------------------------------------+

DEPOIS:
+------------------------------------------+
| - [Ideia de novo sabor___________]   [🗑] |
+------------------------------------------+
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useFocusModes.ts` | Adicionar funcao `updateBacklogIdeia` |
| `src/components/modes/BacklogMode.tsx` | Adicionar prop `onUpdateIdeia`, transformar textos em inputs |

## Detalhes Tecnicos

### Mudanca 1: Criar funcao updateBacklogIdeia (useFocusModes.ts)

Adicionar nova funcao seguindo o padrao existente de `updateBacklogTarefa`:

```typescript
const updateBacklogIdeia = useCallback((id: string, texto: string) => {
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
            ideias: currentBacklog.ideias.map(ideia =>
              ideia.id === id ? { ...ideia, texto } : ideia
            ),
          },
        },
      },
    };
  });
}, []);
```

### Mudanca 2: Atualizar interface do BacklogMode

Adicionar nova prop:

```typescript
interface BacklogModeProps {
  // ... existentes
  onUpdateIdeia: (id: string, texto: string) => void;
}
```

### Mudanca 3: Input editavel para Tarefas (linha 207-212)

Substituir o `<span>` por `<Input>`:

```tsx
<Input
  value={tarefa.descricao}
  onChange={(e) => onUpdateTarefa(tarefa.id, { descricao: e.target.value })}
  className={cn(
    "flex-1 text-sm h-7 border-none shadow-none px-1",
    tarefa.completed && "line-through text-muted-foreground"
  )}
/>
```

### Mudanca 4: Input editavel para Ideias (linha 313)

Substituir o `<span>` por `<Input>`:

```tsx
<div className="flex items-center gap-2 p-2 bg-background rounded border">
  <span className="text-sm text-muted-foreground">-</span>
  <Input
    value={ideia.texto}
    onChange={(e) => onUpdateIdeia(ideia.id, e.target.value)}
    className="flex-1 text-sm h-7 border-none shadow-none px-1 bg-transparent"
  />
  <Button ...>
    <Trash2 />
  </Button>
</div>
```

## Resultado Esperado

- Usuario pode clicar diretamente no texto de qualquer tarefa ou ideia e editar
- Edicoes sao salvas automaticamente (como ja funciona para outros campos)
- Interface permanece limpa e minimalista
- Dados persistem corretamente no banco

