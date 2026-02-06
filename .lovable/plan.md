
# Auto-Geração de Contas a Pagar Fixas + Correção de Bugs

## Resumo das Mudanças

Este plano aborda três problemas principais:

1. Gerar automaticamente contas a pagar baseado nos custos fixos cadastrados
2. Corrigir o bug de itens sumindo nos filtros de conciliação
3. Remover "Custos Defasados" para eliminar duplicidade de inputs

---

## Parte 1: Auto-Geração de Contas Fixas

### Nova Funcionalidade
Quando o usuário abre o Financeiro ou atualiza custos fixos, o sistema gera automaticamente as contas a pagar do mês atual que ainda não existem.

### Regras de Geração

| Categoria | Fonte | Dia de Vencimento |
|-----------|-------|-------------------|
| Pessoas | custosFixosDetalhados.pessoas | 5º dia útil |
| Software | custosFixosDetalhados.software | 23 |
| Ads Base | financeiroData.adsBase | 23 |
| Empréstimos | custosFixosDetalhados.emprestimos | Dia específico de cada um |
| Armazenagem | custosFixosDetalhados.armazenagem | 25 |
| Serviços | custosFixosDetalhados.servicos (por item) | Gioia: 15, Verter: 20, Vegui: 15, Matheus: 25 |
| Impostos | Baseado em faturamento mês anterior | 20 (4 parcelas: 2 DAS + 2 DARF INSS) |

### Novo Campo: Faturamento do Mês Anterior
Para calcular impostos do próximo mês, adicionar campo `faturamentoMesAnterior` em FinanceiroStage:

```text
FinanceiroStage {
  ...
  faturamentoMesAnterior: string;  // Ex: "140000" - base para impostos
}
```

O sistema usa `faturamentoMesAnterior × 16%` para gerar 4 contas:
- 2x DAS (Simples Nacional) = cada uma ~4% do faturamento
- 2x DARF INSS = cada uma ~4% do faturamento

### Lógica de Verificação
Antes de criar, verificar se já existe conta com:
- Mesmo nome/descrição
- Mesmo mês de vencimento
- Não pago

Se já existe, não duplica.

---

## Parte 2: Correção do Bug de Filtros na Conciliação

### Problema Identificado
Quando você aplica filtros no histórico (mês, tipo), os itens de revisão de conciliação desaparecem. Isso acontece porque o `useMemo` que limpa IDs órfãos pode estar removendo IDs prematuramente.

### Solução
O bug está no `ReviewPanel` da `ConciliacaoSection.tsx`. O `useMemo` para limpar IDs órfãos executa mesmo quando não deveria:

```typescript
// PROBLEMA: Este useMemo executa quando lancamentos muda
// e pode estar removendo IDs válidos
useMemo(() => {
  const currentKeys = new Set(
    lancamentos.map(l => `${l.descricao}|${l.valor}|${l.dataVencimento}`)
  );
  // Remove IDs de itens que não existem mais
  stableIdsRef.current.forEach((_, key) => {
    if (!currentKeys.has(key)) {
      stableIdsRef.current.delete(key);
    }
  });
}, [lancamentos]);
```

**Correção**: Usar `useEffect` apenas para cleanup, e garantir que não interfere com re-renders:

```typescript
useEffect(() => {
  // Limpar apenas IDs de itens que realmente saíram da lista
  return () => {
    // Cleanup quando componente desmonta
    stableIdsRef.current.clear();
  };
}, []);
```

---

## Parte 3: Remover Custos Defasados

### Mudanças
1. Remover seção "Custos Defasados" da UI (mas manter dados para retrocompatibilidade)
2. Remover campos:
   - `custosDefasados.impostos` → substituído por faturamentoMesAnterior
   - `custosDefasados.parcelas` → puxado de emprestimos
   - `custosDefasados.estoque` → lançado manualmente em contas a pagar
   - `custosDefasados.outros` → lançado manualmente

3. Os cálculos de projeção usarão:
   - **Saídas próx. 30d** = soma das contas a pagar não pagas com vencimento em 30 dias
   - **Impostos** = calculado automaticamente de `faturamentoMesAnterior × 16%`

---

## Interface Atualizada

### Novo Campo no Financeiro
Adicionar em "PARÂMETROS DO SISTEMA":

```text
┌─────────────────────────────────────────────┐
│ 📊 Base de Impostos (Faturamento Mês Ant.)  │
│ ┌─────────────────────────────────────────┐ │
│ │ R$ 140.000,00                           │ │
│ └─────────────────────────────────────────┘ │
│ Impostos estimados (16%): R$ 22.400,00      │
│ → 4 parcelas de R$ 5.600,00 cada            │
└─────────────────────────────────────────────┘
```

### Botão "Gerar Contas do Mês"
Adicionar botão que:
1. Verifica quais contas fixas já existem para o mês
2. Gera as que faltam
3. Mostra toast com resumo: "12 contas geradas para Fevereiro"

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | Adicionar `faturamentoMesAnterior` em FinanceiroStage |
| `src/components/modes/FinanceiroMode.tsx` | Remover seção Custos Defasados, adicionar campo Faturamento Mês Anterior |
| `src/components/financeiro/ConciliacaoSection.tsx` | Corrigir bug do useMemo que remove IDs |
| `src/utils/gerarContasFixas.ts` | NOVO: Lógica para gerar contas a pagar fixas |
| `src/components/financeiro/GerarContasFixasButton.tsx` | NOVO: Botão para gerar contas do mês |

---

## Fluxo do Usuário

```text
1. Abre Financeiro
        ↓
2. Verifica se há contas fixas pendentes para gerar
        ↓
3. Se sim → Botão "Gerar Contas do Mês" fica destacado
        ↓
4. Clica no botão
        ↓
5. Sistema cria todas as contas pendentes:
   - Pessoas (dia 5)
   - Software (dia 23)
   - Empréstimos (dias específicos)
   - Armazenagem (dia 25)
   - Serviços (dias específicos)
   - Impostos (dia 20, 4 parcelas)
        ↓
6. Contas aparecem em "A Pagar (próx. 30d)"
        ↓
7. Usuário ajusta valores conforme necessário
        ↓
8. Na conciliação, sistema faz match automático
```

---

## Estimativa de Esforço

- Parte 1 (Auto-geração): 4-6 mensagens
- Parte 2 (Bug de filtros): 1-2 mensagens
- Parte 3 (Remover Custos Defasados): 2-3 mensagens

**Total estimado**: 7-11 mensagens

---

## Prioridade Sugerida

1. Primeiro: Corrigir bug de filtros (rápido e libera uso imediato)
2. Segundo: Adicionar campo faturamentoMesAnterior e lógica de geração
3. Terceiro: Remover Custos Defasados da UI
