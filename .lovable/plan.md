

# Plano Completo: Persistencia Blindada + Contas a Receber Automaticas

Este plano consolida TODAS as melhorias pendentes em uma unica implementacao.

---

## Parte 1: Persistencia Blindada (Nunca Mais Perder Dados)

### 1.1 - stateRef (anti-stale closure)

O `beforeunload` atual usa `state` diretamente, que pode estar desatualizado por closures do React. Adicionar um `useRef` que sempre aponta para o estado mais recente.

**Arquivo:** `src/hooks/useFocusModes.ts`

```typescript
const stateRef = React.useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);
```

O `handleBeforeUnload` passa a usar `stateRef.current` em vez de `state`, e o `useEffect` do beforeunload perde a dependencia de `state` (evitando re-registros constantes).

### 1.2 - flushSave + saveStatus

Expor funcao `flushSave()` que cancela o debounce e salva imediatamente, e um estado `saveStatus` para feedback visual.

**Arquivo:** `src/hooks/useFocusModes.ts`

```typescript
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

const flushSave = useCallback(async () => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  setSaveStatus('saving');
  try {
    await saveToSupabase();
    setSaveStatus('saved');
  } catch {
    setSaveStatus('error');
  }
}, [saveToSupabase]);
```

Retornar `flushSave` e `saveStatus` no objeto de retorno do hook.

### 1.3 - Fallback XHR sincrono para payloads grandes

No `handleBeforeUnload`, se o payload JSON exceder 60KB, usar `XMLHttpRequest` sincrono como fallback (fetch keepalive tem limite de 64KB).

**Arquivo:** `src/hooks/useFocusModes.ts`

```typescript
const payloadStr = JSON.stringify(payload);
if (payloadStr.length > 60000) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url, false); // sincrono
  xhr.setRequestHeader('apikey', anonKey);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Prefer', 'resolution=merge-duplicates');
  xhr.send(payloadStr);
} else {
  fetch(url, { ...opts, keepalive: true });
}
```

### 1.4 - Indicador visual de salvamento

Exibir badge discreto no topo do modo ativo mostrando o status de persistencia.

**Arquivo:** `src/components/ModeContent.tsx`

- Receber `saveStatus` como prop
- Mostrar: verde "Salvo" | amarelo "Salvando..." | vermelho "Erro ao salvar"
- Posicao: canto superior direito do cabecalho do modo

### 1.5 - Chamar flushSave nos modos criticos

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`
- Receber `flushSave` como prop
- Chamar apos: addConta, removeConta, togglePago, conciliacao, update de saldos

**Arquivo:** `src/components/modes/SupplyChainMode.tsx`
- Receber `flushSave` como prop
- Chamar apos: importar lista, editar item, remover item

**Arquivo:** `src/pages/Index.tsx`
- Passar `flushSave` e `saveStatus` do hook para `ModeContent`

**Arquivo:** `src/components/ModeContent.tsx`
- Receber e repassar `flushSave` para FinanceiroMode e SupplyChainMode

---

## Parte 2: Contas a Receber Automaticas por Canal

### 2.1 - Atualizar tipo ContaFluxo

**Arquivo:** `src/types/focus-mode.ts`

Adicionar campos opcionais:

```typescript
export interface ContaFluxo {
  // ... campos existentes
  projecao?: boolean;        // true = conta ficticia gerada automaticamente
  canalOrigem?: string;      // 'b2b' | 'ecomNuvem' | 'ecomShopee' | 'ecomAssinaturas'
}
```

### 2.2 - Criar utilitario de geracao

**Arquivo:** `src/utils/gerarContasReceberProjecao.ts` (NOVO)

Distribuicao fixa baseada nos dados reais do negocio:

```text
B2B:              25%
ECOM-NUVEM:       66%
ECOM-SHOPEE:       5%
ECOM-ASSINATURAS:  4%
```

Logica:
- Recebe `faturamentoEsperado30d` e `contasFluxo` existentes
- Remove projecoes antigas (`projecao === true`)
- Calcula valor semanal por canal: `(faturamento * percentual) / 4`
- Gera 16 contas (4 canais x 4 semanas) com datas nas proximas 4 segundas-feiras
- Retorna o array atualizado de `contasFluxo`

### 2.3 - Trigger ao alterar faturamento esperado

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`

Quando o campo `faturamentoEsperado30d` for alterado (onBlur):
1. Chamar funcao de geracao de projecoes
2. Atualizar `contasFluxo` via `onUpdateFinanceiroData`
3. Chamar `flushSave()` para persistir imediatamente

### 2.4 - Visual diferenciado para projecoes

**Arquivo:** `src/components/financeiro/ContasFluxoSection.tsx`

- Contas com `projecao === true`: borda tracejada, opacidade reduzida, badge "Projecao [Canal]"
- Nao editaveis (somente leitura) -- sao geradas automaticamente
- Filtro opcional para mostrar/ocultar projecoes

### 2.5 - Consumo automatico via conciliacao

**Arquivo:** `src/components/financeiro/ConciliacaoSection.tsx`

Ao conciliar uma entrada (tipo "receber"):
1. Buscar conta de projecao com `projecao === true` e `pago !== true`
2. Match por proximidade de valor (tolerancia 30%) e data (mesma semana)
3. Marcar projecao como `pago: true`
4. Se valor diferente, ajustar o valor da projecao para o valor real conciliado

---

## Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useFocusModes.ts` | stateRef, flushSave, saveStatus, fallback XHR |
| `src/types/focus-mode.ts` | Campos `projecao` e `canalOrigem` em ContaFluxo |
| `src/utils/gerarContasReceberProjecao.ts` | **NOVO** - geracao das 16 contas semanais |
| `src/components/modes/FinanceiroMode.tsx` | flushSave apos writes + trigger projecoes |
| `src/components/modes/SupplyChainMode.tsx` | flushSave apos writes |
| `src/components/financeiro/ContasFluxoSection.tsx` | Visual diferenciado para projecoes |
| `src/components/financeiro/ConciliacaoSection.tsx` | Consumo automatico de projecoes |
| `src/components/ModeContent.tsx` | Indicador visual de salvamento + repassar flushSave |
| `src/pages/Index.tsx` | Passar flushSave/saveStatus para ModeContent |

