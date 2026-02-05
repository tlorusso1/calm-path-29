
# Plano Técnico Completo: Governança V2 + Correções Pendentes

## 1. DIAGNÓSTICO: O QUE FALTA IMPLEMENTAR

### 1.1 Features Pendentes do Plano Governança V2:

| Feature | Status | Prioridade |
|---------|--------|------------|
| Executive Resume (Resumo Executivo) | ❌ Não implementado | ALTA |
| Global Inputs únicos | ❌ Não implementado | ALTA |
| Classificação de Informações (⚙️📊✏️) | ❌ Não implementado | MÉDIA |
| Tipo Intercompany em ContaFluxo | ❌ Não implementado | ALTA |
| Margem Real Estimada | ❌ Não implementado | MÉDIA |
| Impostos configuráveis | ❌ Não implementado | BAIXA |
| Gargalo da Semana automático | ❌ Não implementado | MÉDIA |
| Contexto obrigatório em Reunião Ads | ⚠️ Parcial (tem limites, falta contexto bloqueante) | MÉDIA |
| Decisão governa limites reais | ⚠️ Parcial (tem lógica, falta trava rígida) | ALTA |
| Loop de Aprendizado | ❌ Não implementado | BAIXA |

### 1.2 Bugs/Features Reportados pelo Usuário:

| Issue | Status | Solução |
|-------|--------|---------|
| **Excluir lançamentos do histórico** | ❌ Não existe botão | Adicionar botão de delete no histórico |
| **Meta Mensal estática** | ⚠️ Dinâmica mas usando props incorretas | Corrigir passagem de `custoFixoMensal` para usar total calculado |

---

## 2. ALTERAÇÕES TÉCNICAS DETALHADAS

### 2.1 EXECUTIVE RESUME (NOVO COMPONENTE)

**Arquivo:** `src/components/financeiro/ExecutiveResume.tsx` (NOVO)

Componente fixo no topo do Financeiro que mostra:
- Badge de estado global (🟢 Estratégia / 🟡 Atenção / 🔴 Sobrevivência)
- Caixa Livre Real
- Queima Operacional/dia
- Fôlego de Caixa em dias
- Resultado Esperado 30d
- Ads Máximo Permitido (semana)

```
┌─────────────────────────────────────────────────────────┐
│ 🟢 ESTRATÉGIA                                           │
├─────────────────────────────────────────────────────────┤
│ Caixa Livre Real      R$ 45.000    │ Fôlego: 42 dias   │
│ Queima/dia            R$ 1.066     │ Ads Máx: R$ 15k   │
│ Resultado 30d         R$ 8.000     │                   │
└─────────────────────────────────────────────────────────┘
```

**Integrar em:** `FinanceiroMode.tsx` como primeiro elemento após os alerts de Ritmo.

---

### 2.2 INTERCOMPANY (NOVO TIPO)

**Arquivo:** `src/types/focus-mode.ts`

```typescript
// Alterar ContaFluxo.tipo
export interface ContaFluxo {
  id: string;
  tipo: 'pagar' | 'receber' | 'intercompany';  // ADICIONAR 'intercompany'
  // ... resto igual
}
```

**Arquivo:** `src/utils/modeStatusCalculator.ts`

Excluir intercompany dos cálculos de DRE e margem:
```typescript
// Na função de cálculo de margem/DRE:
const contasParaDRE = contas.filter(c => c.tipo !== 'intercompany');
```

**Arquivo:** `src/components/financeiro/ContasFluxoSection.tsx`

Adicionar 'intercompany' no Select de tipo:
```typescript
<SelectItem value="intercompany">🔁 Intercompany</SelectItem>
```

**Arquivo:** `src/components/financeiro/ConciliacaoSection.tsx`

IA sugerir intercompany quando detectar transferências entre CNPJs:
- Regex para "TED", "Transferência", nomes de empresas do grupo

---

### 2.3 MARGEM REAL ESTIMADA (NOVO CARD)

**Arquivo:** `src/components/financeiro/MargemRealCard.tsx` (NOVO)

Fórmula:
```
Margem Real = 1 - (Compras de Produtos + Logística) / Faturamento
```

Baseado em categorias de DRE dos lançamentos pagos:
- Identificar lançamentos com categoria contendo "Compra", "Produto", "Frete", "Logística"
- Calcular percentual
- Comparar com MARGEM_OPERACIONAL (40%)
- Alerta visual se desvio > 5 p.p.

---

### 2.4 IMPOSTOS CONFIGURÁVEIS

**Arquivo:** `src/types/focus-mode.ts`

```typescript
export interface FinanceiroStage {
  // ... existente
  impostoPercentual?: number;  // default 0.16 (16%)
  impostoOverrideMotivo?: string;
}
```

**Arquivo:** `src/utils/modeStatusCalculator.ts`

