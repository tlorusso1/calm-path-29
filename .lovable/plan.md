

# Transformacao: Interface de Foco Ativo com Seletor de Modos

## Visao Geral

Transformar a aplicacao atual (baseada em blocos de tempo) em uma interface onde **voce escolhe conscientemente** o modo de trabalho. Apenas um modo visivel por vez, sem dashboards ou informacoes concorrentes.

---

## Arquitetura da Nova Interface

```text
+------------------------------------------+
|            SELETOR DE MODOS              |
|  [FINANCEIRO] [MARKETING] [SUPPLY...]    |
+------------------------------------------+
|                                          |
|      "Voce esta no modo: FINANCEIRO"     |
|                                          |
|        [CONTEUDO DO MODO ATIVO]          |
|        (checklist/decisoes/items)        |
|                                          |
|                                          |
|        [BOTAO: "Concluido por agora"]    |
|                                          |
+------------------------------------------+
```

---

## Novos Arquivos a Criar

### 1. `src/types/focus-mode.ts`

Tipos para os modos de foco:

```typescript
export type FocusModeId = 
  | 'financeiro'
  | 'marketing'
  | 'supplychain'
  | 'pre-reuniao-geral'
  | 'pre-reuniao-ads'
  | 'pre-reuniao-verter'
  | 'backlog';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  classification?: 'A' | 'B' | 'C';
  decision?: 'pagar' | 'segurar' | 'renegociar' | string;
  notes?: string;
}

export interface FocusMode {
  id: FocusModeId;
  icon: string;
  title: string;
  fixedText: string;
  items: ChecklistItem[];
  completedAt?: string;
}

export interface FocusModeState {
  activeMode: FocusModeId | null;
  modes: Record<FocusModeId, FocusMode>;
  lastCompletedMode?: FocusModeId;
}
```

---

### 2. `src/hooks/useFocusModes.ts`

Hook para gerenciar os modos:

- Persistencia no localStorage
- Funcoes: `setActiveMode`, `toggleItemComplete`, `setItemClassification`, `setItemDecision`, `completeMode`, `resetMode`, `addBacklogItem`, `markBacklogUrgent`, `setBacklogEstimate`
- Checklists pre-definidos para cada modo
- Reset diario opcional

---

### 3. `src/components/ModeSelector.tsx`

Seletor visual de modos (sempre visivel no topo):

- Botoes/tabs para cada modo com icones
- Modo ativo destacado visualmente
- Ao clicar, troca o modo ativo
- Design minimalista, uma linha

---

### 4. Componentes de Modo Individuais

#### `src/components/modes/FinanceiroMode.tsx`
- Checklist: Caixa atual, vencimentos 7 dias
- Classificacao A/B/C por item
- Decisao: pagar/segurar/renegociar
- Frase: "Financeiro se decide. Nao se reage."

#### `src/components/modes/MarketingMode.tsx`
- Checklist: Sobra mes anterior, verba Ads, remarketing, teste pequeno
- Regras visiveis sobre Ads
- Frase contextual

#### `src/components/modes/SupplyChainMode.tsx`
- Checklist: Estoque, producoes, compras 30 dias, o que pode esperar
- Frase: "Compra errada vira caixa parado."

#### `src/components/modes/PreReuniaoGeralMode.tsx`
- Checklist apenas de fatos: caixa, faturamento, estoques, producoes, prazos 7d
- Botao: "Preparacao concluida"

#### `src/components/modes/PreReuniaoAdsMode.tsx`
- Checklist: resultado anterior, verba, campanhas, remarketing, o que NAO mexer
- Frase: "Ads respondem ao caixa, nao ao medo."

#### `src/components/modes/PreReuniaoVerterMode.tsx`
- Checklist: indicadores, caixa/divida, pipeline, atencao semana
- Frase: "Venda da empresa e estrategia, nao urgencia."

#### `src/components/modes/BacklogMode.tsx`
- Lista simples de tarefas (reutilizando tasks existentes)
- Marcar como urgente (sobe pro topo)
- Estimar tempo: 15min / 30min / 1h
- Ordenacao: urgentes primeiro, depois ordem de criacao
- Frase: "Backlog e onde o cerebro descansa."

---

### 5. `src/components/ModeContent.tsx`

