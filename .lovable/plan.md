

# Correção: Nunca Mais Perder Dados + Restauração

## O Que Vai Mudar

Em vez de resetar tudo, o sistema vai **preservar todos os dados estruturais** e apenas marcar campos de saldo como "não atualizado" para você atualizar manualmente. Contas a pagar, conciliações, custos fixos, fornecedores -- nada disso será apagado nunca.

## Mudanças Específicas

### 1. Reset Semanal Inteligente (não destrutivo)

**Antes:** O reset semanal chamava `createDefaultMode(id)` que apagava TUDO dos modos semanais (supply chain, marketing, etc.)

**Depois:** O reset semanal vai preservar dados estruturais de cada modo:

- **Supply Chain**: Preserva `itens` (estoque) e seus preços de custo
- **Marketing**: Preserva dados orgânicos (sessões, pedidos)
- **Pré-Reunião Geral**: Preserva registro de decisão
- **Financeiro** (diário): Já preserva, mas adicionar proteção extra no contexto semanal

Apenas os checklists de conferência são resetados, nunca os dados.

### 2. Correção do sendBeacon (Bug Crítico)

O `sendBeacon` no `beforeunload` usa a anon key como token de autenticação. Isso faz o save falhar silenciosamente por violação de RLS. Corrigir para usar o JWT real do usuário, armazenado em um `useRef` que se atualiza automaticamente com a sessão.

### 3. Restauração dos Dados Perdidos

Restaurar os dados financeiros do backup existente na tabela `weekly_snapshots` (semana 2026-02-03) de volta para o estado atual, mesclando com qualquer dado novo que já exista.

## Detalhes Técnicos

### Arquivo: `src/hooks/useFocusModes.ts`

**Reset semanal (linhas 274-281)** -- substituir o reset destrutivo:

```typescript
// ANTES (destrutivo):
updatedModes[id] = createDefaultMode(id);

// DEPOIS (preserva dados):
const existing = state.modes[id];
const fresh = createDefaultMode(id);
updatedModes[id] = {
  ...fresh,                    // Checklists resetados
  financeiroData: existing?.financeiroData ?? fresh.financeiroData,
  marketingData: existing?.marketingData ?? fresh.marketingData,
  supplyChainData: existing?.supplyChainData ?? fresh.supplyChainData,
  backlogData: existing?.backlogData ?? fresh.backlogData,
  preReuniaoGeralData: existing?.preReuniaoGeralData ?? fresh.preReuniaoGeralData,
  reuniaoAdsData: existing?.reuniaoAdsData ?? fresh.reuniaoAdsData,
};
```

**sendBeacon (linhas 530-540)** -- usar JWT real:

```typescript
// Armazenar JWT em ref que atualiza com sessão
const jwtRef = useRef<string | null>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    jwtRef.current = data.session?.access_token ?? null;
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    jwtRef.current = session?.access_token ?? null;
  });
  return () => subscription.unsubscribe();
}, []);

// No beforeunload:
'Authorization': `Bearer ${jwtRef.current || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
```

### Migração SQL: Restaurar Dados do Backup

Executar query que copia `modes_full_backup` do `weekly_snapshots` mais recente de volta para `focus_mode_states.modes`, preservando dados de modos que já tenham conteúdo no estado atual.

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useFocusModes.ts` | Reset não-destrutivo + fix sendBeacon JWT |
| SQL migration | Restaurar dados do backup |

## Resultado

- Contas a pagar, conciliações, saldos, custos fixos: **nunca mais apagados**
- sendBeacon funciona com autenticação correta
- Dados financeiros restaurados do backup da semana passada

