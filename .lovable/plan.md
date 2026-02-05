
# Plano: Mês na Conciliação + Meta Mensal com Sugestões IA

## Problemas Identificados

### 1. Data da Conciliação Incorreta
O sistema assume automaticamente o mês atual (`new Date()`), mas o extrato colado pode ser de outro mês (ex: janeiro quando estamos em fevereiro).

### 2. Meta de 30 Dias com Cálculo Completo
O MetaVendasCard atual mostra apenas 7 dias. Precisa de uma versão expandida que considere:
- Contas a pagar nos próximos 30 dias
- Custos fixos + marketing estrutural + margem
- Meta de faturamento para cobrir tudo

### 3. Sugestões com IA
Gerar recomendações semanais baseadas na situação financeira atual (ex: "reduzir custo fixo", "fazer ação de vendas levanta-caixa").

---

## Solução 1: Seletor de Mês/Ano na Conciliação

### Interface

```text
┌──────────────────────────────────────────────────────────────────┐
│ 📊 Conciliação Bancária                                         │
├──────────────────────────────────────────────────────────────────┤
│  Mês do extrato: [Janeiro ▼] [2026 ▼]                           │
│                                                                  │
│  Cole seu extrato bancário...                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  💡 Datas sem ano usarão o mês/ano selecionado acima            │
│                              [Processar Extrato]                 │
└──────────────────────────────────────────────────────────────────┘
```

### Mudanças no Código

**ConciliacaoSection.tsx:**
```typescript
// Novo state
const [mesExtrato, setMesExtrato] = useState(new Date().getMonth() + 1);
const [anoExtrato, setAnoExtrato] = useState(new Date().getFullYear());

// Usar no envio
const mesAno = `${mesExtrato}/${anoExtrato}`;
```

**Adicionar selects de mês e ano antes do textarea.**

---

## Solução 2: Card de Meta Mensal (30 dias)

### Novo Componente: MetaMensalCard.tsx

Diferente do MetaVendasCard (7 dias), este mostra o cenário completo mensal.

### Cálculo

```text
CONTAS A PAGAR (próx. 30d)
+ Custos Fixos Mensais
+ Marketing Estrutural
+ Ads Base
─────────────────────────
= SAÍDA MENSAL TOTAL

FATURAMENTO NECESSÁRIO = SAÍDA MENSAL ÷ MARGEM (40%)

Exemplo:
  Contas a pagar 30d: R$ 45.000
  Custo fixo: R$ 25.000
  Marketing estrut.: R$ 8.000
  Ads base: R$ 5.000
  ─────────────────────
  Saída total: R$ 83.000
  
  Faturamento necessário: R$ 83.000 ÷ 0.40 = R$ 207.500
```

### Interface Visual

```text
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 Meta Mensal de Faturamento                    [Pressão Alta]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SAÍDAS PREVISTAS (próx. 30d)                                    │
│  ├── Contas a pagar                   R$ 45.000,00              │
│  ├── Custo fixo                       R$ 25.000,00              │
│  ├── Marketing estrutural             R$ 8.000,00               │
│  └── Ads base                         R$ 5.000,00               │
│  ──────────────────────────────────────────────────────         │
│  TOTAL SAÍDAS                         R$ 83.000,00              │
│                                                                  │
│  Margem operacional                   ÷ 40%                      │
│  ──────────────────────────────────────────────────────         │
│  FATURAMENTO NECESSÁRIO               R$ 207.500,00   ← META    │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 65%                      │
│  Faturado até agora: R$ 135.000 (via FaturamentoCanais)         │
│                                                                  │
│  Meta diária restante: R$ 4.833/dia (15 dias restantes)         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dados Necessários

```typescript
interface MetaMensalData {
  // Saídas
  contasPagar30d: number;
  custoFixo: number;
  marketingEstrutural: number;
  adsBase: number;
  totalSaidas: number;
  
  // Meta
  faturamentoNecessario: number;
  faturadoAtual: number;  // soma dos canais
  progressoPercent: number;
  