Componente wrapper que renderiza o modo ativo:

- Switch baseado no `activeMode`
- Mostra "Voce esta agora no modo: X"
- Renderiza o componente do modo correto
- Botao universal "Concluido por agora"

---

### 6. `src/components/ChecklistItem.tsx`

Componente reutilizavel para items de checklist:

- Checkbox para marcar como feito
- Campo opcional de classificacao (A/B/C)
- Campo opcional de decisao
- Campo opcional de notas rapidas

---

## Arquivos a Modificar

### `src/pages/Index.tsx`

Substituir toda a logica atual por:

```typescript
const Index = () => {
  const { 
    activeMode, 
    modes, 
    setActiveMode, 
    completeMode,
    // ... outras funcoes
  } = useFocusModes();

  return (
    <div className="min-h-screen bg-background">
      {/* Seletor sempre visivel no topo */}
      <ModeSelector 
        activeMode={activeMode}
        onSelectMode={setActiveMode}
      />
      
      {/* Conteudo do modo ativo */}
      <main className="max-w-lg mx-auto">
        {activeMode ? (
          <ModeContent 
            mode={modes[activeMode]}
            onComplete={() => completeMode(activeMode)}
          />
        ) : (
          <NoModeSelected />
        )}
      </main>
    </div>
  );
};
```

---

### `src/types/task.ts`

Adicionar campos para backlog melhorado:

```typescript
export interface Task {
  // ... campos existentes ...
  isUrgent?: boolean;        // Marca como urgente
  estimatedTime?: '15min' | '30min' | '1h';  // Estimativa de tempo
}
```

---

### `src/hooks/useTasks.ts`

Adicionar funcoes:

- `markUrgent(id: string)`: Marca tarefa como urgente
- `setEstimatedTime(id: string, time)`: Define estimativa de tempo
- Modificar `getSortedTasks()`: Urgentes primeiro

---

## Fluxo de Uso

1. Usuario abre o app
2. Ve o seletor de modos no topo
3. Clica em "FINANCEIRO"
4. Tela mostra APENAS o modo FINANCEIRO
5. Completa/ajusta os items do checklist
6. Clica em "Concluido por agora"
7. Volta para o seletor de modos
8. Sensacao clara: "isso esta resolvido"

---

## Estilo Visual

- Layout de coluna unica
- Muito espaco em branco
- Tipografia Inter (ja configurada)
- Destaque forte para modo ativo (bg-foreground, text-background)
- Modos inativos sutis (text-muted-foreground)
- Zero graficos, zero animacoes distratoras
- Interface silenciosa

---

## Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/types/focus-mode.ts` |
| Criar | `src/hooks/useFocusModes.ts` |
| Criar | `src/components/ModeSelector.tsx` |
| Criar | `src/components/ModeContent.tsx` |
| Criar | `src/components/ChecklistItem.tsx` |
| Criar | `src/components/NoModeSelected.tsx` |
| Criar | `src/components/modes/FinanceiroMode.tsx` |
| Criar | `src/components/modes/MarketingMode.tsx` |
| Criar | `src/components/modes/SupplyChainMode.tsx` |
| Criar | `src/components/modes/PreReuniaoGeralMode.tsx` |
| Criar | `src/components/modes/PreReuniaoAdsMode.tsx` |
| Criar | `src/components/modes/PreReuniaoVerterMode.tsx` |
| Criar | `src/components/modes/BacklogMode.tsx` |
| Modificar | `src/pages/Index.tsx` |
| Modificar | `src/types/task.ts` |
| Modificar | `src/hooks/useTasks.ts` |

---

## Componentes Existentes

Os seguintes componentes serao **removidos ou nao utilizados** na nova interface:

- `OpeningBlock.tsx` (substituido por seletor de modos)
- `ClosingBlock.tsx` (substituido por "Concluido por agora")
- `TrackingBlock.tsx` (funcionalidade integrada nos modos)
- `CurrentTask.tsx` (substituido pelo BacklogMode)
- `EmptyState.tsx` (substituido por NoModeSelected)
- `CaptureButton.tsx` (substituido por adicao direta no BacklogMode)
- `BacklogAccess.tsx` (o backlog agora e um modo)

O codigo existente sera mantido para referencia, mas nao sera usado.

