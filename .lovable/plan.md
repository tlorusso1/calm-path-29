

# Plano: Status Visual + Dar Baixa Manual + Agendamento

## Resumo

Adicionar funcionalidades para controle manual de pagamentos na lista de Contas a Pagar/Receber:
- Botão de **dar baixa** com um clique (marcar como pago)
- **Indicador visual de atraso** (conta vencida muda de cor)
- **Status "Agendado"** - quando marcado, dá baixa automática no dia do vencimento

---

## Mudanças Necessárias

### 1. Atualizar Tipo ContaFluxo

**Arquivo:** `src/types/focus-mode.ts`

Adicionar campo `agendado`:

```typescript
export interface ContaFluxo {
  id: string;
  tipo: 'pagar' | 'receber';
  descricao: string;
  valor: string;
  dataVencimento: string;
  pago?: boolean;
  agendado?: boolean;  // NOVO: indica se foi agendado no banco
}
```

---

### 2. ContaItem: Botões de Ação + Visual de Atraso

**Arquivo:** `src/components/financeiro/ContaItem.tsx`

Adicionar:
- Botão de **check** para dar baixa manual (toggle pago)
- Botão de **calendário** para marcar como agendado
- **Cor vermelha/laranja** para contas vencidas

```text
┌─────────────────────────────────────────────────────────────────┐
│ 30/01  Fornecedor XYZ           R$ 1.234,56  [✓] [📅] [✏️] [🗑] │
│                                                                 │
│ 28/01  Conta Atrasada!          R$ 500,00    [✓] [📅] [✏️] [🗑] │ ← Fundo vermelho
│                                                                 │
│ 05/02  Conta Agendada           R$ 2.000,00  [agendado]   [🗑] │ ← Badge "agendado"
└─────────────────────────────────────────────────────────────────┘
```

**Lógica de cores:**
- **Atrasada** (data < hoje e não pago): fundo vermelho claro
- **Vence hoje**: fundo amarelo claro
- **Agendada**: badge azul "agendado"
- **Normal**: fundo padrão

---

### 3. ContasFluxoSection: Mostrar Contas Atrasadas

**Arquivo:** `src/components/financeiro/ContasFluxoSection.tsx`

Separar contas em 3 grupos:
1. **Atrasadas** (data < hoje, não pago) - destaque vermelho
2. **Hoje** (vence hoje) - destaque amarelo
3. **Futuras** (próximos 30d)

Adicionar nova seção visual:

```text
⚠️ Atrasadas (2)
  [lista vermelha]

📅 Vence Hoje (1)
  [lista amarela]

⬆️ A Pagar (próx. 30d)
  [lista normal]
```

---

### 4. Auto-Baixa de Contas Agendadas

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`

Adicionar `useEffect` para verificar contas agendadas cujo vencimento chegou:

```typescript
useEffect(() => {
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const contasParaDarBaixa = (data.contasFluxo || []).filter(c => 
    c.agendado && 
    !c.pago && 
    c.dataVencimento <= hoje
  );
  
  if (contasParaDarBaixa.length > 0) {
    // Marcar todas como pagas automaticamente
    const contasAtualizadas = (data.contasFluxo || []).map(c => {
      if (contasParaDarBaixa.find(cp => cp.id === c.id)) {
        return { ...c, pago: true };
      }
      return c;
    });
    onUpdateFinanceiroData({ contasFluxo: contasAtualizadas });
    toast.success(`${contasParaDarBaixa.length} conta(s) agendada(s) marcada(s) como paga(s)`);
  }
}, [data.contasFluxo]);
```

---

## Interface Visual do ContaItem

```text
┌─────────────────────────────────────────────────────────────────┐
│  NORMAL (futuro)                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 10/02  Fornecedor ABC    R$ 2.500,00  [✓] [📅] [✏️] [🗑]   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ATRASADA (fundo vermelho)                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 28/01  Boleto Atrasado   R$ 800,00    [✓] [📅] [✏️] [🗑]   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  AGENDADA (badge azul)                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 05/02  Imposto    [agendado]  R$ 1.000,00      [❌] [🗑]   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Legenda:
[✓] = Dar baixa (marcar como pago)
[📅] = Marcar como agendado
[✏️] = Editar
[🗑] = Excluir
[❌] = Desmarcar agendamento
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar campo `agendado?: boolean` ao ContaFluxo |
| `src/components/financeiro/ContaItem.tsx` | Botões de ação, cores por status (atrasado/agendado) |
| `src/components/financeiro/ContasFluxoSection.tsx` | Separar listas por status (atrasadas/hoje/futuras) |
| `src/components/modes/FinanceiroMode.tsx` | Handler `handleToggleAgendado`, auto-baixa de agendadas |

---

## Comportamentos

**Dar Baixa Manual:**
- Clique no [✓] marca como `pago: true`
- Conta some da lista de pendentes
- Vai para seção "Histórico" (se implementada)

**Marcar como Agendado:**
- Clique no [📅] marca `agendado: true`
- Exibe badge "agendado" na linha
- No dia do vencimento, automaticamente marca como pago

**Visual de Atraso:**
- Data < hoje E não pago → fundo vermelho
- Data = hoje → fundo amarelo (atenção)
- Com tooltip "Vencido há X dias"

**Desmarcar Agendamento:**
- Se agendado, botão [❌] remove o agendamento
- Conta volta ao estado normal

