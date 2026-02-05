
# Plano: Melhorias UI + Criar Fornecedor + DRE + Faturamento por Canal

## Problemas Identificados

### 1. Campos do Contas a Pagar Muito Pequenos
O `ContaItem.tsx` usa `truncate` para descrições, cortando nomes longos sem permitir visualização completa.

### 2. Conciliação: Precisa Criar Novo Fornecedor + Selecionar Categoria
Atualmente o `FornecedorSelect` só permite selecionar fornecedores existentes. Falta:
- Opção de criar novo fornecedor inline
- Seletor de categoria separado para quando não há fornecedor

### 3. OCR: Às Vezes Só Puxa Primeira Linha
O `extract-documento` extrai múltiplos lançamentos (`toolCalls.filter`), mas pode estar limitado pela IA. Precisa reforçar o prompt para múltiplas linhas.

### 4. Conferir Categorias (Planilha Anexa)
A planilha anexada é a estrutura de DRE com hierarquia: `Tipo > Modalidade > Grupo > Categoria`. Precisa atualizar o sistema para usar essa estrutura.

### 5. DRE (Demonstrativo de Resultado)
Criar um componente que agrupe lançamentos por categoria DRE usando os dados do histórico conciliado.

### 6. Verificar Saídas R$ 49.937
Pode ser problema de parsing de valores ou filtro incorreto no histórico.

### 7. Faturamento por Canal (B2B, Ecom-Nuvem, Shopee, Assinaturas)
Adicionar campos de entrada para faturamento separado por canal, com projeção mensal baseada no ritmo atual.

---

## Arquitetura das Soluções

```text
┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 1: Campos pequenos no ContaItem                       │
│  → Aumentar largura, permitir hover tooltip com texto completo  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 2: Criar fornecedor + selecionar categoria            │
│  → FornecedorSelect: botão "Criar novo" + seletor de categoria  │
│  → CategoriaSelect: dropdown com hierarquia DRE                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 3: OCR só puxa primeira linha                         │
│  → Melhorar prompt para detectar múltiplos lançamentos          │
│  → Retornar array sempre, mesmo com 1 item                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 4: Categorias DRE                                     │
│  → Importar planilha como estrutura de categorias               │
│  → Criar arquivo categorias-dre.ts com hierarquia               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 5: DRE                                                │
│  → DRESection.tsx: agrupa lançamentos por Modalidade > Grupo    │
│  → Mostra totais por categoria e resultado final                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 6: Verificar totais                                   │
│  → Auditar parseValorFlexivel no cálculo do histórico           │
│  → Adicionar logs de debug temporários                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROBLEMA 7: Faturamento por Canal                              │
│  → FaturamentoCanaisCard.tsx: B2B, Nuvem, Shopee, Assinaturas   │
│  → Projeção mensal: (valor atual / dias passados) × 30          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Detalhadas

### 1. ContaItem.tsx - Campos Maiores

**Problema:** Descrição truncada sem visibilidade

**Solução:**
- Aumentar a largura mínima do campo descrição
- Adicionar Tooltip no hover para mostrar texto completo
- Modo edição com Input de largura maior

```typescript
// Antes: truncate simples
<span className="truncate">{conta.descricao}</span>

// Depois: com Tooltip
<Tooltip>
  <TooltipTrigger asChild>
    <span className="truncate max-w-[200px]">{conta.descricao}</span>
  </TooltipTrigger>
  <TooltipContent side="top" className="max-w-[300px]">
    {conta.descricao}
  </TooltipContent>
</Tooltip>
```

### 2. FornecedorSelect - Criar Novo + Categoria

**Novo fluxo:**
1. Usuário digita nome no campo
2. Se não encontrar, aparece botão "Criar [nome]"
3. Ao clicar, abre formulário inline:
   - Nome (preenchido)
   - Seletor de Modalidade
   - Seletor de Grupo (filtrado por modalidade)
   - Seletor de Categoria (filtrado por grupo)
4. Salva novo fornecedor e seleciona automaticamente

**Novo componente: CategoriaSelect**
```typescript
// Hierarquia de categorias para seleção
interface CategoriaSelectProps {
  value?: { modalidade?: string; grupo?: string; categoria?: string };
  onChange: (value: { modalidade: string; grupo: string; categoria: string }) => void;
}
```

### 3. OCR com Múltiplas Linhas

**Problema:** Prompt não enfatiza buscar múltiplos lançamentos

**Solução - extract-documento:**
```typescript
const systemPrompt = `...
IMPORTANTE: Se a imagem contiver MÚLTIPLOS documentos ou lançamentos,
chame a função extract_conta UMA VEZ PARA CADA lançamento encontrado.
Não agrupe lançamentos - extraia cada um separadamente.
...`;
```

### 4. Estrutura de Categorias DRE

**Novo arquivo: `src/data/categorias-dre.ts`**

```typescript
export interface CategoriaDRE {
  tipo: 'RECEITAS' | 'DESPESAS';
  modalidade: string;
  grupo: string;
  categoria: string;
}

