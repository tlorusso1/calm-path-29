-- Tabela para armazenar o estado dos focus modes
CREATE TABLE public.focus_mode_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  week_start TEXT NOT NULL,
  active_mode TEXT,
  modes JSONB NOT NULL DEFAULT '{}',
  last_completed_mode TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para armazenar os projetos
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  next_action TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em ambas as tabelas
ALTER TABLE public.focus_mode_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para focus_mode_states
CREATE POLICY "Users can view their own focus mode state"
  ON public.focus_mode_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus mode state"
  ON public.focus_mode_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus mode state"
  ON public.focus_mode_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus mode state"
  ON public.focus_mode_states FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar updated_at em focus_mode_states
CREATE TRIGGER update_focus_mode_states_updated_at
  BEFORE UPDATE ON public.focus_mode_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_focus_mode_states_user_id ON public.focus_mode_states(user_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);