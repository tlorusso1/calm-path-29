

# Plano: Mapeamento Detalhado de Custos Fixos

## Problema Atual
O sistema tem apenas **um campo único** (`custoFixoMensal`) sem visibilidade de onde o dinheiro vai. Isso impede decisões racionais de corte.

## Solução: Breakdown Estruturado de Custos Fixos

### Estrutura de Dados Proposta

Com base nos dados fornecidos, criar 5 categorias principais:

```
┌────────────────────────────────────────────────────────────────────┐
│ 💰 CUSTOS FIXOS DETALHADOS                    R$ 56.800/mês       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  👥 PESSOAS                                   R$ 22.269,38         │
│  ├── Paola - Distribuição lucros              R$ 5.000,00         │
│  ├── Paola - Pró-labore                       R$ 1.351,02         │
│  ├── Thiago - Distribuição lucros             R$ 8.000,00         │
│  ├── Thiago - Pró-labore                      R$ 1.351,02         │
│  ├── Gabrielle - CLT                          R$ 1.901,87         │
│  ├── Julia - CLT                              R$ 1.282,87         │
│  ├── Amanda - PJ                              R$ 2.382,60         │
│  └── Geral - Auxílios                         R$ 1.000,00         │
│                                                                    │
│  💻 SOFTWARE                                  R$ 2.862,19          │
│  ├── Bling (ERP Ecom)                         R$ 450,00           │
│  ├── Tiny B2B (x2)                            R$ 324,84           │
│  ├── Nuvemshop                                R$ 394,00           │
│  ├── Google GSUITE                            R$ 560,00           │
│  ├── Perfit (Email MKT)                       R$ 476,00           │
│  ├── Empreender.com                           R$ 169,51           │
│  ├── Adobe                                    R$ 124,00           │
│  └── Outros (+7)                              R$ 363,84           │
│                                                                    │
│  📣 MARKETING ESTRUTURAL                      R$ 22.000,00         │
│  ├── Vegui - Influencer                       R$ 1.500,00         │
│  ├── Matheus - Conteúdo                       R$ 2.500,00         │
│  ├── Ads (Meta + Google)                      R$ 15.000,00  ⚠️    │
│  └── Impressos                                R$ 1.000,00         │
│                                                                    │
│  🔧 SERVIÇOS                                  R$ 8.000,00          │
│  ├── Gioia (Contabilidade)                    R$ 3.000,00         │
│  └── Verter (Consultoria)                     R$ 5.000,00         │
│                                                                    │
│  📦 ARMAZENAGEM                               R$ 1.800,00          │
│  └── Galpão/Estoque                           R$ 1.800,00         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novos Tipos em `src/types/focus-mode.ts`

```typescript
// Item individual de custo fixo
export interface CustoFixoItem {
  id: string;
  nome: string;
  valor: number;
  tipo: 'fixo' | 'variavel' | 'cortavel';  // Classificação para decisão
  notas?: string;
}

// Categoria de custo fixo
export interface CustoFixoCategoria {
  id: 'pessoas' | 'software' | 'marketing' | 'servicos' | 'armazenagem';
  nome: string;
  icone: string;
  itens: CustoFixoItem[];
  total: number;  // Calculado automaticamente
}

// Estrutura completa de custos fixos
export interface CustosFixosDetalhados {
  pessoas: CustoFixoItem[];
  software: CustoFixoItem[];
  marketing: CustoFixoItem[];  // Marketing ESTRUTURAL (não Ads)
  servicos: CustoFixoItem[];
  armazenagem: CustoFixoItem[];
  totalGeral: number;  // Calculado
}
```

### 2. Adicionar ao `FinanceiroStage`

```typescript
export interface FinanceiroStage {
  // ... campos existentes
  
