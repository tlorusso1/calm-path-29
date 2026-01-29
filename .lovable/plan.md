
# Painel Visual de Fluxo de Caixa - 30 dias

## Visão Geral

Transformar o modo Financeiro em um painel visual de fluxo de caixa simplificado, focado em projeção de 30 dias com feedback visual claro.

```text
┌─────────────────────────────────────────────────────┐
│  📊 PREVISÃO DE CAIXA — 30 DIAS                     │
├─────────────────────────────────────────────────────┤
│  1. CAIXA ATUAL                                     │
│     NICE FOODS          R$ ________                 │
│     NICE FOODS ECOM     R$ ________                 │
│     ─────────────────────────────                   │
│     TOTAL CAIXA         R$ XX.XXX                   │
├─────────────────────────────────────────────────────┤
│  2. ENTRADAS PREVISTAS                              │
│     Entrada média conservadora    R$ ________       │
│     Entradas já garantidas        R$ ________       │
│     ─────────────────────────────                   │
│     TOTAL ENTRADAS                R$ XX.XXX        │
├─────────────────────────────────────────────────────┤
│  3. SAÍDAS INEVITÁVEIS                              │
│     Custos fixos mensais          R$ ________       │
│     Operação mínima               R$ ________       │
│     Impostos estimados            R$ ________       │
│     ─────────────────────────────                   │
│     TOTAL SAÍDAS                  R$ XX.XXX        │
├─────────────────────────────────────────────────────┤
│  4. RESULTADO                                       │
│     Saldo projetado = Caixa + Entradas - Saídas    │
│                                                     │
│     ████████████████████░░░░ R$ 42.000 (Verde)     │
│                                                     │
│  5. COMPARATIVO VISUAL                              │
│     Caixa Hoje    ██████████████ R$ 57.000         │
│     Projetado     ██████████░░░░ R$ 42.000         │
└─────────────────────────────────────────────────────┘
```

---

## Mudanças no Modelo de Dados

### Interface `FinanceiroStage` atualizada

Novos campos a adicionar:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `entradaMediaConservadora` | string | Entrada média conservadora do mês |
| `entradasGarantidas` | string | Entradas já garantidas |
| `custosFixosMensais` | string | Custos fixos mensais |
| `operacaoMinima` | string | Custo de operação mínima |
| `impostosEstimados` | string | Impostos estimados |

O campo `saidasInevitaveis` será **removido** (substituído pelos 3 campos detalhados acima).

---

## Cálculos Automáticos

```text
TOTAL CAIXA = caixaNiceFoods + caixaEcommerce

TOTAL ENTRADAS = entradaMediaConservadora + entradasGarantidas

TOTAL SAÍDAS = custosFixosMensais + operacaoMinima + impostosEstimados

SALDO PROJETADO = TOTAL CAIXA + TOTAL ENTRADAS - TOTAL SAÍDAS
```

---

## Status Visual do Saldo

| Condição | Cor | Status |
|----------|-----|--------|
| Saldo >= R$ 50.000 | Verde | Confortável |
| Saldo >= R$ 20.000 e < R$ 50.000 | Amarelo | Atenção |
| Saldo > R$ 0 e < R$ 20.000 | Laranja | Risco |
| Saldo <= R$ 0 | Vermelho | Crítico |

---

## Gráfico Comparativo

Mostrar duas barras horizontais lado a lado:

```text
Caixa Hoje     ████████████████████████░░░░░░  R$ 57.000
Saldo Projetado ████████████████░░░░░░░░░░░░░░  R$ 42.000
```

- Barra proporcional ao valor máximo entre os dois
- Cores diferentes para cada barra (azul para atual, cor do status para projetado)

---

## Arquivos a Modificar

### 1. `src/types/focus-mode.ts`

```typescript
export interface FinanceiroStage {
  // Caixa separado por empresa
  caixaNiceFoods: string;
  caixaEcommerce: string;
  
  // NOVOS: Entradas previstas
  entradaMediaConservadora: string;
  entradasGarantidas: string;
  
  // NOVOS: Saídas detalhadas (substitui saidasInevitaveis)
  custosFixosMensais: string;
  operacaoMinima: string;
  impostosEstimados: string;
  
  // Verificações simplificadas (mantido)
  vencimentos: {
    dda: boolean;
    email: boolean;
    whatsapp: boolean;
    planilha: boolean;
  };
  
  // Itens de vencimento (mantido)
  itensVencimento: ChecklistItem[];
  
  // Agendamento (mantido)
  agendamentoConfirmado: boolean;
  
  // Decisões como texto livre (mantido)
  decisaoPagar: string;
  decisaoSegurar: string;
  decisaoRenegociar: string;
}
```

Atualizar `DEFAULT_FINANCEIRO_DATA`:

```typescript
export const DEFAULT_FINANCEIRO_DATA: FinanceiroStage = {
  caixaNiceFoods: '',
  caixaEcommerce: '',
  entradaMediaConservadora: '',
  entradasGarantidas: '',
  custosFixosMensais: '',
  operacaoMinima: '',
  impostosEstimados: '',
  vencimentos: { ... },
  itensVencimento: [],
  agendamentoConfirmado: false,
  decisaoPagar: '',
  decisaoSegurar: '',
  decisaoRenegociar: '',
};
```

