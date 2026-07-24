
CREATE TABLE public.vendas_canais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes DATE NOT NULL,
  canal TEXT NOT NULL,
  pedidos INTEGER NOT NULL DEFAULT 0,
  faturamento NUMERIC(14,2) NOT NULL DEFAULT 0,
  fonte TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mes, canal, fonte)
);
CREATE INDEX idx_vendas_canais_mes ON public.vendas_canais(mes);
CREATE INDEX idx_vendas_canais_canal ON public.vendas_canais(canal);

GRANT SELECT ON public.vendas_canais TO authenticated;
GRANT ALL ON public.vendas_canais TO service_role;
ALTER TABLE public.vendas_canais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read vendas_canais" ON public.vendas_canais
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vendas_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes DATE NOT NULL,
  canal TEXT NOT NULL,
  nome TEXT NOT NULL,
  sku TEXT,
  qtd_vendida INTEGER NOT NULL DEFAULT 0,
  faturamento NUMERIC(14,2) NOT NULL DEFAULT 0,
  fonte TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mes, canal, sku, nome, fonte)
);
CREATE INDEX idx_vendas_produtos_mes ON public.vendas_produtos(mes);
CREATE INDEX idx_vendas_produtos_canal ON public.vendas_produtos(canal);
CREATE INDEX idx_vendas_produtos_sku ON public.vendas_produtos(sku);

GRANT SELECT ON public.vendas_produtos TO authenticated;
GRANT ALL ON public.vendas_produtos TO service_role;
ALTER TABLE public.vendas_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read vendas_produtos" ON public.vendas_produtos
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_vendas_canais_updated_at BEFORE UPDATE ON public.vendas_canais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendas_produtos_updated_at BEFORE UPDATE ON public.vendas_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
