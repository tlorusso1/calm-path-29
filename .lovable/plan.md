
# Persistência de Validades no Estoque

## O Problema

Toda vez que você atualiza o estoque (colando lista do Bling), as informações de **validade** e **saída semanal** que você já preencheu são perdidas ou precisam ser reinseridas.

## A Solução

Duas melhorias:

### 1. Preservar Dados ao Importar Lista

Quando você cola uma lista para atualizar quantidades, o sistema vai **manter** as datas de validade e saída semanal que já estavam salvas para aquele item.

**Antes:**
```
Colar lista → Atualiza quantidade → Perde validade
```

**Depois:**
```
Colar lista → Atualiza quantidade → Mantém validade + saída semanal
```

### 2. Alerta de Revisão de Validades

Após importar uma lista, o sistema vai mostrar um alerta perguntando: **"Algum item teve mudança de validade?"** com a lista de itens que têm validade cadastrada para você revisar rapidamente.

```text
+------------------------------------------+
| ✅ 15 itens atualizados                  |
|                                          |
| 📦 Itens com validade cadastrada:        |
|                                          |
| • Manteiga 500g        Vence: 15/03/2026 |
|   [Manter] [Alterar]                     |
|                                          |
| • Creme de Avelã       Vence: 20/04/2026 |
|   [Manter] [Alterar]                     |
|                                          |
| [Confirmar Todos]                        |
+------------------------------------------+
```

## O Que Muda Para Você

1. **Importação preserva seus dados**: Validades e saída semanal não são mais apagadas
2. **Revisão rápida após importar**: Sistema pergunta se algo mudou
3. **Menos trabalho repetitivo**: Só precisa preencher validade uma vez por item

---

## Detalhes Técnicos

### Mudança 1: Preservar Dados no Upsert

Arquivo: `src/components/modes/SupplyChainMode.tsx`

Atualizar a função `handleColarLista`:

```typescript
const handleColarLista = () => {
  const itensImportados = parsearListaEstoque(textoColado);
  const itensAtualizados: string[] = [];
  
  itensImportados.forEach(itemImportado => {
    if (!itemImportado.nome || !itemImportado.quantidade) return;
    
    const nomeNormalizado = itemImportado.nome.toLowerCase().trim();
    const itemExistente = data.itens.find(
      i => i.nome.toLowerCase().trim() === nomeNormalizado
    );
    
    if (itemExistente) {
      // UPSERT: Atualizar quantidade MAS MANTER validade e demanda
      onUpdateItem(itemExistente.id, { 
        quantidade: itemImportado.quantidade 
        // NÃO sobrescreve: demandaSemanal, dataValidade
      });
      itensAtualizados.push(itemExistente.nome);
    } else {
      // Criar novo item
      onAddItem({
        nome: itemImportado.nome,
        tipo: itemImportado.tipo || 'produto_acabado',
        quantidade: itemImportado.quantidade,
        unidade: itemImportado.unidade || 'un',
      });
    }
  });
  
  // Mostrar modal de revisão se houver itens com validade
  const itensComValidade = data.itens.filter(i => 
    itensAtualizados.includes(i.nome) && i.dataValidade
  );
  
  if (itensComValidade.length > 0) {
    setItensParaRevisar(itensComValidade);
    setMostrarRevisaoValidade(true);
  }
  
  setTextoColado('');
};
```

### Mudança 2: Modal de Revisão de Validades

Adicionar estado e modal:

```typescript
const [mostrarRevisaoValidade, setMostrarRevisaoValidade] = useState(false);
const [itensParaRevisar, setItensParaRevisar] = useState<ItemEstoque[]>([]);
```

Modal de revisão:

```tsx
<Dialog open={mostrarRevisaoValidade} onOpenChange={setMostrarRevisaoValidade}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Revisar Validades</DialogTitle>
      <DialogDescription>
        Estes itens foram atualizados e têm validade cadastrada. 
        Alguma validade mudou?
      </DialogDescription>
    </DialogHeader>
    
    <ScrollArea className="max-h-[300px]">
      {itensParaRevisar.map(item => (
        <div key={item.id} className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-sm">{item.nome}</p>
            <p className="text-xs text-muted-foreground">
              Validade: {formatarData(item.dataValidade)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Check className="h-3 w-3 mr-1" /> OK
            </Button>
            <Input
              type="date"
              value={item.dataValidade}
              onChange={(e) => onUpdateItem(item.id, { 
                dataValidade: e.target.value 
              })}
              className="h-8 w-32"
            />
          </div>
        </div>
      ))}
    </ScrollArea>
    
    <DialogFooter>
      <Button onClick={() => setMostrarRevisaoValidade(false)}>
        Confirmar Todos
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Mudança 3: Feedback Visual Após Importação

Mostrar toast com resumo:

```typescript
toast({
  title: "Estoque Atualizado",
  description: `${itensAtualizados.length} itens atualizados, ${novosItens.length} novos`,
});
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/modes/SupplyChainMode.tsx` | Preservar dados no upsert + modal de revisão |

## Comportamento Esperado

1. **Colar lista do Bling**: Atualiza quantidade, mantém validade e saída semanal
2. **Se itens têm validade**: Modal pergunta se alguma mudou
3. **Revisão rápida**: Confirmar ou alterar individualmente
4. **Toast de feedback**: Mostra quantos itens foram atualizados

## Resultado

- Preenche validade **uma vez** por item
- Importação semanal preserva tudo
- Revisão rápida só se precisar alterar algo
