
# Limpar Saídas Duplicadas + Corrigir Deduplicação por Timestamp

## O problema real

O CSV de saídas que você usa tem uma coluna `DataHora` com **data + hora + segundos** (ex: `18/02/2026 09:40:56`). Porém o parser atual **ignora** essa coluna nas saídas e usa `hoje` (só a data, sem hora) para todos. Resultado: duas saídas do mesmo produto com a mesma quantidade no mesmo dia geram **hash idêntico** e são tratadas como duplicata — quando na verdade são vendas separadas.

```text
Linha CSV:  NICE® MILK | 2 | 131.8 | 18/02/2026 09:40:56
Linha CSV:  NICE® MILK | 2 | 65.9  | 18/02/2026 09:40:58  ← horário diferente, mesma qtd

Hash atual: saida|milk...|2|2026-02-18|  ← MESMO HASH → duplicata falsa!
Hash certo: saida|milk...|2|2026-02-18T09:40:56|  ← hash diferente → correto!
```

## O que vai ser feito

### 1. Adicionar botão "Limpar Movimentações" imediato

Um botão vermelho no painel de movimentações que zera `movimentacoes: []` e `ultimaImportacaoMov: undefined` no state — começa do zero sem perder itens de estoque ou outros dados.

### 2. Corrigir o parser para capturar o timestamp completo nas saídas

**Arquivo: `src/utils/movimentacoesParser.ts`**

O CSV de saídas tem uma coluna de data/hora (a 4ª coluna nos dados que você mostrou: `18/02/2026 09:40:56`). O parser precisa:

- Procurar coluna de data/hora nas saídas também (header `datahora`, `data`, ou a 4ª/última coluna)
- Extrair **data + hora completa** (incluindo segundos: `HH:MM:SS`)
- Usar o timestamp completo como base do ID determinístico

```text
ANTES:  id = hash("saida|milk|2|2026-02-18|")  ← conflito entre vendas do mesmo dia
DEPOIS: id = hash("saida|milk|2|2026-02-18T09:40:56|")  ← único por transação
```

A função `parseDateCSV` será atualizada para retornar também a hora:

```ts
// DD/MM/YYYY HH:MM:SS → 2026-02-18T09:40:56
const match1 = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}T${match1[4]}`;
```

E o campo `data` salvo na movimentação ficará como `2026-02-18` (só data, para filtros de janela), enquanto o timestamp completo vai só para o hash do ID.

### 3. Detectar colunas de data/hora nas saídas

O formato do CSV de saídas que você usa aparentemente é:
```
DescriçãoProduto ; Qtde.Saída ; ValorSaída ; DataHora
```
ou pode ser:
```
Cód.Item ; DescriçãoProduto ; Qtde.Saída ; ValorSaída ; NumeroLote ; DatadeValidade
```

O parser vai procurar coluna com `datahora` ou `data` no header das saídas, e se não encontrar, vai tentar a última coluna que contenha `/` e `:` (timestamp). Isso torna robusto para ambos os formatos.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/movimentacoesParser.ts` | Capturar timestamp completo (data+hora) nas saídas para ID único; atualizar `parseDateCSV` para HH:MM:SS |
| `src/components/modes/SupplyChainMode.tsx` | Adicionar botão "Limpar Movimentações" com confirmação |

## Dados preservados

- Itens de estoque, quantidades, dados financeiros: **intactos**
- Somente `movimentacoes[]` e `ultimaImportacaoMov` serão zerados ao clicar em "Limpar"
- Após limpar, reimporte o CSV uma vez — dessa vez sem duplicatas
