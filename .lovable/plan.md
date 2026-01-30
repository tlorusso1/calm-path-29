
# Score de Marketing Relativo ao Histórico

## Resumo da Mudança

O score de Marketing/Demanda vai deixar de ser **absoluto** (pontos por preencher) e passar a ser **relativo** (comparação com média das últimas 4 semanas). Além disso, vamos adicionar o pilar de **Pedidos** para validar a conversão real.

## O Que Muda Para Você

### Antes (Absoluto)
- Preencher e-mail = 30 pontos
- Influencer ativo = 30 pontos
- Alcance >= média manual = 40 pontos
- **Problema:** Score "bom" só por preencher, mesmo que performance esteja caindo

### Depois (Relativo)
- Cada pilar compara com a **média das últimas 4 semanas**
- Acima da média (+10%): pontuação máxima
- Na média (±10%): 70% dos pontos
- Abaixo da média (-10%): 40% dos pontos

### Novo Campo: Pedidos da Semana
- Você vai informar quantos pedidos teve na semana
- Sistema vai comparar com média histórica
- Valida se o orgânico está convertendo em vendas reais

## Nova Fórmula de Demanda

```text
Score Demanda = Organico (30%) + Sessoes (35%) + Pedidos (35%)
```

Sessões e Pedidos pesam mais porque validam conversão real.

## Visualização com Tendências

Cada pilar mostrará sua tendência:

```text
+-----------------------------------------+
| DEMANDA - VISAO GERAL                   |
+-----------------------------------------+
|  Organico    Sessoes      Pedidos       |
|  ↑ Acima     = Media      ↓ Abaixo      |
|                                         |
|  [============================] 65/100  |
|                                         |
|  Leitura: Sessoes OK, pedidos           |
|     caindo. Verificar conversao.        |
+-----------------------------------------+
```

Indicadores visuais:
- ↑ Verde = Acima da média histórica
- = Amarelo = Na média
- ↓ Vermelho = Abaixo da média

---

## Detalhes Técnicos

### 1. Migração do Banco

Adicionar coluna para pedidos no histórico:

```sql
ALTER TABLE weekly_snapshots 
ADD COLUMN IF NOT EXISTS pedidos_semana NUMERIC;
```

### 2. Novos Campos nos Tipos (`src/types/focus-mode.ts`)

```typescript
// Em MarketingOrganico
interface MarketingOrganico {
  // ... existentes ...
  pedidosSemana: string;  // NOVO
}

// Em MarketingExports
interface MarketingExports {
  // ... existentes ...
  tendenciaOrganico: 'acima' | 'media' | 'abaixo';
  tendenciaSessoes: 'acima' | 'media' | 'abaixo';
  tendenciaPedidos: 'acima' | 'media' | 'abaixo';
}
```

### 3. Interface de Médias Históricas (`src/hooks/useWeeklyHistory.ts`)

```typescript
export interface HistoricoMedias {
  scoreOrganico: number;
  sessoesSemana: number;
  pedidosSemana: number;
  temDados: boolean;
}

export function calcularMediasHistoricas(
  snapshots: WeeklySnapshot[]
): HistoricoMedias {
  // Pegar ultimas 4 semanas (excluindo a atual)
  const ultimas4 = snapshots.slice(1, 5);
  
  if (ultimas4.length < 2) {
    return { 
      temDados: false, 
      scoreOrganico: 0, 
      sessoesSemana: 0, 
      pedidosSemana: 0 
    };
  }
  
  const media = (arr: number[]) => 
    arr.reduce((a, b) => a + b, 0) / arr.length;
  
  return {
    temDados: true,
    scoreOrganico: media(ultimas4.map(s => s.score_organico || 0)),
    sessoesSemana: media(ultimas4.map(s => s.sessoes_semana || 0)),
    pedidosSemana: media(ultimas4.map(s => s.pedidos_semana || 0)),
  };
}
```

### 4. Função de Score Relativo (`src/utils/modeStatusCalculator.ts`)

```typescript
type Tendencia = 'acima' | 'media' | 'abaixo';

function calcularScoreRelativo(
  valorAtual: number, 
  mediaHistorica: number,
  pontosTotais: number
): { score: number; tendencia: Tendencia } {
  // Sem historico = neutro (50%)
  if (mediaHistorica <= 0) {
    return { score: pontosTotais * 0.5, tendencia: 'media' };
  }
  
  const variacao = ((valorAtual - mediaHistorica) / mediaHistorica) * 100;
  
  if (variacao >= 10) {
    return { score: pontosTotais, tendencia: 'acima' };
  } else if (variacao >= -10) {
    return { score: pontosTotais * 0.7, tendencia: 'media' };
  } else {
    return { score: pontosTotais * 0.4, tendencia: 'abaixo' };
  }
}
```

### 5. Atualização de calculateMarketingOrganico

A função passará a receber o histórico como parâmetro opcional:

