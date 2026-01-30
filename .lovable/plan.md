
# Separação Visual por Categoria no Backlog

## Proposta

Agrupar tarefas em três seções com headers simples e bordas sutis à esquerda para diferenciar visualmente:

```text
┌─────────────────────────────────────────┐
│ 🟢 HOJE                                 │
├─────────────────────────────────────────┤
│ ▌ [x] Tarefa 1 - 30min                  │
│ ▌ [ ] Tarefa 2 - 1h ★                   │
├─────────────────────────────────────────┤
│ 🔵 PRÓXIMO                              │
├─────────────────────────────────────────┤
│ ▌ [ ] Tarefa 3 - 2h                     │
├─────────────────────────────────────────┤
│ ⚪ DEPOIS                               │
├─────────────────────────────────────────┤
│ ▌ [ ] Tarefa 4 - 15min                  │
│ ▌ [ ] Tarefa 5 - 30min                  │
└─────────────────────────────────────────┘
```

## Diferenciação Visual

| Categoria | Borda Esquerda | Header |
|-----------|----------------|--------|
| Hoje | Verde (`border-l-green-500`) | "HOJE" com fundo leve |
| Próximo | Azul (`border-l-blue-500`) | "PRÓXIMO" com fundo leve |
| Depois | Cinza (`border-l-muted`) | "DEPOIS" com fundo leve |

## Mudanças

### Arquivo: `src/components/modes/BacklogMode.tsx`

**1. Separar tarefas por categoria:**

```typescript
const tarefasHoje = tarefas.filter(t => t.quandoFazer === 'hoje');
const tarefasProximo = tarefas.filter(t => t.quandoFazer === 'proximo');
const tarefasDepois = tarefas.filter(t => t.quandoFazer === 'depois');
```

**2. Criar componente de seção reutilizável:**

```tsx
function TarefaSection({ 
  titulo, 
  tarefas, 
  borderColor,
  bgColor 
}: { 
  titulo: string; 
  tarefas: BacklogTarefa[]; 
  borderColor: string;
  bgColor: string;
}) {
  if (tarefas.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className={cn("text-xs font-medium uppercase tracking-wide px-2 py-1 rounded", bgColor)}>
        {titulo} ({tarefas.length})
      </div>
      {tarefas.map(tarefa => (
        <Card className={cn("border-l-4", borderColor)}>
          {/* Card content existente */}
        </Card>
      ))}
    </div>
  );
}
```

**3. Renderizar as três seções:**

```tsx
<div className="space-y-6">
  <TarefaSection 
    titulo="Hoje" 
    tarefas={tarefasHoje}
    borderColor="border-l-green-500"
    bgColor="bg-green-500/10 text-green-700"
  />
  <TarefaSection 
    titulo="Próximo" 
    tarefas={tarefasProximo}
    borderColor="border-l-blue-500"
    bgColor="bg-blue-500/10 text-blue-700"
  />
  <TarefaSection 
    titulo="Depois" 
    tarefas={tarefasDepois}
    borderColor="border-l-muted"
    bgColor="bg-muted/50 text-muted-foreground"
  />
</div>
```

## Comportamento

- Cada seção só aparece se tiver tarefas
- Ordenação dentro de cada seção: urgentes primeiro, depois não-completas
- Os botões de "Hoje/Próximo/Depois" continuam funcionando para mover entre seções
- Visualmente fica claro onde cada tarefa está sem mudar a estrutura

## Resultado Esperado

- Separação visual clara mas minimalista
- Cores sutis que não distraem
- Contagem de tarefas por seção
- Mantém a simplicidade da interface atual
