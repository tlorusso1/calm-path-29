

## Problemas identificados

1. **Dashboard público não mostra as mudanças** — Pela screenshot, a tabela ainda tem "Saída/sem" e não tem o gráfico de cobertura nem o bloco de validades. Isso pode ser porque o código foi editado mas o deploy não refletiu, ou o screenshot é anterior. Vou verificar o código atual.

2. **Nomes truncados no gráfico de cobertura** — O `CoberturaChart` usa `w-[120px] sm:w-[160px]` para os nomes, o que trunca nomes longos como "NICE® MILK - AVEIA BARISTA - 400G".

3. **Coluna "Dura até" com data não é clara** — O usuário prefere manter apenas a cobertura em dias (`~134d`), sem a coluna extra de data projetada.

## Plano

### 1. CoberturaChart — Mais espaço para nomes
Em `src/components/CoberturaChart.tsx`: aumentar a largura dos nomes de `w-[120px] sm:w-[160px]` para `w-[160px] sm:w-[220px]` e usar fonte ligeiramente maior.

### 2. EstoqueDashboard — Reverter "Dura até", voltar ao formato original
Em `src/pages/EstoqueDashboard.tsx`:
- **Remover** a coluna "Dura até" (linhas 359, 388-392) — voltar ao formato anterior com "Saída/sem" mostrando `demandaSemanal`
- **Manter** o gráfico de cobertura por tipo (já implementado, linhas 292-310)
- **Manter** o bloco "Validades Mais Próximas" (já implementado, linhas 312-342)

Resultado: tabela volta a ter `Produto | Qtde | Saída/sem | Cobertura | Status | Validade`, como o screenshot original mostra que era mais simples e claro.

### 3. SupplyChainMode — Mais espaço para nomes no gráfico
Garantir que o `CoberturaChart` no SupplyChainMode também use os nomes mais largos (já usa o componente, então a mudança no componente resolve).

### Arquivos alterados
- `src/components/CoberturaChart.tsx` — Aumentar largura dos nomes
- `src/pages/EstoqueDashboard.tsx` — Reverter coluna "Dura até" para "Saída/sem"

