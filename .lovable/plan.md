

## Plano: Correção de Seleção Automática de Novo Fornecedor

### Problema Identificado

Quando um novo fornecedor é criado durante a conciliação:
1. O fornecedor É salvo na lista `data.fornecedores` (persistido corretamente)
2. O toast "Fornecedor criado!" aparece
3. **MAS** o fornecedor NÃO é selecionado automaticamente no lançamento
4. O usuário precisa buscar novamente para atrelar

### Causa Raiz

O `onCreateNew` callback apenas cria o fornecedor, mas não retorna o ID para que o `FornecedorSelect` possa:
1. Selecionar automaticamente o novo fornecedor
2. Atualizar o estado do componente pai (`ReviewItem`)

### Solução

Modificar o fluxo para que `onCreateNew` retorne o ID do fornecedor criado:

| Arquivo | Mudança |
|---------|---------|
| `FornecedorSelect.tsx` | Alterar `onCreateNew` para receber callback que retorna o ID criado |
| `FinanceiroMode.tsx` | Modificar handler para retornar o ID do fornecedor criado |
| `ConciliacaoSection.tsx` | Atualizar `ReviewItem` para selecionar automaticamente |

---

### Mudanças Detalhadas

#### 1. FornecedorSelect.tsx

**Interface atualizada:**
```typescript
interface FornecedorSelectProps {
  // ...
  onCreateNew?: (fornecedor: Omit<Fornecedor, 'id'>) => string | void; 
  // Agora pode retornar o ID do fornecedor criado
}
```

**handleConfirmCreate atualizado:**
```typescript
const handleConfirmCreate = () => {
  if (!newFornecedorCategoria || !search.trim()) return;
  
  const novoFornecedor: Omit<Fornecedor, 'id'> = {
    nome: search.trim(),
    modalidade: newFornecedorCategoria.modalidade,
    grupo: newFornecedorCategoria.grupo,
    categoria: newFornecedorCategoria.categoria,
  };
  
  // Chamar callback e capturar ID retornado
  const novoId = onCreateNew?.(novoFornecedor);
  
  // Se retornou ID, selecionar automaticamente
  if (novoId) {
    onChange(novoId);
  }
  
  setSearch('');
  setOpen(false);
  setShowCreateForm(false);
  setNewFornecedorCategoria(undefined);
};
```

#### 2. FinanceiroMode.tsx

**Handler atualizado para retornar o ID:**
```typescript
onCreateFornecedor={(novoFornecedor) => {
  const novoId = crypto.randomUUID();
  const fornecedorComId: Fornecedor = {
    ...novoFornecedor,
    id: novoId,
  };
  onUpdateFinanceiroData({
    fornecedores: [...(data.fornecedores || []), fornecedorComId],
  });
  toast.success(`Fornecedor "${novoFornecedor.nome}" criado!`);
  return novoId; // Retornar o ID para seleção automática
}}
```

#### 3. ConciliacaoSection.tsx

**Interface ConciliacaoSectionProps atualizada:**
```typescript
onCreateFornecedor?: (fornecedor: Omit<Fornecedor, 'id'>) => string | void;
```

**ReviewItem - já funciona** pois o `setSelectedFornecedor` é chamado automaticamente via `onChange` no `FornecedorSelect`.

---

### Fluxo Após Correção

```text
1. Usuário digita nome do fornecedor
2. Clica "Criar [nome]"
3. Seleciona categoria DRE
4. Clica "Salvar e Selecionar"
5. onCreateNew é chamado → retorna novo ID
6. FornecedorSelect chama onChange(novoId)
7. ReviewItem atualiza selectedFornecedor = novoId
8. Fornecedor aparece selecionado automaticamente
9. Lista de fornecedores já inclui o novo (próximos usos)
```

---

### Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/financeiro/FornecedorSelect.tsx` | MODIFICAR | Capturar e usar ID retornado |
| `src/components/financeiro/ConciliacaoSection.tsx` | MODIFICAR | Atualizar tipos |
| `src/components/modes/FinanceiroMode.tsx` | MODIFICAR | Retornar ID no callback |

