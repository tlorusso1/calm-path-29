
# Plano: Gráfico de Fluxo de Caixa Híbrido no Financeiro

## Objetivo

Adicionar um gráfico de fluxo de caixa ao módulo Financeiro que funciona em dois modos:
1. **Modo Projeção** (sem inputs detalhados): Usa dados já existentes para estimar
2. **Modo Preciso** (com inputs detalhados): Usa contas a pagar/receber com datas

---

## Estratégia Híbrida

```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 FLUXO DE CAIXA (próximos 30 dias)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  R$     ┌────────────────────────────────────────────────────┐ │
│  100k   │    ████                                             │ │
│   80k   │    ████  ████                                       │ │
│   60k   │    ████  ████  ████                                 │ │
│   40k   │    ████  ████  ████  ████  ────────────────────────│ │
│   20k   │    ████  ████  ████  ████  ████████████████████████│ │
│    0k   └────────────────────────────────────────────────────┘ │
│         Hoje   S1    S2    S3    S4                            │
│                                                                 │
│  ⓘ Projeção simplificada (baseada em médias)                   │
│  [+ Adicionar Conta a Pagar/Receber] ← link para seção         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Dados Atuais Disponíveis (Projeção)

Já existem no `FinanceiroStage`:
- `caixaAtual` - Ponto de partida
- `faturamentoEsperado30d` - Entrada esperada (dividir em 4 semanas)
- `custoFixoMensal` - Saída fixa (dividir em 4 semanas)
- `marketingEstrutural` - Saída fixa (dividir em 4 semanas)
- `adsBase` - Saída variável (dividir em 4 semanas)
- `custosDefasados` - Saídas comprometidas com datas específicas

**Cálculo do Modo Projeção:**
```typescript
// Semana 0 = Caixa Atual
// Semana 1-4 = Caixa Anterior + (Entradas - Saídas) / 4

const entradasSemanais = (faturamentoEsperado30d * 0.40) / 4; // Margem
const saidasSemanais = (custoFixo + mktEstrutural + ads) / 4;
const resultadoSemanal = entradasSemanais - saidasSemanais;
```

---

## 2. Nova Estrutura: Contas a Pagar/Receber (Opcional)

Adicionar ao `FinanceiroStage`:

```typescript
export interface ContaFluxo {
  id: string;
  tipo: 'pagar' | 'receber';
  descricao: string;
  valor: string;
  dataVencimento: string;  // ISO date (YYYY-MM-DD)
  pago?: boolean;
}

export interface FinanceiroStage {
  // ... campos existentes ...
  
  // NOVO: Contas detalhadas para fluxo de caixa preciso
  contasFluxo?: ContaFluxo[];
}
```

---

## 3. Lógica Híbrida

```typescript
function calcularFluxoCaixa(data: FinanceiroStage): FluxoCaixaData[] {
  const temContasDetalhadas = (data.contasFluxo?.length ?? 0) > 0;
  
  if (temContasDetalhadas) {
    // MODO PRECISO: Usa contasFluxo com datas reais
    return calcularFluxoPreciso(data);
  } else {
    // MODO PROJEÇÃO: Estima baseado em médias
    return calcularFluxoProjecao(data);
  }
}
```

---

## 4. Interface Visual

### Gráfico de Barras (Recharts)

```typescript
// Já disponível: recharts + ChartContainer
import { BarChart, Bar, XAxis, YAxis, ReferenceLine } from 'recharts';

const dadosGrafico = [
  { semana: 'Hoje', saldo: 85000, cor: 'green' },
  { semana: 'S1', saldo: 72000, cor: 'green' },
  { semana: 'S2', saldo: 58000, cor: 'yellow' },
  { semana: 'S3', saldo: 45000, cor: 'yellow' },
  { semana: 'S4', saldo: 32000, cor: 'red' },
];
```

### Cores Dinâmicas

```text
Verde:   saldo > caixaMinimo
Amarelo: saldo > 0 && saldo < caixaMinimo
Vermelho: saldo <= 0
```

### Linha de Referência

```typescript
<ReferenceLine 
  y={caixaMinimo} 
  stroke="orange" 
  strokeDasharray="3 3"
  label="Mínimo" 
