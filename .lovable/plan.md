
## Plano de Reorganização do Financeiro V3

### Problemas Identificados

1. **UI Confusa** - Mistura de dados estimados e reais sem separação clara
2. **Conciliação com Erros** - Importação falha, some dados, não permite editar
3. **Aplicações classificadas como despesas** - APLICACAO TRUST DI, CDB são investimentos, não despesas
4. **Falta tipo Intercompany na conciliação** - Não está sendo sugerido durante revisão
5. **Pendências não são atualizadas** - Mesmo preenchendo, sistema não marca como resolvido
6. **DRE com dados errados** - Puxa dados incorretos e não tem visão anual
7. **Fluxo de caixa sem projeção diária** - Falta granularidade e previsão baseada em histórico

---

### Solução 1: Reorganizar UI - Separar Estimado vs Real

**Objetivo**: Criar hierarquia visual clara em 3 seções colapsáveis

```text
┌─────────────────────────────────────────────────────┐
│ 📊 EXECUTIVE RESUME (sempre visível)                │
│   Status • Caixa Livre • Queima/dia • Fôlego        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 💰 POSIÇÃO ATUAL (Real - O que temos hoje)         │
│   ├─ Contas Bancárias [collapse]                    │
│   ├─ Contas a Pagar/Receber [collapse]              │
│   └─ Histórico 60d + Por Conta [collapse]           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🔮 PROJEÇÃO (Estimado - O que esperamos)           │
│   ├─ Premissas (Faturamento esperado, Margem)       │
│   ├─ Fluxo de Caixa 30d (gráfico)                   │
│   ├─ Resultado Esperado 30d                         │
│   └─ Projeção Diária (novo) [collapse]              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📈 ANÁLISE (DRE + Relatórios)                      │
│   ├─ DRE Mensal [collapse]                          │
│   ├─ DRE Anual (novo) [collapse]                    │
│   └─ Margem Real Estimada [collapse]                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⚙️ CONFIGURAÇÕES                                   │
│   ├─ Custos Fixos Detalhados [collapse]             │
│   ├─ Custos Defasados [collapse]                    │
│   └─ Conciliação Bancária [collapse]                │
└─────────────────────────────────────────────────────┘
```

---

### Solução 2: Corrigir Conciliação Bancária

**Problema raiz**: A edge function está processando mas os resultados somem porque a lógica de merge/update falha silenciosamente.

**Correções**:
1. **Adicionar debounce e feedback visual** ao processar
2. **Garantir persistência imediata** após cada item adicionado
3. **Melhorar tratamento de erro** com mensagens específicas
4. **Adicionar retry automático** para falhas de rede

**Código atualizado** no `ConciliacaoSection.tsx`:
- Mostrar loading state por item
- Salvar cada lançamento individualmente em vez de batch
- Toast de sucesso/erro por item

---

### Solução 3: Classificar Aplicações Separadamente

**Problema**: APLICACAO TRUST DI, APLICACAO CDB DI, APLICACAO IDSELICEMP INT estão indo para despesas.

**Solução**:
1. Criar nova categoria `movimentacao_financeira` em ContaFluxo
2. Atualizar edge function `extract-extrato` para detectar e classificar:
   - Padrões: APLICACAO, RESGATE, REND PAGO → tipo `movimentacao_financeira`
3. No DRE, excluir movimentações financeiras do cálculo de resultado operacional
4. Exibir em seção separada "Movimentações Financeiras" no histórico

**Novo campo no ContaFluxo**:
```typescript
tipo: 'pagar' | 'receber' | 'intercompany' | 'aplicacao' | 'resgate';
```

**Regras de classificação automática**:
- APLICACAO* → tipo `aplicacao` (saída de caixa, não é despesa)
- RESGATE* → tipo `resgate` (entrada de caixa, não é receita operacional)
- REND PAGO* → ignorar (já está no prompt)

---

### Solução 4: Adicionar Intercompany na Revisão de Conciliação

**Problema**: O select de tipo na revisão não tem opção Intercompany.

**Correção** em `ConciliacaoSection.tsx`:
- Adicionar campo de seleção de tipo no ReviewItem
- Permitir mudar entre: A Pagar, A Receber, Intercompany, Aplicação

---

### Solução 5: Corrigir Sistema de Pendências (Ritmo)

**Problema**: Pendências não atualizam status após preenchimento.

**Análise**: O `ritmoCalculator.ts` verifica timestamps que não são atualizados quando o usuário preenche os campos.

**Correções**:
1. **Caixa atualizado**: Chamar `onUpdateTimestamp('lastCaixaUpdate')` quando input de caixa mudar
2. **Contas hoje revisadas**: Marcar quando usuário abre seção de contas
3. **Conciliação**: Marcar timestamp após processar extrato

**Implementação**:
- Adicionar `useEffect` para detectar mudanças nos campos relevantes
- Chamar `onUpdateTimestamp` automaticamente

