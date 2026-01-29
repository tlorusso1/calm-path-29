
# Reestruturação do Modo Financeiro

## Visão Geral

Reorganizar o modo Financeiro em 3 blocos distintos com hierarquia clara:

```text
+----------------------------------+
|     BLOCO 0: PAINEL DE DECISÃO   |  <-- Contexto estratégico (topo)
|     Caixa + Saídas + Fôlego      |
+----------------------------------+
|  BLOCO 1: CHECKLIST DE EXECUÇÃO  |  <-- Verificações operacionais
|  DDA, Email, WhatsApp, Planilha  |
+----------------------------------+
|   BLOCO 2: DECISÃO DA SEMANA     |  <-- Ações pós-análise
|   Pagar / Segurar / Renegociar   |
+----------------------------------+
|     [Concluído por agora]        |
+----------------------------------+
```

---

## BLOCO 0 — Painel de Decisão (TOPO)

### Estrutura Visual

```text
┌─────────────────────────────────────┐
│  Caixa hoje NICE FOODS      R$ ___  │
│  Caixa hoje NICE FOODS ECOM R$ ___  │
│  ─────────────────────────────────  │
│  TOTAL                      R$ XXX  │
├─────────────────────────────────────┤
│  Saídas inevitáveis (30 dias)       │
│  R$ _______________                 │
├─────────────────────────────────────┤
│  FÔLEGO ESTIMADO           R$ XXX   │
│  ████████████ (barra visual)        │
│                                     │
│  "Este número governa as decisões   │
│   da semana."                       │
└─────────────────────────────────────┘
```

### Campos Novos

Adicionar à interface `FinanceiroStage`:

```typescript
saidasInevitaveis: string;  // Novo campo
```

### Cálculo do Fôlego

```text
Fôlego = TOTAL - Saídas inevitáveis
```

### Feedback Visual (cores)

| Fôlego | Cor |
|--------|-----|
| >= R$ 50.000 | Verde |
| R$ 20.000 - R$ 49.999 | Amarelo |
| < R$ 20.000 | Vermelho |

---

## BLOCO 1 — Checklist de Execução

### Itens do Checklist

1. Verifiquei DDA
2. Verifiquei E-mail
3. Verifiquei WhatsApp
4. Coloquei na planilha (com link clicável)
5. Itens que vencem (campo de adicionar itens)
6. Confirmei o que foi ou não agendado

### Link da Planilha

```text
https://docs.google.com/spreadsheets/d/1xNwAHMM6f8j1NWdWceHks76zLr8zQGHzZ99VHn6VKiM/edit?gid=548762562#gid=548762562
```

### Mudança Visual

- Remover numeração de seções (era 1, 2, 3...)
- Usar títulos de bloco em vez de números
- Este bloco NÃO contém valores monetários (apenas verificações)

---

## BLOCO 2 — Decisão da Semana

### Texto Fixo no Topo

```text
"Preencher apenas após olhar o fôlego."
```

### Campos

- O que vou pagar (textarea)
- O que vou segurar (textarea)
- O que vou renegociar (textarea)

---

## Arquivos a Modificar

### 1. `src/types/focus-mode.ts`

Adicionar novo campo na interface:

```typescript
export interface FinanceiroStage {
  caixaNiceFoods: string;
  caixaEcommerce: string;
  saidasInevitaveis: string;  // NOVO
  // ... resto mantido
}
```

Atualizar `DEFAULT_FINANCEIRO_DATA`:

```typescript
export const DEFAULT_FINANCEIRO_DATA: FinanceiroStage = {
  caixaNiceFoods: '',
  caixaEcommerce: '',
  saidasInevitaveis: '',  // NOVO
  // ... resto mantido
};
```

### 2. `src/components/modes/FinanceiroMode.tsx`

Reestruturar completamente o componente:

```text
BLOCO 0: Painel de Decisão
├── Card com borda destacada
├── Caixa NICE FOODS (input)
├── Caixa NICE FOODS ECOM (input)
├── TOTAL (calculado)
├── Separador
├── Saídas inevitáveis 30 dias (input)
├── Separador
├── FÔLEGO ESTIMADO (calculado)
├── Barra de progresso colorida
└── Texto fixo

BLOCO 1: Checklist de Execução
├── Título "Checklist de Execução"
├── Checkbox: Verifiquei DDA
├── Checkbox: Verifiquei E-mail
├── Checkbox: Verifiquei WhatsApp
├── Checkbox: Coloquei na planilha (com link)
├── Itens que vencem (lista + input)
└── Checkbox: Confirmei agendamento

BLOCO 2: Decisão da Semana
├── Título "Decisão da Semana"
├── Texto: "Preencher apenas após olhar o fôlego."
├── Textarea: O que vou pagar
├── Textarea: O que vou segurar
└── Textarea: O que vou renegociar
```