### 2. `src/components/modes/FinanceiroMode.tsx`

Reestruturar completamente para o novo layout:

```text
SEÇÃO: Previsão de Caixa — 30 dias
├── Card principal com borda destacada
│
├── Bloco 1: CAIXA ATUAL
│   ├── Input: NICE FOODS
│   ├── Input: NICE FOODS ECOM
│   └── TOTAL CAIXA (calculado)
│
├── Bloco 2: ENTRADAS PREVISTAS
│   ├── Input: Entrada média conservadora
│   ├── Input: Entradas já garantidas
│   └── TOTAL ENTRADAS (calculado)
│
├── Bloco 3: SAÍDAS INEVITÁVEIS
│   ├── Input: Custos fixos mensais
│   ├── Input: Operação mínima
│   ├── Input: Impostos estimados
│   └── TOTAL SAÍDAS (calculado)
│
├── Bloco 4: RESULTADO
│   ├── Saldo projetado (calculado)
│   ├── Barra de progresso colorida
│   └── Status textual
│
└── Bloco 5: COMPARATIVO VISUAL
    ├── Barra: Caixa Hoje
    └── Barra: Saldo Projetado

SEÇÃO: Checklist de Execução (mantido)
SEÇÃO: Decisão da Semana (mantido)
```

### 3. `src/utils/modeStatusCalculator.ts`

Atualizar campos verificados:

```typescript
export function calculateFinanceiroStatus(data?: FinanceiroStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    (data.caixaNiceFoods ?? '').trim() !== '',
    (data.caixaEcommerce ?? '').trim() !== '',
    // Novos campos de entradas
    (data.entradaMediaConservadora ?? '').trim() !== '' ||
      (data.entradasGarantidas ?? '').trim() !== '',
    // Novos campos de saídas
    (data.custosFixosMensais ?? '').trim() !== '' ||
      (data.operacaoMinima ?? '').trim() !== '' ||
      (data.impostosEstimados ?? '').trim() !== '',
    // Checklist continua igual
    (data.vencimentos?.dda || data.vencimentos?.email || 
      data.vencimentos?.whatsapp || data.vencimentos?.planilha) ?? false,
  ];
  
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'neutral';
  if (filled === fields.length) return 'completed';
  return 'in-progress';
}
```

---

## Detalhes Técnicos

### Função de Status Visual

```typescript
const getSaldoStatus = (saldo: number) => {
  if (saldo >= 50000) return { 
    color: 'bg-green-500', 
    textColor: 'text-green-600',
    label: 'Confortável'
  };
  if (saldo >= 20000) return { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-600',
    label: 'Atenção'
  };
  if (saldo > 0) return { 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600',
    label: 'Risco'
  };
  return { 
    color: 'bg-red-500', 
    textColor: 'text-red-600',
    label: 'Crítico'
  };
};
```

### Componente de Barra Comparativa

```typescript
const BarraComparativa = ({ 
  label, 
  valor, 
  maxValor, 
  corClasse 
}: { 
  label: string; 
  valor: number; 
  maxValor: number; 
  corClasse: string;
}) => {
  const percentage = maxValor > 0 ? (valor / maxValor) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{formatCurrency(valor)}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", corClasse)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};
```

---

## Compatibilidade com Dados Existentes

- O campo `saidasInevitaveis` será mantido temporariamente para compatibilidade
- Novos campos terão valor default vazio
- Dados existentes continuarão funcionando

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────┐
│  📊 PREVISÃO DE CAIXA — 30 DIAS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ CAIXA ATUAL ───────────────────────────────────────┐│
│  │  NICE FOODS              R$ 45.000,00               ││
│  │  NICE FOODS ECOM         R$ 12.000,00               ││
│  │  ───────────────────────────────────────            ││
│  │  TOTAL                   R$ 57.000,00               ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ ENTRADAS PREVISTAS ────────────────────────────────┐│
│  │  Entrada média conservadora    R$ 80.000,00         ││
│  │  Entradas já garantidas        R$ 25.000,00         ││
│  │  ───────────────────────────────────────            ││
│  │  TOTAL                         R$ 105.000,00        ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ SAÍDAS INEVITÁVEIS ────────────────────────────────┐│
│  │  Custos fixos mensais          R$ 45.000,00         ││
│  │  Operação mínima               R$ 30.000,00         ││
│  │  Impostos estimados            R$ 15.000,00         ││
│  │  ───────────────────────────────────────            ││
│  │  TOTAL                         R$ 90.000,00         ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ RESULTADO ─────────────────────────────────────────┐│
│  │                                                     ││
│  │  SALDO PROJETADO              R$ 72.000,00          ││
│  │  ████████████████████████░░░░ (verde)               ││
│  │  ✓ Confortável                                      ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ COMPARATIVO ───────────────────────────────────────┐│
│  │  Caixa Hoje     ████████░░░░░░░ R$ 57.000           ││
│  │  Projetado      ██████████████░ R$ 72.000 ↑        ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  "Este painel governa as decisões da semana."           │
└─────────────────────────────────────────────────────────┘
```

---

## Seções Mantidas (Abaixo do Painel)

O **Checklist de Execução** e **Decisão da Semana** continuam como estão, abaixo do novo painel de previsão de caixa.
