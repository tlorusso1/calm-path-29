

# Reestruturacao dos Modos Marketing e Supply Chain

## Resumo

Transformar os modos Marketing e Supply Chain em roteiros estruturados com dados proprios, seguindo o padrao do modo Financeiro. Isso reduz carga mental e cria ritmo claro de execucao.

---

## PARTE 1: Modo Marketing

### Nova Estrutura

```text
+------------------------------------------+
|  CONTEXTO MENSAL (atualizar 1x por mes)  |
|                                          |
|  Mês fechou positivo?   [Sim] [Não]      |
|                                          |
|  Verba liberada para Ads R$ [________]   |
|                                          |
|  "Este valor não será revisto até o      |
|   próximo fechamento."                   |
|                                          |
+------------------------------------------+
|  FOCO DA SEMANA                          |
|                                          |
|  Qual é o foco desta semana?             |
|  [_______________________________]       |
|  (apenas um foco)                        |
|                                          |
+------------------------------------------+
|  O QUE PRECISO VER / COBRAR              |
|                                          |
|  [x] Campanhas ativas                    |
|  [x] Remarketing rodando                 |
|  [x] Conteúdo publicado/programado       |
|  [x] E-mail/promoção enviado/agendado    |
|  [x] Influencers/parcerias verificados   |
|                                          |
+------------------------------------------+
|  O QUE NÃO VAMOS FAZER ESTA SEMANA       |
|                                          |
|  [_______________________________]       |
|                                          |
+------------------------------------------+
|  DECISÃO DA SEMANA                       |
|                                          |
|  (o) Manter                              |
|  (o) Ajuste pequeno                      |
|  (o) Pausar algo específico              |
|                                          |
|  Observação (opcional):                  |
|  [_______________________________]       |
|                                          |
+------------------------------------------+
|                                          |
|  "Marketing não é fazer mais.            |
|   É escolher onde prestar atenção."      |
|                                          |
+------------------------------------------+
```

---

## PARTE 2: Modo Supply Chain

### Nova Estrutura com Ritmos

```text
+------------------------------------------+
|  ESCOLHA O RITMO                         |
|                                          |
|  [Semanal] [Quinzenal] [Mensal]          |
|                                          |
+------------------------------------------+
|                                          |
|  (mostra apenas o checklist do ritmo     |
|   selecionado)                           |
|                                          |
+------------------------------------------+
```

### Ritmo Semanal

```text
+------------------------------------------+
|  🟢 SEMANAL — Radar da Operação          |
|                                          |
|  [x] Atualizar saída de estoque semanal  |
|      (Planilha: Saída de estoque 2025)   |
|  [x] Verificar estoque no Bling          |
|  [x] Algum produto com saída fora do     |
|      padrão?                             |
|                                          |
|  "Semanal é radar, não decisão grande."  |
|                                          |
+------------------------------------------+
```

### Ritmo Quinzenal

```text
+------------------------------------------+
|  🟡 QUINZENAL — Ajuste de Produção       |
|                                          |
|  [x] Atualizar planejamento de produção  |
|      (Planejamento Nice Foods 2025)      |
|  [x] Produção planejada faz sentido?     |
|  [x] Ajustar se necessário               |
|                                          |
|  "Produção responde à demanda,           |
|   não ao medo."                          |
|                                          |
+------------------------------------------+
```

### Ritmo Mensal

```text
+------------------------------------------+
|  🔵 MENSAL — Base de Dados               |
|                                          |
|  [x] Atualizar saída de estoque mensal   |
|      (Saída de estoque mensal 2025)      |
|  [x] Conferir saldo final de estoque     |
|      (Relatório saldo estoque 2025)      |
|  [x] Avaliar comportamento de produtos   |
|      (caiu / manteve / cresceu)          |
|                                          |
|  "Decisão boa vem de dado consistente."  |
|                                          |
+------------------------------------------+
|  PADRÃO DE PREENCHIMENTO                 |
|                                          |
|  1. Preencher aba Ecommerce (col A-B)    |
|  2. Preencher aba Atacado (col A-B)      |
|  3. Atualizar aba TOTAL (puxar formulas) |
|                                          |
|  "Sempre seguir este padrão.             |
|   Não improvisar."                       |
|                                          |
+------------------------------------------+
```