```typescript
const impostoPercent = data.impostoPercentual ?? 0.16;
const impostosCalculados = faturamento * impostoPercent;
```

**UI:** Adicionar campo editável no card de Custos Defasados com aviso se alterado.

---

### 2.5 GARGALO DA SEMANA (NOVO COMPONENTE)

**Arquivo:** `src/components/GargaloIdentifier.tsx` (NOVO)

Lógica:
```typescript
function identificarGargalo(
  financeiroExports: FinanceiroExports,
  supplyExports?: SupplyExports,
  marketingExports?: MarketingExports
): { gargalo: string; areaSoberana: string } {
  
  if (financeiroExports.caixaLivreReal <= 0) {
    return { gargalo: 'FINANCEIRO', areaSoberana: 'Financeiro' };
  }
  if (supplyExports?.riscoRuptura) {
    return { gargalo: 'ESTOQUE', areaSoberana: 'Financeiro' };
  }
  if (marketingExports?.statusDemanda === 'fraco') {
    return { gargalo: 'DEMANDA', areaSoberana: 'Financeiro' };
  }
  return { gargalo: 'Nenhum', areaSoberana: 'Financeiro' };
}
```

**Integrar em:** `PreReuniaoGeralMode.tsx` e `ReuniaoAdsMode.tsx`

---

### 2.6 CONTEXTO OBRIGATÓRIO EM REUNIÃO ADS

**Arquivo:** `src/components/modes/ReuniaoAdsMode.tsx`

Adicionar card de contexto no topo que bloqueia a tela se decisão não existir:

```typescript
{!prioridadeSemana && (
  <Card className="bg-destructive/5 border-destructive/30">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Decisão da Semana não definida</p>
          <p className="text-xs text-muted-foreground">
            Defina a prioridade na Pré-Reunião Geral para liberar esta tela.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

Se `!prioridadeSemana`, desabilitar todos os inputs abaixo.

---

### 2.7 GLOBAL INPUTS (ANTI-RETRABALHO)

**Arquivo:** `src/types/focus-mode.ts`

```typescript
export interface GlobalInputs {
  pedidosSemanaAnterior: number;
  faturamentoMesAtual: string;
  faturamentoEsperado30d: string;
  margemOperacional: number;  // Default 40%, editável
}

export interface FocusModeState {
  // ... existente
  globalInputs?: GlobalInputs;
}
```

**Arquivo:** `src/hooks/useFocusModes.ts`

Adicionar:
```typescript
const updateGlobalInput = useCallback((key: keyof GlobalInputs, value: any) => {
  setState(prev => ({
    ...prev,
    globalInputs: { ...prev.globalInputs, [key]: value },
  }));
}, []);
```

**UI:** Financeiro edita esses campos → Marketing/Supply lêem apenas (readonly).

---

### 2.8 CLASSIFICAÇÃO DE INFORMAÇÕES (⚙️📊✏️)

**Arquivo:** `src/components/ui/info-label.tsx` (NOVO)

Componente reutilizável:
```typescript
type InfoType = 'parametro' | 'leitura' | 'input';

export function InfoLabel({ type, children }: { type: InfoType; children: React.ReactNode }) {
  const styles = {
    parametro: { icon: '⚙️', bg: 'bg-blue-50', text: 'text-blue-700', label: 'PARÂMETRO' },
    leitura: { icon: '📊', bg: 'bg-cyan-50', text: 'text-cyan-700', label: 'LEITURA' },
    input: { icon: '✏️', bg: 'bg-amber-50', text: 'text-amber-700', label: 'INPUT' },
  };
  
  const s = styles[type];
  return (
    <div className={`${s.bg} rounded p-1 flex items-center gap-1`}>
      <span className={`text-[10px] font-bold ${s.text}`}>{s.icon} {s.label}</span>
      {children}
    </div>
  );
}
```

**Integrar:** Em cada card do Financeiro, Marketing, etc.

---

### 2.9 EXCLUIR LANÇAMENTOS DO HISTÓRICO

**Arquivo:** `src/components/financeiro/ContasFluxoSection.tsx`

Na seção de histórico (linhas 516-536), adicionar botão de delete:

```typescript
{contasPagas.slice(0, historicoLimit).map((conta) => (
  <div 
    key={conta.id}
    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border text-xs"
  >
    {/* ... conteúdo existente ... */}
    
    {/* NOVO: Botão de excluir */}
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2"
      onClick={() => onRemoveConta(conta.id)}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
))}
```

---

### 2.10 META MENSAL DINÂMICA (CORREÇÃO)

**Problema:** `MetaMensalCard` recebe `custoFixoMensal` como string, mas o Financeiro agora usa `custosFixosDetalhados` com breakdown.

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`

Onde renderiza `MetaMensalCard`, passar o total calculado:

```typescript
<MetaMensalCard
  contasFluxo={data.contasFluxo || []}
  custoFixoMensal={formatCurrency(totalCustosFixos).replace('R$', '').trim()}  // ← JÁ CORRETO
  marketingEstrutural={data.marketingEstrutural || ''}
  adsBase={data.adsBase || ''}
  faturamentoCanais={data.faturamentoCanais}
/>
```

**Verificar:** Se `totalCustosFixos` está sendo calculado corretamente do breakdown.

Atualmente em FinanceiroMode.tsx linha 127-129:
```typescript
const totalCustosFixos = useMemo(() => {
  return calcularTotalCustosFixos(data.custosFixosDetalhados || DEFAULT_CUSTOS_FIXOS);
}, [data.custosFixosDetalhados]);
```

Isso está correto - o problema pode ser que `faturamentoCanais` não está preenchido (mostra R$0 faturado).

**Solução adicional:** Usar `faturamentoMes` como fallback se canais estiverem vazios:
```typescript
// Em MetaMensalCard.tsx
const faturadoAtual = faturamentoCanais
  ? (parseValorFlexivel(faturamentoCanais.b2b) + ...)
  : parseValorFlexivel(faturamentoMes || '0');  // FALLBACK
```

---

### 2.11 LOOP DE APRENDIZADO (OPCIONAL)

**Arquivo:** `src/components/financeiro/LoopAprendizado.tsx` (NOVO)

Comparar dados da semana atual com `weekly_snapshots` da semana anterior:
```
"Semana passada você decidiu ESCALAR"
"Resultado: ROAS 3.2 (+0.4 vs semana anterior)"
```

**Integrar em:** `ReuniaoAdsMode.tsx` no topo.

---

## 3. ORDEM DE IMPLEMENTAÇÃO

| Fase | Item | Arquivos | Créditos Est. |
|------|------|----------|---------------|
| 1 | Excluir do histórico (BUG) | ContasFluxoSection.tsx | 1 |
| 1 | Meta Mensal fallback (BUG) | MetaMensalCard.tsx | 1 |
| 2 | Executive Resume | ExecutiveResume.tsx, FinanceiroMode.tsx | 2 |
| 2 | Intercompany tipo | focus-mode.ts, modeStatusCalculator.ts, ContasFluxoSection.tsx | 2 |
| 3 | Margem Real Estimada | MargemRealCard.tsx, FinanceiroMode.tsx | 1 |
| 3 | Impostos configuráveis | focus-mode.ts, modeStatusCalculator.ts, FinanceiroMode.tsx | 1 |
| 4 | Gargalo da Semana | GargaloIdentifier.tsx, PreReuniaoGeralMode.tsx | 1 |
| 4 | Contexto bloqueante Ads | ReuniaoAdsMode.tsx | 1 |
| 5 | Global Inputs | focus-mode.ts, useFocusModes.ts, FinanceiroMode.tsx | 2 |
| 5 | Classificação visual (⚙️📊✏️) | info-label.tsx, múltiplos | 2 |
| 6 | Loop de Aprendizado | LoopAprendizado.tsx | 1 |

**Total estimado: 15 alterações**

---

## 4. RESUMO VISUAL FINAL

Após implementação:

```
┌───────────────────────────────────────────────────────────────┐
│ 🟢 Hoje está tudo em dia                                      │  ← RitmoStatusBar
├───────────────────────────────────────────────────────────────┤
│ [💰] [📣] [🚚] [🧠] [🎯] [📈] [📋]                            │  ← ModeSelector
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  🟢 ESTRATÉGIA           Caixa Livre: R$ 45.000              │  ← Executive Resume
│  Queima/dia: R$ 1.066    Fôlego: 42 dias                     │
│  Resultado 30d: R$ 8k    Ads Máx: R$ 15.000                  │
│                                                               │
│  ⚙️ PARÂMETROS                                               │
│  ├── Margem: 40%                                             │
│  └── Impostos: 16%                                           │
│                                                               │
│  📊 LEITURAS AUTOMÁTICAS                                     │
│  ├── Margem Real Estimada: 38% (⚠️ -2pp vs padrão)          │
│  └── Gargalo: Nenhum                                         │
│                                                               │
│  💰 Custos Fixos Detalhados         Total: R$ 36.131         │
│  ▼ 👥 Pessoas                       R$ 22.269                │
│  ► 💻 Software                      R$ 2.862                 │
│  ...                                                         │
│                                                               │
│  📋 Contas a Pagar/Receber                                   │
│  ├── Pendentes (12)                                          │
│  └── ▼ Histórico (últimos 60d)                              │
│       ├── 05/02 Fornecedor X  R$ -500  [🗑️]                 │  ← NOVO: Delete
│       └── ...                                                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```
