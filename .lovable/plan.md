

## Fix: Impostos não aparecem em DEDUÇÕES no DRE

### Problema raiz

A função `classificarLancamento` no DRE só auto-classifica **entradas** (receitas B2C via descrição/contaOrigem). Para **saídas**, depende 100% de `lanc.categoria` ou `fornecedor.categoria`. 

Pagamentos de impostos importados do extrato bancário (DAS, DARF, INSS, Simples Nacional) chegam sem categoria e sem fornecedor, caindo em **"Saídas a Reclassificar"** em vez de **DEDUÇÕES**.

### Solução

Adicionar auto-classificação de saídas por palavras-chave na descrição bancária, similar ao que já existe para receitas. Isso preenche automaticamente a categoria correta para impostos e outros padrões comuns.

### Mudanças em `src/components/financeiro/DRESection.tsx`

Na função `classificarLancamento`, após o bloco de auto-classificação de receitas (linha ~100), adicionar um bloco equivalente para **saídas sem categoria**:

```
if (!categoria && !isReceita) {
  const desc = (lanc.descricao || '').toUpperCase();
  
  // Impostos → DEDUÇÕES
  if (desc.includes('DAS') || desc.includes('SIMPLES NACIONAL'))
    categoria = 'Simples Nacional (DAS)';
  else if (desc.includes('DARF') && desc.includes('INSS'))
    categoria = 'INSS';
  else if (desc.includes('ICMS'))
    categoria = 'ICMS';
  else if (desc.includes('PIS') || desc.includes('COFINS'))
    categoria = 'PIS E COFINS';
  
  // Pessoal
  else if (desc.includes('FOLHA') || desc.includes('SALARIO'))
    categoria = 'Salários CLT';
  else if (desc.includes('FGTS'))
    categoria = 'FGTS';
  else if (desc.includes('PRO LABORE') || desc.includes('PRÓ-LABORE'))
    categoria = 'Pro Labore';
  
  // Frete
  else if (desc.includes('JADLOG') || desc.includes('MANDAE'))
    categoria = 'Frete Venda';
  
  // Empréstimos
  else if (desc.includes('EMPRESTIMO') || desc.includes('FINANCIAMENTO'))
    categoria = 'Pagamento da Parcela Principal';
  
  // Tarifas bancárias
  else if (desc.includes('TARIFA') || desc.includes('IOF'))
    categoria = 'Tarifas Bancárias';
}
```

Estas regras funcionam como **fallback** — se o lançamento já tem `categoria` (manual ou via mapeamento aprendido), nada muda. Só atua em lançamentos sem classificação.

### Resultado esperado

- Pagamentos de DAS, DARF INSS → aparecem em **DEDUÇÕES** no DRE
- FGTS, Folha → aparecem em **DESPESAS DE PESSOAL**
- Jadlog/Mandae → aparecem em **DESPESAS COMERCIAIS > Frete Venda**
- Menos itens em "Saídas a Reclassificar"

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/DRESection.tsx` | Adicionar auto-classificação de saídas por palavras-chave na descrição |