---

## Alteracoes nos Arquivos

### 1. `src/types/focus-mode.ts`

Adicionar novas interfaces:

```typescript
// Marketing Mode specific structure
export interface MarketingStage {
  // Contexto mensal
  mesFechouPositivo: boolean | null;
  verbaAds: string;
  
  // Foco semanal
  focoSemana: string;
  
  // Checklist de verificacao
  verificacoes: {
    campanhasAtivas: boolean;
    remarketingRodando: boolean;
    conteudoPublicado: boolean;
    emailEnviado: boolean;
    influencersVerificados: boolean;
  };
  
  // O que nao fazer
  naoFazerSemana: string;
  
  // Decisao
  decisaoSemana: 'manter' | 'ajuste' | 'pausar' | null;
  observacaoDecisao: string;
}

// Supply Chain Mode specific structure
export type SupplyChainRitmo = 'semanal' | 'quinzenal' | 'mensal';

export interface SupplyChainStage {
  ritmoAtual: SupplyChainRitmo;
  
  // Semanal
  semanal: {
    saidaEstoque: boolean;
    verificarBling: boolean;
    produtoForaPadrao: boolean;
  };
  
  // Quinzenal
  quinzenal: {
    planejamentoProducao: boolean;
    producaoFazSentido: boolean;
    ajustarSeNecessario: boolean;
  };
  
  // Mensal
  mensal: {
    saidaEstoqueMensal: boolean;
    saldoFinalEstoque: boolean;
    avaliarComportamento: boolean;
  };
}
```

Atualizar `FocusMode`:

```typescript
export interface FocusMode {
  // ... campos existentes
  financeiroData?: FinanceiroStage;
  marketingData?: MarketingStage;
  supplyChainData?: SupplyChainStage;
}
```

Adicionar defaults:

```typescript
export const DEFAULT_MARKETING_DATA: MarketingStage = {
  mesFechouPositivo: null,
  verbaAds: '',
  focoSemana: '',
  verificacoes: {
    campanhasAtivas: false,
    remarketingRodando: false,
    conteudoPublicado: false,
    emailEnviado: false,
    influencersVerificados: false,
  },
  naoFazerSemana: '',
  decisaoSemana: null,
  observacaoDecisao: '',
};

export const DEFAULT_SUPPLYCHAIN_DATA: SupplyChainStage = {
  ritmoAtual: 'semanal',
  semanal: {
    saidaEstoque: false,
    verificarBling: false,
    produtoForaPadrao: false,
  },
  quinzenal: {
    planejamentoProducao: false,
    producaoFazSentido: false,
    ajustarSeNecessario: false,
  },
  mensal: {
    saidaEstoqueMensal: false,
    saldoFinalEstoque: false,
    avaliarComportamento: false,
  },
};
```

---

### 2. `src/hooks/useFocusModes.ts`

Atualizar `createDefaultMode`:

```typescript
function createDefaultMode(id: FocusModeId): FocusMode {
  const config = MODE_CONFIGS[id];
  const defaultItems = DEFAULT_CHECKLISTS[id];
  
  const mode: FocusMode = {
    ...config,
    status: 'neutral' as ModeStatus,
    items: defaultItems.map(item => ({
      ...item,
      id: generateId(),
      completed: false,
    })),
  };

  if (id === 'financeiro') {
    mode.financeiroData = { ...DEFAULT_FINANCEIRO_DATA };
  }
  
  if (id === 'marketing') {
    mode.marketingData = { ...DEFAULT_MARKETING_DATA };
  }
  
  if (id === 'supplychain') {
    mode.supplyChainData = { ...DEFAULT_SUPPLYCHAIN_DATA };
  }

  return mode;
}
```

Adicionar funcoes para Marketing e Supply Chain:

