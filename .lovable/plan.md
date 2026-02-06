
# Correções para Conciliação e Adição de Soma de Contas a Pagar 30d

## Problemas Identificados

### 1. Falta soma de "Contas a Pagar próx. 30d"
Na seção de Contas a Pagar/Receber, a lista de contas futuras mostra apenas "A Pagar (próx. 30d)" como título, mas **não exibe a soma total** dos valores a pagar nesse período.

### 2. Itens de conciliação somem quando muda o filtro/toggle
O problema está no `ReviewItem`:
- O componente usa `useState` interno para `selectedTipo` e `selectedNatureza`
- Quando o usuário muda o tipo (ex: de "pagar" para "receber"), o Select de Natureza desaparece (porque só aparece para tipo "pagar")
- A **lista pai (`lancamentosParaRevisar`) não é afetada**, mas o React pode estar re-renderizando de forma inesperada

**Causa raiz provável**: O `useMemo` de `valorFormatado` e `dataFormatada` pode estar causando re-render quando a key do item muda. Além disso, a comparação por dados no `handleAddRevisado` pode falhar se o valor for formatado diferente.

### 3. Projeções NÃO usam Caixa Contratado
Analisando `fluxoCaixaCalculator.ts`:
- **Modo Projeção**: Usa `caixaAtual` + resultado semanal estimado (faturamento × margem - custos)
- **Modo Preciso**: Usa `caixaAtual` + soma das contas a pagar/receber por semana

O **Caixa Contratado** (A Receber dos gateways como Nuvemshop D+2, Asaas D+30, etc.) **NÃO é incluído** nas projeções. Isso é correto conceitualmente porque:
- Caixa Contratado = vendas já feitas, aguardando liquidação
- Não são "contas a receber" genéricas, são recebíveis já comprometidos
- Servem para dar "conforto" de liquidez, não para projetar fluxo

---

## Soluções Propostas

### Correção 1: Adicionar soma de Contas a Pagar 30d

**Arquivo**: `src/components/financeiro/ContasFluxoSection.tsx`

Calcular a soma e exibir no header da seção:

```tsx
// Após linha 200, calcular soma
const totalPagar30d = contasPagar.reduce((acc, c) => 
  acc + parseValorFlexivel(c.valor), 0
);
const totalReceber30d = contasReceber.reduce((acc, c) => 
  acc + parseValorFlexivel(c.valor), 0
);

// Na linha 519-521, atualizar o título
<p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
  <ArrowDownCircle className="h-3 w-3 text-destructive" />
  A Pagar (próx. 30d)
  <span className="ml-auto font-semibold text-destructive">
    {formatCurrencyValue(totalPagar30d)}
  </span>
</p>

// Similar para A Receber (linha 543-545)
<p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
  <ArrowUpCircle className="h-3 w-3 text-green-600" />
  A Receber (próx. 30d)
  <span className="ml-auto font-semibold text-green-600">
    {formatCurrencyValue(totalReceber30d)}
  </span>
</p>
```

### Correção 2: Evitar sumiço de itens de conciliação

**Arquivo**: `src/components/financeiro/ConciliacaoSection.tsx`

O problema pode estar na key ou na comparação. Vamos:

1. **Usar key com ID único gerado** ao invés de dados do lançamento:
```tsx
// Adicionar useMemo para gerar IDs estáveis
const lancamentosComId = useMemo(() => 
  lancamentosParaRevisar.map((lanc, idx) => ({
    ...lanc,
    _tempId: `${lanc.descricao.substring(0,10)}-${lanc.valor}-${idx}-${Date.now()}`
  })),
  [lancamentosParaRevisar]
);
```

2. **Garantir que ReviewItem não perca estado** ao mudar toggles:
```tsx
// No ReviewItem, usar useCallback para handlers
const handleTipoChange = useCallback((v: ContaFluxoTipo) => {
  setSelectedTipo(v);
}, []);
```

3. **Mover estado para o componente pai** se necessário (lifting state up)

### Correção 3: Documentar comportamento do Caixa Contratado

O Caixa Contratado **não deve** entrar nas projeções de fluxo de caixa porque:
- Ele já está computado como "vendas realizadas" no faturamento
- Adicionar nas projeções causaria contagem dupla
- Serve apenas como indicador de conforto de liquidez

**Não é necessário mudar o cálculo**, mas podemos adicionar um tooltip explicativo no card de Caixa Contratado.

---

## Mudanças Técnicas Detalhadas

### Arquivo 1: `src/components/financeiro/ContasFluxoSection.tsx`

**Calcular totais** (após linha 200):
```tsx
const totalPagar30d = contasPagar.reduce((acc, c) => 
  acc + parseValorFlexivel(c.valor), 0
);
const totalReceber30d = contasReceber.reduce((acc, c) => 
  acc + parseValorFlexivel(c.valor), 0
);
```

**Exibir no header A Pagar** (linhas 519-522):
```tsx
<p className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-2">
  <span className="flex items-center gap-1">
    <ArrowDownCircle className="h-3 w-3 text-destructive" />
    A Pagar (próx. 30d)
  </span>
  <span className="font-semibold text-destructive">
    {formatCurrencyValue(totalPagar30d)}
  </span>
</p>
```

**Exibir no header A Receber** (linhas 543-546):
```tsx
<p className="text-xs font-medium text-muted-foreground flex items-center justify-between mb-2">
  <span className="flex items-center gap-1">
    <ArrowUpCircle className="h-3 w-3 text-green-600" />
    A Receber (próx. 30d)
  </span>
  <span className="font-semibold text-green-600">
    {formatCurrencyValue(totalReceber30d)}
  </span>
</p>
```

### Arquivo 2: `src/components/financeiro/ConciliacaoSection.tsx`

**Estabilizar keys** usando ID temporário gerado uma vez (linhas 553-566):
```tsx
// Adicionar ref para IDs estáveis
const lancamentoIdsRef = useRef<Map<string, string>>(new Map());

// Gerar ID estável para cada lançamento
const getStableId = (lanc: ExtractedLancamento, idx: number) => {
  const dataKey = `${lanc.descricao}-${lanc.valor}-${lanc.dataVencimento}`;
  if (!lancamentoIdsRef.current.has(dataKey)) {
    lancamentoIdsRef.current.set(dataKey, `review-${Date.now()}-${idx}`);
  }
  return lancamentoIdsRef.current.get(dataKey)!;
};

// No map
{lancamentosParaRevisar.map((lanc, idx) => (
  <div 
    key={getStableId(lanc, idx)}
    style={{ position: 'relative', zIndex: lancamentosParaRevisar.length - idx }}
  >
    <ReviewItem ... />
  </div>
))}
```

**Limpar IDs quando item é removido** (nas funções handleAddRevisado e handleIgnorar):
```tsx
// Remover ID do ref quando item é processado
const dataKey = `${lanc.descricao}-${lanc.valor}-${lanc.dataVencimento}`;
lancamentoIdsRef.current.delete(dataKey);
```

---

## Resultado Esperado

| Item | Antes | Depois |
|------|-------|--------|
| Soma A Pagar 30d | Não exibida | Exibida no header "R$ X.XXX,XX" |
| Soma A Receber 30d | Não exibida | Exibida no header "R$ X.XXX,XX" |
| Toggle natureza na conciliação | Sumia itens | Mantém itens estáveis |
| Toggle tipo na conciliação | Sumia itens | Mantém itens estáveis |
| Caixa Contratado nas projeções | Não incluído | Mantém não incluído (correto) |