```typescript
export function calculateMarketingOrganico(
  organico?: MarketingStage['organico'],
  historicoMedias?: HistoricoMedias
): MarketingOrganicoResult {
  // ... calcular scoreOrganicoAbsoluto (0-100) ...
  
  // PILAR 1: ORGANICO (30 pontos max)
  const organicoResult = calcularScoreRelativo(
    scoreOrganicoAbsoluto, 
    historicoMedias?.scoreOrganico || 0,
    30
  );
  
  // PILAR 2: SESSOES (35 pontos max)
  const sessoes = parseCurrency(organico?.sessoesSemana || '');
  const sessoesResult = calcularScoreRelativo(
    sessoes,
    historicoMedias?.sessoesSemana || 0,
    35
  );
  
  // PILAR 3: PEDIDOS (35 pontos max)
  const pedidos = parseCurrency(organico?.pedidosSemana || '');
  const pedidosResult = calcularScoreRelativo(
    pedidos,
    historicoMedias?.pedidosSemana || 0,
    35
  );
  
  // SCORE FINAL DE DEMANDA
  const scoreDemanda = Math.round(
    organicoResult.score + sessoesResult.score + pedidosResult.score
  );
  
  return {
    scoreDemanda,
    statusDemanda: scoreDemanda >= 70 ? 'forte' : 
                   scoreDemanda >= 40 ? 'neutro' : 'fraco',
    tendenciaOrganico: organicoResult.tendencia,
    tendenciaSessoes: sessoesResult.tendencia,
    tendenciaPedidos: pedidosResult.tendencia,
    // ... outros campos ...
  };
}
```

### 6. Atualização do MarketingMode.tsx

Adicionar input de pedidos e indicadores de tendência:

```tsx
{/* Novo Card: Pedidos da Semana */}
<Card>
  <CardHeader>
    <CardTitle>Pedidos da Semana</CardTitle>
  </CardHeader>
  <CardContent>
    <Input
      placeholder="Ex: 250"
      value={data.organico?.pedidosSemana || ''}
      onChange={(e) => handleOrganicoChange('pedidosSemana', e.target.value)}
    />
    
    {/* Indicador de tendencia */}
    <div className={cn("p-3 rounded-lg", bgByTendencia)}>
      <p>{tendenciaPedidos === 'acima' ? '↑' : 
          tendenciaPedidos === 'abaixo' ? '↓' : '='} 
         vs média histórica</p>
    </div>
  </CardContent>
</Card>

{/* Grid de demanda atualizado */}
<div className="grid grid-cols-3 gap-3">
  <div className="text-center">
    <p>Organico</p>
    <p className={colorByTendencia[tendenciaOrganico]}>
      {tendenciaOrganico === 'acima' ? '↑' : 
       tendenciaOrganico === 'abaixo' ? '↓' : '='}
    </p>
  </div>
  <div className="text-center">
    <p>Sessoes</p>
    <p className={colorByTendencia[tendenciaSessoes]}>
      {tendenciaSessoes === 'acima' ? '↑' : 
       tendenciaSessoes === 'abaixo' ? '↓' : '='}
    </p>
  </div>
  <div className="text-center">
    <p>Pedidos</p>
    <p className={colorByTendencia[tendenciaPedidos]}>
      {tendenciaPedidos === 'acima' ? '↑' : 
       tendenciaPedidos === 'abaixo' ? '↓' : '='}
    </p>
  </div>
</div>
```

### 7. Uso do Histórico no MarketingMode

O componente vai buscar o histórico via hook:

```tsx
import { useWeeklyHistory, calcularMediasHistoricas } from '@/hooks/useWeeklyHistory';

function MarketingMode({ mode, onUpdateMarketingData }) {
  const { history } = useWeeklyHistory(5); // Ultimas 5 semanas
  const historicoMedias = calcularMediasHistoricas(history);
  
  // Calcular com historico
  const organicoResult = calculateMarketingOrganico(
    data.organico, 
    historicoMedias
  );
  // ...
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Migracao SQL | Adicionar `pedidos_semana` na tabela `weekly_snapshots` |
| `src/types/focus-mode.ts` | Adicionar `pedidosSemana` e tendencias |
| `src/hooks/useWeeklyHistory.ts` | Adicionar `calcularMediasHistoricas()` |
| `src/utils/modeStatusCalculator.ts` | Reescrever `calculateMarketingOrganico` com score relativo |
| `src/components/modes/MarketingMode.tsx` | Adicionar input de pedidos e indicadores de tendencia |

## Exemplo Pratico

**Historico (media 4 semanas):**
- Score organico: 60
- Sessoes: 10.000
- Pedidos: 250

**Semana atual:**
- Score organico: 70 (+17% -> Acima) -> 30 pontos
- Sessoes: 11.500 (+15% -> Acima) -> 35 pontos
- Pedidos: 220 (-12% -> Abaixo) -> 14 pontos (35 x 0.4)

**Score Demanda:** 30 + 35 + 14 = **79** (Forte)

**Leitura:** "Organico e sessoes acima da media, mas pedidos caindo. Verificar conversao."

## Resultado Esperado

1. Score so e "bom" se performance estiver **melhor que o historico**
2. Cross com sessoes e pedidos **valida o organico**
3. Tendencias visuais (↑ = ↓) facilitam leitura rapida
4. Sem historico = neutro (nao pune nem beneficia)
5. Termometro semanal reflete demanda real com dados de conversao
