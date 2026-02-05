
## Plano de Implementação: Melhorias na Conciliação e Empréstimos

### Problemas Identificados

1. **Layout quebrado no ReviewItem**: O campo de FornecedorSelect está empurrando outros elementos para baixo quando expandido
2. **Não salva mapeamento descrição→fornecedor**: Toda vez que processa o extrato, pergunta o fornecedor novamente para os mesmos tipos de transação
3. **Empréstimos não pré-preenchidos**: O usuário forneceu os dados dos empréstimos mas eles não estão preenchidos automaticamente

---

### Mudanças a Implementar

#### 1. Corrigir Layout do ReviewItem (ConciliacaoSection.tsx)

**Problema**: O dropdown do FornecedorSelect está causando overflow e empurrando elementos.

**Solução**:
- Alterar o container do ReviewItem para usar `overflow-visible` corretamente
- Garantir que o dropdown tenha `z-index` adequado
- Usar layout horizontal fixo em vez de empilhado para o campo de fornecedor e botões

```text
Antes (empilhado):
┌─────────────────────────────────┐
│ Descrição / Data / Valor        │
├─────────────────────────────────┤
│ [Campo Fornecedor ▼]            │ ← Dropdown expande e empurra
│ [+ Adicionar] [Ignorar]         │
└─────────────────────────────────┘

Depois (horizontal fixo):
┌───────────────────────────────────────────────────┐
│ Descrição                                         │
│ Data • Valor                                      │
├───────────────────────────────────────────────────┤
│ [Fornecedor ▼  ]  [+ Adicionar]  [Ignorar]       │
└───────────────────────────────────────────────────┘
```

#### 2. Salvar Mapeamento Descrição→Fornecedor

**Objetivo**: Quando o usuário associa uma descrição bancária a um fornecedor, salvar esse mapeamento para uso futuro.

**Implementação**:
- Adicionar novo tipo `MapeamentoDescricaoFornecedor` que mapeia padrões de descrição para IDs de fornecedor
- Armazenar no `FinanceiroStage.mapeamentosDescricao[]`
- No processamento do extrato, consultar esse mapeamento ANTES de pedir revisão
- Quando o usuário adiciona um lançamento com fornecedor, extrair o padrão da descrição e salvar

```typescript
// Novo tipo em focus-mode.ts
interface MapeamentoDescricaoFornecedor {
  padrao: string;        // Padrão normalizado da descrição (ex: "BOLETO PAGO RNX FIDC")
  fornecedorId: string;  // ID do fornecedor associado
  criadoEm: string;      // ISO date
}

// Adicionar ao FinanceiroStage
mapeamentosDescricao?: MapeamentoDescricaoFornecedor[];
```

**Fluxo**:
1. Processar extrato → verificar mapeamentos existentes
2. Se encontra mapeamento → aplicar automaticamente (não precisa revisão)
3. Se usuário seleciona fornecedor manualmente → salvar mapeamento

#### 3. Pré-preencher Empréstimos

**Dados fornecidos pelo usuário**:

| Empresa | Banco | Produto | Valor Contratado | Saldo Devedor | Taxa Anual | Taxa Mensal | Parcelas Rest. | Total | Parcela Média | Dia Venc. | Venc. Final | Carência |
|---------|-------|---------|------------------|---------------|------------|-------------|----------------|-------|---------------|-----------|-------------|----------|
| NICE FOODS ECOMMERCE LTDA | Itaú | PRONAMPE 2025 | R$ 150.000 | R$ 152.891,69 | 20,76% | 1,73% | 36 | 48 | R$ 4.621,15 | 20 | abr.2029 | 12 meses |
| NICE FOODS ECOMMERCE LTDA | Itaú | PRONAMPE 2026 | R$ 97.376 | R$ 100.699,91 | 20,88% | 1,74% | 48 | 48 | R$ 2.350,52 | 26 | abr.2030 | 3 meses |
| NICE FOODS LTDA | Itaú | PRONAMPE PJ-2026 | R$ 65.734 | R$ 67.977,70 | 20,88% | 1,74% | 48 | 48 | R$ 1.586,72 | 26 | abr.2030 | 3 meses |
| NICE FOODS LTDA | Itaú | PRONAMPE PJ-2025 | R$ 95.000 | R$ 104.278,97 | 20,88% | 1,74% | 48 | 48 | R$ 2.433,07 | 7 | jan.2030 | 12 meses |
| NICE FOODS LTDA | Itaú | PEAC FGI 2025 | R$ 450.000 | R$ 481.110,48 | 28,56% | 2,38% | 48 | 48 | R$ 11.076,37 | 8 | jan.2030 | 5 meses |
| NICE FOODS ECOMMERCE LTDA | Receita Federal | SIMPLES NACIONAL PARCELAMENTO | R$ 34.079,32 | R$ 27.750,92 | - | - | 50 | 60 | R$ 632,84 | 25 | - | - |

**Total parcelas mensais: R$ 22.700,67**

**Implementação**:
- Criar array `DEFAULT_EMPRESTIMOS` em `custos-fixos-default.ts`
- No `FinanceiroMode`, verificar se `custosFixosDetalhados.emprestimos` está vazio
- Se vazio, carregar os defaults automaticamente

---

### Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/types/focus-mode.ts` | Adicionar tipo `MapeamentoDescricaoFornecedor` e campo no `FinanceiroStage` |
| `src/components/financeiro/ConciliacaoSection.tsx` | Corrigir layout ReviewItem + implementar lógica de mapeamento |
| `src/data/custos-fixos-default.ts` | Adicionar `DEFAULT_EMPRESTIMOS` com os 6 empréstimos |
| `src/components/financeiro/CustosFixosCard.tsx` | Carregar defaults se lista vazia |

---

### Detalhes Técnicos

**Extração de padrão da descrição**:
```typescript
function extrairPadraoDescricao(descricao: string): string {
  // Remove números variáveis (datas, valores, IDs)
  // "BOLETO PAGO RNX FIDC MUL 12345" → "BOLETO PAGO RNX FIDC MUL"
  return descricao
    .replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, '')  // Datas
    .replace(/R\$[\s\d.,]+/g, '')               // Valores
    .replace(/\d{5,}/g, '')                     // IDs longos
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
```

**Match de mapeamento**:
```typescript
function encontrarMapeamento(
  descricao: string, 
  mapeamentos: MapeamentoDescricaoFornecedor[]
): string | null {
  const padrao = extrairPadraoDescricao(descricao);
  const match = mapeamentos.find(m => 
    padrao.includes(m.padrao) || m.padrao.includes(padrao)
  );
  return match?.fornecedorId || null;
}
```
