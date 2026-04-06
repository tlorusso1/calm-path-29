

## Fix: Reversão no toggle de contas pagas

### Problema resolvido manualmente
Caixa corrigido para R$ 184.868,08. Agora precisamos garantir que o bug não se repita.

### Mudança necessária

**`src/components/modes/FinanceiroMode.tsx`** — função `handleTogglePago`:

1. **Ao marcar como pago**: subtrair (pagar/cartão) ou somar (receber) — manter
2. **Ao desmarcar (desfazer pago)**: reverter a operação — somar de volta (pagar/cartão) ou subtrair (receber)
3. **Remover o guard `caixaAtualNum > 0`** que impede correção quando negativo
4. Toast diferenciado ao desmarcar: "Conta desmarcada → Caixa revertido"

### Lógica simplificada
```typescript
const isExpense = conta.tipo === 'pagar' || conta.tipo === 'cartao';
const valorBase = isExpense ? -valorConta : valorConta;
const ajuste = estaMarcandoPago ? valorBase : -valorBase;
const novoCaixa = caixaAtualNum + ajuste;
```

### Resultado
- Toggle bidirecional: marcar subtrai, desmarcar devolve
- Caixa sempre consistente independente de quantas vezes clica

