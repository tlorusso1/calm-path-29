
# Criar Gestão de Fornecedores Cadastrados

## Situação Atual
O componente **FornecedoresManager** foi planejado anteriormente mas **não foi implementado**. Atualmente:
- Fornecedores são carregados de um CSV estático (~1200 registros)
- Novos fornecedores podem ser criados durante a conciliação bancária
- **Não existe UI para visualizar ou gerenciar fornecedores existentes**

## O Que Será Criado

### Interface Visual
```text
┌─────────────────────────────────────────────────────┐
│ 📋 Fornecedores Cadastrados                  (123)  │
├─────────────────────────────────────────────────────┤
│ [🔍 Buscar fornecedor...                         ]  │
├─────────────────────────────────────────────────────┤
│ CUSTOS DE PRODUTO VENDIDO (45)              [▼]     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 3TM DISTRIBUIDORA        │ Embalagens   │ [✏️🗑] │ │
│ │ JUND COCO LTDA           │ Compra MP    │ [✏️🗑] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ DESPESAS COMERCIAIS (28)                    [▶]     │
│ DESPESAS ADMINISTRATIVAS (32)               [▶]     │
│                                                     │
│ [+ Adicionar Novo Fornecedor]                       │
└─────────────────────────────────────────────────────┘
```

### Funcionalidades
1. **Visualização**: Lista agrupada por modalidade DRE com busca fuzzy
2. **Edição**: Click no nome abre edição inline (nome + categoria DRE)
3. **Exclusão**: Com verificação de contas vinculadas (impede exclusão se houver)
4. **Adição**: Formulário inline com seletor de categoria DRE

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/financeiro/FornecedoresManager.tsx` | **NOVO** - Componente de gestão |
| `src/components/modes/FinanceiroMode.tsx` | Adicionar na seção "Parâmetros do Sistema" |

---

## Detalhes Técnicos

### 1. Novo Componente: FornecedoresManager.tsx

```typescript
interface FornecedoresManagerProps {
  fornecedores: Fornecedor[];
  contasFluxo: ContaFluxo[];  // Para verificar vínculos
  onAdd: (fornecedor: Omit<Fornecedor, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Fornecedor>) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Estados internos:**
- `search`: string para busca
- `openModalidades`: Record<string, boolean> para controlar colapso por grupo
- `editingId`: string | null para modo edição
- `showAddForm`: boolean para exibir formulário de adição

**Agrupamento por Modalidade:**
```typescript
const grouped = useMemo(() => {
  const filtrados = buscarFornecedores(search, fornecedores, 500);
  return filtrados.reduce((acc, f) => {
    const key = f.modalidade || 'Não Classificado';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, Fornecedor[]>);
}, [search, fornecedores]);
```

**Verificação de Vínculo antes de Excluir:**
```typescript
const isVinculado = (id: string) => contasFluxo.some(c => c.fornecedorId === id);

const handleRemove = (id: string) => {
  const vinculadas = contasFluxo.filter(c => c.fornecedorId === id);
  if (vinculadas.length > 0) {
    toast.error(`Não é possível excluir: ${vinculadas.length} conta(s) vinculada(s)`);
    return;
  }
  onRemove(id);
  toast.success('Fornecedor removido!');
};
```

### 2. Integração no FinanceiroMode.tsx

**Adicionar estado em `openSections`:**
```typescript
const [openSections, setOpenSections] = useState({
  // ...existentes
  fornecedores: false,  // NOVO
});
```

**Handlers:**
```typescript
const handleAddFornecedor = (fornecedor: Omit<Fornecedor, 'id'>) => {
  const novoId = crypto.randomUUID();
  onUpdateFinanceiroData({
    fornecedores: [...(data.fornecedores || []), { ...fornecedor, id: novoId }],
  });
  toast.success(`Fornecedor "${fornecedor.nome}" criado!`);
};

const handleUpdateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
  onUpdateFinanceiroData({
    fornecedores: (data.fornecedores || []).map(f => 
      f.id === id ? { ...f, ...updates } : f
    ),
  });
};

const handleRemoveFornecedor = (id: string) => {
  onUpdateFinanceiroData({
    fornecedores: (data.fornecedores || []).filter(f => f.id !== id),
  });
};
```

**Adicionar componente após Conciliação Bancária:**
```tsx
<FornecedoresManager
  fornecedores={data.fornecedores || []}
  contasFluxo={data.contasFluxo || []}
  onAdd={handleAddFornecedor}
  onUpdate={handleUpdateFornecedor}
  onRemove={handleRemoveFornecedor}
  isOpen={openSections.fornecedores}
  onToggle={() => toggleSection('fornecedores')}
/>
```

---

## Resultado Esperado
- Usuário pode visualizar todos os fornecedores agrupados por modalidade
- Pode buscar por nome
- Pode editar nome e categoria DRE
- Pode excluir fornecedores sem contas vinculadas
- Pode adicionar novos fornecedores manualmente
