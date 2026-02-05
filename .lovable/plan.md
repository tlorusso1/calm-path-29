

## Plano: Correções Financeiro V3

### Problema 1: Prazos de Liquidação Incorretos

**Arquivo:** `src/components/financeiro/CaixaContratadoCard.tsx`

**Valores Atuais (ERRADOS):**
```typescript
const PRAZOS = {
  nuvemshop: 'D+14',  // ERRADO
  asaas: 'D+7',       // ERRADO
  pagarMe: 'D+14',    // OK
  mercadoPago: 'D+14',
};
```

**Valores Corretos:**
```typescript
const PRAZOS = {
  nuvemshop: 'D+2',   // CORRIGIR
  asaas: 'D+30',      // CORRIGIR
  pagarMe: 'D+14',    // OK
  mercadoPago: 'D+14',
};
```

---

### Problema 2: Edição Inline não permite alterar Tipo

**Arquivo:** `src/components/financeiro/ContaItem.tsx`

**Situação Atual:**
O modo de edição (isEditing) só exibe:
- Input de data
- Input de descrição  
- Input de valor
- Botões Salvar/Cancelar

**Falta:** Select para alterar o tipo (pagar/receber/intercompany/aplicacao/resgate)

**Solução:**
Adicionar um Select no modo de edição para permitir alterar o tipo da conta

**Mudança no código:**
1. Adicionar estado `editTipo` inicializado com `conta.tipo`
2. Adicionar Select no formulário de edição
3. Incluir `tipo` no `handleSave()`

**Layout do formulário de edição atualizado:**
```
[Select Tipo] [Data] [Descrição] [Valor] [✓] [✗]
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/CaixaContratadoCard.tsx` | Corrigir prazos: Nuvemshop D+2, Asaas D+30 |
| `src/components/financeiro/ContaItem.tsx` | Adicionar Select de tipo no modo de edição inline |

---

### Detalhes da Implementação ContaItem

1. **Import adicional:** `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` do shadcn
2. **Novo estado:** `const [editTipo, setEditTipo] = useState(conta.tipo)`
3. **Novo campo no formulário:** Select com opções pagar/receber/intercompany/aplicacao/resgate
4. **handleSave atualizado:** incluir `tipo: editTipo` no objeto de updates
5. **handleCancel atualizado:** resetar `editTipo` para `conta.tipo`

