
# Plano: Consolidar Ads no Marketing + Ajustar Acesso Gabrielle

## Resumo das Mudanças

Este plano reorganiza os módulos de Ads para simplificar a interface:

1. **Renomear** "Pré-Reunião Ads" para "Reunião Ads" (muda de "pré" para reunião real de terça)
2. **Remover** a aba "Reunião Ads" antiga (duplicada)
3. **Consolidar Performance** na Reunião Ads (terça) em vez de ser preparação
4. **Ajustar acesso da Gabrielle**: Marketing + Reunião Ads (SEM acesso à Pré-Reunião Geral)

---

## Antes vs Depois

| Antes | Depois |
|-------|--------|
| Marketing | Marketing |
| Pré-Reunião Geral | Pré-Reunião Geral (só admin) |
| Pré-Reunião Ads | Reunião Ads (renomeado) |
| Reunião Ads | (removido - fusão) |

---

## 1. Remover "reuniao-ads" do Sistema

A aba "Reunião Ads" antiga tinha:
- Orçamento aprovado
- Distribuição por canal (Meta vs Google)
- Métricas por canal
- Ações da semana

**Decisão**: Mover o conteúdo útil para a nova "Reunião Ads" (antiga Pré-Reunião Ads)

---

## 2. Renomear "pre-reuniao-ads" para "reuniao-ads"

### Arquivos afetados:

**src/types/focus-mode.ts**
- `FocusModeId`: Remover `'reuniao-ads'` mantendo apenas `'pre-reuniao-ads'`
- Ou: Inverter - manter `'reuniao-ads'`, remover `'pre-reuniao-ads'`
- `MODE_CONFIGS['reuniao-ads']`: Atualizar title e fixedText
- Remover `ReuniaoAdsStage` e `DEFAULT_REUNIAO_ADS_DATA`

**Melhor abordagem**: Manter o ID `'reuniao-ads'` (já existe) e remover `'pre-reuniao-ads'`, migrando os dados.

### Novo título e texto:
```typescript
'reuniao-ads': {
  id: 'reuniao-ads',
  icon: '🎯',
  title: 'Reunião Ads',
  fixedText: 'Ads respondem ao caixa, não ao medo.',
  frequency: 'weekly',
}
```

---

## 3. Fusão de Conteúdo na Nova "Reunião Ads"

A nova aba combinará:

**Da antiga Pré-Reunião Ads:**
- Score do Negócio (readonly)
- Limites de Ads do Financeiro (readonly)
- Status do Marketing/Orgânico (readonly)
- Inputs de Performance (ROAS, CPA, Ticket, Gasto)
- Termômetros
- Leitura combinada
- Decisão da semana (escalar/manter/reduzir)

**Da antiga Reunião Ads:**
- Orçamento aprovado (diário/semanal)
- Distribuição Meta vs Google
- Limites ROAS/CPA
- Métricas por canal
- Ações da semana
- Registro da decisão

### Estrutura Visual Proposta:

