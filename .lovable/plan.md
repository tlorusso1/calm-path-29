

# Melhoria: Demanda Individual por Produto

## Problema Atual

O sistema usa uma demanda semanal global (pedidos/semana) e aplica igualmente para todos os produtos. Isso gera previsões incorretas porque cada produto tem um comportamento diferente de venda.

## Solução Proposta

### Duas Abordagens Complementares

```text
+-----------------------------------------------------+
|           DEMANDA INDIVIDUAL POR PRODUTO            |
+-----------------------------------------------------+
|                                                     |
|  Abordagem 1: Inserir Saída Real (Manual)           |
|  +-----------------------------------------------+  |
|  | NICE MILK AVEIA 450G                          |  |
|  | Estoque: 653un   |   Saída/sem: [___]         |  |
|  | >> Cobertura calculada: X dias                |  |
|  +-----------------------------------------------+  |
|                                                     |
|  Abordagem 2: Multiplicador por Produto (Rapido)   |
|  +-----------------------------------------------+  |
|  | Pedidos/sem: 200   x   Fator: 1.5             |  |
|  | = 300 un/semana de saída esperada             |  |
|  +-----------------------------------------------+  |
|                                                     |
+-----------------------------------------------------+
```

### O que sera implementado

1. **Campo de Saida Semanal na Lista**
   - Cada item tera um campo editavel de "Saida/sem"
   - Ao importar, o campo fica vazio (usa a demanda global como fallback)
   - O usuario pode clicar e preencher a saida real do produto

2. **Calculo Inteligente de Cobertura**
   - Se o item tem saida semanal definida: usa esse valor
   - Se nao tem: usa a demanda global como aproximacao

3. **Sugestao de Saida Baseada em Historico**
   - Opcional: campo para inserir a saida do mes anterior
   - Sistema calcula a media semanal automaticamente (saida mes / 4)

### Interface Atualizada

Na lista de itens, adicionar um campo editavel inline:

```text
+--------------------------------------------------------------+
| NICE MILK AVEIA 450G                          Produto        |
| 653 un  |  Saída: [80___] /sem  |  8 dias  | [Editar] [X]   |
+--------------------------------------------------------------+
| NICE CHEESY PARMESAO                          Produto        |
| 1799 un |  Saída: [____] /sem   |  -- dias | [Editar] [X]   |
| >> Sem saída definida, usando demanda global                 |
+--------------------------------------------------------------+
```

### Fluxo de Uso Simplificado

1. Usuario cola lista do Bling (como ja faz)
2. Itens sao importados com quantidade atual
3. Usuario clica em um item para adicionar a saida semanal
4. Cobertura e recalculada automaticamente

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/modes/SupplyChainMode.tsx` | Adicionar campo editavel de saida semanal na lista de itens |
| `src/types/focus-mode.ts` | Ja tem `demandaSemanal` em ItemEstoque (sem mudanca necessaria) |
| `src/utils/supplyCalculator.ts` | Ja usa `item.demandaSemanal` quando disponivel (sem mudanca) |

## Detalhes Tecnicos

A estrutura de dados ja suporta demanda individual:

```typescript
// Ja existe em ItemEstoque
demandaSemanal?: number;  // Consumo especifico do item por semana
```

O calculo tambem ja usa isso:

```typescript
// Em SupplyChainMode.tsx linha 122
const demanda = item.demandaSemanal ?? data.demandaSemanalMedia;
```

So precisa expor na interface para o usuario poder editar.

