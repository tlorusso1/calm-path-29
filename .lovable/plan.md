
# Corrigir Perda de Dados: Race Conditions na Persistencia

## Problema Raiz Identificado

O sistema tem **3 bugs criticos** que causam a perda de dados:

### Bug 1: Carga dupla no login
O `AuthContext` chama `setUser` duas vezes na inicializacao (uma via `onAuthStateChange`, outra via `getSession`). Como o `useEffect` de carga em `useFocusModes.ts` depende de `[user]`, a funcao de carga executa **duas vezes**. A segunda execucao pode sobrescrever edicoes que o usuario ja fez entre a primeira e a segunda carga.

### Bug 2: Recarga em token refresh
A cada ~1 hora, o Supabase faz refresh do token de autenticacao. Isso dispara `onAuthStateChange`, que cria uma nova referencia de `user`, que re-executa o efeito de carga. Resultado: todos os dados em memoria sao substituidos pelo que esta no banco -- **descartando tudo que o usuario editou desde o ultimo save**.

### Bug 3: Arquivo morto `useSupabaseSync.ts`
O arquivo `src/hooks/useSupabaseSync.ts` contem uma implementacao antiga e nao e importado por ninguem, mas pode causar confusao em manutencoes futuras.

## Solucao

### Arquivo: `src/hooks/useFocusModes.ts`

1. **Adicionar guard `initialLoadDone` no efeito de carga** (linhas 409-479):
   - Antes de carregar, verificar `if (initialLoadDone.current) return;`
   - Isso impede recargas duplicadas ou causadas por token refresh

2. **Estabilizar referencia do `user`** na dependencia do useEffect:
   - Usar `user?.id` como dependencia em vez do objeto `user` inteiro
   - Objeto `user` muda de referencia a cada auth event, mas `user.id` permanece estavel

3. **Adicionar log de protecao** para debugging futuro:
   - Logar quando uma recarga e bloqueada por `initialLoadDone`

### Arquivo: `src/contexts/AuthContext.tsx`

4. **Eliminar a chamada dupla de `setUser`**:
   - Remover o `getSession().then()` que duplica o que `onAuthStateChange` ja faz
   - Ou alternativamente, usar um ref para controlar se o user ja foi setado

### Arquivo: `src/hooks/useSupabaseSync.ts`

5. **Deletar arquivo morto** que nao e mais utilizado.

## Resultado Esperado

- Dados carregados uma unica vez do banco
- Edicoes do usuario nunca sobrescritas por recargas fantasma
- Token refresh nao interfere nos dados em memoria
- Indicador visual "Salvo" continua funcionando normalmente

## Detalhes Tecnicos

### Mudanca principal em `useFocusModes.ts` (efeito de carga):

```text
useEffect(() => {
  if (!user) { setIsLoading(false); return; }
  if (initialLoadDone.current) return;  // <-- NOVO: impede recarga

  const loadFromSupabase = async () => { ... };
  loadFromSupabase();
}, [user?.id]);  // <-- MUDADO: user.id em vez de user
```

### Mudanca em `AuthContext.tsx`:

Remover a chamada redundante `getSession().then(...)` que causa o segundo disparo de `setUser`, ou proteger com um flag para so setar na primeira vez.

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `src/hooks/useFocusModes.ts` | Guard `initialLoadDone` + dep `user?.id` |
| `src/contexts/AuthContext.tsx` | Eliminar dupla chamada de `setUser` |
| `src/hooks/useSupabaseSync.ts` | Deletar (nao utilizado) |
