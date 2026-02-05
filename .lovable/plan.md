

## Plano: Separar Capital de Giro de Despesas Operacionais

### Diagnóstico Confirmado

Você acertou no ponto: **compras de estoque (capital de giro)** estão sendo tratadas como **despesas operacionais** no cálculo da meta de faturamento, inflando artificialmente a meta necessária.

**Exemplo real:**
- Saídas totais: R$ 160k
- Estoque dentro disso: R$ 60k
- Hoje: 160k ÷ 0,4 = **R$ 400k** de meta ❌
- Correto: 100k ÷ 0,4 = **R$ 250k** de meta ✅

### Solução Proposta

Usar a **estrutura DRE existente** para separar automaticamente:
- Contas com `fornecedorId` cuja modalidade = `CUSTOS DE PRODUTO VENDIDO` → **Capital de Giro** (não impacta meta)
- Demais contas → **Despesas Operacionais** (impacta meta)

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | Adicionar constante `MODALIDADES_CAPITAL_GIRO` |
| `src/utils/fluxoCaixaCalculator.ts` | Criar função `isCapitalGiro()` |
| `src/components/financeiro/MetaMensalCard.tsx` | Separar saídas operacionais vs capital de giro |
| `src/components/financeiro/ContaItem.tsx` | Exibir badge visual de "Capital de Giro" |

---

### Detalhes da Implementação

#### 1. Constante de Modalidades (focus-mode.ts)

```typescript
// Modalidades que representam Capital de Giro (não impactam meta de faturamento)
export const MODALIDADES_CAPITAL_GIRO = [
  'CUSTOS DE PRODUTO VENDIDO', // Compra matéria-prima, embalagens, etc.
];
```

#### 2. Função Helper (fluxoCaixaCalculator.ts)

```typescript
import { ContaFluxo, Fornecedor, MODALIDADES_CAPITAL_GIRO } from '@/types/focus-mode';

export function isCapitalGiro(
  conta: ContaFluxo, 
  fornecedores: Fornecedor[]
): boolean {
  // Se não tem fornecedor atrelado, considera despesa operacional
  if (!conta.fornecedorId) return false;
  
  const fornecedor = fornecedores.find(f => f.id === conta.fornecedorId);
  if (!fornecedor) return false;
  
  return MODALIDADES_CAPITAL_GIRO.includes(fornecedor.modalidade);
}
```

#### 3. Cálculo Corrigido (MetaMensalCard.tsx)

```typescript
// Receber fornecedores como prop
interface MetaMensalCardProps {
  // ...existentes
  fornecedores?: Fornecedor[];
}

// No cálculo:
const { contasOperacionais30d, capitalGiro30d } = contasFluxo
  .filter(c => {
    if (c.pago) return false;
    if (c.tipo !== 'pagar') return false;
    return c.dataVencimento >= hojeStr && c.dataVencimento <= em30diasStr;
  })
  .reduce((acc, c) => {
    const valor = parseValorFlexivel(c.valor);
    if (isCapitalGiro(c, fornecedores || [])) {
      acc.capitalGiro30d += valor;
    } else {
      acc.contasOperacionais30d += valor;
    }
    return acc;
  }, { contasOperacionais30d: 0, capitalGiro30d: 0 });

// META usa APENAS saídas operacionais
const totalSaidasOperacionais = contasOperacionais30d + custoFixo + mktEstrutural + ads;
const faturamentoNecessario = totalSaidasOperacionais / MARGEM_OPERACIONAL;

// NECESSIDADE DE CAIXA inclui TUDO (para stress test)
const necessidadeCaixa30d = contasOperacionais30d + capitalGiro30d + custoFixo + mktEstrutural + ads;
```

#### 4. Exibição no Card (dois totais)

```text
┌─ Saídas Previstas (próx. 30d) ────────────────┐
│                                               │
│ OPERACIONAIS (impactam meta):                 │
│   ├── Contas operacionais    R$ 40.000        │
│   ├── Custo fixo             R$ 50.000        │
│   ├── Marketing estrutural   R$ 5.000         │
│   └── Ads base               R$ 5.000         │
│   TOTAL OPERACIONAL          R$ 100.000       │
│                                               │
│ CAPITAL DE GIRO (não impacta meta):           │
│   └── Estoque/Insumos        R$ 60.000        │
│                                               │
│ ═══════════════════════════════════════════   │
│ META DE FATURAMENTO          R$ 250.000       │
│ (100k ÷ 40%)                                  │
│                                               │
│ NECESSIDADE DE CAIXA 30d     R$ 160.000       │
│ (inclui capital de giro)                      │
└───────────────────────────────────────────────┘
```

#### 5. Badge Visual no ContaItem

Para contas classificadas como Capital de Giro, exibir badge:

```tsx
{isCapitalGiro(conta, fornecedores) && (
  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
    💰 Capital de Giro
  </Badge>
)}
```

---

### Fluxo de Funcionamento

```text
1. Usuário importa extrato ou adiciona conta manualmente
2. Na conciliação, seleciona fornecedor (ex: "Supermix" → CUSTOS DE PRODUTO VENDIDO)
3. Sistema detecta automaticamente que é Capital de Giro
4. Na Meta Mensal:
   - Saída operacional: NÃO inclui essa conta
   - Necessidade de caixa: INCLUI essa conta
5. Meta de faturamento fica realista
6. Pressão de caixa permanece visível (não some o dinheiro necessário)
```

---

### Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Total Saídas | R$ 160k | - |
| Saídas Operacionais | - | R$ 100k |
| Capital de Giro | - | R$ 60k |
| Meta Faturamento | R$ 400k | **R$ 250k** |
| Pressão | Alta ❌ | Saudável ✅ |

---

### Extensão Futura (Opcional)

Se quiser ir além:
1. Indicador **Giro de Estoque (dias)** = Capital de Giro / (Faturamento ÷ 30)
2. Vincular com **prazo médio de recebimento** dos canais
3. Mostrar "Quanto de estoque já virou faturamento"

