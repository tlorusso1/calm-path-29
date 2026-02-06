
# Permitir Edição de Tipo nas Contas do Histórico

## Problema Identificado
As transações que aparecem no **Histórico** (últimos 60 dias - contas já pagas) não podem ser editadas. Isso causa problemas porque:
- Durante a conciliação bancária, a IA classifica automaticamente algumas transações como "intercompany"
- Mas nem todas são realmente intercompany - algumas são apenas transferências entre contas da mesma empresa
- Uma vez conciliada como paga, **não há como corrigir o tipo**
- Isso causa distorções no DRE e fluxo de caixa

## Situação Atual
```text
┌─────────────────────────────────────────────────────────────────┐
│ Histórico (últimos 60d)                                         │
├─────────────────────────────────────────────────────────────────┤
│ 03/02  PIX Nice Foods   [conc] [inter]     ↔ R$ 7.707,06   🗑   │ ← NÃO EDITA
│ 02/02  Sispag Pix       [conc]               - R$ 570,00   🗑   │ ← NÃO EDITA
│ 02/02  TED Nice F E     [conc] [inter]     ↔ R$ 11.089,36  🗑   │ ← NÃO EDITA
└─────────────────────────────────────────────────────────────────┘
```

## Solução
Adicionar botão de edição em cada item do histórico, similar às contas pendentes, permitindo alterar:
- **Tipo** (Pagar, Receber, Intercompany, Aplicação, Resgate)
- **Natureza** (Operacional vs Estoque)

### Nova Interface
```text
┌─────────────────────────────────────────────────────────────────┐
│ 03/02  PIX Nice Foods   [conc] [inter]     ↔ R$ 7.707,06  ✏️ 🗑 │
│                                                                 │
│ [Click ✏️ abre modo edição:]                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tipo: Receber ▼] [Data] [Descrição] [Valor] [✓] [✕]        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### Arquivo: `src/components/financeiro/ContasFluxoSection.tsx`

#### 1. Substituir renderização manual do histórico por `ContaItem`

**Linhas 603-641** - Trocar a `div` manual pelo componente `ContaItem`:

```typescript
{contasPagas.slice(0, historicoLimit).map((conta) => (
  <ContaItem
    key={conta.id}
    conta={conta}
    variant={conta.tipo}
    fornecedores={fornecedores}
    onUpdate={onUpdateConta || (() => {})}
    onRemove={onRemoveConta}
    // Sem onTogglePago - já está pago
    formatCurrency={formatCurrency}
  />
))}
```

### Arquivo: `src/components/financeiro/ContaItem.tsx`

#### 2. Permitir edição mesmo em contas pagas

**Linha 229-231** - Remover a condição que impede click em contas pagas:

```typescript
// ANTES:
onClick={() => !conta.pago && !conta.agendado && setIsEditing(true)}

// DEPOIS:
onClick={() => setIsEditing(true)}
```

#### 3. Manter cursor pointer para todas as contas

**Linha 229** - Remover condição do cursor:

```typescript
// ANTES:
!conta.pago && !conta.agendado && "cursor-pointer hover:bg-muted/50"

// DEPOIS:
"cursor-pointer hover:bg-muted/50"
```

#### 4. Mostrar botão de edição para contas pagas também

**Linhas 344-356** - Ajustar condição do botão de edição:

```typescript
// ANTES:
{!conta.pago && !conta.agendado && (
  <Button ... Pencil />
)}

// DEPOIS:
<Button
  size="sm"
  variant="ghost"
  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
  onClick={(e) => {
    e.stopPropagation();
    setIsEditing(true);
  }}
>
  <Pencil className="h-3 w-3" />
</Button>
```

---

## Resultado Esperado
- Usuário pode clicar em qualquer transação do histórico para editar
- Pode corrigir tipo de "intercompany" para "receber" ou "pagar"
- Pode ajustar natureza (operacional/estoque) retroativamente
- DRE e fluxo de caixa refletem as classificações corretas

