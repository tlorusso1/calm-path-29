

## Plano: Gráfico de Cobertura + Validades Separadas + "Dura até"

### 3 mudanças principais

#### 1. Gráfico de Cobertura por Produto (SupplyChainMode + EstoqueDashboard)
Adicionar um componente visual de barras horizontais mostrando cobertura por produto, ordenado de maior para menor. Usar barras CSS puras (div com width proporcional ao maior valor), sem dependência de recharts.

- **SupplyChainMode**: Novo bloco dentro da Visão Executiva, abaixo dos alertas, filtrando apenas produtos acabados com cobertura definida.
- **EstoqueDashboard**: Novo Card "📊 Cobertura por Produto" logo após os summary badges e alertas, antes das tabelas. Agrupado por tipo público.

Estrutura visual:
```text
📊 Cobertura
Barista         ████████████████ 134d
Avelã           █████████████   126d
Levedura        ████              25d
```

Cores das barras: verde (>30d), amarelo (15-30d), vermelho (<15d).

#### 2. Bloco "Validades Mais Próximas" (só EstoqueDashboard)
Novo Card separado no dashboard público, após o gráfico de cobertura:

```text
⏳ VALIDADES MAIS PRÓXIMAS
Parmesão — vence em 96 dias
Molho Branco — vence em 82 dias
Carbonara — vence em 48 dias
```

Filtra itens com validade definida, ordena pelo mais próximo, mostra os top ~10. Separado dos alertas de estoque para deixar claro que é outro tipo de risco.

#### 3. "Dura ~X dias" em vez de "Saída/sem" (EstoqueDashboard)
Na tabela do dashboard público, trocar a coluna "Saída/sem" por "Dura até":
- Se tem coberturaDias: mostrar `📦 dura ~Xd` ou calcular data projetada (`dura até DD/MM`)
- Se não tem demanda: mostrar `—`

### Arquivos alterados
- **`src/components/modes/SupplyChainMode.tsx`**: Adicionar gráfico de barras de cobertura na Visão Executiva
- **`src/pages/EstoqueDashboard.tsx`**: Adicionar gráfico de cobertura, bloco de validades separado, trocar coluna saída/sem por "dura até"

