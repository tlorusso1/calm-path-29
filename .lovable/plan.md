
## Plano: Reestruturação Financeiro V3 — Painel de Avião CFO

### Resumo das Mudanças

O wireframe define uma nova estrutura visual com 8 seções lógicas distintas, separando claramente o que é **REAL** (já aconteceu), **CONTRATADO** (vendido, aguardando liquidação), **PROJEÇÃO** (hipóteses) e **PARÂMETROS** (configuração).

---

### 1. HEADER FIXO — Alertas Contextuais

**O que é:** Alertas de pendências do Ritmo sempre visíveis no topo

**Mudança:**
- Manter os `RitmoContextualAlert` existentes
- Adicionar nova linha com o título do modo e frase âncora
- Visual: destaque amarelo para pendências

**Localização:** Primeiro elemento dentro do `FinanceiroMode`

---

### 2. EXECUTIVE RESUME — Reformulação

**O que é:** Painel soberano (sem inputs, só leitura)

**Mudanças no `ExecutiveResume.tsx`:**

| Campo Atual | Novo Campo | Descrição |
|-------------|------------|-----------|
| Caixa Livre Real | Caixa Livre REAL | Dinheiro disponível agora |
| - | Caixa CONTRATADO | Vendas feitas aguardando liquidação (novo!) |
| Queima/dia | Queima/dia | Mantém |
| Fôlego | Fôlego | Mantém |
| Resultado 30d | Resultado 30d | Mantém |
| Ads Máx/mês | Ads Máx Permitido | Mantém |

**Novo cálculo a adicionar:**
```typescript
caixaContratado = totalAReceber (de todos os gateways)
// Já existe em totaisContas.aReceber no FinanceiroMode
```

**Layout:** 2x3 grid com labels em CAPS e descrições curtas

---

### 3. POSIÇÃO ATUAL — REAL

**O que é:** O que já aconteceu (bate com banco)

**Estrutura:**
```
3.1 Caixa Atual (INPUT único) ← input principal
3.2 Contas Bancárias [collapse]
3.3 Contas a Pagar/Receber [collapse] ← ação diária
3.4 Histórico 60d [collapse]
```

**Mudanças:**
- Criar novo `Card` container com header "POSIÇÃO ATUAL — REAL"
- Mover o input de Caixa Atual para dentro desta seção
- Mover Contas Bancárias (já existe como collapse)
- Mover ContasFluxoSection (já existe)
- Mover o histórico que está dentro de ContasFluxoSection para uma seção própria

---

### 4. CAIXA CONTRATADO — NOVA SEÇÃO

**O que é:** Vendas já feitas, aguardando liquidação

**Novo componente:** `CaixaContratadoCard.tsx`

```typescript
interface CaixaContratadoData {
  nuvemshop: { valor: string; prazo: string }; // D+14
  shopee: { valor: string; prazo: string };    // D+30
  assinaturas: { valor: string; prazo: string }; // D+7
  outros?: { valor: string; prazo: string };
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│ 💳 CAIXA CONTRATADO                     │
│ (vendas feitas, aguardando liquidação)  │
├─────────────────────────────────────────┤
│ Nuvemshop      R$ ___      D+14        │
│ Shopee         R$ ___      D+30        │
│ Assinaturas    R$ ___      D+7         │
├─────────────────────────────────────────┤
│ TOTAL          R$ 53.000               │
└─────────────────────────────────────────┘
```

**Fonte dos dados:** Já existe em `contas.asaas.aReceber`, `contas.nuvem.aReceber`, etc.

---

### 5. PROJEÇÃO — ESTIMADO

**O que é:** Hipóteses (depende de premissas)

**Estrutura:**
```
5.1 Premissas [PARÂMETROS]
    - Faturamento esperado 30d
    - Margem operacional (40%)
    - Ads base
5.2 Fluxo de Caixa 30d [gráfico]
5.3 Projeção Diária [novo collapse]
```

**Mudanças:**
- Criar Card container "PROJEÇÃO — ESTIMADO"
- Mover inputs de premissas para dentro
- Mover FluxoCaixaChart para dentro
- Mover FluxoCaixaDiarioChart para dentro

---

### 6. METAS — CONSEQUÊNCIA

**O que é:** Metas calculadas (não opinião)

**Estrutura:**
```
6.1 Meta Semanal (MetaVendasCard)
6.2 Meta Mensal (MetaMensalCard)
```

**Mudanças:**
- Criar Card container "METAS — CONSEQUÊNCIA"
- Mover os dois cards existentes para dentro

---

### 7. ANÁLISE — DRE + RELATÓRIOS

**O que é:** Entender, não agir

**Estrutura:**
```
7.1 DRE Mensal/Anual [collapse]
7.2 Margem Real Estimada [collapse]
```

**Mudanças:**
- Criar Card container "ANÁLISE"
- Mover DRESection
- Mover MargemRealCard

---

### 8. PARÂMETROS DO SISTEMA

**O que é:** Onde mexe para afetar tudo acima

**Estrutura:**
```
8.1 Custos Fixos Detalhados [collapse]
8.2 Custos Defasados (30d) [collapse]
8.3 Conciliação Bancária [collapse]
```

