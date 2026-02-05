
# Plano: Histórico de Conciliação + Meta de Vendas Semanal

## Resumo

O usuário precisa de:
1. **Acessar o que foi conciliado** - visualizar lançamentos pagos/conciliados
2. **Saber quanto precisa vender por semana** para pagar as contas

---

## Funcionalidade 1: Seção de Histórico (Contas Pagas)

### Problema Atual
As contas marcadas como `pago: true` simplesmente desaparecem da interface - não há como ver o que já foi pago/conciliado.

### Solução
Adicionar uma seção colapsável **"Histórico"** no `ContasFluxoSection` que mostra:
- Lançamentos pagos dos últimos 30-60 dias
- Indicador visual de conciliado vs. pago manual
- Totais por tipo (entradas x saídas)
- Filtro por categoria/fornecedor (opcional)

### Interface Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📑 Contas a Pagar/Receber                    [12 pendentes] ▼  │
├─────────────────────────────────────────────────────────────────┤
│  [Formulário de adição]                                         │
│  [Seções: Atrasadas | Hoje | Futuras]                          │
│                                                                 │
│  ▶ Histórico (últimos 30d)                           [32 itens] │
│  └─ Quando expandido:                                           │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ RESUMO: Saídas R$ -45.230,00 | Entradas R$ +62.100,00  │  │
│     │         Saldo período: +R$ 16.870,00                   │  │
│     └────────────────────────────────────────────────────────┘  │
│     │ 02/02 PIX ENVIADO FORNECEDOR X      R$ -1.234,56 [conc] │  │
│     │ 01/02 BOLETO PAGO IMPOSTO           R$ -5.000,00 [manual] │
│     │ 31/01 VENDA ECOMMERCE               R$ +2.500,00 [conc] │  │
│     │ ...                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivo a Modificar
- `src/components/financeiro/ContasFluxoSection.tsx`

### Lógica

```typescript
// Separar contas pagas (últimos 30/60 dias)
const contasPagas = contas
  .filter(c => c.pago)
  .filter(c => {
    const data = parseISO(c.dataVencimento);
    return isAfter(data, subDays(hoje, 60));
  })
  .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento)); // Mais recentes primeiro

// Calcular totais
const totalSaidas = contasPagas
  .filter(c => c.tipo === 'pagar')
  .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);

const totalEntradas = contasPagas
  .filter(c => c.tipo === 'receber')
  .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
```

---

## Funcionalidade 2: Meta de Vendas Semanal

### Problema Atual
O usuário não tem uma visão clara de "quanto precisa faturar esta semana para pagar as contas".

### Solução
Criar um **card de Meta de Vendas** que calcula:
- Total de contas a pagar nos próximos 7 dias
- Margem operacional (40%) necessária para cobrir
- Faturamento semanal necessário

### Fórmula

```text
Contas a Pagar (7d) = Soma das contas a pagar vencendo nos próximos 7 dias
Faturamento Necessário = Contas a Pagar ÷ Margem Operacional (40%)
Meta de Vendas = Faturamento Necessário

Exemplo:
  Contas próximos 7d: R$ 8.000
  Faturamento necessário: R$ 8.000 ÷ 0.40 = R$ 20.000
```

### Interface Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Meta de Vendas Semanal                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contas a pagar (próx. 7d)              R$ 8.250,00            │
│  Margem operacional (40%)               ÷ 0,40                  │
│  ─────────────────────────────────────────────────────         │
│  Faturamento necessário                 R$ 20.625,00 ← META    │
│                                                                 │
│  [==============================--------] 75%                   │
│  Progresso: R$ 15.500 de R$ 20.625                             │
│                                                                 │
│  💡 Para sobrar caixa, venda 20% a mais: R$ 24.750             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cálculos Adicionais (opcionais)
- **Por dia**: Meta diária = Meta Semanal ÷ 7
- **Com folga**: Meta + 20% para construir reserva
- **Considerando a receber**: Deduzir valores a receber já confirmados

### Arquivos a Modificar/Criar
- `src/components/financeiro/MetaVendasCard.tsx` (NOVO)
- `src/components/modes/FinanceiroMode.tsx` (integrar o card)

### Dados Necessários

```typescript
interface MetaVendasData {
  contasPagar7d: number;        // Total a pagar nos próximos 7 dias
  contasReceber7d: number;      // Total a receber nos próximos 7 dias
  saldoLiquido7d: number;       // Receber - Pagar
  faturamentoNecessario: number; // Se negativo: quanto precisa vender
  metaDiaria: number;           // Faturamento / 7
  // Progresso (se tiver dado de vendas da semana)
  vendasSemana?: number;
  progressoPercent?: number;
}

function calcularMetaVendas(contas: ContaFluxo[]): MetaVendasData {
  const hoje = startOfDay(new Date());
  const em7dias = addDays(hoje, 7);
  
  const contasProximas = contas.filter(c => {
    if (c.pago) return false;
    const data = parseISO(c.dataVencimento);
    return data >= hoje && data <= em7dias;
  });
  
  const aPagar = contasProximas
    .filter(c => c.tipo === 'pagar')
    .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  
  const aReceber = contasProximas
    .filter(c => c.tipo === 'receber')
    .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  
  const saldoLiquido = aReceber - aPagar;
  
  // Se saldo negativo, precisa vender para cobrir
  const faturamentoNecessario = saldoLiquido < 0 
    ? Math.abs(saldoLiquido) / MARGEM_OPERACIONAL 
    : 0;
  
  return {
    contasPagar7d: aPagar,
    contasReceber7d: aReceber,
    saldoLiquido7d: saldoLiquido,
    faturamentoNecessario,
    metaDiaria: faturamentoNecessario / 7,
  };
}
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/financeiro/ContasFluxoSection.tsx` | Adicionar seção colapsável de Histórico |
| `src/components/financeiro/MetaVendasCard.tsx` | **NOVO** - Card de meta de vendas semanal |
| `src/components/modes/FinanceiroMode.tsx` | Integrar MetaVendasCard na interface |

---

## Estrutura do Histórico

```text
ContasFluxoSection
├── Zona de Drop (OCR)
├── Formulário de Adição
├── ⚠️ Atrasadas (vermelho)
├── 📅 Vence Hoje (amarelo)
├── ⬆️ A Pagar (futuras)
├── ⬇️ A Receber (futuras)
└── 📁 Histórico (NOVO - colapsável)
    ├── Resumo: Entradas x Saídas x Saldo
    └── Lista ordenada por data (mais recente primeiro)
        ├── Indicador [conciliado] ou [manual]
        └── Categoria/Fornecedor se disponível
```

---

## Comportamento do Histórico

1. **Seção colapsada por padrão** (apenas badge com quantidade)
2. **Mostra últimos 30-60 dias** de contas pagas
3. **Resumo no topo**: Total Saídas, Total Entradas, Saldo do Período
4. **Badge visual**:
   - `[conc]` = Veio da conciliação bancária (`conciliado: true`)
   - `[manual]` = Marcado como pago manualmente
   - `[agend]` = Foi agendado e baixou automaticamente
5. **Opção de "Mostrar mais"** se tiver muitos itens

---

## Considerações Técnicas

### Performance
O histórico pode crescer muito. Implementar:
- Limite inicial de 30 itens visíveis
- Botão "Carregar mais" ou paginação
- Possível arquivamento após 60-90 dias

### Persistência
Os dados já estão em `contasFluxo` no state. Não precisa de nova tabela.

### Filtragem (opcional futuro)
- Por categoria (DRE)
- Por fornecedor
- Por período customizado