### 3. `src/utils/modeStatusCalculator.ts`

Atualizar lógica para incluir novo campo:

```typescript
export function calculateFinanceiroStatus(data?: FinanceiroStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    (data.caixaNiceFoods ?? '').trim() !== '',
    (data.caixaEcommerce ?? '').trim() !== '',
    (data.saidasInevitaveis ?? '').trim() !== '',  // NOVO
    (data.vencimentos?.dda || data.vencimentos?.email || 
      data.vencimentos?.whatsapp || data.vencimentos?.planilha) ?? false,
    data.agendamentoConfirmado ?? false,
  ];
  
  // ... resto igual
}
```

---

## Remoção de Seção

A seção "Classificação A/B/C" será **removida**:
- Atualmente aparece quando há itens de vencimento
- Adiciona complexidade desnecessária
- As decisões agora ficam no Bloco 2 (Pagar/Segurar/Renegociar)

---

## Detalhes de Implementação

### Cálculo do Fôlego com Cores

```typescript
const getFolegoStatus = (folego: number) => {
  if (folego >= 50000) return { color: 'bg-green-500', label: 'Confortável' };
  if (folego >= 20000) return { color: 'bg-yellow-500', label: 'Atenção' };
  return { color: 'bg-red-500', label: 'Crítico' };
};
```

### Link da Planilha

O checkbox "Coloquei na planilha" terá um ícone de link externo:

```typescript
<a 
  href="https://docs.google.com/spreadsheets/d/1xNwAHMM6f8j1NWdWceHks76zLr8zQGHzZ99VHn6VKiM/edit?gid=548762562#gid=548762562"
  target="_blank"
  rel="noopener noreferrer"
  className="text-primary hover:underline"
>
  <ExternalLink className="h-3 w-3 inline ml-1" />
</a>
```

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────┐
│  📊 PAINEL DE DECISÃO                       │
│                                             │
│  Caixa hoje NICE FOODS        R$ 45.000,00  │
│  Caixa hoje NICE FOODS ECOM   R$ 12.000,00  │
│  ─────────────────────────────────────────  │
│  TOTAL                        R$ 57.000,00  │
│                                             │
│  Saídas inevitáveis (30 dias)               │
│  R$ 35.000,00                               │
│                                             │
│  FÔLEGO ESTIMADO              R$ 22.000,00  │
│  ███████████░░░░░░ (amarelo)                │
│                                             │
│  "Este número governa as decisões da        │
│   semana."                                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✓ CHECKLIST DE EXECUÇÃO                    │
│                                             │
│  [x] Verifiquei DDA                         │
│  [x] Verifiquei E-mail                      │
│  [ ] Verifiquei WhatsApp                    │
│  [x] Coloquei na planilha 🔗                │
│                                             │
│  Itens que vencem:                          │
│  ┌────────────────────────────────────────┐ │
│  │ [ ] Fornecedor X - R$ 5.000            │ │
│  │ [ ] Conta de luz - R$ 800              │ │
│  └────────────────────────────────────────┘ │
│  [+ Adicionar item]                         │
│                                             │
│  [x] Confirmei o que foi ou não agendado    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  📝 DECISÃO DA SEMANA                       │
│                                             │
│  "Preencher apenas após olhar o fôlego."    │
│                                             │
│  💵 O que vou pagar:                        │
│  ┌────────────────────────────────────────┐ │
│  │ Fornecedor X, conta de luz             │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ⏸️ O que vou segurar:                      │
│  ┌────────────────────────────────────────┐ │
│  │ Compra de estoque                      │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  🤝 O que vou renegociar:                   │
│  ┌────────────────────────────────────────┐ │
│  │ Prazo com fornecedor Y                 │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

       [✓ Concluído por agora]
```

---

## Compatibilidade com Dados Existentes

O novo campo `saidasInevitaveis` terá valor default vazio, garantindo que dados existentes no banco continuem funcionando sem problemas.
