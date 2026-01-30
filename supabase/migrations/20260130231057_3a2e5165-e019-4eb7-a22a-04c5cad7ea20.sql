-- Adicionar coluna para pedidos da semana no histórico
ALTER TABLE weekly_snapshots 
ADD COLUMN IF NOT EXISTS pedidos_semana NUMERIC;