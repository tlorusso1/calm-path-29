
# Auto-classificar Receitas por Origem Bancária na Conciliação

## Problema

Entradas (tipo `receber`) que passam pela conciliação sem match de fornecedor ficam sem categoria DRE, caindo em "Entradas a Reclassificar". Isso faz o DRE ficar incompleto e o card de Entrada Media Real mostrar valores baixos.

O usuario ja sabe a regra:
- Extrato com "ITAUBBA" ou "ITAU BBA" na descricao = conta da NICE FOODS ECOMMERCE LTDA (B2C)
- Extrato com "ITAU" ou "CONTA CORRENTE" (sem ser BBA) = conta da NICE FOODS LTDA (B2B)

## Solucao

### Arquivo: `src/components/financeiro/ConciliacaoSection.tsx`

Adicionar uma funcao `autoAtribuirFornecedorReceita` que e chamada ANTES do match por fornecedor, especificamente para lancamentos tipo `receber` sem match. A logica:

1. Verificar a descricao do lancamento para detectar a origem bancaria
2. Se contem "ITAUBBA" ou "ITAU BBA" -> atribuir fornecedor "NICE FOODS ECOMMERCE LTDA" (categoria: Clientes Nacionais B2C)
3. Se contem "ITAU" ou "CONTA CORRENTE" -> atribuir fornecedor "NICE FOODS LTDA" (categoria: Clientes Nacionais B2B)
4. Isso acontece no bloco de processamento (linhas ~458-488), onde lancamentos sem match sao processados

Ponto de insercao: no trecho que hoje faz `matchFornecedor(lanc.descricao, fornecedores)` (linha 459), adicionar uma checagem previa para receitas:

```
// Para receitas sem match, tentar auto-atribuir por origem bancaria
if (lanc.tipo === 'receber') {
  const fornecedorPorOrigem = autoAtribuirFornecedorReceita(lanc.descricao, fornecedores);
  if (fornecedorPorOrigem) {
    novos.push({
      tipo: lanc.tipo,
      subtipo: lanc.subtipo,
      descricao: lanc.descricao,
      valor: lanc.valor,
      dataVencimento: lanc.dataVencimento,
      pago: true,
      fornecedorId: fornecedorPorOrigem.id,
      categoria: fornecedorPorOrigem.categoria,
      conciliado: true,
    });
    continue; // ou return para o contexto do loop
  }
}
```

A funcao `autoAtribuirFornecedorReceita`:

```
function autoAtribuirFornecedorReceita(
  descricao: string, 
  fornecedores: Fornecedor[]
): Fornecedor | null {
  const desc = descricao.toUpperCase();
  
  if (desc.includes('ITAUBBA') || desc.includes('ITAU BBA')) {
    return fornecedores.find(f => 
      f.nome === 'NICE FOODS ECOMMERCE LTDA'
    ) || null;
  }
  
  if (desc.includes('ITAU') || desc.includes('CONTA CORRENTE')) {
    return fornecedores.find(f => 
      f.nome === 'NICE FOODS LTDA'
    ) || null;
  }
  
  return null;
}
```

## Resultado esperado

- Receitas de extrato Itau BBA -> automaticamente classificadas como B2C no DRE
- Receitas de extrato Itau CC -> automaticamente classificadas como B2B no DRE  
- Card "Entrada Media Real" passa a refletir corretamente todas as entradas conciliadas
- DRE fica confiavel com receitas classificadas por canal

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Adicionar funcao `autoAtribuirFornecedorReceita` e integrar no fluxo de processamento de lancamentos sem match |
