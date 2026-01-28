

# Calculo Automatico de Status dos Modos

## Problema Atual

O status dos modos (neutro/em andamento/concluido) esta sendo definido apenas quando:
- Usuario **entra** no modo → status = `in-progress`
- Usuario clica **"Concluido por agora"** → status = `completed`

Isso ignora completamente o estado real de preenchimento dos campos.

## Comportamento Esperado

- **Neutro (cinza)**: Nenhum campo preenchido
- **Em andamento (amarelo)**: Alguns campos preenchidos, mas nao todos
- **Concluido (verde)**: Todos os campos preenchidos

---

## Solucao

Criar funcoes que calculam o status de cada modo baseado nos seus dados especificos.

### Logica por Modo

#### Financeiro
```text
Campos obrigatorios:
- caixaNiceFoods (nao vazio)
- caixaEcommerce (nao vazio)
- pelo menos 1 vencimento verificado (dda, email, whatsapp ou planilha)
- agendamentoConfirmado = true

Neutro: todos vazios
Em andamento: alguns preenchidos
Concluido: todos preenchidos
```

#### Marketing
```text
Campos obrigatorios:
- mesFechouPositivo (nao null)
- verbaAds (nao vazio)
- focoSemana (nao vazio)
- pelo menos 1 verificacao marcada
- decisaoSemana (nao null)

Neutro: todos vazios/null
Em andamento: alguns preenchidos
Concluido: todos preenchidos
```

#### Supply Chain
```text
Avaliar apenas o ritmo selecionado:
- semanal: 3 checkboxes
- quinzenal: 3 checkboxes
- mensal: 3 checkboxes

Neutro: 0 checkboxes marcados
Em andamento: 1-2 checkboxes marcados
Concluido: todos os 3 checkboxes marcados
```

#### Backlog
```text
Nao usa status automatico - funciona diferente
(backlog e deposito, nao tem "conclusao")
Manter como neutro sempre ou usar logica especifica
```

#### Pre-Reuniao (geral, ads, verter)
```text
Usa checklist generico (items[]):
Neutro: 0 items completed
Em andamento: alguns items completed
Concluido: todos items completed
```

---

## Arquivos a Modificar

### 1. `src/hooks/useFocusModes.ts`

Criar funcao `calculateModeStatus`:

```typescript
function calculateModeStatus(mode: FocusMode): ModeStatus {
  switch (mode.id) {
    case 'financeiro':
      return calculateFinanceiroStatus(mode.financeiroData);
    case 'marketing':
      return calculateMarketingStatus(mode.marketingData);
    case 'supplychain':
      return calculateSupplyChainStatus(mode.supplyChainData);
    case 'backlog':
      return 'neutral'; // Backlog nao usa status
    default:
      return calculateChecklistStatus(mode.items);
  }
}
```

Implementar cada funcao de calculo:

```typescript
function calculateFinanceiroStatus(data?: FinanceiroStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    data.caixaNiceFoods.trim() !== '',
    data.caixaEcommerce.trim() !== '',
    data.vencimentos.dda || data.vencimentos.email || 
      data.vencimentos.whatsapp || data.vencimentos.planilha,
    data.agendamentoConfirmado,
  ];
  
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'neutral';
  if (filled === fields.length) return 'completed';
  return 'in-progress';
}

function calculateMarketingStatus(data?: MarketingStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    data.mesFechouPositivo !== null,
    data.verbaAds.trim() !== '',
    data.focoSemana.trim() !== '',
    Object.values(data.verificacoes).some(Boolean),
    data.decisaoSemana !== null,
  ];
  
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'neutral';
  if (filled === fields.length) return 'completed';
  return 'in-progress';
}

function calculateSupplyChainStatus(data?: SupplyChainStage): ModeStatus {
  if (!data) return 'neutral';
  
  const ritmo = data[data.ritmoAtual];
  const checks = Object.values(ritmo).filter(Boolean).length;
  const total = Object.keys(ritmo).length;
  
  if (checks === 0) return 'neutral';
  if (checks === total) return 'completed';
  return 'in-progress';
}

function calculateChecklistStatus(items: ChecklistItem[]): ModeStatus {
  if (items.length === 0) return 'neutral';
  
  const completed = items.filter(i => i.completed).length;
  if (completed === 0) return 'neutral';
  if (completed === items.length) return 'completed';
  return 'in-progress';
}
```

### 2. Atualizar logica de persistencia

Modificar as funcoes de update para recalcular o status apos cada mudanca:

```typescript
// Exemplo em updateFinanceiroData
const updateFinanceiroData = useCallback((data: Partial<FinanceiroStage>) => {
  setState(prev => {
    const newFinanceiroData = {
      ...prev.modes.financeiro.financeiroData!,
      ...data,
    };
    
    return {
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: newFinanceiroData,
          status: calculateFinanceiroStatus(newFinanceiroData),
        },
      },
    };
  });
}, []);
```

Aplicar o mesmo padrao para:
- `updateMarketingData`
- `updateSupplyChainData`
- `toggleItemComplete` (para modos pre-reuniao)
- `addItem` / `removeItem`
- Funcoes do financeiro (toggle, add, remove)

### 3. `src/components/ModeSelector.tsx`

Nenhuma mudanca necessaria - ja usa `mode.status` para exibir as cores.

---

## Resultado Esperado

| Acao | Status |
|------|--------|
| Entrar no modo vazio | Neutro (cinza) |
| Preencher 1 campo | Em andamento (amarelo) |
| Preencher metade | Em andamento (amarelo) |
| Preencher tudo | Concluido (verde) |
| Limpar campos | Volta para neutro/andamento |

---

## Detalhes Tecnicos

1. As funcoes `calculate*Status` serao puras e determinisitcas
2. O status sera recalculado em toda atualizacao de dados
3. O botao "Concluido por agora" ainda funciona, mas o status ja estara verde se tudo estiver preenchido
4. Nao depende de `activeMode` para determinar status - e baseado puramente nos dados

---

## Casos Especiais

### Supply Chain
O status e calculado apenas para o ritmo atualmente selecionado (`ritmoAtual`). Se o usuario trocar de ritmo, o status reflete o novo ritmo.

### Backlog
Backlog nao tem "conclusao" - e um deposito. Manter sempre como neutro ou criar logica especifica (ex: verde se tiver pelo menos 1 tarefa concluida hoje).

### Pre-Reuniao (geral, ads, verter)
Usa o array `items[]` padrao - status baseado na proporcao de items completados.