export const CATEGORIAS_DRE: CategoriaDRE[] = [
  // RECEITAS
  { tipo: 'RECEITAS', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2B)' },
  { tipo: 'RECEITAS', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2C)' },
  // ... todas as categorias da planilha
  
  // DESPESAS - DEDUÇÕES
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'Devoluções de vendas' },
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'ICMS' },
  // ... etc
];

// Helpers para navegação hierárquica
export function getModalidades(tipo?: 'RECEITAS' | 'DESPESAS'): string[];
export function getGrupos(modalidade: string): string[];
export function getCategorias(grupo: string): string[];
```

### 5. DRE Section

**Novo componente: `DRESection.tsx`**

```typescript
interface DRESectionProps {
  lancamentos: ContaFluxo[];  // Histórico de lançamentos pagos
  mesAno?: string;            // Filtro por período
}

// Estrutura do DRE:
// ┌─────────────────────────────────────────────────────────────┐
// │ 📊 DRE - Resultado do Mês (Janeiro/2026)                    │
// ├─────────────────────────────────────────────────────────────┤
// │ RECEITAS                                                    │
// │   Receitas Diretas                                          │
// │     Clientes Nacionais (B2B)           R$ 45.000,00         │
// │     Clientes Nacionais (B2C)           R$ 62.000,00         │
// │   TOTAL RECEITAS                       R$ 107.000,00        │
// │                                                             │
// │ DEDUÇÕES                                                    │
// │   Deduções da receita                                       │
// │     ICMS                               R$ -5.000,00         │
// │     Simples Nacional                   R$ -8.000,00         │
// │   TOTAL DEDUÇÕES                       R$ -13.000,00        │
// │                                                             │
// │ RECEITA LÍQUIDA                        R$ 94.000,00         │
// │                                                             │
// │ CUSTOS DE PRODUTO VENDIDO                                   │
// │   Estoque/Custos                                            │
// │     Compra de Matéria Prima            R$ -25.000,00        │
// │     Embalagens                         R$ -3.000,00         │
// │   TOTAL CPV                            R$ -28.000,00        │
// │                                                             │
// │ LUCRO BRUTO                            R$ 66.000,00         │
// │ ...                                                         │
// │ RESULTADO OPERACIONAL                  R$ 12.500,00         │
// └─────────────────────────────────────────────────────────────┘
```

### 6. Auditoria de Totais

**Verificar em ContasFluxoSection:**
```typescript
// Adicionar log para debug
console.log('Contas pagas:', contasPagas.map(c => ({
  desc: c.descricao.substring(0, 30),
  valor: c.valor,
  parsed: parseValorFlexivel(c.valor),
  tipo: c.tipo
})));
console.log('Total saídas calculado:', totalSaidas);
```

**Possível problema:** Lançamentos sendo duplicados ou parsing incorreto

### 7. Faturamento por Canal

**Novo componente: `FaturamentoCanaisCard.tsx`**

```typescript
interface FaturamentoCanais {
  b2b: string;
  ecomNuvem: string;
  ecomShopee: string;
  ecomAssinaturas: string;
  diaDoMes: number;  // Para projeção
}

// Interface Visual:
// ┌─────────────────────────────────────────────────────────────┐
// │ 📈 Faturamento por Canal                                    │
// ├─────────────────────────────────────────────────────────────┤
// │                     Atual        Projeção Mês   % Meta      │
// │ B2B                R$ 25.000    R$ 150.000     75%   ████── │
// │ Nuvem              R$ 12.000    R$ 72.000      60%   ███─── │
// │ Shopee             R$ 5.000     R$ 30.000      50%   ██──── │
// │ Assinaturas (Rits) R$ 3.500     R$ 21.000      70%   ███─── │
// │ ─────────────────────────────────────────────────────────── │
// │ TOTAL              R$ 45.500    R$ 273.000                  │
// └─────────────────────────────────────────────────────────────┘

