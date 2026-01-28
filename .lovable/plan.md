
# Migração para Banco de Dados com Supabase

## Visão Geral

Migrar todos os dados do localStorage para o Supabase (banco de dados na nuvem), adicionando autenticação para que você possa:
- **Fazer login** e ter seus dados seguros
- **Acessar de qualquer dispositivo** com a mesma conta
- **Nunca perder dados** mesmo limpando o navegador

---

## O Que Vai Mudar Para Você

| Antes | Depois |
|-------|--------|
| Abre o app e usa direto | Faz login uma vez (email ou Google) |
| Dados somem se limpar navegador | Dados ficam salvos na nuvem |
| Só funciona neste navegador | Funciona em qualquer dispositivo |

---

## Etapas da Implementação

### Etapa 1: Habilitar Supabase Cloud

Primeiro passo é conectar o projeto ao Supabase Cloud, que vai criar automaticamente:
- Banco de dados PostgreSQL
- Sistema de autenticação
- APIs seguras

### Etapa 2: Criar Tabelas no Banco

Duas tabelas principais:

```text
TABELA: focus_mode_states
+------------------+------------------+
| Campo            | Tipo             |
+------------------+------------------+
| id               | uuid (primário)  |
| user_id          | uuid (referência)|
| date             | text             |
| week_start       | text             |
| active_mode      | text             |
| modes            | jsonb            |
| updated_at       | timestamp        |
+------------------+------------------+

TABELA: projects
+------------------+------------------+
| Campo            | Tipo             |
+------------------+------------------+
| id               | uuid (primário)  |
| user_id          | uuid (referência)|
| name             | text             |
| owner            | text             |
| status           | text             |
| next_action      | text             |
| last_checked_at  | timestamp        |
| created_at       | timestamp        |
+------------------+------------------+
```

### Etapa 3: Políticas de Segurança (RLS)

Cada usuário só vê e edita seus próprios dados:
- SELECT: apenas user_id = auth.uid()
- INSERT: user_id = auth.uid()
- UPDATE: apenas user_id = auth.uid()
- DELETE: apenas user_id = auth.uid()

### Etapa 4: Tela de Login

Uma tela simples com:
- Login com email/senha
- Opção de login com Google (opcional)
- Cadastro de nova conta
- "Esqueci minha senha"

### Etapa 5: Adaptar os Hooks

Modificar os hooks existentes para:
1. Buscar dados do Supabase ao fazer login
2. Salvar mudanças no Supabase (não mais localStorage)
3. Manter sincronizado em tempo real

### Etapa 6: Migração de Dados Existentes

Ao fazer primeiro login:
- Verificar se tem dados no localStorage
- Perguntar se quer importar para a conta
- Migrar automaticamente

---

## Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/pages/Auth.tsx` | Tela de login/cadastro |
| `src/contexts/AuthContext.tsx` | Gerenciar estado de autenticação |
| `src/hooks/useSupabaseFocusModes.ts` | Hook para buscar/salvar modos |
| `src/hooks/useSupabaseProjects.ts` | Hook para buscar/salvar projetos |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Adicionar rotas protegidas |
| `src/pages/Index.tsx` | Verificar autenticação |
| `src/hooks/useFocusModes.ts` | Integrar com Supabase |
| `src/hooks/useProjects.ts` | Integrar com Supabase |

---

## Fluxo do Usuário

```text
1. Abre o app
   ↓
2. Não está logado?
   → Vai para tela de login
   ↓
3. Faz login (email ou Google)
   ↓
4. Primeira vez?
   → Pergunta se quer importar dados do localStorage
   ↓
5. Usa o app normalmente
   → Todas as mudanças são salvas automaticamente na nuvem
```

---

## Detalhes Técnicos

### Estrutura do Supabase

Tipo de conexão: **Lovable Cloud** (recomendado)
- Não precisa criar conta separada no Supabase
- Integração automática
- Mais simples de configurar

### Autenticação

Provider inicial: **Email/Senha**
- Pode adicionar Google depois se quiser

### Sincronização

Estratégia: **Salvar a cada mudança**
- Cada alteração atualiza o banco imediatamente
- Usa debounce de 1 segundo para evitar excesso de requisições

### Fallback Offline

Se não tiver internet:
- Continua usando localStorage temporariamente
- Sincroniza quando voltar online

---

## Segurança

- Senhas são gerenciadas pelo Supabase Auth (bcrypt)
- Row Level Security (RLS) garante isolamento de dados
- HTTPS em todas as comunicações
- Tokens JWT com expiração

---

## Próximos Passos Após Implementação

1. Testar login/cadastro
2. Verificar se dados estão sendo salvos
3. Testar em outro navegador/dispositivo
4. Opcional: Adicionar login com Google
