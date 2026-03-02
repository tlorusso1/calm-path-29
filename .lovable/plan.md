
Objetivo: corrigir definitivamente o caso em que “Saída/sem” não atualiza após colar/importar, incluindo o CSV que você enviou (com cabeçalho `DataSaida` e nomes com prefixo `NICE®`).

1) Diagnóstico confirmado (causa raiz)
- Hoje existe inconsistência no “nome canônico” do produto:
  - Parser de movimentações remove prefixo `NICE` (e `[B]`) ao criar `movimentacoes`.
  - Itens de estoque normalmente mantêm `NICE` no nome exibido.
  - O match de demanda usa `normalizarNomeProduto`, que atualmente não remove `NICE`.
- Resultado prático: a chave da movimentação vira algo como `milk - castanha...`, enquanto o item vira `nice milk - castanha...` → sem match → `demandaSemanal` não preenche.
- Gap adicional: `DataSaida` não está explicitamente mapeado como coluna de data (hoje depende de fallback por conteúdo da célula).

2) Correções de implementação (arquivos e sequência)

2.1 Padronizar normalização de nome para matching
Arquivo: `src/utils/movimentacoesParser.ts`
- Ajustar `normalizarNomeProduto()` para tratar também prefixos de catálogo:
  - remover aspas iniciais/finais,
  - remover prefixo `[B]`,
  - remover prefixo `NICE`/`NICE®` no início,
  - manter restante (peso/gramagem/sabor) para não colidir SKUs diferentes.
- Importante: essa mudança atua só no match, sem forçar alteração visual do nome salvo.

2.2 Tornar detecção de data robusta para `DataSaida`
Arquivo: `src/utils/movimentacoesParser.ts`
- Na detecção da coluna de data em saídas, incluir explicitamente variações:
  - `datasaida`, `data_saida`, `datahora`, `data`.
- Melhorar fallback para aceitar também célula com apenas data (`DD/MM/YYYY`) sem hora.

2.3 Limpar logs de debug temporários
Arquivo: `src/components/modes/SupplyChainMode.tsx`
- Remover `console.log('[DEBUG handleColarLista] ...')` adicionados para investigação.
- Manter somente a lógica funcional de recálculo.

2.4 Garantir recálculo nos dois fluxos (já existente, validar)
Arquivo: `src/components/modes/SupplyChainMode.tsx`
- Confirmar comportamento final:
  - Ao importar em “Mov.”: recalcula `demandaSemanal` dos itens.
  - Ao colar em “Estoques” com movimentações já existentes: recalcula e aplica automaticamente `Saída/sem`.

3) Critérios de aceite (com seu cenário)
- Colar/importar o CSV enviado na aba “Mov.”:
  - movimentações são reconhecidas,
  - itens correspondentes (inclusive os com nome começando em `NICE`) recebem `Saída/sem` > 0.
- Em seguida colar lista na aba “Estoques”:
  - novos/atualizados já aparecem com `Saída/sem` preenchida automaticamente (sem precisar reimportar movimentos).
- Não gerar regressão em produtos sem prefixo `NICE` e nem em nomes com acentos/marca registrada.

Seção técnica (resumo de trade-off)
- Optei por corrigir a normalização (matching) em vez de alterar o nome armazenado nas movimentações para evitar:
  - quebrar deduplicação histórica por ID,
  - alterar comportamento de dados já salvos.
- A normalização continuará conservadora (não remove gramagem/variante), minimizando risco de colidir produtos diferentes.
