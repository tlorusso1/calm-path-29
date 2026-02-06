
# Melhorar Visualização e Edição do Histórico de Lançamentos

## Problemas Identificados

1. **Badge "pago" desnecessário**: Se está no histórico/conciliado, óbviamente já foi pago - informação redundante
2. **Difícil diferenciar tipos**: Entradas, saídas e intercompany não estão claros visualmente
3. **Edição pouco intuitiva**: Precisa clicar no item para abrir modo edição - não é óbvio
4. **Sem filtros**: Impossível encontrar lançamentos específicos por nome, categoria ou mês

## Solução

### Nova Interface do Histórico

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🕐 Histórico (últimos 60d)                                   [▼]    │
├─────────────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...]  [Jan ▼]  [Todas Categorias ▼]  [Todos Tipos ▼]     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 03/02  PIX Nice Foods        [🔁] ← clicável     R$ 7.707,06 🗑 │ │
│ │        INTER → clicar muda para: SAÍDA, ENTRADA                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 02/02  Sispag Pix            [🔴]                  R$ 570,00 🗑 │ │
│ │                              SAÍDA                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 01/02  Venda B2C Shopee      [🟢]               R$ 2.340,00  🗑 │ │
│ │                              ENTRADA                            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Interações

1. **Badge de Tipo Clicável**: Um único clique no badge alterna entre:
   - 🔴 SAÍDA (pagar)
   - 🟢 ENTRADA (receber) 
   - 🔁 INTER (intercompany)
   - 📈 APLICAÇÃO
   - 📉 RESGATE

2. **Filtros Rápidos**:
   - **Busca por texto**: Filtra descrição
   - **Mês**: Dropdown com meses disponíveis
   - **Categoria DRE**: Dropdown agrupado por modalidade
   - **Tipo**: Todos / Entradas / Saídas / Inter

3. **Remove badge "pago"**: Redundante no contexto de histórico

---

## Mudanças Técnicas

### Arquivo 1: `src/components/financeiro/ContaItem.tsx`

**1. Remover badge "pago" para contas já pagas (linha ~247-250)**

Atualmente mostra:
```tsx
{conta.pago && (
  <Badge>pago</Badge>
)}
```

Remover este bloco - se está no histórico, já é implícito que foi pago.

**2. Adicionar badge de tipo clicável (novo componente inline)**

Após a descrição, adicionar um badge que indica o tipo e permite alternar com um clique:

```tsx
// Novo componente de tipo clicável
const tipoConfig = {
  pagar: { emoji: '🔴', label: 'SAÍDA', next: 'receber' },
  receber: { emoji: '🟢', label: 'ENTRADA', next: 'intercompany' },
  intercompany: { emoji: '🔁', label: 'INTER', next: 'aplicacao' },
  aplicacao: { emoji: '📈', label: 'APLIC', next: 'resgate' },
  resgate: { emoji: '📉', label: 'RESG', next: 'pagar' },
};

<button
  onClick={(e) => {
    e.stopPropagation();
    onUpdate(conta.id, { tipo: tipoConfig[conta.tipo].next });
  }}
  className="px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity"
  title="Clique para alternar tipo"
>
  {tipoConfig[conta.tipo].emoji} {tipoConfig[conta.tipo].label}
</button>
```

**3. Cores do badge por tipo:**
- SAÍDA: `bg-red-100 text-red-700`
- ENTRADA: `bg-green-100 text-green-700`  
- INTER: `bg-blue-100 text-blue-700`
- APLICAÇÃO: `bg-purple-100 text-purple-700`
- RESGATE: `bg-orange-100 text-orange-700`

### Arquivo 2: `src/components/financeiro/ContasFluxoSection.tsx`

**1. Adicionar estados de filtro (após linha ~48)**

```tsx
// Filtros do histórico
const [filtroTexto, setFiltroTexto] = useState('');
const [filtroMes, setFiltroMes] = useState<number | 'todos'>('todos');
const [filtroTipo, setFiltroTipo] = useState<ContaFluxoTipo | 'todos'>('todos');
const [filtroCategoria, setFiltroCategoria] = useState<string | 'todos'>('todos');
```

**2. Filtrar contasPagas no useMemo (linha ~58-134)**

Adicionar lógica de filtro após o `.filter(c => c.pago)`:

```tsx
// Dentro do useMemo, após filtrar por pago e data
let pagas = contas
  .filter(c => c.pago)
  .filter(c => { /* limite 60d */ });

// Aplicar filtros
if (filtroTexto.trim()) {
  const termo = filtroTexto.toLowerCase();
  pagas = pagas.filter(c => c.descricao.toLowerCase().includes(termo));
}

if (filtroMes !== 'todos') {
  pagas = pagas.filter(c => {
    const data = parseISO(c.dataVencimento);
    return data.getMonth() + 1 === filtroMes;
  });
}

if (filtroTipo !== 'todos') {
  pagas = pagas.filter(c => c.tipo === filtroTipo);
}

if (filtroCategoria !== 'todos') {
  // Buscar fornecedor → categoria → modalidade
  pagas = pagas.filter(c => {
    if (!c.fornecedorId) return false;
    const fornecedor = fornecedores.find(f => f.id === c.fornecedorId);
    return fornecedor?.modalidade === filtroCategoria;
  });
}
```

**3. Adicionar barra de filtros na UI do histórico (linha ~598)**

Antes do ScrollArea, inserir:

```tsx
{/* Barra de Filtros */}
<div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border">
  {/* Busca por texto */}
  <div className="relative flex-1 min-w-[150px]">
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    <Input
      placeholder="Buscar..."
      value={filtroTexto}
      onChange={(e) => setFiltroTexto(e.target.value)}
      className="h-8 text-xs pl-7"
    />
  </div>
  
  {/* Filtro por mês */}
  <Select value={String(filtroMes)} onValueChange={(v) => setFiltroMes(v === 'todos' ? 'todos' : Number(v))}>
    <SelectTrigger className="h-8 w-[100px] text-xs">
      <SelectValue placeholder="Mês" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="todos">Todos</SelectItem>
      <SelectItem value="1">Jan</SelectItem>
      <SelectItem value="2">Fev</SelectItem>
      {/* ... etc ... */}
    </SelectContent>
  </Select>
  
  {/* Filtro por tipo */}
  <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
    <SelectTrigger className="h-8 w-[110px] text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="todos">Todos</SelectItem>
      <SelectItem value="receber">🟢 Entradas</SelectItem>
      <SelectItem value="pagar">🔴 Saídas</SelectItem>
      <SelectItem value="intercompany">🔁 Inter</SelectItem>
    </SelectContent>
  </Select>
  
  {/* Filtro por categoria DRE */}
  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
    <SelectTrigger className="h-8 w-[140px] text-xs">
      <SelectValue placeholder="Categoria" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="todos">Todas</SelectItem>
      {ORDEM_MODALIDADES_DRE.map(mod => (
        <SelectItem key={mod} value={mod} className="text-xs">
          {mod}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**4. Atualizar dependências do useMemo**

Adicionar os novos estados de filtro às dependências:

```tsx
}, [contas, hoje, filtroTexto, filtroMes, filtroTipo, filtroCategoria, fornecedores]);
```

---

## Resultado Esperado

1. **Tipo visualmente claro**: Cada lançamento tem badge colorido indicando entrada/saída/inter
2. **Edição com um clique**: Clicar no badge de tipo alterna instantaneamente
3. **Sem informação redundante**: Badge "pago" removido do histórico
4. **Filtros poderosos**: Busca por texto, mês, tipo e categoria DRE
5. **Navegação rápida**: Encontrar lançamentos específicos facilmente
