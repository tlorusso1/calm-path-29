

# Integrar Marketing Exports na Pre-Reunião Ads

## Problema Atual

O **PreReuniaoAdsMode** (terça) recebe apenas:
- `financeiroExports` (do Financeiro)
- `prioridadeSemana` (da Pré-Reunião Geral)

Mas **NÃO recebe** os dados do Marketing (segunda):
- `scoreOrganico`
- `statusOrganico`
- `scoreDemanda`
- `statusDemanda`

Isso quebra a lógica: "se orgânico foi fraco na segunda, a terça deveria saber para ajustar Ads".

---

## Solucao

Passar os `MarketingExports` calculados do Marketing para o PreReuniaoAdsMode.

---

## Fluxo Corrigido

```text
Segunda: Marketing
    └── Calcula: scoreOrganico, scoreDemanda, statusOrganico, statusDemanda
           │
           ▼
Terça: Pre-Reunião Ads
    └── Recebe: financeiroExports + prioridadeSemana + marketingExports
           │
           ▼
    Regras automáticas:
    - Orgânico 🔴 = "Ads compensa com mais topo de funil"
    - Orgânico 🟢 = "Ads pode focar remarketing"
    - Orgânico 🔴 + Financeiro 🟡 = Bloqueado escalar
```

---

## Mudancas Tecnicas

### 1. Hook `useFocusModes.ts`

Calcular e exportar `marketingExports`:

```typescript
const marketingExports = useMemo(() => {
  const marketing = state.modes.marketing?.marketingData;
  return calculateMarketingOrganico(marketing?.organico);
}, [state.modes.marketing?.marketingData]);

return {
  // ... existentes
  marketingExports,
};
```

### 2. Componente `Index.tsx`

Passar `marketingExports` para o ModeContent:

```typescript
const { marketingExports, ... } = useFocusModes();

<ModeContent
  marketingExports={marketingExports}
  ...
/>
```

### 3. Componente `ModeContent.tsx`

Adicionar prop e passar para PreReuniaoAdsMode:

```typescript
interface ModeContentProps {
  marketingExports?: MarketingExports;
  // ...
}

case 'pre-reuniao-ads':
  return (
    <PreReuniaoAdsMode 
      marketingExports={marketingExports!}
      ...
    />
  );
```

### 4. Componente `PreReuniaoAdsMode.tsx`

Receber `marketingExports` e usar na lógica:

```typescript
interface PreReuniaoAdsModeProps {
  marketingExports: MarketingExports;
  // ...
}

// Mostrar status do orgânico
// Ajustar leitura combinada para incluir orgânico
// Regra: Orgânico fraco + Financeiro atenção = bloquear escalar
```

---

## Novas Regras de Bloqueio

| Orgânico | Financeiro | Escalar? |
|----------|------------|----------|
| 🟢 Forte | 🟢 Estratégia | Permitido |
| 🟡 Médio | 🟢 Estratégia | Permitido |
| 🔴 Fraco | 🟢 Estratégia | Permitido (Ads compensa) |
| 🟢 Forte | 🟡 Atenção | Permitido |
| 🟡 Médio | 🟡 Atenção | Permitido com cautela |
| 🔴 Fraco | 🟡 Atenção | **BLOQUEADO** |
| Qualquer | 🔴 Sobrevivência | **BLOQUEADO** |
| Qualquer | Preservar Caixa | **BLOQUEADO** |

---

## Visual Atualizado no PreReuniaoAdsMode

Adicionar card "Status do Marketing" antes da decisão:

```text
┌─────────────────────────────────────┐
│ 🌱 Status do Marketing (segunda)   │
├─────────────────────────────────────┤
│ Orgânico:  🔴 Fraco (32 pts)       │
│ Demanda:   🟡 Neutro (58 pts)      │
│ Sessões:   🟡 -3% vs média         │
├─────────────────────────────────────┤
│ Recomendação:                       │
│ "Ads deve compensar com mais topo   │
│ de funil e remarketing"             │
└─────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useFocusModes.ts` | Calcular e exportar `marketingExports` |
| `src/pages/Index.tsx` | Passar `marketingExports` para ModeContent |
| `src/components/ModeContent.tsx` | Aceitar prop e passar para PreReuniaoAdsMode |
| `src/components/modes/PreReuniaoAdsMode.tsx` | Receber prop, mostrar status, aplicar regras |

---

## Resultado

- Segunda: preenche Marketing
- Terça: vê automaticamente como foi o orgânico
- Decisão de Ads é informada pelo contexto completo
- Bloqueio automático: Orgânico fraco + Financeiro em atenção = proibido escalar