// Fórmula de projeção:
// projecaoMes = (valorAtual / diaAtual) × diasNoMes
```

**Campos adicionais em FinanceiroStage:**
```typescript
faturamentoCanais?: {
  b2b: string;
  ecomNuvem: string;
  ecomShopee: string;
  ecomAssinaturas: string;
};
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/financeiro/ContaItem.tsx` | Tooltip no hover, campo maior |
| `src/components/financeiro/FornecedorSelect.tsx` | Botão criar novo, formulário inline |
| `src/components/financeiro/CategoriaSelect.tsx` | **NOVO** - Seletor hierárquico de categoria |
| `src/data/categorias-dre.ts` | **NOVO** - Estrutura de categorias DRE |
| `src/components/financeiro/DRESection.tsx` | **NOVO** - Componente de DRE |
| `src/components/financeiro/FaturamentoCanaisCard.tsx` | **NOVO** - Faturamento por canal |
| `src/types/focus-mode.ts` | Adicionar `faturamentoCanais` em FinanceiroStage |
| `supabase/functions/extract-documento/index.ts` | Melhorar prompt para múltiplas linhas |
| `src/components/financeiro/ConciliacaoSection.tsx` | Integrar CategoriaSelect no ReviewItem |
| `src/components/modes/FinanceiroMode.tsx` | Integrar DRE e FaturamentoCanais |

---

## Fluxo de Criação de Novo Fornecedor

```text
1. Usuário na Conciliação vê item sem fornecedor
2. Digita nome no FornecedorSelect
3. Não encontra match
4. Clica em "Criar [nome digitado]"
5. Abre formulário inline:
   ┌────────────────────────────────────────┐
   │ Novo Fornecedor                        │
   │ Nome: [PIX FULANO SILVA]               │
   │ Modalidade: [▼ DESPESAS COMERCIAIS]    │
   │ Grupo: [▼ Despesas de Marketing]       │
   │ Categoria: [▼ Influencers]             │
   │ [Cancelar]  [Salvar e Selecionar]      │
   └────────────────────────────────────────┘
6. Salva fornecedor no state (financeiroData.fornecedores)
7. Seleciona automaticamente o novo fornecedor
8. Lançamento fica classificado
```

---

## Estrutura Completa do DRE

Baseado na planilha anexada:

```text
RECEITAS
├── Receitas Diretas
│   ├── Clientes Nacionais (B2B)
│   ├── Receita Inter Company
│   └── Clientes Nacionais (B2C)
└── Receitas Financeiras
    ├── Rendimentos de Aplicações
    └── Estornos de pagamentos

DEDUÇÕES
└── Deduções da receita
    ├── Devoluções de vendas
    ├── ICMS
    ├── Simples Nacional (DAS)
    ├── PIS E COFINS
    └── Taxas sobre vendas

CUSTOS DE PRODUTO VENDIDO
└── Estoque/Custos
    ├── Compra de Matéria Prima
    ├── Frete Compra
    ├── Industrialização
    ├── Embalagens
    └── Mercadoria para Revenda

DESPESAS DE PESSOAL
└── Despesas com Pessoal
    ├── Colaboradores PJ
    ├── Salários CLT
    ├── INSS, FGTS, IRRF
    └── Vale Refeição/Alimentação

DESPESAS ADMINISTRATIVAS
├── Despesa com Materiais
├── Despesas com Ocupação e Utilidades
├── Despesas com Tecnologia
├── Despesas Operacionais
├── Obrigações Tributárias
├── Serviços de Consultoria Operacional
└── Despesas com Viagens

DESPESAS COMERCIAIS
├── Despesas de Marketing
│   ├── Influencers
│   ├── Criadores de Conteúdo
│   ├── Anuncios Online
│   └── Materiais Impressos
└── Despesas de Vendas
    ├── Frete Venda
    ├── Brindes
    └── Fullfilment

DESPESAS FINANCEIRAS
└── Despesas Financeiras / Bancos
    ├── Tarifas Bancárias
    ├── Taxas de Cartão
    └── Juros sobre Empréstimo

ATIVIDADES NÃO OPERACIONAIS
├── Pesquisa e Desenvolvimento
├── Distribuição de Lucros
├── Bens Móveis
└── Emprestimos e Financiamentos

IMPOSTOS
└── Impostos sobre o lucro
```

---

## Ordem de Implementação

1. **Categorias DRE** - Base para todo o resto
2. **ContaItem maior** - Correção visual rápida
3. **CategoriaSelect** - Componente reutilizável
4. **FornecedorSelect atualizado** - Criar novo fornecedor
5. **ConciliacaoSection** - Integrar categoria quando não tem fornecedor
6. **DRESection** - Relatório completo
7. **FaturamentoCanaisCard** - Faturamento por canal
8. **OCR melhorado** - Múltiplas linhas
9. **Auditoria de totais** - Debug dos R$ 49.937
