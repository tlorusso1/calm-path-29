

# Permitir Fornecedores de RECEITAS + Criar 2 Fornecedores

## Problema

O componente `CategoriaSelect` no cadastro de fornecedores esta filtrado com `tipo="DESPESAS"` hardcoded (linhas 207 e 287 do `FornecedoresManager.tsx`). Isso impede selecionar categorias de RECEITAS ao criar/editar um fornecedor.

## Correcoes

### 1. Remover filtro de tipo no CategoriaSelect (FornecedoresManager.tsx)

Nas linhas 207 e 287, remover a prop `tipo="DESPESAS"` para que o seletor mostre todas as modalidades (RECEITAS e DESPESAS).

### 2. Adicionar 2 fornecedores iniciais (fornecedoresParser.ts)

Adicionar ao array `FORNECEDORES_INICIAIS`:

- **NICE FOODS LTDA** - Modalidade: RECEITAS, Grupo: Receitas Diretas, Categoria: Clientes Nacionais (B2B)
- **NICE FOODS ECOMMERCE LTDA** - Modalidade: RECEITAS, Grupo: Receitas Diretas, Categoria: Clientes Nacionais (B2C)

Isso garante que receitas conciliadas com esses nomes sejam automaticamente classificadas no DRE como Receitas Diretas (B2B ou B2C).

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/FornecedoresManager.tsx` | Remover `tipo="DESPESAS"` das linhas 207 e 287 |
| `src/utils/fornecedoresParser.ts` | Adicionar 2 fornecedores de receita ao array FORNECEDORES_INICIAIS |

