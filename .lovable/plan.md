

# Corrigir Auto-classificacao de Receitas + Novo Painel Orcado vs Realizado

## Problema 1: Receitas nao estao sendo auto-classificadas

A funcao `autoAtribuirFornecedorReceita` busca por `f.nome === 'NICE FOODS ECOMMERCE LTDA'` na lista de fornecedores, mas no CSV (`fornecedores.csv`) essa entidade esta mapeada como **"OUTRAS RECEITAS/DESPESAS" -> "Transferencias entre contas"** (linha 826), nao como RECEITAS. O `loadFornecedores()` carrega essa versao errada.

Alem disso, os fornecedores `FORNECEDORES_INICIAIS` adicionados no `fornecedoresParser.ts` (com a categoria correta de RECEITAS) **nunca sao usados** - `loadFornecedores()` le apenas do CSV.

Resultado: quando `autoAtribuirFornecedorReceita` encontra "NICE FOODS ECOMMERCE LTDA" na lista, pega o fornecedor com categoria errada (Transferencias entre contas), ou se o usuario ja salvou fornecedores, pode nao ter esses nomes na lista.

### Correcao

**Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`**

Mudar `autoAtribuirFornecedorReceita` para nao depender de encontrar o fornecedor na lista. Se nao encontrar, criar um objeto inline com os dados corretos:

```
function autoAtribuirFornecedorReceita(
  descricao: string, 
  fornecedores: Fornecedor[]
): { fornecedorId?: string; categoria: string; modalidade: string; grupo: string } | null {
  const desc = descricao.toUpperCase();
  
  if (desc.includes('ITAUBBA') || desc.includes('ITAU BBA')) {
    const f = fornecedores.find(f => 
      f.nome === 'NICE FOODS ECOMMERCE LTDA' && 
      f.modalidade === 'RECEITAS'
    );
    return {
      fornecedorId: f?.id,
      categoria: 'Clientes Nacionais (B2C)',
      modalidade: 'RECEITAS',
      grupo: 'Receitas Diretas',
    };
  }
  
  if (desc.includes('ITAU') || desc.includes('CONTA CORRENTE')) {
    const f = fornecedores.find(f => 
      f.nome === 'NICE FOODS LTDA' && 
      f.modalidade === 'RECEITAS'
    );
    return {
      fornecedorId: f?.id,
      categoria: 'Clientes Nacionais (B2B)',
      modalidade: 'RECEITAS',
      grupo: 'Receitas Diretas',
    };
  }
  
  return null;
}
```

No ponto de insercao (linha ~478), ajustar para usar os campos retornados diretamente, sem depender do fornecedorId existir.

**Arquivo: `src/data/fornecedores.csv`**

Corrigir as linhas 826-827 para que "NICE FOODS ECOMMERCE LTDA" tenha modalidade RECEITAS em vez de "OUTRAS RECEITAS/DESPESAS" ou "Transacional". E garantir que "NICE FOODS LTDA" tambem tenha uma entrada com RECEITAS (a linha 831 mapeia para "Mercadoria para Revenda" que e despesa).

---

## Problema 2: Orcado vs Realizado

Hoje nao existe uma visao que compare o que foi planejado (contas a pagar/receber em aberto no inicio do mes) com o que realmente aconteceu (lancamentos conciliados). Isso e essencial para previsibilidade financeira.

### Solucao: Painel "Orcado vs Realizado" na secao de Analise

**Novo arquivo: `src/components/financeiro/OrcadoRealizadoSection.tsx`**

Um componente que:

1. **Agrupa por categoria DRE** os lancamentos do mes selecionado
2. Para cada categoria, mostra 3 colunas:
   - **Orcado**: soma das contas que estavam previstas (projecoes + contas a pagar criadas manualmente)
   - **Realizado**: soma dos lancamentos efetivamente pagos/recebidos (conciliados)
   - **Variacao**: diferenca percentual e absoluta com cor (verde se gastou menos, vermelho se gastou mais; invertido para receitas)
3. **Totalizadores** no final: Total Receitas Orcado vs Realizado, Total Despesas Orcado vs Realizado, Resultado Orcado vs Realizado

A fonte de dados:
- **Orcado**: `contasFluxo` com `pago: false` ou que foram criadas com data de vencimento naquele mes (incluindo projecoes)
- **Realizado**: `contasFluxo` com `pago: true` e `conciliado: true`

**Arquivo: `src/components/modes/FinanceiroMode.tsx`**

Adicionar o novo componente na secao de Analise (bloco MEIO), abaixo do DRE, como um Collapsible "Orcado vs Realizado".

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Refatorar `autoAtribuirFornecedorReceita` para nao depender do fornecedor existir na lista com categoria correta |
| `src/data/fornecedores.csv` | Corrigir mapeamento de NICE FOODS ECOMMERCE LTDA e NICE FOODS LTDA para RECEITAS |
| `src/components/financeiro/OrcadoRealizadoSection.tsx` | Novo componente com tabela comparativa Orcado vs Realizado por categoria DRE |
| `src/components/modes/FinanceiroMode.tsx` | Integrar OrcadoRealizadoSection na secao de Analise |

