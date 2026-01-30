-- Create weekly_snapshots table for historical metrics
CREATE TABLE public.weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Financeiro
  caixa_livre_real NUMERIC,
  status_financeiro TEXT,
  score_financeiro INTEGER,
  resultado_mes NUMERIC,
  total_defasados NUMERIC,
  ads_maximo NUMERIC,
  
  -- Ads
  roas_medio NUMERIC,
  cpa_medio NUMERIC,
  ticket_medio NUMERIC,
  gasto_ads NUMERIC,
  decisao_ads TEXT,
  
  -- Demanda
  score_demanda INTEGER,
  status_demanda TEXT,
  score_sessoes INTEGER,
  sessoes_semana NUMERIC,
  
  -- Organico
  score_organico INTEGER,
  status_organico TEXT,
  
  -- Decisao
  prioridade_semana TEXT,
  registro_decisao TEXT,
  
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own snapshots"
  ON public.weekly_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON public.weekly_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON public.weekly_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);