```
┌─────────────────────────────────────────────────┐
│  📊 REUNIÃO ADS (terça-feira)                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌── 📈 SCORE DO NEGÓCIO (readonly) ──────────┐│
│  │  Financeiro: 🟢 | Estoque: 🟡 | Demanda: 🟢 ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 🔒 LIMITES DO FINANCEIRO (readonly) ─────┐│
│  │  Ads máximo: R$ X.XXX | Teto: R$ Y.YYY     ││
│  │  Prioridade: Crescer controlado            ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 🌱 STATUS MARKETING (readonly) ──────────┐│
│  │  Orgânico: Forte | Demanda: +15%           ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ═══════════════════════════════════════════════│
│  PERFORMANCE (preencher toda terça)             │
│  ═══════════════════════════════════════════════│
│                                                 │
│  ┌── 📊 MÉTRICAS GERAIS ──────────────────────┐│
│  │  ROAS 7d: [___] 14d: [___] 30d: [___]      ││
│  │  CPA médio: R$ [___]  Ticket: R$ [___]     ││
│  │  Gasto semanal: R$ [___]                   ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 📊 MÉTRICAS POR CANAL ───────────────────┐│
│  │  🔵 META:   ROAS [__] CPA [__] Spend [__]  ││
│  │  🟢 GOOGLE: ROAS [__] CPA [__] Spend [__]  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 🎚️ TERMÔMETROS ──────────────────────────┐│
│  │  ROAS: ████████░░ 3.2                       ││
│  │  CPA:  ██████░░░░ 75%                       ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 💬 LEITURA COMBINADA ────────────────────┐│
│  │  "Financeiro saudável, orgânico forte..."  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ═══════════════════════════════════════════════│
│  DECISÕES                                       │
│  ═══════════════════════════════════════════════│
│                                                 │
│  ┌── 💰 ORÇAMENTO APROVADO ───────────────────┐│
│  │  Diário: R$ [___]    Semanal: R$ [___]     ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 📊 DISTRIBUIÇÃO ─────────────────────────┐│
│  │  Meta [═══════════░░░] Google              ││
│  │       70%              30%                 ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 🎯 LIMITES DE OPERAÇÃO ──────────────────┐│
│  │  ROAS mínimo: [___]  CPA máximo: R$ [___]  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── ⚡ DECISÃO DA SEMANA ────────────────────┐│
│  │  ○ Escalar (+20%)                          ││
│  │  ● Manter                                  ││
│  │  ○ Reduzir (-30%)                          ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── ⚡ AÇÕES ────────────────────────────────┐│
│  │  🚀 Escalar: Campanha X                    ││
│  │  ⏸️ Pausar: Criativo Y                     ││
│  │  [Tipo ▼] [Descrição...        ] [+]       ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌── 📝 REGISTRO ─────────────────────────────┐│
│  │  [Resumo das decisões...]                  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 4. Ajustar Acesso da Gabrielle

**Atual (useUserRole.ts):**
```typescript
'pre-reuniao-geral': ['admin'],
'pre-reuniao-ads': ['admin', 'marketing'],
'reuniao-ads': ['admin', 'marketing'],
```

**Novo:**
```typescript
'pre-reuniao-geral': ['admin'],
'reuniao-ads': ['admin', 'marketing'],  // Única aba de Ads
```

A Gabrielle terá acesso a:
- Marketing
- Reunião Ads (nova, consolidada)

E NAO terá acesso a:
- Financeiro
- Supply Chain
- Pré-Reunião Geral
- Pré-Reunião Verter
- Tasks

---

## 5. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Remover `'pre-reuniao-ads'` do type, mesclar interfaces, atualizar MODE_CONFIGS |
| `src/hooks/useUserRole.ts` | Atualizar MODE_ROLE_MAP removendo pre-reuniao-ads |
| `src/components/ModeSelector.tsx` | Remover pre-reuniao-ads do MODE_ORDER |
| `src/components/ModeContent.tsx` | Remover case pre-reuniao-ads, atualizar reuniao-ads |
| `src/components/modes/PreReuniaoAdsMode.tsx` | Renomear para ReuniaoAdsMode.tsx e mesclar conteúdo |
| `src/components/modes/ReuniaoAdsMode.tsx` | Deletar (será substituído) |
| `src/hooks/useFocusModes.ts` | Remover handlers de pre-reuniao-ads, migrar dados |
| `src/pages/Index.tsx` | Atualizar props removendo pre-reuniao-ads |
| `src/components/modes/PreReuniaoGeralMode.tsx` | Atualizar referência de preReuniaoAdsData para reuniaoAdsData |
| `src/utils/modeStatusCalculator.ts` | Atualizar se necessário |

---

## 6. Migração de Dados

Os dados de `preReuniaoAdsData` precisam ser migrados para `reuniaoAdsData`. A nova interface combinada:

```typescript
export interface ReuniaoAdsStage {
  // Antigo PreReuniaoAdsStage
  roasMedio7d: string;
  roasMedio14d: string;
  roasMedio30d: string;
  cpaMedio: string;
  ticketMedio: string;
  gastoAdsAtual: string;
  decisaoSemana: 'escalar' | 'manter' | 'reduzir' | null;
  
  // Antigo ReuniaoAdsStage
  orcamentoDiario: string;
  orcamentoSemanal: string;
  distribuicaoMeta: string;
  distribuicaoGoogle: string;
  roasMinimoAceitavel: string;
  cpaMaximoAceitavel: string;
  metricasMeta: { roas: string; cpa: string; spend: string; receita: string };
  metricasGoogle: { roas: string; cpa: string; spend: string; receita: string };
  acoes: ReuniaoAdsAcao[];
  registroDecisao: string;
}
```

---

## 7. Vantagens

1. **Interface mais limpa**: Uma aba a menos no menu
2. **Fluxo lógico**: Tudo de Ads em um só lugar (terça-feira)
3. **Menos confusão**: Não tem mais "Pré" e "Reunião" separados
4. **Acesso simplificado**: Gabrielle vê só o que precisa

---

## Consideracoes Tecnicas

### Dados Existentes
- Os dados do `preReuniaoAdsData` precisam ser migrados para `reuniaoAdsData`
- Fazer isso no hook `useFocusModes` ao carregar dados antigos

### Performance
- O componente consolidado será maior, mas não impactará performance significativamente
- Manter seções colapsáveis se necessário para mobile

### Backward Compatibility
- Manter suporte temporário para dados antigos no formato `preReuniaoAdsData`
- Migrar automaticamente na primeira carga
