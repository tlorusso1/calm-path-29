

# Reestruturação: Marketing Estrutural vs Ads (Tráfego Pago)

## O Problema Identificado

O sistema atual trata "Marketing Base" como se fosse Ads, permitindo que o investimento em tráfego pago cresça automaticamente com base no Caixa Livre Real. Isso cria um risco: mesmo com dívidas, estoque sensível e estrutura pesada, o sistema pode autorizar gastos altos em Ads.

### Lógica atual problemática:

```text
adsIncremental = caixaLivreReal * (10% a 30%)
adsMaximoPermitido = marketingBase + adsIncremental
```

Com Caixa Livre de R$ 79.000, isso permite Ads de até R$ 30.000+ - sem considerar o faturamento esperado.

## A Solução

### 1. Separar Marketing em Dois Conceitos Distintos

| Campo | Natureza | Onde entra nos calculos |
|-------|----------|-------------------------|
| **Marketing Estrutural** | Custo fixo (agencia, influencers, conteudo, ferramentas) | Queima Operacional |
| **Ads Base** | Trafego pago minimo para manter campanhas vivas | Calculo de Ads |

### 2. Nova Regra de Teto para Ads

```text
Ads Total <= 10% do Faturamento Esperado (30d)
```

Exemplo:
- Faturamento esperado: R$ 130.000
- Teto absoluto de Ads: R$ 13.000

### 3. Nova Formula de Ads Incremental

O incremento so acontece se TODAS as condicoes forem verdadeiras:
- Caixa Livre Real > 0
- alertaRisco30d diferente de vermelho
- statusDemanda diferente de fraco
- Ads total <= 10% do faturamento esperado

Percentuais de incremento sobre Ads Base:

| Status Financeiro | Incremento permitido |
|-------------------|---------------------|
| Sobrevivencia | 0% |
| Atencao | ate +10% |
| Estrategia | ate +20% |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/types/focus-mode.ts` | Renomear `marketingBase` para `marketingEstrutural`, adicionar `adsBase` |
| `src/utils/modeStatusCalculator.ts` | Reescrever calculo de Ads com teto e travas |
| `src/components/modes/FinanceiroMode.tsx` | Atualizar inputs para Marketing Estrutural + Ads Base |
| `src/components/modes/PreReuniaoAdsMode.tsx` | Atualizar exibicao dos limites |
| `src/components/ScoreNegocioCard.tsx` | Adicionar indicador de Ads (opcional) |

## Detalhes Tecnicos

### 1. Mudanca nos Tipos (`focus-mode.ts`)

**Antes:**
```typescript
interface FinanceiroStage {
  marketingBase: string;
  // ...
}
```

**Depois:**
```typescript
interface FinanceiroStage {
  marketingEstrutural: string;  // Agencia, influencers, conteudo, ferramentas
  adsBase: string;               // Trafego pago minimo
  // ...
}
```

### 2. Novo Calculo de Ads (`modeStatusCalculator.ts`)

```typescript
function calculateFinanceiroV2(data?: FinanceiroStage): FinanceiroExports {
  // Parse valores
  const marketingEstrutural = parseCurrency(d.marketingEstrutural || d.marketingBase || '');
  const adsBase = parseCurrency(d.adsBase || '');
  const faturamentoEsperado = parseCurrency(d.faturamentoEsperado30d || d.faturamentoMes || '');
  
  // TETO ABSOLUTO: Ads nunca passa de 10% do faturamento esperado
  const tetoAdsAbsoluto = faturamentoEsperado * 0.10;
  
  // Queima Operacional agora usa Marketing Estrutural (nao Ads)
  const queimaOperacional = custoFixo + marketingEstrutural;
  
  // Calculo de Ads Incremental com travas
  let adsIncremental = 0;
  let motivoBloqueioAds: string | null = null;
  
  // Verificar travas
  const podeCrescerAds = 
    caixaLivreReal > 0 &&
    alertaRisco30d !== 'vermelho';
  
  if (podeCrescerAds) {
    // Percentual baseado no status
    let incrementoPercent = 0;
    if (statusFinanceiro === 'estrategia') incrementoPercent = 0.20;
    else if (statusFinanceiro === 'atencao') incrementoPercent = 0.10;
    // sobrevivencia = 0%
    
    adsIncremental = adsBase * incrementoPercent;
  } else {
    motivoBloqueioAds = alertaRisco30d === 'vermelho' 
      ? 'Bloqueado: Alerta de risco vermelho'
      : 'Bloqueado: Caixa Livre negativo';
  }
  
  // Aplicar teto absoluto
  const adsTotal = Math.min(adsBase + adsIncremental, tetoAdsAbsoluto);
  const adsMaximoPermitido = adsTotal;
  
  return {
    // ... existentes
    adsBase,
    adsIncremental: adsTotal - adsBase,  // Ajustado pelo teto
    adsMaximoPermitido,
    tetoAdsAbsoluto,       // NOVO
    motivoBloqueioAds,     // NOVO
    queimaOperacional,     // Agora usa marketingEstrutural
  };
}
```

### 3. Atualizacao dos Inputs (`FinanceiroMode.tsx`)

```tsx
{/* ANTES: Marketing base */}
<div className="space-y-1.5">
  <label className="text-xs text-muted-foreground">Marketing base</label>
  <Input value={data.marketingBase} ... />