**Mudanças:**
- Criar Card container "PARÂMETROS DO SISTEMA"
- Mover CustosFixosCard
- Mover Custos Defasados
- Mover ConciliacaoSection

---

### 9. CHECKLIST FINAL — RITMO

**O que é:** Tarefas de governança

**Layout simplificado:**
```
┌─────────────────────────────────────────┐
│ CHECKLIST FINAL — RITMO                 │
├─────────────────────────────────────────┤
│ 📅 HOJE                                 │
│   [ ] Atualizar caixa                   │
│   [ ] Conferir vencimentos              │
│                                         │
│ 📆 SEMANA                               │
│   [✓] Pedidos semana anterior           │
│   [ ] Conciliação revisada              │
│   [✓] Decisão da semana                 │
│                                         │
│ 📅 MÊS                                  │
│   [✓] Premissas revisadas               │
└─────────────────────────────────────────┘
```

**Mudanças:**
- Unificar os 3 checklists em um único Card
- Layout mais compacto

---

### Arquivos a Modificar/Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/modes/FinanceiroMode.tsx` | MODIFICAR | Reorganizar estrutura em seções lógicas |
| `src/components/financeiro/ExecutiveResume.tsx` | MODIFICAR | Adicionar Caixa Contratado, melhorar layout |
| `src/components/financeiro/CaixaContratadoCard.tsx` | CRIAR | Novo card para vendas aguardando liquidação |
| `src/components/financeiro/SectionHeader.tsx` | CRIAR | Componente reutilizável para headers de seção |
| `src/components/financeiro/RitmoChecklist.tsx` | CRIAR | Checklist unificado e compacto |

---

### Detalhes de Implementação

**Novo componente SectionHeader:**
```typescript
interface SectionHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

// Exemplo de uso:
<SectionHeader 
  icon="💰" 
  title="POSIÇÃO ATUAL — REAL" 
  subtitle="(bate com banco. não é projeção.)"
/>
```

**Estrutura final do FinanceiroMode:**
```
<div>
  {/* HEADER FIXO */}
  <FinanceiroHeader pendencias={...} />
  
  {/* 1. EXECUTIVE RESUME */}
  <ExecutiveResume exports={exports} aReceber={totaisContas.aReceber} />
  
  {/* 2. POSIÇÃO ATUAL — REAL */}
  <SectionContainer icon="💰" title="POSIÇÃO ATUAL — REAL">
    <CaixaAtualInput ... />
    <ContasBancariasCollapse ... />
    <ContasFluxoSection ... />
    <HistoricoCollapse ... />
  </SectionContainer>
  
  {/* 3. CAIXA CONTRATADO */}
  <CaixaContratadoCard aReceber={...} />
  
  {/* 4. PROJEÇÃO — ESTIMADO */}
  <SectionContainer icon="🔮" title="PROJEÇÃO — ESTIMADO">
    <PremissasCard ... />
    <FluxoCaixaChart ... />
    <FluxoCaixaDiarioChart ... />
  </SectionContainer>
  
  {/* 5. METAS — CONSEQUÊNCIA */}
  <SectionContainer icon="🎯" title="METAS — CONSEQUÊNCIA">
    <MetaVendasCard ... />
    <MetaMensalCard ... />
  </SectionContainer>
  
  {/* 6. ANÁLISE */}
  <SectionContainer icon="📈" title="ANÁLISE">
    <DRESection ... />
    <MargemRealCard ... />
  </SectionContainer>
  
  {/* 7. PARÂMETROS DO SISTEMA */}
  <SectionContainer icon="⚙️" title="PARÂMETROS DO SISTEMA">
    <CustosFixosCard ... />
    <CustosDefasadosCard ... />
    <ConciliacaoSection ... />
  </SectionContainer>
  
  {/* 8. CHECKLIST FINAL */}
  <RitmoChecklist ... />
</div>
```

---

### Elementos a Remover

Para evitar redundância:
- Card duplicado de "Caixa Livre Real" (já está no Executive Resume)
- Card duplicado de "Queima Operacional + Limite Ads" (simplificar)
- Card "Resultado Esperado + Fôlego" (mover para Executive Resume)
- Card "Legenda Anti-Confusão" (estrutura nova já é clara)
- Card "Ads Máximo Permitido" duplicado
- Card "Projeção de Risco 30/60/90" (manter apenas alerta)

---

### Regra de Ouro (Footer)

Texto âncora final:
```
🔒 Caixa Real decide
💳 Caixa Contratado tranquiliza
🔮 Projeção orienta
⚙️ Parâmetros controlam
📊 Análise ensina
```

---

### Ordem de Execução

1. Criar `SectionHeader.tsx` (componente reutilizável)
2. Criar `CaixaContratadoCard.tsx`
3. Criar `RitmoChecklist.tsx` (unificado)
4. Modificar `ExecutiveResume.tsx` (adicionar aReceber)
5. Reescrever `FinanceiroMode.tsx` com nova estrutura
6. Remover cards duplicados
7. Testar navegação e visibilidade
