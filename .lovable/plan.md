

# Correção: Persistência do Backlog

## Problema Identificado

As tarefas do Backlog estão sumindo. Após análise do código, identifiquei **3 causas potenciais**:

### 1. Risco de Sobrescrita no updateBacklogData

A função `updateBacklogData` usa spread operator que pode sobrescrever dados:

```typescript
// Código atual (linha 967-970)
backlogData: {
  ...prev.modes.backlog.backlogData!,  // <-- ! pode falhar
  ...data,  // <-- pode sobrescrever tarefas/ideias
}
```

Se `backlogData` for `undefined`, o código quebra silenciosamente.

### 2. Race Condition no Reset Diário

Quando o app detecta um novo dia, ele tenta preservar o backlog:

```typescript
// Linha 164
backlogData: state.modes.backlog?.backlogData ?? { tarefas: [], ideias: [] }
```

Porém, se o estado ainda estiver carregando do banco, `state.modes.backlog` pode não ter os dados atuais.

### 3. Debounce de 1 segundo

Alterações são salvas após 1 segundo de inatividade. Se você adiciona tarefas e fecha o navegador antes disso, os dados não são salvos.

## Solução Proposta

### Mudança 1: Proteção contra undefined

Garantir que `backlogData` nunca seja undefined:

```typescript
const updateBacklogData = useCallback((data: Partial<BacklogStage>) => {
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
            // Só atualiza campos que vieram, preserva tarefas/ideias
            tempoDisponivelHoje: data.tempoDisponivelHoje ?? currentBacklog.tempoDisponivelHoje,
            tarefas: data.tarefas ?? currentBacklog.tarefas,
            ideias: data.ideias ?? currentBacklog.ideias,
          },
        },
      },
    };
  });
}, []);
```

### Mudança 2: Flush ao Sair da Página

Adicionar salvamento imediato quando o usuário sai:

```typescript
// No hook useFocusModes
useEffect(() => {
  const handleBeforeUnload = () => {
    if (user && initialLoadDone.current) {
      // Cancela debounce e salva imediatamente
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Usa navigator.sendBeacon para garantir envio
      const payload = {...};
      navigator.sendBeacon('/api/save-state', JSON.stringify(payload));
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [user, state]);
```

### Mudança 3: Validação na Inicialização

Garantir que o backlog sempre tenha arrays válidos:

```typescript
// Em processLoadedState
if (id === 'backlog') {
  const existingBacklog = state.modes.backlog?.backlogData;
  updatedModes[id] = {
    ...createDefaultMode(id),
    backlogData: {
      tempoDisponivelHoje: existingBacklog?.tempoDisponivelHoje ?? 480,
      tarefas: Array.isArray(existingBacklog?.tarefas) ? existingBacklog.tarefas : [],
      ideias: Array.isArray(existingBacklog?.ideias) ? existingBacklog.ideias : [],
    },
  };
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useFocusModes.ts` | Proteger contra undefined, flush on unload, validar arrays |

## Resultado Esperado

- Tarefas e ideias do Backlog nunca serão perdidas por erro de código
- Dados serão salvos mesmo se o navegador for fechado rapidamente
- Arrays sempre serão válidos, evitando erros silenciosos

