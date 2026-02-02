
# Plano: Corrigir Migração de Dados Backlog → Tasks

## Problema Identificado

Os dados das tarefas e ideias estão salvos no banco em `modes.backlog.backlogData`, mas o código agora procura em `modes.tasks.backlogData`.

**Dados confirmados no banco:**
- 12 tarefas (Comprar manual, Levedura, Reunião Geral, etc.)
- 3 ideias (Nice milk shake, Materiais PDV, Pote castanha creme)
- tempoDisponivelHoje: 300 minutos

## Solução

Adicionar lógica de migração no hook `useFocusModes.ts` que:
1. Ao carregar dados do banco, verifica se existe `modes.backlog` com dados
2. Se existir, migra para `modes.tasks`
3. Remove o `backlog` antigo para não duplicar

## Alteração Técnica

**Arquivo: `src/hooks/useFocusModes.ts`**

Adicionar após carregar os dados do Supabase (linha ~304):

```typescript
// MIGRAÇÃO: backlog -> tasks
// Se existe backlog com dados e tasks está vazio, migrar
if (loadedState.modes.backlog?.backlogData && 
    (!loadedState.modes.tasks?.backlogData?.tarefas?.length)) {
  console.log('Migrando dados de backlog para tasks...');
  
  loadedState.modes.tasks = {
    ...loadedState.modes.tasks,
    backlogData: loadedState.modes.backlog.backlogData,
  };
  
  // Limpar backlog antigo para evitar confusão
  delete (loadedState.modes as any).backlog;
}
```

## Fluxo da Correção

1. Usuário abre o app
2. Hook carrega dados do Supabase
3. Detecta `modes.backlog.backlogData` com tarefas
4. Copia para `modes.tasks.backlogData`
5. Remove `backlog` antigo
6. Processa normalmente
7. Salva com a estrutura correta
8. Próximas vezes: dados já estarão em `tasks`

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useFocusModes.ts` | Adicionar migração backlog → tasks após carregar do Supabase |

## Resultado Esperado

Após a correção:
- Suas 12 tarefas vão aparecer novamente
- Suas 3 ideias vão aparecer novamente
- O tempo disponível (300min) será preservado
- Dados serão salvos na estrutura correta (`tasks`)
