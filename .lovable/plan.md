

## Fix DRE: Receitas incorretas + Export funcional + Planilha anual com meses

### Problemas identificados

1. **Receitas somadas errado**: O DRE soma `valor` de todos os lançamentos como positivo, mas lançamentos `tipo === 'pagar'` que caem em categorias de receita (fallback errado) ou `tipo === 'receber'` com classificação de despesa inflam/distorcem os totais. Além disso, `OUTRAS RECEITAS/DESPESAS` tem tratamento ambíguo — busca por texto "entrada" no nome da categoria, frágil.

2. **Download CSV não funciona**: O `Blob` + `URL.createObjectURL` + `a.click()` pode falhar em alguns navegadores mobile/sandbox. Precisa ajuste.

3. **Visão Anual**: Mostra apenas o total do ano. O usuário quer uma planilha com **cada mês como coluna** e soma anual no final.

---

### Mudanças

#### A. Corrigir lógica de receitas/despesas no DRE (`DRESection.tsx`)

- **Regra fundamental**: o `tipo` do lançamento (`receber` vs `pagar`) determina o sinal, não a categoria DRE.
  - `receber` → sempre entra como receita (positivo)
  - `pagar` → sempre entra como despesa (positivo para despesas)
- **Separar na agregação**: em vez de jogar tudo no mesmo mapa, separar entradas e saídas:
  - Lançamentos `receber` → classificar nas modalidades de RECEITAS (ou RECEITAS FINANCEIRAS, ou "Entradas a Reclassificar")
  - Lançamentos `pagar` → classificar nas modalidades de DESPESAS (DEDUÇÕES, CPV, DESPESAS DE PESSOAL, etc., ou "Saídas a Reclassificar")
- **Remover fallback perigoso** que joga `receber` como B2B baseado em "PIX"/"TED" genérico (pode capturar devoluções, transferências)
- **Forçar**: se `tipo === 'receber'` e a categoria mapeada tem `tipo === 'DESPESAS'` → ignorar categoria, usar "Entradas a Reclassificar". E vice-versa.

#### B. Fix export CSV (`DRESection.tsx`)

- Usar `document.createElement('a')` com `setTimeout` para garantir que funciona em todos os contextos
- Adicionar fallback com `window.open` se necessário

#### C. Visão Anual com meses em planilha (`DRESection.tsx`)

- Quando `viewMode === 'anual'`:
  - Adicionar seletor de ano (últimos 3 anos)
  - Na UI: mostrar o DRE consolidado do ano (como hoje)
  - No **export**: gerar CSV/XLSX com 12 colunas (jan-dez) + coluna "Total Anual"
  - Cada linha = categoria DRE, cada coluna = mês
  - Recalcular o `dre` para cada mês do ano selecionado

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/DRESection.tsx` | Corrigir agregação receita/despesa por `tipo`; fix download; seletor de ano; export anual com meses |