/>
```

---

## 5. Seção de Contas (Collapsible)

Quando clicado em "Adicionar Conta", expande:

```text
┌── 📑 CONTAS A PAGAR/RECEBER ──────────────────────────────────┐
│                                                                │
│  [A Pagar ▼] [Descrição...        ] R$[____] [Data][Adicionar] │
│                                                                │
│  📤 A Pagar (próx. 30d)                                        │
│  ├── 05/02 - Fornecedor X ............... R$ 5.000 [x]        │
│  ├── 10/02 - Cartão Ads ................. R$ 3.200 [x]        │
│  └── 15/02 - Aluguel .................... R$ 4.500 [x]        │
│                                                                │
│  📥 A Receber (próx. 30d)                                      │
│  └── 08/02 - Cliente Y .................. R$ 12.000 [x]       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar `ContaFluxo[]` ao `FinanceiroStage` + defaults |
| `src/components/modes/FinanceiroMode.tsx` | Adicionar seção do gráfico + contas |
| `src/utils/modeStatusCalculator.ts` | Adicionar função `calcularFluxoCaixa()` |
| `src/hooks/useFocusModes.ts` | Adicionar handlers para CRUD de contasFluxo |

---

## 7. Componente do Gráfico

Criar `src/components/financeiro/FluxoCaixaChart.tsx`:

```typescript
interface FluxoCaixaChartProps {
  caixaAtual: number;
  caixaMinimo: number;
  projecoes: { semana: string; saldo: number }[];
  modoProjecao: boolean;  // true = estimado, false = preciso
}

export function FluxoCaixaChart({ ... }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa (30d)</CardTitle>
        {modoProjecao && (
          <Badge variant="outline">Projeção estimada</Badge>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={projecoes}>
            <XAxis dataKey="semana" />
            <YAxis />
            <Bar dataKey="saldo" fill="var(--color-saldo)" />
            <ReferenceLine y={caixaMinimo} stroke="orange" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 8. Fluxo de Uso

1. **Usuário abre Financeiro**
2. **Gráfico aparece** com projeção baseada nos dados existentes
3. **Badge "Projeção estimada"** indica que são médias
4. **Usuário pode clicar** em "Adicionar Conta" para detalhar
5. **Quando adiciona contas**, gráfico muda para "Fluxo real"
6. **Badge muda** para "Baseado em X contas"

---

## 9. Dados do Gráfico em Modo Projeção

Usando os dados que já existem:

```typescript
function calcularFluxoProjecao(data: FinanceiroStage) {
  const caixa = parseCurrency(data.caixaAtual);
  const entradas = parseCurrency(data.faturamentoEsperado30d) * 0.40; // Margem
  const saidas = 
    parseCurrency(data.custoFixoMensal) +
    parseCurrency(data.marketingEstrutural) +
    parseCurrency(data.adsBase);
  
  const resultadoSemanal = (entradas - saidas) / 4;
  
  return [
    { semana: 'Hoje', saldo: caixa },
    { semana: 'S1', saldo: caixa + resultadoSemanal },
    { semana: 'S2', saldo: caixa + (resultadoSemanal * 2) },
    { semana: 'S3', saldo: caixa + (resultadoSemanal * 3) },
    { semana: 'S4', saldo: caixa + (resultadoSemanal * 4) },
  ];
}
```

---

## 10. Dados do Gráfico em Modo Preciso

Quando tem contas detalhadas:

```typescript
function calcularFluxoPreciso(data: FinanceiroStage) {
  const caixa = parseCurrency(data.caixaAtual);
  const contas = data.contasFluxo || [];
  
  // Agrupar por semana
  const hoje = new Date();
  const semanas = [0, 7, 14, 21, 28].map(dias => {
    const dataRef = addDays(hoje, dias);
    return {
      semana: dias === 0 ? 'Hoje' : `S${Math.ceil(dias / 7)}`,
      dataFim: dataRef,
    };
  });
  
  let saldoAcumulado = caixa;
  
  return semanas.map(({ semana, dataFim }, i) => {
    const dataInicio = i === 0 ? hoje : semanas[i - 1].dataFim;
    
    // Somar contas nesse período
    const movimentacao = contas
      .filter(c => {
        const data = parseISO(c.dataVencimento);
        return data >= dataInicio && data < dataFim && !c.pago;
      })
      .reduce((acc, c) => {
        const valor = parseCurrency(c.valor);
        return acc + (c.tipo === 'receber' ? valor : -valor);
      }, 0);
    
    saldoAcumulado += movimentacao;
    
    return { semana, saldo: saldoAcumulado };
  });
}
```

---

## Resultado Final

O Financeiro ganhará uma seção de Fluxo de Caixa que:

1. **Funciona imediatamente** com os dados que você já preenche
2. **Evolui para precisão** quando você adiciona contas específicas
3. **Alerta visualmente** quando o saldo vai cruzar o mínimo
4. **Mantém simplicidade** - não é obrigatório detalhar

---

## Consideracoes Tecnicas

- O gráfico usa `recharts` que já está instalado no projeto
- As contas ficam salvas no mesmo state do Financeiro (persiste no Supabase)
- O cálculo considera a margem operacional de 40% (já definida como constante)
- A seção de contas fica colapsada por padrão para não poluir a interface