</div>

{/* DEPOIS: Marketing Estrutural + Ads Base */}
<div className="space-y-1.5">
  <label className="text-xs text-muted-foreground">Marketing estrutural</label>
  <p className="text-[10px] text-muted-foreground">
    Agencia, influencers, conteudo, ferramentas
  </p>
  <Input value={data.marketingEstrutural} ... />
</div>

<div className="space-y-1.5">
  <label className="text-xs text-muted-foreground">Ads base</label>
  <p className="text-[10px] text-muted-foreground">
    Minimo para manter campanhas vivas
  </p>
  <Input value={data.adsBase} ... />
</div>
```

### 4. Queima Operacional Atualizada

```tsx
{/* Card Queima Operacional */}
<div className="flex justify-between">
  <span className="text-muted-foreground">Custo fixo</span>
  <span>{formatCurrency(parseCurrency(data.custoFixoMensal))}</span>
</div>
<div className="flex justify-between">
  <span className="text-muted-foreground">Marketing estrutural</span>
  <span>{formatCurrency(parseCurrency(data.marketingEstrutural))}</span>
</div>
{/* Ads NAO entra na queima operacional */}
```

### 5. Card de Limite de Ads (`PreReuniaoAdsMode.tsx`)

```tsx
<Card className="bg-muted/30">
  <CardHeader>
    <CardTitle>Limites de Ads</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Ads base</span>
      <span>{formatCurrency(financeiroExports.adsBase)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span>Incremento permitido</span>
      <span className="text-green-600">
        +{formatCurrency(financeiroExports.adsIncremental)}
      </span>
    </div>
    <Separator />
    <div className="flex justify-between text-sm font-bold">
      <span>Ads maximo esta semana</span>
      <span className="text-primary">{formatCurrency(financeiroExports.adsMaximoPermitido)}</span>
    </div>
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>Teto absoluto (10% fat. esperado)</span>
      <span>{formatCurrency(financeiroExports.tetoAdsAbsoluto)}</span>
    </div>
    {financeiroExports.motivoBloqueioAds && (
      <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
        {financeiroExports.motivoBloqueioAds}
      </div>
    )}
  </CardContent>
</Card>
```

### 6. Termometro Semanal Atualizado (`ScoreNegocioCard.tsx`)

Adicionar indicador visual de Ads no card:

```tsx
{/* Nova secao: Status de Ads */}
<div className="p-2 bg-muted/50 rounded-lg space-y-1">
  <Megaphone className="h-4 w-4 mx-auto text-muted-foreground" />
  <p className="text-xs text-muted-foreground">Ads</p>
  <p className="font-bold text-sm">
    {financeiroExports.adsMaximoPermitido > 0 
      ? formatCurrency(financeiroExports.adsMaximoPermitido) 
      : 'Bloqueado'}
  </p>
  <p className="text-[10px] text-muted-foreground">
    {financeiroExports.motivoBloqueioAds || `max 10% fat.`}
  </p>
</div>
```

## Migracao de Dados

Para manter compatibilidade com dados existentes:

```typescript
// No calculateFinanceiroV2
const marketingEstrutural = parseCurrency(d.marketingEstrutural || d.marketingBase || '');
const adsBase = parseCurrency(d.adsBase || '');

// Se adsBase nao existir, usar 50% do marketingBase antigo como fallback
const adsBaseFallback = !d.adsBase && d.marketingBase 
  ? parseCurrency(d.marketingBase) * 0.5 
  : adsBase;
```

## Exemplo Pratico com Seus Numeros

**Entradas:**
- Faturamento esperado: R$ 130.000
- Marketing estrutural: R$ 7.000
- Ads base: R$ 4.000
- Status financeiro: Estrategia

**Calculos:**
- Teto absoluto: R$ 130.000 × 10% = **R$ 13.000**
- Incremento permitido: R$ 4.000 × 20% = R$ 800
- Ads total: R$ 4.000 + R$ 800 = R$ 4.800
- Ads maximo: min(R$ 4.800, R$ 13.000) = **R$ 4.800**

Se o usuario quiser aumentar Ads Base para R$ 10.000:
- Incremento: R$ 10.000 × 20% = R$ 2.000
- Ads total: R$ 12.000 (ainda abaixo do teto de R$ 13.000)

## Resultado Esperado

1. Ads NUNCA ultrapassa 10% do faturamento esperado
2. Marketing Estrutural entra na queima operacional (custo fixo)
3. Ads Base e separado e controlado
4. Incremento e proporcional ao status financeiro
5. Travas automaticas impedem escala em cenarios de risco
6. Termometro semanal reflete a nova estrutura

