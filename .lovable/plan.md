

## Enriquecer lançamentos SISPAG com fornecedor real via planilha de conciliação

### Problema
Lançamentos do extrato bancário com descrição genérica ("SISPAG TRIB/COD BARRAS", "SISPAG FORNECEDORES" etc.) ficam sem fornecedor identificado → caem em "a reclassificar" no DRE. A planilha `conciliacao_completa.xlsx` tem o detalhamento real (fornecedor, data, valor) que permite cruzar e identificar quem é quem.

### Solução
Adicionar na Conciliação Bancária a opção de importar um arquivo XLSX de conciliação detalhada. O sistema cruza cada lançamento existente sem fornecedor (SISPAG etc.) com as linhas da planilha por **data + valor (±R$0,01)**, atribuindo automaticamente o fornecedor real.

### Fluxo

1. **Upload XLSX** — Botão "📋 Importar Conciliação Detalhada (XLSX)" na seção de conciliação
2. **Parse no frontend** — Usar `xlsx` (SheetJS) para ler a planilha, extrair colunas: fornecedor/beneficiário, data, valor
3. **Cross-reference** — Para cada lançamento existente em `contasFluxo` que:
   - Não tem `fornecedorId`, OU
   - Tem descrição genérica (SISPAG, PIX ENVIADO sem nome claro)
   - Fazer match por `data === dataVencimento` E `|valor_planilha - valor_conta| <= 0.01`
4. **Match → Atribuir fornecedor** — Encontrado match:
   - Buscar fornecedor na lista por nome (fuzzy via `matchFornecedor`)
   - Se não existe, criar novo fornecedor automaticamente
   - Atribuir `fornecedorId` + `categoria` do fornecedor ao lançamento
   - Salvar mapeamento descrição→fornecedor (aprendizado)
5. **Feedback** — Toast: "✅ 87 lançamentos enriquecidos, 12 fornecedores criados, 5 sem match"

### Detalhes técnicos

**Novo componente ou lógica em `ConciliacaoSection.tsx`**:
- Adicionar input file `.xlsx` separado do TXT/CSV de extrato
- Instalar/usar `xlsx` (SheetJS) para parse client-side
- Função `processarConciliacaoXLSX(rows, contasFluxo, fornecedores)`:
  - Para cada row da planilha, normalizar data e valor
  - Buscar em `contasFluxo` por match exato (data + valor)
  - Se match, resolver fornecedor via `matchFornecedor` ou criar novo
  - Retornar lista de updates `{ id, changes: { fornecedorId, categoria } }`
- Chamar `onUpdateMultipleContas(updates)` para aplicar em batch

**Adaptação da planilha**:
- Detectar automaticamente as colunas relevantes (fornecedor/beneficiário, data, valor) por header ou posição
- Suportar formatos de data DD/MM/YYYY e YYYY-MM-DD
- Suportar valores com vírgula decimal (padrão BR)

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/ConciliacaoSection.tsx` | Botão upload XLSX + lógica de cross-reference por data+valor |
| `package.json` | Adicionar `xlsx` (SheetJS) como dependência |

### Resultado esperado
- Os ~246 lançamentos genéricos (SISPAG) são automaticamente vinculados ao fornecedor real
- O DRE passa a classificar corretamente essas despesas
- Novos fornecedores são criados conforme necessário
- Mapeamentos são salvos para futuras importações

