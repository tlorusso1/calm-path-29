
# Plano: NICE TASKS - Thiago Edition v1.0 Beta

## Resumo

Este plano transforma o app atual em "NICE TASKS - Thiago Edition v1.0 Beta", com melhorias significativas no módulo de Backlog (agora chamado "TASKS") e implementação de controle de acesso por usuário.

---

## 1. Renomear o App

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Título para "NICE TASKS - Thiago Edition v1.0 Beta" |
| `src/pages/Index.tsx` | Adicionar header com logo NICE FOODS + título |
| `src/components/ModeSelector.tsx` | Atualizar "Backlog" para "Tasks" no menu |
| `src/types/focus-mode.ts` | Renomear `backlog` para `tasks` e atualizar title |

### Logo NICE FOODS

A imagem enviada será copiada para `src/assets/` e usada no header:

```
┌──────────────────────────────────────────┐
│ [NICE FOODS LOGO]   NICE TASKS    🌙 ⇥  │
└──────────────────────────────────────────┘
```

---

## 2. Sistema de Roles (Controle de Acesso)

### Banco de Dados

Criar tabela `user_roles` para controlar quem pode ver o quê:

```sql
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'marketing', 'operacional');

-- Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para checar role (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Política: usuário só vê suas próprias roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

### Mapeamento de Roles para Módulos

| Role | Módulos Visíveis |
|------|------------------|
| `admin` | Todos os módulos |
| `marketing` | Marketing, Pre-Reunião Ads, Reunião Ads |
| `operacional` | Tasks (antigo Backlog) |

### Atribuir Role para Gabrielle

```sql
-- Depois que ela criar conta, executar:
INSERT INTO user_roles (user_id, role)
SELECT id, 'marketing' FROM auth.users WHERE email = 'gabrielle@nicefoods.com.br';
```

### Hook `useUserRole`

Novo hook para verificar permissões:

```typescript
// src/hooks/useUserRole.ts
export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  
  useEffect(() => {
    // Buscar roles do usuário
    // Se não tem role, é admin (você, Thiago)
  }, [user]);
  
  const canAccess = (modeId: FocusModeId) => {
    if (roles.length === 0 || roles.includes('admin')) return true;
    
    const modeRoleMap = {
      'financeiro': ['admin'],
      'marketing': ['admin', 'marketing'],
      'supplychain': ['admin'],
      'pre-reuniao-geral': ['admin'],
      'pre-reuniao-ads': ['admin', 'marketing'],
      'reuniao-ads': ['admin', 'marketing'],
      'pre-reuniao-verter': ['admin'],
      'tasks': ['admin', 'operacional'], // Antigo backlog
    };
    
    return modeRoleMap[modeId]?.some(r => roles.includes(r)) ?? false;
  };
  
  return { roles, canAccess };
}
```

---

## 3. Melhorias no TASKS (antigo Backlog)

### 3.1 Input Único no Topo com Lógica de Capacidade

Quando criar tarefa:
1. Calcular tempo total de tarefas "HOJE" + nova tarefa
2. Se couber (< tempo disponível): vai para HOJE
3. Se não couber: vai para PRÓXIMO

```typescript
const handleAddTarefa = () => {
  const novoTempo = calcularTempoHoje(tarefas) + TEMPO_EM_MINUTOS['30min'];
  const quandoFazer = novoTempo <= tempoDisponivelHoje ? 'hoje' : 'proximo';
  
  onAddTarefa({
    descricao: novaTarefa.trim(),
    tempoEstimado: '30min',
    urgente: false,
    quandoFazer,
    completed: false,
  });
};
```

### 3.2 Seções Sempre Visíveis

Mesmo sem tarefas, mostrar seções vazias:

```
┌── 🟢 HOJE (0) ──────────────────────────┐
│  Nenhuma tarefa para hoje               │
│  [Nova tarefa...] [+]                   │
└─────────────────────────────────────────┘
```

### 3.3 Modo Foco Melhorado

Quando uma tarefa está em foco:
- Card com borda roxa e animação pulsante (`animate-pulse`)
- Resto da página com `opacity-40` e `pointer-events-none`
- Visual mais dramático para manter o foco

### 3.4 Ordenação Automática

```typescript
const sortedTarefas = [...tarefas].sort((a, b) => {
  // 1. Urgentes primeiro
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  // 2. Não concluídas antes das concluídas
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  // 3. Manter ordem de criação
  return 0;
});
```

### 3.5 Botões de Seção Inline

Cada tarefa terá botões coloridos para trocar de seção:

```
☐ Revisar relatório  [30min] [HOJE][PROX][DEP] ⭐🎯🗑
                              ^^^^^ ^^^^ ^^^
                              verde azul cinza