---

### Solução 6: Corrigir DRE + Adicionar Visão Anual

**Problemas**:
- Dados errados (puxa lançamentos incorretos)
- Falta visão anual
- Aplicações/resgates confundem resultado

**Correções no DRESection**:
1. **Filtrar por tipo**: Excluir `intercompany`, `aplicacao`, `resgate` do cálculo
2. **Adicionar toggle Mensal/Anual**
3. **Calcular DRE anual** agregando últimos 12 meses
4. **Mostrar breakdown por mês** na visão anual

---

### Solução 7: Projeção de Fluxo Diário (baseada em histórico 90d)

**Novo componente**: `FluxoCaixaDiarioChart`

**Lógica**:
1. Pegar média de entradas e saídas diárias dos últimos 90 dias de lançamentos
2. Projetar saldo dia a dia para os próximos 30 dias
3. Marcar dias em que o saldo ficaria abaixo do caixa mínimo
4. Mostrar curva com tooltip detalhado

**Cálculo**:
```typescript
// Média diária baseada nos últimos 90 dias
const mediaEntradaDiaria = totalEntradas90d / 90;
const mediaSaidaDiaria = totalSaidas90d / 90;

// Projeção
for (let dia = 1; dia <= 30; dia++) {
  saldoProjetado = saldoAnterior + mediaEntradaDiaria - mediaSaidaDiaria;
  // Aplicar contas conhecidas que vencem neste dia
  ...
}
```

---

### Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/types/focus-mode.ts` | Adicionar tipos `aplicacao`, `resgate` ao ContaFluxo |
| `src/components/modes/FinanceiroMode.tsx` | Reorganizar em seções lógicas, adicionar updateTimestamp nos inputs |
| `src/components/financeiro/ConciliacaoSection.tsx` | Corrigir persistência, adicionar select de tipo no ReviewItem |
| `src/components/financeiro/DRESection.tsx` | Filtrar tipos, adicionar toggle anual, mostrar breakdown mensal |
| `src/components/financeiro/FluxoCaixaDiarioChart.tsx` | Novo componente para projeção diária |
| `src/utils/fluxoCaixaCalculator.ts` | Adicionar função para calcular média 90d |
| `supabase/functions/extract-extrato/index.ts` | Classificar APLICACAO/RESGATE como tipos especiais |
| `src/utils/ritmoCalculator.ts` | Ajustar verificação de pendências |

---

### Prioridade de Implementação

1. **CRÍTICO**: Corrigir conciliação (dados somem) + classificação de aplicações
2. **ALTO**: Corrigir sistema de pendências (ritmo)
3. **MÉDIO**: Reorganizar UI em seções
4. **MÉDIO**: DRE com visão anual
5. **BAIXO**: Projeção diária de fluxo

---

### Detalhes Técnicos

**Nova estrutura de tipos para ContaFluxo**:
```typescript
export interface ContaFluxo {
  id: string;
  tipo: 'pagar' | 'receber' | 'intercompany' | 'aplicacao' | 'resgate';
  subtipo?: 'cdb' | 'trust' | 'renda_fixa' | 'outro';
  descricao: string;
  valor: string;
  dataVencimento: string;
  pago?: boolean;
  agendado?: boolean;
  fornecedorId?: string;
  categoria?: string;
  conciliado?: boolean;
}
```

**Regras de classificação automática na edge function**:
```typescript
// Detectar aplicações
const isAplicacao = /APLICACAO|APLIC\.|CDB|TRUST|LCI|LCA|TESOURO/i.test(descricao);
const isResgate = /RESGATE|RESG\./i.test(descricao);
const isIntercompany = /TED.*NICE|PIX.*NICE|TRANSF.*NICE/i.test(descricao);

if (isAplicacao) return { tipo: 'aplicacao', ...resto };
if (isResgate) return { tipo: 'resgate', ...resto };
if (isIntercompany) return { tipo: 'intercompany', ...resto };
```

**Seções colapsáveis no FinanceiroMode**:
```typescript
const [openSections, setOpenSections] = useState({
  // Real
  contas: false,
  fluxoContas: false,
  historico: false,
  // Projeção
  premissas: true,
  fluxoGrafico: true,
  fluxoDiario: false,
  // Análise
  dre: false,
  dreAnual: false,
  margem: false,
  // Config
  custosFixos: false,
  defasados: false,
  conciliacao: false,
});
```

**Atualização automática de timestamps**:
```typescript
// Em FinanceiroMode, detectar mudança no caixa
const prevCaixaRef = useRef(data.caixaAtual);
useEffect(() => {
  if (data.caixaAtual !== prevCaixaRef.current && data.caixaAtual) {
    prevCaixaRef.current = data.caixaAtual;
    onUpdateTimestamp?.('lastCaixaUpdate');
  }
}, [data.caixaAtual, onUpdateTimestamp]);
```
