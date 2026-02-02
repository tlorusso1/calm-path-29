
# Campos de Tarefas com Expansão Automática

## O Problema

Os campos de descrição de tarefas e ideias no Backlog estão cortando o texto quando ele é longo. Isso acontece porque estamos usando `<Input>` (que é single-line) ao invés de um campo que expande.

## A Solução

Vou criar um componente `AutoResizeTextarea` que:
- Começa com altura mínima (uma linha)
- Expande automaticamente quando você digita mais texto
- Mantém a aparência visual atual (sem borda visível, estilo limpo)

## O Que Vai Mudar Para Você

**Antes:** Campo fixo, texto cortado
```
[Tarefa com texto muito long...]
```

**Depois:** Campo expande conforme necessário
```
[Tarefa com texto muito longo  ]
[que agora aparece em múltiplas]
[linhas sem cortar nada        ]
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/auto-resize-textarea.tsx` | Criar novo componente |
| `src/components/modes/BacklogMode.tsx` | Usar o novo componente nos campos de descrição |

## Detalhes Técnicos

### 1. Novo Componente AutoResizeTextarea

```typescript
// src/components/ui/auto-resize-textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps 
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement, 
  AutoResizeTextareaProps
>(({ className, onChange, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Combinar refs
  React.useImperativeHandle(ref, () => textareaRef.current!);
  
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [props.value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onChange?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-md bg-transparent px-1 py-0 text-sm",
        "resize-none overflow-hidden",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-[1.75rem]", // Altura minima de uma linha
        className
      )}
      onChange={handleChange}
      rows={1}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
```

### 2. Atualizar BacklogMode.tsx

Substituir os `<Input>` de descrição por `<AutoResizeTextarea>`:

**Tarefas (linha ~76):**
```tsx
// Antes
<Input
  value={tarefa.descricao}
  onChange={(e) => onUpdateTarefa(tarefa.id, { descricao: e.target.value })}
  className={cn(
    "flex-1 text-sm h-7 border-none shadow-none px-1 bg-transparent",
    tarefa.completed && "line-through text-muted-foreground"
  )}
/>

// Depois
<AutoResizeTextarea
  value={tarefa.descricao}
  onChange={(e) => onUpdateTarefa(tarefa.id, { descricao: e.target.value })}
  className={cn(
    "flex-1 text-sm border-none shadow-none",
    tarefa.completed && "line-through text-muted-foreground"
  )}
/>
```

**Ideias (linha ~405):**
```tsx
// Antes
<Input
  value={ideia.texto}
  onChange={(e) => onUpdateIdeia(ideia.id, e.target.value)}
  className="flex-1 text-sm h-7 border-none shadow-none px-1 bg-transparent"
/>

// Depois
<AutoResizeTextarea
  value={ideia.texto}
  onChange={(e) => onUpdateIdeia(ideia.id, e.target.value)}
  className="flex-1 text-sm border-none shadow-none"
/>
```

## Comportamento Esperado

1. Campo inicia com altura de uma linha
2. Conforme digita, expande verticalmente
3. Se apagar texto, contrai de volta
4. Sem scroll interno - todo conteúdo visível
5. Mantém estilo visual atual (transparente, sem bordas extras)