```

### 3.6 Trigger no Banco para Foco Exclusivo

```sql
-- Garantir apenas 1 tarefa em foco por usuário
CREATE OR REPLACE FUNCTION ensure_single_focus()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.em_foco = true THEN
    UPDATE tasks 
    SET em_foco = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND em_foco = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_focus
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION ensure_single_focus();
```

---

## 4. Design Visual

### Cores por Seção

```css
/* HOJE - Verde */
.section-hoje { border-left-color: #22c55e; }

/* PRÓXIMO - Azul */
.section-proximo { border-left-color: #3b82f6; }

/* DEPOIS - Cinza */
.section-depois { border-left-color: #6b7280; }

/* URGENTE - Amarelo/Dourado */
.tarefa-urgente { background: #fef3c7; }

/* FOCO - Roxo com pulse */
.fazendo-agora { 
  border-color: #a855f7; 
  animation: pulse 2s infinite;
}
```

### Dark Mode

O sistema já suporta dark mode via `next-themes`. As cores serão ajustadas automaticamente.

---

## 5. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Novo título |
| `src/assets/nice-foods-logo.png` | Copiar logo |
| `src/pages/Index.tsx` | Novo header com logo e dark mode toggle |
| `src/types/focus-mode.ts` | Renomear backlog → tasks |
| `src/components/ModeSelector.tsx` | Filtrar módulos por role |
| `src/components/modes/BacklogMode.tsx` | Renomear para TasksMode.tsx + melhorias |
| `src/hooks/useUserRole.ts` | NOVO: hook de permissões |
| `supabase/migrations/` | NOVA: migration para user_roles |

---

## 6. Custo de Implementação

Este plano é **moderado em complexidade**:
- Renomear e ajustar UI: ~20% do esforço
- Sistema de roles: ~40% do esforço (novo)
- Melhorias no TASKS: ~40% do esforço

Não é um custo alto de tokens. A maior parte reutiliza código existente.

---

## 7. Fluxo para Gabrielle

1. Gabrielle acessa o app e cria conta com `gabrielle@nicefoods.com.br`
2. Você (ou automaticamente) atribui a role `marketing` a ela
3. Ela só verá: **Marketing**, **Pre-Reunião Ads**, **Reunião Ads**
4. Todo o resto fica invisível para ela

---

## 8. Resumo Visual Final

```
┌──────────────────────────────────────────────┐
│ [NICE FOODS]   NICE TASKS          🌙  🚪   │
├──────────────────────────────────────────────┤
│ [💰][📣][🚚][🧠][🎯][📈][📋 Tasks]          │
├──────────────────────────────────────────────┤
│                                              │
│  🎯 FAZENDO AGORA                            │
│  ┌────────────────────────────────────────┐  │
│  │ █████ Tarefa em foco █████            │  │
│  │ [Concluir] [Pausar]                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⏱️ Capacidade: ████████░░ 4h/6h            │
│  "Se não couber hoje, fica para outro dia." │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Nova tarefa...                    [+] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  🟢 HOJE (3)                                 │
│  ├── ☐ Tarefa 1 [30min] [H][P][D] ⭐🎯🗑   │
│  └── ☐ Tarefa 2 [1h]    [H][P][D]   🎯🗑   │
│                                              │
│  🔵 PRÓXIMO (2)                              │
│  └── ☐ Tarefa 3 [2h]    [H][P][D]   🎯🗑   │
│                                              │
│  ⚪ DEPOIS (1)                               │
│  └── ☐ Tarefa 4 [15min] [H][P][D]   🎯🗑   │
│                                              │
└──────────────────────────────────────────────┘
```
