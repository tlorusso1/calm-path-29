
# Melhorar Layout de Edição dos Lançamentos do Extrato

## Problema
O painel de revisão de lançamentos do extrato está muito "apertado":
- Descrição, tipo, fornecedor e botões estão todos espremidos em duas linhas
- O seletor de fornecedor tem pouco espaço para expandir
- Em telas menores fica ainda pior com `flex-wrap`
- Difícil de identificar e editar cada lançamento

## Layout Atual (Apertado)
```text
┌─────────────────────────────────────────────────────┐
│ PIX ENVIADO PADARIA FULANO 12345   R$ 1.234,56     │
│ 05/02 [A Pagar▼] [Fornecedor...      ] [+Add] [✕]  │
└─────────────────────────────────────────────────────┘
```

## Novo Layout (Mais Espaçado)
```text
┌─────────────────────────────────────────────────────┐
│ 📄 PIX ENVIADO PADARIA FULANO 12345                 │
│                                                     │
│ 📅 05/02/2026        💰 R$ 1.234,56                 │
│                                                     │
│ [🔴 A Pagar ▼]       [Selecionar fornecedor... ▼]  │
│                                                     │
│              [+ Adicionar]     [Ignorar]           │
└─────────────────────────────────────────────────────┘
```

---

## Mudanças

### Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`

**1. Padding e espaçamento do container**
- Aumentar padding de `p-2` para `p-4`
- Aumentar gap entre linhas de `mb-2` para `mb-3`

**2. Linha 1 - Descrição em destaque**
- Descrição em texto maior (`text-sm` ao invés de `text-xs`)
- Adicionar ícone 📄 para identificação visual
- Remover valor dessa linha

**3. Linha 2 - Data e Valor lado a lado**
- Data formatada com ano (dd/MM/yyyy)
- Valor em destaque com cor diferenciada
- Espaçamento adequado entre elementos

**4. Linha 3 - Seletores em linha separada**
- Seletor de Tipo maior (`w-[140px]` ao invés de `w-[110px]`)
- Seletor de Fornecedor com mais espaço (`min-w-[200px]`)
- Altura maior nos seletores (`h-9` ao invés de `h-7`)

**5. Linha 4 - Botões de ação**
- Botões em linha separada para não competir espaço
- Botão "Adicionar" mais proeminente
- Botão "Ignorar" com texto visível (não só ✕)

**6. Z-index dinâmico**
- Wrapper com z-index decrescente para evitar sobreposição de dropdowns
- Corrigir key única para evitar estados residuais após remoção

---

## Detalhes Técnicos

### Novo código do ReviewItem (~linha 582-642):

```typescript
return (
  <div className="p-4 bg-background rounded-lg border space-y-3">
    {/* Linha 1: Descrição */}
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground">📄</span>
      <p className="text-sm font-medium leading-snug flex-1">{lancamento.descricao}</p>
    </div>
    
    {/* Linha 2: Data + Valor */}
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1 text-muted-foreground">
        📅 {dataFormatada}
      </span>
      <span className="font-semibold text-foreground">
        {valorFormatado}
      </span>
    </div>
    
    {/* Linha 3: Seletores */}
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={selectedTipo} onValueChange={...}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        ...
      </Select>
      
      {selectedTipo === 'pagar' && (
        <div className="flex-1 min-w-[200px]">
          <FornecedorSelect ... />
        </div>
      )}
    </div>
    
    {/* Linha 4: Botões de Ação */}
    <div className="flex items-center justify-end gap-2 pt-2 border-t">
      <Button variant="ghost" size="sm" onClick={() => onIgnore(lancamento)}>
        Ignorar
      </Button>
      <Button variant="default" size="sm" onClick={() => onAdd(...)}>
        <Plus className="h-4 w-4 mr-1" />
        Adicionar
      </Button>
    </div>
  </div>
);
```

### Wrapper com z-index dinâmico (~linha 523-534):

```typescript
<div className="space-y-3">
  {lancamentosParaRevisar.map((lanc, idx) => (
    <div 
      key={`${lanc.descricao}-${lanc.valor}-${lanc.dataVencimento}`}
      style={{ position: 'relative', zIndex: lancamentosParaRevisar.length - idx }}
    >
      <ReviewItem
        lancamento={lanc}
        fornecedores={fornecedores}
        onAdd={handleAddRevisado}
        onIgnore={handleIgnorar}
        onCreateFornecedor={onCreateFornecedor}
      />
    </div>
  ))}
</div>
```

---

## Resultado Esperado
- Cada lançamento tem espaço adequado para leitura
- Seletores são maiores e mais fáceis de clicar
- Botões de ação claramente visíveis e acessíveis
- Dropdowns não sobrepõem outros itens incorretamente
- Layout funciona bem em desktop e mobile