  // Projeção
  diasRestantes: number;
  metaDiariaRestante: number;
}
```

---

## Solução 3: Sugestões com IA Semanal

### Novo Componente: SugestoesIACard.tsx

Gera sugestões baseadas na análise da situação financeira atual.

### Interface Visual

```text
┌──────────────────────────────────────────────────────────────────┐
│ 💡 Sugestões da Semana                     [Atualizar com IA]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Baseado na sua situação atual:                                  │
│  • Caixa Livre: R$ 12.500 (Atenção)                             │
│  • Fôlego: 8 dias                                                │
│  • Meta vs Realizado: 65%                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔥 PRIORIDADE ALTA                                          │ │
│  │ Fazer ação de vendas "levanta caixa" - promoção relâmpago   │ │
│  │ de 24-48h com desconto agressivo para gerar entrada rápida  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📉 CUSTO FIXO                                               │ │
│  │ Revisar assinaturas SaaS - cancelar ferramentas pouco       │ │
│  │ utilizadas. Potencial economia: R$ 500-1.500/mês            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📦 ESTOQUE                                                  │ │
│  │ Verificar produtos parados há +60 dias. Criar kit combo     │ │
│  │ para desovar estoque e liberar capital de giro.             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Última atualização: há 2 dias                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Lógica de Geração

**Edge Function: generate-sugestoes**

Recebe o contexto financeiro e gera sugestões personalizadas:

```typescript
const contexto = {
  caixaLivre: 12500,
  folegoDias: 8,
  statusRisco: 'amarelo',
  faturamentoMes: 135000,
  metaMensal: 207500,
  progressoMeta: 0.65,
  custoFixo: 25000,
  marketingEstrutural: 8000,
  contasPagar30d: 45000,
  topCategoriasDespesa: ['Pessoal', 'Marketing', 'Ocupação'],
};

// Prompt para IA
const systemPrompt = `Você é um consultor financeiro para pequenas empresas.
Analise a situação e dê 3-5 sugestões práticas e acionáveis para melhorar o caixa.

Foque em:
1. Ações de curto prazo para levantar caixa (24-72h)
2. Redução de custos fixos
3. Otimização de marketing
4. Gestão de estoque
5. Renegociação de prazos

Cada sugestão deve ser:
- Específica e acionável
- Com potencial impacto estimado
- Priorizada por urgência`;
```

### Armazenamento

Salvar sugestões no state para não regenerar toda hora:

```typescript
interface SugestoesIA {
  sugestoes: {
    tipo: 'urgente' | 'custo' | 'vendas' | 'estoque' | 'marketing';
    titulo: string;
    descricao: string;
    impactoEstimado?: string;
  }[];
  geradoEm: string;  // ISO date
  contextoHash: string;  // Para detectar se precisa atualizar
}

// Adicionar ao FinanceiroStage
sugestoesIA?: SugestoesIA;
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Adicionar seletores de mês/ano |
| `src/components/financeiro/MetaMensalCard.tsx` | **NOVO** - Card de meta mensal completa |
| `src/components/financeiro/SugestoesIACard.tsx` | **NOVO** - Card de sugestões com IA |
| `supabase/functions/generate-sugestoes/index.ts` | **NOVO** - Edge function para gerar sugestões |
| `src/types/focus-mode.ts` | Adicionar SugestoesIA ao FinanceiroStage |
| `src/components/modes/FinanceiroMode.tsx` | Integrar novos cards |

---

## Fluxo de Atualização das Sugestões

```text
1. Usuário abre Financeiro
2. Sistema verifica sugestões existentes:
   - Se < 7 dias e contexto similar → mostra cached
   - Se > 7 dias ou contexto mudou → oferece "Atualizar"
3. Ao clicar "Atualizar":
   - Monta contexto atual
   - Chama Edge Function
   - Salva no state
   - Exibe novas sugestões
```

---

## Sobre o CPV (Custo de Produto Vendido)

O modelo atual usa **fluxo de caixa** - soma das compras pagas no período. É mais simples e adequado para gestão diária.

**Prós do modelo atual:**
- Reflete o que realmente saiu do caixa
- Não precisa de controle de estoque
- Bom para decisões de liquidez

**Contras:**
- Pode distorcer lucro mensal (compra grande em um mês afeta resultado)
- Não mostra margem real por produto

**Sugestão futura (opcional):**
Adicionar campo "CMV Estimado" ou "Margem Média %" para cálculo mais preciso de lucro bruto, sem necessidade de controle de estoque item a item.

---

## Ordem de Implementação

1. **ConciliacaoSection** - Seletores de mês/ano (correção imediata)
2. **MetaMensalCard** - Card de meta mensal completa
3. **SugestoesIACard + Edge Function** - Sugestões com IA
4. **Integração** - Adicionar cards no FinanceiroMode
