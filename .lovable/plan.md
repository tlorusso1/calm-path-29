

# Corrigir Auto-classificacao de Receitas e Emprestimos na Conciliacao

## Problemas Identificados

### 1. Receitas (B2B vs B2C) nao classificam automaticamente
A funcao `autoAtribuirFornecedorReceita` busca "ITAUBBA", "ITAU BBA", "CONTA CORRENTE" na descricao do lancamento. Porem, a IA do edge function simplifica as descricoes (ex: "TED ITAUBBA NICE FOODS LTDA" vira "TED Nice Foods"), removendo as palavras-chave que identificam a origem bancaria.

Alem disso, o `matchFornecedor` faz match parcial com "NICE FOODS" e retorna o primeiro resultado encontrado, sem distinguir LTDA vs ECOMMERCE LTDA.

### 2. Emprestimos nao classificam automaticamente
Nao existe nenhuma regra para classificar automaticamente parcelas de emprestimos (PRONAMPE, PEAC FGI, Simples Nacional, etc.) durante a conciliacao.

---

## Solucao

### Arquivo 1: `supabase/functions/extract-extrato/index.ts`

Alterar o prompt da IA para preservar a **descricao original completa** do extrato em um campo adicional `descricaoOriginal`. Adicionar esse campo ao schema da tool `extract_lancamento`.

Isso garante que a descricao crua com "ITAUBBA", "CONTA CORRENTE", "PRONAMPE", etc. chega ao frontend para matching.

Alteracoes:
- Adicionar instrucao no systemPrompt: "Inclua a descricao original/crua da linha do extrato no campo descricaoOriginal"
- Adicionar campo `descricaoOriginal` na tool `extract_lancamento`

### Arquivo 2: `src/components/financeiro/ConciliacaoSection.tsx`

**2a. Propagar descricaoOriginal**:
- Atualizar interface `ExtractedLancamento` para incluir `descricaoOriginal?: string`
- No `processarLote`, mapear o campo `descricaoOriginal` do retorno da API

**2b. Melhorar `autoAtribuirFornecedorReceita`**:
- Receber tambem `descricaoOriginal` e buscar keywords em AMBAS as descricoes
- Adicionar regras para emprestimos:
  - "PRONAMPE" -> tipo `pagar`, match com fornecedor do banco correspondente
  - "PEAC" ou "FGI" -> tipo `pagar`
  - "SIMPLES NACIONAL" ou "PARCELAMENTO" -> tipo `pagar`

**2c. Criar funcao `autoClassificarEmprestimos`**:
- Detectar parcelas de emprestimo pela descricao (PRONAMPE, PEAC FGI, PARCELAMENTO SIMPLES)
- Atribuir categoria DRE: DESPESAS FINANCEIRAS > Juros e Encargos > Emprestimos
- Evitar que sejam enviados para revisao manual

**2d. Integrar no fluxo de processamento (linha ~476)**:
- Chamar `autoAtribuirFornecedorReceita` com ambas as descricoes (original + processada)
- Chamar `autoClassificarEmprestimos` para detectar parcelas de emprestimo
- Ordem: auto-receita -> auto-emprestimo -> matchFornecedor -> revisao manual

### Arquivo 3: `src/utils/fornecedoresParser.ts`

Adicionar fornecedores de emprestimos ao `FORNECEDORES_INICIAIS` para que o `matchFornecedor` tambem consiga detecta-los:

```text
PRONAMPE ITAU -> DESPESAS FINANCEIRAS > Juros e Encargos > Emprestimos
PEAC FGI ITAU -> DESPESAS FINANCEIRAS > Juros e Encargos > Emprestimos  
SIMPLES NACIONAL -> DEDUCOES > Impostos > Parcelamento Simples Nacional
```

### Arquivo 4: `src/data/categorias-dre.ts`

Verificar se ja existe a categoria "Emprestimos" dentro de DESPESAS FINANCEIRAS. Se nao existir, adicionar:
- Modalidade: DESPESAS FINANCEIRAS
- Grupo: Juros e Encargos
- Categoria: Emprestimos

---

## Resultado Esperado

- Receitas com "ITAUBBA" na descricao original -> NICE FOODS ECOMMERCE LTDA (B2C)
- Receitas com "CONTA CORRENTE" ou "ITAU" -> NICE FOODS LTDA (B2B)
- Parcelas PRONAMPE, PEAC FGI -> classificadas automaticamente como Emprestimos
- Parcelamento Simples Nacional -> classificado como Deducoes/Impostos
- Nenhuma dessas categorias devera aparecer no painel de revisao manual

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/extract-extrato/index.ts` | Adicionar campo `descricaoOriginal` na extracao |
| `src/components/financeiro/ConciliacaoSection.tsx` | Propagar descricaoOriginal, melhorar auto-classificacao receitas + emprestimos |
| `src/utils/fornecedoresParser.ts` | Adicionar fornecedores de emprestimos ao array inicial |
| `src/data/categorias-dre.ts` | Garantir categorias DRE para emprestimos |
