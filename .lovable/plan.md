

## Plan: Separar alertas e tabela por categoria de produto

### Problema
1. **Alertas internos (SupplyChainMode)**: Ruptura Iminente, Cobertura Baixa, Vencendo etc. misturam todos os tipos de produto. Produtos acabados precisam ter destaque principal.
2. **Dashboard público (EstoqueDashboard)**: A tabela lista tudo junto. Precisa separar visualmente por categoria (Produtos Acabados, Acessórios, Brindes, Material PDV).

### Mudanças

#### 1. `src/components/modes/SupplyChainMode.tsx` — Alertas por categoria
- Nos blocos de alerta (Ruptura Iminente, Cobertura Baixa, Vencendo em Breve), agrupar itens por tipo.
- Mostrar primeiro os **Produtos Acabados** (com destaque), depois as demais categorias com sub-headers.
- Estrutura: dentro de cada bloco de alerta, iterar por tipo na ordem definida (produto_acabado > acessorio > brinde > material_pdv > embalagem > insumo > materia_prima), mostrando um sub-label com o nome do tipo antes da lista de itens daquela categoria.

#### 2. `src/pages/EstoqueDashboard.tsx` — Tabela separada por categoria
- Em vez de uma tabela única, renderizar uma seção por tipo público (Produtos Acabados, Acessórios, Brindes, Material PDV).
- Cada seção terá um heading com o nome da categoria e sua própria tabela (ou usar um separator/heading row).
- Os alertas no topo também seguirão a mesma lógica: primeiro produtos acabados, depois o resto agrupado.

#### 3. Alertas no dashboard público — Prioridade produtos acabados
- Nos blocos de Ruptura/Atenção/Vencendo, listar primeiro os produtos acabados, depois os demais com separação visual (ex: sub-label do tipo).

