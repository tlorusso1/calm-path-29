
# Melhoria de Responsividade no Layout de Contas

## Problema Identificado

O componente `ContaItem.tsx` atualmente exibe todos os elementos em uma única linha:
- Data (12 chars)
- Descrição (truncada)
- Badge de tipo (SAÍDA/ENTRADA)
- Badge "agendado" (opcional)
- Badge "vence hoje" (opcional)
- Badge OP/EST (opcional)
- Valor
- 4 botões de ação (check, calendar, edit, trash)

No mobile e até em telas médias, isso causa sobreposição de elementos.

---

## Solução: Layout Responsivo em 2 Linhas

### Estrutura Proposta

```text
DESKTOP (>768px):
┌─────────────────────────────────────────────────────────────────┐
│ 06/02  Folha: Paola...  🔴 SAÍDA  vence hoje  ⚙️ OP  R$ 5.000  ✓ 📅 ✏️ 🗑 │
└─────────────────────────────────────────────────────────────────┘

MOBILE (<768px):
┌─────────────────────────────────────────────────────────┐
│ 06/02  Folha: Paola Meneguelli                         │
│ 🔴 SAÍDA  vence hoje  ⚙️ OP    R$ 5.000,00  ✓ 📅 🗑    │
└─────────────────────────────────────────────────────────┘
```

### Mudanças no `ContaItem.tsx`

1. **Wrapper com flex-wrap**: Permitir quebra de linha natural
2. **Primeira linha**: Data + Descrição (flex-1, sem truncate em mobile)
3. **Segunda linha (mobile)**: Badges + Valor + Ações
4. **Espaçamento**: Aumentar gap entre elementos

### CSS Responsivo

- `flex-wrap` para permitir quebra
- `w-full` condicional em mobile para forçar nova linha
- Remover `shrink-0` de alguns elementos para permitir compressão
- Aumentar `max-w-[250px]` para `max-w-[300px]` em desktop

---

## Formulário de Adição

O grid atual `grid-cols-12` também está apertado. Proposta:

```text
DESKTOP:
[Tipo 3col] [Descrição 4col] [Valor 2col] [Data 2col] [+1col]

MOBILE (stack vertical):
[Tipo]
[Descrição]
[Valor] [Data]
[+ Adicionar]
```

### Mudanças no `ContasFluxoSection.tsx`

1. Usar classes responsivas: `grid-cols-1 sm:grid-cols-12`
2. Span full-width em mobile: `col-span-1 sm:col-span-3`

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/ContaItem.tsx` | Layout responsivo com 2 linhas em mobile |
| `src/components/financeiro/ContasFluxoSection.tsx` | Grid responsivo no formulário de adição |

---

## Detalhes da Implementação

### ContaItem.tsx - Modo de Visualização

```tsx
// Antes: flex items-center justify-between
// Depois: flex flex-wrap items-center gap-2

<div className="flex flex-wrap items-center gap-2 p-2 ...">
  {/* Linha 1: Data + Descrição */}
  <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
    <span className="text-xs text-muted-foreground shrink-0">06/02</span>
    <span className="truncate sm:max-w-[300px]">Folha: Paola...</span>
  </div>
  
  {/* Linha 2: Badges + Valor + Ações */}
  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
    {/* Badges */}
    <button>🔴 SAÍDA</button>
    <Badge>vence hoje</Badge>
    <button>⚙️ OP</button>
    
    {/* Valor + Ações */}
    <div className="flex items-center gap-1.5 ml-auto">
      <span className="font-medium">R$ 5.000,00</span>
      {/* Botões */}
    </div>
  </div>
</div>
```

### ContaItem.tsx - Modo de Edição

```tsx
// Usar flex-wrap com gap maior
<div className="flex flex-wrap items-center gap-3 p-3 ...">
  <Select className="w-full sm:w-28">...</Select>
  <Input type="date" className="w-full sm:w-28" />
  <Input placeholder="Descrição" className="w-full sm:flex-1 sm:min-w-[200px]" />
  <Input placeholder="R$" className="w-24" />
  <div className="flex gap-1">
    <Button>✓</Button>
    <Button>✕</Button>
  </div>
</div>
```

### ContasFluxoSection.tsx - Formulário

```tsx
// Grid responsivo
<div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 ...">
  <div className="sm:col-span-3">
    <Select>...</Select>
  </div>
  <div className="sm:col-span-4">
    <Input placeholder="Descrição" />
  </div>
  <div className="sm:col-span-2">
    <Input placeholder="R$" />
  </div>
  <div className="sm:col-span-2">
    <Input type="date" />
  </div>
  <div className="sm:col-span-1">
    <Button>+</Button>
  </div>
</div>
```

---

## Resultado Esperado

- **Mobile**: Campos empilham verticalmente, legíveis sem sobreposição
- **Tablet**: Layout híbrido com quebra inteligente
- **Desktop**: Layout horizontal compacto como atualmente, mas com mais respiro
