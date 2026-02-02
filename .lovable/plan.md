
# Plano: Persistência do Financeiro + Contas Bancárias + Médias 90D no Marketing

## Resumo Executivo

Este plano aborda três grandes melhorias solicitadas:

1. **Corrigir persistência do Financeiro**: Os dados estruturais (faturamento, custos, caixa) estão sendo apagados diariamente - apenas os checklists diários devem resetar
2. **Adicionar contas bancárias detalhadas**: Separar o "Caixa Atual" em contas individuais para melhor controle
3. **Adicionar campos de Média 90D no Marketing**: Email, Social e Influencers com médias de 90 dias para comparação

---

## 1. Corrigir Persistência do Financeiro

### O Problema

Atualmente no arquivo `src/hooks/useFocusModes.ts`, o Financeiro reseta completamente quando muda o dia:

```typescript
// Linha 172-174 - PROBLEMA
} else {
  updatedModes[id] = createDefaultMode(id); // Apaga TUDO
}
```

### A Solução

Preservar os dados estruturais do Financeiro e resetar apenas os checklists diários:

**Alteração em `src/hooks/useFocusModes.ts`:**

```typescript
if (id === 'financeiro') {
  const existingData = state.modes.financeiro?.financeiroData;
  updatedModes[id] = {
    ...createDefaultMode(id),
    financeiroData: {
      ...existingData,  // Mantém faturamento, custos, caixa, contas
      checklistDiario: {  // Reseta apenas o checklist diário
        atualizouCaixa: false,
        olhouResultado: false,
        decidiu: false,
      },
    },
  };
}
```

---

## 2. Adicionar Contas Bancárias Detalhadas

### Novas Contas Solicitadas

O usuário pediu para detalhar o caixa por conta:

| Conta | Campos |
|-------|--------|
| ITAU NICE FOODS | Saldo + CDB |
| ITAU NICE ECOM | Saldo + CDB |
| ASAAS | Saldo + A receber |
| NUVEM | Saldo + A receber |
| PAGAR.ME | Saldo + A receber |
| MERCADO PAGO ECOM | Disponível + Saldo total |

### Alterações Necessárias

**Em `src/types/focus-mode.ts`:**

Nova interface para contas:

```typescript
export interface ContaBancaria {
  saldo: string;
  cdb?: string;      // Para Itaú
  aReceber?: string; // Para gateways
}

export interface FinanceiroContas {
  itauNiceFoods: ContaBancaria;
  itauNiceEcom: ContaBancaria;
  asaas: ContaBancaria;
  nuvem: ContaBancaria;
  pagarMe: ContaBancaria;
  mercadoPagoEcom: ContaBancaria;
}
```

Adicionar ao `FinanceiroStage`:
```typescript
contas?: FinanceiroContas;
```

**Em `src/components/modes/FinanceiroMode.tsx`:**

- Nova seção colapsável "Contas Bancárias"
- Grid com inputs para cada conta
- Cálculo automático de:
  - **Caixa Atual** = Soma de todos os saldos + CDBs + Disponíveis
  - **A Receber** = Soma de todos os "a receber"

---

## 3. Adicionar Médias 90D no Marketing

### Novos Campos Solicitados

**E-mail (semanal e média 90D):**
- Enviados
- % Abertura
- % Conversões (novo campo)

**Social (semanal e média 90D):**
- Posts publicados
- Taxa engajamento (%)
- Alcance total semana
- Média últimas semanas

**Influencers:**
- Código cupom (novo campo no cadastro)

**Pedidos:**
- Pedidos da semana anterior (já existe)
- Média pedidos/sem 90D (novo campo)

### Comportamento das Médias 90D

1. **No início**: Usuário preenche manualmente (não tem histórico)
2. **Depois de ~12 semanas**: Sistema calcula automaticamente baseado no histórico de snapshots semanais

### Alterações Necessárias

**Em `src/types/focus-mode.ts`:**

Adicionar ao `MarketingOrganico`:
```typescript
// E-mail - novos campos
emailConversoes: string;
// Médias 90D (preenchidas manualmente no início)
media90d: {
  emailEnviados: string;
  emailAbertura: string;
  emailConversoes: string;
  postsPublicados: string;
  taxaEngajamento: string;
  alcanceTotal: string;
  pedidosSemana: string;
};
```

Adicionar ao `MarketingInfluencer`:
```typescript
codigoCupom: string;
```

**Em `src/components/modes/MarketingMode.tsx`:**

Reorganizar seções:
- Cada pilar (Email, Social, Influencers) terá:
  - "SEMANA" - dados da semana atual
  - "MÉDIA 90D" - dados de referência (manual ou calculado)

---

## 4. Pre-Reunião Geral - Resumo

Já traz resumo dos 3 pilares (Financeiro, Estoque, Demanda). Apenas confirmar que está funcionando corretamente.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useFocusModes.ts` | Lógica de persistência do Financeiro |
| `src/types/focus-mode.ts` | Novos tipos para contas e médias 90D |
| `src/components/modes/FinanceiroMode.tsx` | Nova seção de contas bancárias |
| `src/components/modes/MarketingMode.tsx` | Campos de média 90D e código cupom |
| `src/utils/modeStatusCalculator.ts` | Cálculos de caixa total e a receber |

---

## Comportamento do Ads

Confirmando: quando você muda o valor de Ads Base ou o caixa, o sistema recalcula os limites automaticamente (Ads Máximo, Incremento Permitido, etc.). Se os valores não estão mudando quando você edita, pode haver um bug no cálculo que preciso investigar.

---

## Ordem de Implementação

1. Corrigir persistência do Financeiro (crítico)
2. Adicionar contas bancárias detalhadas
3. Adicionar campos de média 90D no Marketing
4. Verificar comportamento do Ads
