
# Melhorias no Financeiro + Supply Chain

## Resumo das Features Solicitadas

1. **Entradas Automáticas Estimadas** na projeção diária
2. **Verificação de Duplicatas** (mesmo dia + mesmo valor)
3. **Gráfico com 3 Linhas** (entradas, saídas e saldo)
4. **Layout Maior para ContaItem** (web mais largo, mobile 2 linhas)
5. **Alerta de Caixa Insuficiente** para pagamentos de hoje (popup grande)
6. **Preço de Custo no Supply** + Valor em Estoque + Valor Vendável

---

## 1. Entradas Automáticas Estimadas

### Problema Atual
O gráfico de Projeção Diária usa média de entradas/saídas dos últimos 90d para dias sem contas conhecidas, mas não gera "contas estimadas" visíveis na lista.

### Solução
Adicionar indicador visual no gráfico mostrando quais dias usam dados estimados vs conhecidos:
- Dias com contas reais: ponto sólido
- Dias estimados: ponto tracejado/transparente
- Legenda explicando a diferença

Isso mantém a projeção como está (já funciona) mas deixa mais claro visualmente.

---

## 2. Verificação de Duplicatas

### Nova Funcionalidade
Detectar automaticamente saídas duplicadas (mesmo dia + mesmo valor) e exibir alerta.

### Implementação
Adicionar lógica em `ContasFluxoSection.tsx`:

```text
Regra de Detecção:
- Filtrar contas a pagar não pagas
- Agrupar por (dataVencimento + valor)
- Se grupo.length > 1 → Potencial duplicata

Exibição:
- Badge "⚠️ Possíveis duplicatas" no header da seção
- Clicar abre lista dos itens suspeitos
- Cada item tem botão para remover se for realmente duplicado
```

---

## 3. Gráfico com 3 Linhas

### Mudança no FluxoCaixaDiarioChart

Atualmente mostra apenas 1 área (saldo). Adicionar:

```text
Linha 1 (Verde): Entradas acumuladas
Linha 2 (Vermelha): Saídas acumuladas  
Linha 3 (Azul): Saldo resultante
```

Usar `LineChart` do Recharts com 3 `<Line>` components em vez de `AreaChart`.

---

## 4. Layout Maior para ContaItem

### Web (Desktop)
- Aumentar `max-w-[300px]` para `max-w-[400px]` na descrição
- Garantir que fornecedor apareça sem truncar muito

### Mobile (2 linhas)
Estrutura atual já usa `flex-wrap`, mas precisa forçar quebra:

```text
Linha 1: [Data] [Descrição completa]
Linha 2: [Badge Tipo] [Badge Status] [Valor] [Ações]
```

Usar `w-full` no primeiro grupo para forçar quebra em mobile.

---

## 5. Alerta de Caixa Insuficiente (POPUP GRANDE)

### Funcionalidade
Se existem pagamentos vencendo hoje, verificar se há saldo suficiente nas contas Itaú:
- `ITAU NICE FOODS` (saldo + CDB)
- `ITAU NICE ECOM` (saldo + CDB)

### Lógica

```text
totalPagarHoje = soma de contas a pagar com vencimento hoje
saldoItau = itauNiceFoods.saldo + itauNiceFoods.cdb 
          + itauNiceEcom.saldo + itauNiceEcom.cdb

Se saldoItau < totalPagarHoje:
  → Mostrar DIALOG/POPUP grande vermelho
  → Mensagem: "FALTA CAIXA PARA PAGAMENTOS DE HOJE"
  → Valor faltante: R$ X
  → Sugestão: "Puxar de Asaas, Pagar.me ou Nuvemshop"
  
Se saldoItau < totalPagar5dias:
  → Mostrar alerta secundário sobre próximos 5 dias
```

### Componente
Criar `AlertaCaixaInsuficiente.tsx` que renderiza um `Dialog` modal quando detecta problema.

---

## 6. Preço de Custo no Supply + Valor em Estoque

### Mudanças no ItemEstoque

Adicionar campo no tipo:

```typescript
interface ItemEstoque {
  // ... campos existentes
  precoCusto?: number;  // NOVO: Preço de custo unitário
}
```

### Preços Iniciais (dados fornecidos)

| Produto | Preço Custo |
|---------|-------------|
| NICE Milk Castanha de Caju 450G | R$ 22,60 |
| NICE Milk Aveia 450G | R$ 16,38 |
| NICE Milk Aveia Barista 400G | R$ 17,40 |
| Óleo de Coco | R$ 11,21 |
| Levedura Nutricional 100g | R$ 12,84 |
| ChocoNICE Ao leite vegetal 150G | R$ 17,70 |
| ChocoNICE 70% Cacau 150G | R$ 21,75 |
| ChocoNICE Branco 150G | R$ 18,37 |
| NICE Spices Carbonara 40G | R$ 3,54 |
| NICE Spices Estrogonofe 40G | R$ 3,57 |
| NICE Spices Molho Branco 40G | R$ 3,47 |
| NICE Cheesy Parmesão 40G | R$ 3,06 |
| NICE Milk+ Protein Avelã e Cacau 250G | R$ 28,64 |
| [Food Service] Nice Milk Castanha 3,2KG | R$ 141,38 |
| [Food Service] Nice Milk Castanha 20KG | R$ 870,60 |

### Cálculos na Visão Executiva

```text
Valor em Estoque = Σ (quantidade × precoCusto)
Valor Vendável = Valor em Estoque × 3
```

### UI no SupplyChainMode

Adicionar card no topo:

```text
┌──────────────────────────────────────┐
│ 💰 Valor do Estoque                  │
├──────────────────────────────────────┤
│ Custo Total:     R$ 45.000,00        │
│ Valor Vendável:  R$ 135.000,00       │
│ (Margem 3x)                          │
└──────────────────────────────────────┘
```

### Edição Inline de Preço de Custo
Na lista de itens, adicionar coluna/campo para editar `precoCusto` inline.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | Adicionar `precoCusto` em `ItemEstoque` |
| `src/components/financeiro/FluxoCaixaDiarioChart.tsx` | 3 linhas no gráfico, indicador de estimativa |
| `src/components/financeiro/ContasFluxoSection.tsx` | Detecção de duplicatas, layout expandido |
| `src/components/financeiro/ContaItem.tsx` | Layout 2 linhas mobile, descrição maior |
| `src/components/financeiro/AlertaCaixaInsuficiente.tsx` | NOVO: Popup de alerta caixa |
| `src/components/modes/FinanceiroMode.tsx` | Integrar alerta de caixa |
| `src/components/modes/SupplyChainMode.tsx` | Card valor estoque, campo preço custo |
| `src/utils/supplyCalculator.ts` | Função para calcular valor estoque |

---

## Ordem de Implementação Sugerida

1. **Layout ContaItem** (rápido, melhora UX imediata)
2. **Alerta de Caixa Insuficiente** (crítico para não perder pagamentos)
3. **Gráfico 3 linhas** (visual importante)
4. **Detecção de duplicatas** (previne erros)
5. **Preço de custo Supply** (nova funcionalidade)

---

## Estimativa Total

8-12 mensagens para implementar todas as features.
