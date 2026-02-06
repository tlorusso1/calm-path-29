
# Adicionar Toggle de Natureza (Estoque/Operacional) Inline

## Problema Atual

Na lista de Contas a Pagar/Receber, cada item tem:
- Badge de **tipo** clicável (🔴 SAÍDA → 🟢 ENTRADA → 🔁 INTER...) ✅
- Badge de **estoque** apenas informativo, aparece só se `ehCapitalGiro = true` ❌

O usuário quer poder **alternar a natureza** (Operacional ↔ Estoque) diretamente na lista, sem entrar em modo de edição.

## Solução

Adicionar um botão clicável de natureza ao lado do badge de tipo, que:
1. Só aparece para contas do tipo "pagar" (despesas)
2. Alterna entre ⚙️ Operacional e 📦 Estoque ao clicar
3. Substitui o badge informativo atual por um botão interativo

### Comportamento Visual

```text
Antes (somente leitura):
┌─────────────────────────────────────────────────────────────────┐
│ 07/01  PIX Thiago Jose  🔴 SAÍDA  📦 Estoque    R$ 8.000,00  🗑️ │
│                                   ↑ badge estático              │
└─────────────────────────────────────────────────────────────────┘

Depois (interativo):
┌─────────────────────────────────────────────────────────────────┐
│ 07/01  PIX Thiago Jose  🔴 SAÍDA  📦 EST        R$ 8.000,00  🗑️ │
│                         ↑ clica    ↑ clica                      │
│                         muda tipo  alterna natureza             │
└─────────────────────────────────────────────────────────────────┘
```

## Mudanças Técnicas

### Arquivo: `src/components/financeiro/ContaItem.tsx`

**1. Substituir badge informativo por botão clicável (linhas 308-320)**

Remover:
```tsx
{ehCapitalGiro && !conta.pago && (
  <Badge variant="outline" className="...">
    <Package className="h-2.5 w-2.5" />
    Estoque
  </Badge>
)}
```

Adicionar (após o badge de tipo, somente para tipo "pagar"):
```tsx
{conta.tipo === 'pagar' && !conta.pago && (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const novaNatureza = conta.natureza === 'capitalGiro' ? 'operacional' : 'capitalGiro';
          onUpdate(conta.id, { natureza: novaNatureza });
        }}
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity shrink-0 flex items-center gap-1",
          conta.natureza === 'capitalGiro' 
            ? "bg-orange-100 text-orange-700" 
            : "bg-gray-100 text-gray-600"
        )}
        title="Clique para alternar natureza"
      >
        {conta.natureza === 'capitalGiro' ? (
          <>📦 EST</>
        ) : (
          <>⚙️ OP</>
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">
      {conta.natureza === 'capitalGiro' 
        ? "Estoque (não impacta meta) — Clique para Operacional" 
        : "Operacional (impacta meta) — Clique para Estoque"}
    </TooltipContent>
  </Tooltip>
)}
```

**2. Para contas pagas no histórico (sem botões de ação)**

Manter o badge informativo para itens pagos, já que não faz sentido editar o histórico:
```tsx
{conta.tipo === 'pagar' && conta.pago && conta.natureza === 'capitalGiro' && (
  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 shrink-0 gap-1">
    <Package className="h-2.5 w-2.5" />
    Estoque
  </Badge>
)}
```

## Resultado Final

| Cenário | Comportamento |
|---------|---------------|
| Conta a pagar (pendente) | Mostra botão clicável ⚙️ OP ou 📦 EST |
| Conta a pagar (paga, histórico) | Mostra badge estático se for Estoque |
| Conta a receber | Não mostra (natureza só aplica a despesas) |
| Tipos intercompany/aplicação/resgate | Não mostra (não afetam meta) |

## Fluxo UX

1. Usuário vê a lista de contas
2. Identifica despesa que deveria ser "Estoque" (ex: compra de insumos)
3. Clica no badge ⚙️ OP → vira 📦 EST
4. Sistema salva automaticamente e atualiza cálculo da meta

Isso elimina a necessidade de entrar em modo de edição só para mudar a classificação.