  // NOVO: Custos Fixos Detalhados
  custosFixosDetalhados?: CustosFixosDetalhados;
}
```

### 3. Novo Componente: `CustosFixosCard.tsx`

**Arquivo:** `src/components/financeiro/CustosFixosCard.tsx`

Features:
- Collapsible por categoria
- Edição inline de valores
- Adicionar/remover itens
- Badge de "cortável" para destacar custos não essenciais
- Total automático por categoria e geral
- Comparação com mês anterior (se houver histórico)

```
┌─────────────────────────────────────────────────────────┐
│ 💰 Custos Fixos Detalhados          Total: R$ 56.800   │
│                                                         │
│ ▼ 👥 Pessoas                                R$ 22.269  │
│   ┌──────────────────────────────────────────────────┐ │
│   │ Paola - Dist. Lucros    [R$ 5.000,00]  [🗑️]    │ │
│   │ Thiago - Dist. Lucros   [R$ 8.000,00]  [🗑️]    │ │
│   │ ...                                              │ │
│   │ [+ Adicionar item]                               │ │
│   └──────────────────────────────────────────────────┘ │
│                                                         │
│ ► 💻 Software                               R$ 2.862   │
│ ► 📣 Marketing Estrutural                   R$ 22.000  │
│ ► 🔧 Serviços                               R$ 8.000   │
│ ► 📦 Armazenagem                            R$ 1.800   │
│                                                         │
│ ⚠️ Ads (R$ 15k) está em Marketing.                     │
│    Considere separar para Ads Base no modo Ads.        │
└─────────────────────────────────────────────────────────┘
```

### 4. Defaults com Dados Fornecidos

Pré-popular com os valores informados:

```typescript
export const DEFAULT_CUSTOS_FIXOS: CustosFixosDetalhados = {
  pessoas: [
    { id: '1', nome: 'Paola - Distribuição lucros', valor: 5000, tipo: 'fixo' },
    { id: '2', nome: 'Paola - Pró-labore', valor: 1351.02, tipo: 'fixo' },
    { id: '3', nome: 'Thiago - Distribuição lucros', valor: 8000, tipo: 'fixo' },
    { id: '4', nome: 'Thiago - Pró-labore', valor: 1351.02, tipo: 'fixo' },
    { id: '5', nome: 'Gabrielle - CLT', valor: 1901.87, tipo: 'fixo' },
    { id: '6', nome: 'Julia - CLT', valor: 1282.87, tipo: 'fixo' },
    { id: '7', nome: 'Amanda - PJ', valor: 2382.60, tipo: 'cortavel' },
    { id: '8', nome: 'Geral - Auxílios', valor: 1250, tipo: 'cortavel' },
  ],
  software: [
    { id: 's1', nome: 'Bling (ERP Ecom)', valor: 450, tipo: 'fixo' },
    { id: 's2', nome: 'Tiny B2B (x2)', valor: 324.84, tipo: 'fixo' },
    { id: 's3', nome: 'Nuvemshop', valor: 394, tipo: 'fixo' },
    { id: 's4', nome: 'Google GSUITE', valor: 560, tipo: 'fixo' },
    { id: 's5', nome: 'Perfit (Email MKT)', valor: 476, tipo: 'cortavel' },
    { id: 's6', nome: 'Empreender.com', valor: 169.51, tipo: 'cortavel' },
    { id: 's7', nome: 'Adobe', valor: 124, tipo: 'cortavel' },
    { id: 's8', nome: 'Canva', valor: 44.99, tipo: 'cortavel' },
    { id: 's9', nome: 'Claspo.io', valor: 48.04, tipo: 'cortavel' },
    { id: 's10', nome: 'Cashing', valor: 99.90, tipo: 'cortavel' },
    { id: 's11', nome: 'Pluga', valor: 89, tipo: 'cortavel' },
    { id: 's12', nome: 'Chipbot', valor: 49.01, tipo: 'cortavel' },
    { id: 's13', nome: 'ML nível 6', valor: 17.99, tipo: 'fixo' },
    { id: 's14', nome: 'Apple iCloud', valor: 14.90, tipo: 'cortavel' },
  ],
  marketing: [
    { id: 'm1', nome: 'Vegui - Influencer', valor: 1500, tipo: 'cortavel' },
    { id: 'm2', nome: 'Matheus - Conteúdo', valor: 2500, tipo: 'cortavel' },
    { id: 'm3', nome: 'Impressos', valor: 1000, tipo: 'cortavel' },
    // Ads Base vai para campo separado (já existe)
  ],
  servicos: [
    { id: 'sv1', nome: 'Gioia - Contabilidade', valor: 3000, tipo: 'fixo' },
    { id: 'sv2', nome: 'Verter - Consultoria', valor: 5000, tipo: 'cortavel' },
  ],
  armazenagem: [
    { id: 'a1', nome: 'Galpão/Estoque', valor: 1800, tipo: 'fixo' },
  ],
  totalGeral: 0, // Calculado
};
```

### 5. Integração com Cálculos Existentes

- O total de `custosFixosDetalhados` substitui o campo `custoFixoMensal`
- Separar Marketing Estrutural dos custos fixos gerais
- Ads Base continua separado (já existe no sistema)

### 6. Análise de Corte (Feature Extra)

Adicionar seção de análise:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 ANÁLISE PARA CORTE                                   │
│                                                         │
│ Custos cortáveis identificados:          R$ 12.500/mês │
│                                                         │
│ Maior impacto:                                          │
│ • Verter (R$ 5k) - Avaliar ROI da consultoria          │
│ • Vegui + Matheus (R$ 4k) - Reavaliar se gera vendas   │
│ • Perfit (R$ 476) - Comparar com alternativas          │
│                                                         │
│ Softwares redundantes:                                  │
│ • Adobe + Canva (R$ 169) - Manter apenas 1             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar interfaces `CustoFixoItem`, `CustosFixosDetalhados` |
| `src/components/financeiro/CustosFixosCard.tsx` | **NOVO** - Card com breakdown por categoria |
| `src/components/modes/FinanceiroMode.tsx` | Integrar CustosFixosCard, substituir input simples |
| `src/utils/modeStatusCalculator.ts` | Calcular total de custos fixos a partir do breakdown |

---

## Ordem de Implementação

1. Tipos e interface de dados
2. Defaults com dados fornecidos
3. Componente CustosFixosCard
4. Integração no FinanceiroMode
5. (Opcional) Análise de corte

---

## Notas Importantes

### Separação Ads vs Marketing Estrutural

O valor de **R$ 15k de Ads** que você mencionou em Marketing **NÃO** deve entrar nos custos fixos. Ele já está no campo `adsBase` separado. No breakdown:

- **Marketing Estrutural** (custo fixo): Vegui + Matheus + Impressos = R$ 5.000
- **Ads Base** (variável): R$ 15.000 → campo separado

### Distribuição de Lucros

Conforme regra do sistema:
- ✅ Afeta caixa (sai do banco)
- ❌ Não entra no DRE (não é despesa operacional)

No breakdown, manter como "custo fixo de caixa" mas com flag especial para não computar no DRE.

