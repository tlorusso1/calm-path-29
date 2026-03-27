

## Ficha Técnica (BOM) — Plano de Implementação

### Objetivo
Cadastrar a composição de cada produto acabado (quanto de cada insumo/embalagem é necessário para produzir 1 unidade). Com isso, derivar automaticamente a demanda de insumos a partir do forecast de produção de produtos acabados.

---

### Como funciona

```text
Produto Acabado "Pasta de Amendoim 500g"
  └─ 0.45 kg  Pasta de Amendoim (Matéria Prima)
  └─ 0.02 kg  Sal Rosa (Matéria Prima)
  └─ 1 un     Pote 500g (Embalagem)
  └─ 1 un     Rótulo 500g (Embalagem)
  └─ 1 un     Lacre (Embalagem)

Forecast diz: precisa produzir 200 un → consome 90kg pasta, 4kg sal, 200 potes...
```

---

### Mudanças

**1. Novo tipo `FichaTecnica` em `src/types/focus-mode.ts`**
- Interface `FichaTecnicaIngrediente`: `{ insumoNome: string, quantidade: number, unidade: string }`
- Interface `FichaTecnica`: `{ produtoAcabadoNome: string, ingredientes: FichaTecnicaIngrediente[] }`
- Adicionar `fichasTecnicas?: FichaTecnica[]` ao `SupplyChainStage`

**2. Nova aba "BOM" no Supply Chain (`SupplyChainMode.tsx`)**
- Selecionar um produto acabado (dropdown dos itens com tipo `produto_acabado`)
- Adicionar linhas: selecionar insumo/embalagem existente, quantidade necessária por unidade produzida
- Salvar no state via `onUpdateSupplyChainData`
- Visualizar fichas cadastradas com opção de editar/remover

**3. Cálculo de demanda derivada de insumos (`supplyCalculator.ts`)**
- Para cada insumo/embalagem, somar: `Σ (demanda diária do PA × quantidade do insumo por unidade do PA)`
- Usar essa demanda derivada no lugar da `demandaSemanal` para calcular cobertura e necessidade de reposição
- Se o insumo não tem ficha técnica vinculada, manter comportamento atual (sem dados / saudável por padrão)

**4. Integrar no Forecast**
- Na lista de "Fila de Produção", além de mostrar quanto de PA produzir, mostrar abaixo a necessidade total de insumos derivada
- Card resumo: "Insumos necessários para produção" com total R$ baseado no custo unitário dos insumos

---

### Escopo NÃO incluído
- Importação automática de fichas técnicas por planilha (pode ser adicionado depois)
- Versionamento de fichas (alterações substituem a versão anterior)

