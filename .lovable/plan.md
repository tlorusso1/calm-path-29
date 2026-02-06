

# Correção de Bugs: Sumiço de Contas + Layout Responsivo

## Diagnóstico Final

### Problema 1: Contas Desaparecem ao Clicar em Badges

**Causa Raiz Identificada:**
Quando você clica no badge de tipo (🔴 SAÍDA), ele faz "cycling" entre tipos:
`pagar` → `receber` → `intercompany` → `aplicacao` → `resgate` → `cartao`

As listas de "Vence Hoje" e "Atrasadas" só exibem contas dos tipos:
- `tipo === 'pagar'` 
- `tipo === 'receber'`

**Se a conta muda para `intercompany`, `aplicacao`, `resgate` ou `cartao`, ela SOME da visualização** porque não existe grupo para esses tipos nas listas de pendentes.

**A conta NÃO foi deletada** - está no banco de dados. Apenas não está sendo exibida.

**Solução:**
1. Adicionar grupos para os outros tipos (intercompany, aplicacao, etc) nas listas de pendentes
2. OU criar um grupo "Outras Movimentações" que agrupa todos os tipos que não são pagar/receber
3. Adicionar `e.stopPropagation()` aos cliques em badges para não abrir o editor acidentalmente

### Problema 2: Layout Apertado

O layout responsivo foi planejado mas pode não ter sido aplicado completamente. Vou verificar e garantir que:
- Em mobile: campos empilham verticalmente
- Badges e valor ficam em linha separada da descrição
- Formulário de adição usa grid responsivo

---

## Mudanças Planejadas

### ContasFluxoSection.tsx

1. **Criar filtros para todos os tipos:**
```typescript
// Adicionar filtro para outros tipos
const contasOutrasHoje = contasHoje.filter(c => 
  c.tipo !== 'pagar' && c.tipo !== 'receber'
);
const contasOutrasAtrasadas = contasAtrasadas.filter(c => 
  c.tipo !== 'pagar' && c.tipo !== 'receber'
);
const contasOutrasFuturas = contasFuturas.filter(c => 
  c.tipo !== 'pagar' && c.tipo !== 'receber'
);
```

2. **Renderizar seção "Outras Movimentações"** para que contas intercompany, aplicações, etc apareçam nas listas de pendentes

### ContaItem.tsx

1. **Prevenir propagação de clique no badge "vence hoje":**
```tsx
{status === 'hoje' && (
  <Badge 
    variant="secondary" 
    className="text-[10px] bg-yellow-100 text-yellow-700 shrink-0"
    onClick={(e) => e.stopPropagation()} // Previne abrir editor
  >
    vence hoje
  </Badge>
)}
```

2. **Confirmar layout responsivo aplicado:**
- Wrapper com `flex-wrap`
- Primeira div com `w-full sm:w-auto sm:flex-1`
- Segunda div com `w-full sm:w-auto`

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/ContasFluxoSection.tsx` | Adicionar grupo "Outras Movimentações" para tipos não-pagar/receber |
| `src/components/financeiro/ContaItem.tsx` | Adicionar `stopPropagation` aos badges clicáveis, confirmar layout responsivo |

---

## Estimativa

- Bug de sumiço de contas: 1-2 mensagens
- Layout responsivo: já implementado, verificar se precisa ajuste fino