```typescript
// Marketing-specific
const updateMarketingData = useCallback((data: Partial<MarketingStage>) => {
  setState(prev => ({
    ...prev,
    modes: {
      ...prev.modes,
      marketing: {
        ...prev.modes.marketing,
        marketingData: {
          ...prev.modes.marketing.marketingData!,
          ...data,
        },
      },
    },
  }));
}, []);

// Supply Chain-specific
const updateSupplyChainData = useCallback((data: Partial<SupplyChainStage>) => {
  setState(prev => ({
    ...prev,
    modes: {
      ...prev.modes,
      supplychain: {
        ...prev.modes.supplychain,
        supplyChainData: {
          ...prev.modes.supplychain.supplyChainData!,
          ...data,
        },
      },
    },
  }));
}, []);
```

---

### 3. `src/components/modes/MarketingMode.tsx`

Reescrever completamente:

- Secao 1: Contexto Mensal
  - Botoes Sim/Nao para "Mes fechou positivo?"
  - Input para verba de Ads
  - Texto fixo sobre nao revisar ate proximo fechamento

- Secao 2: Foco da Semana
  - Input de texto (apenas um foco)

- Secao 3: O que preciso ver/cobrar
  - 5 checkboxes fixos

- Secao 4: O que NAO fazer
  - Input de texto

- Secao 5: Decisao da Semana
  - Radio buttons: Manter / Ajuste pequeno / Pausar algo
  - Textarea para observacao opcional

- Texto ancora final

---

### 4. `src/components/modes/SupplyChainMode.tsx`

Reescrever completamente:

- Seletor de ritmo no topo (Semanal / Quinzenal / Mensal)
- Renderizar apenas o checklist do ritmo selecionado
- Cada ritmo tem seu texto ancora proprio
- Ritmo Mensal mostra instrucoes de preenchimento fixas

---

### 5. `src/components/ModeContent.tsx`

Atualizar props e switch case:

```typescript
// Adicionar props
onUpdateMarketingData?: (data: Partial<MarketingStage>) => void;
onUpdateSupplyChainData?: (data: Partial<SupplyChainStage>) => void;

// Atualizar switch case
case 'marketing':
  return (
    <MarketingMode 
      mode={mode}
      onUpdateMarketingData={onUpdateMarketingData!}
    />
  );
case 'supplychain':
  return (
    <SupplyChainMode 
      mode={mode}
      onUpdateSupplyChainData={onUpdateSupplyChainData!}
    />
  );
```

---

### 6. `src/pages/Index.tsx`

Adicionar handlers:

```typescript
const {
  // ... existentes
  updateMarketingData,
  updateSupplyChainData,
} = useFocusModes();

// Passar para ModeContent
<ModeContent
  // ... existentes
  onUpdateMarketingData={updateMarketingData}
  onUpdateSupplyChainData={updateSupplyChainData}
/>
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar MarketingStage, SupplyChainStage e defaults |
| `src/hooks/useFocusModes.ts` | Adicionar funcoes update e inicializacao |
| `src/components/modes/MarketingMode.tsx` | Reescrever com nova estrutura |
| `src/components/modes/SupplyChainMode.tsx` | Reescrever com ritmos |
| `src/components/ModeContent.tsx` | Adicionar novas props e cases |
| `src/pages/Index.tsx` | Conectar novos handlers |

---

## Resultado Final

### Marketing
1. Contexto mensal (1x por mes) - define verba
2. Foco unico da semana
3. Checklist de verificacao
4. O que NAO fazer
5. Decisao simples (manter/ajustar/pausar)

### Supply Chain
1. Escolher ritmo (semanal/quinzenal/mensal)
2. Ver apenas o checklist daquele ritmo
3. Concluir e fechar

### Textos Ancora

Marketing:
> "Marketing nao e fazer mais. E escolher onde prestar atencao."

Supply Chain (por ritmo):
> Semanal: "Semanal e radar, nao decisao grande."
> Quinzenal: "Producao responde a demanda, nao ao medo."
> Mensal: "Decisao boa vem de dado consistente."

