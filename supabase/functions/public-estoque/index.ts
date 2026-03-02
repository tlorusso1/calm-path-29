import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Réguas de cobertura por tipo
const REGRAS_COBERTURA: Record<string, { critico: number; atencao: number }> = {
  produto_acabado: { critico: 15, atencao: 30 },
  embalagem: { critico: 30, atencao: 60 },
  insumo: { critico: 20, atencao: 40 },
  materia_prima: { critico: 20, atencao: 40 },
}

function calcCobertura(quantidade: number, demandaSemanal: number): number | null {
  if (demandaSemanal <= 0) return null
  return Math.round(quantidade / (demandaSemanal / 7))
}

function calcStatus(coberturaDias: number | null, tipo: string): string {
  if (coberturaDias === null) return 'amarelo'
  const regra = REGRAS_COBERTURA[tipo] || REGRAS_COBERTURA.produto_acabado
  if (coberturaDias < regra.critico) return 'vermelho'
  if (coberturaDias < regra.atencao) return 'amarelo'
  return 'verde'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase
      .from('focus_mode_states')
      .select('modes, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Dados não encontrados' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const modes = data.modes as Record<string, any>
    const supplyChainData = modes?.supplychain?.supplyChainData

    if (!supplyChainData) {
      return new Response(JSON.stringify({ error: 'Dados de estoque não encontrados' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const demandaMedia = supplyChainData.demandaSemanalMedia || 0

    const itens = (supplyChainData.itens || []).map((item: any) => {
      const demanda = item.demandaSemanal ?? demandaMedia
      const coberturaDias = calcCobertura(item.quantidade, demanda)
      const status = calcStatus(coberturaDias, item.tipo || 'produto_acabado')

      return {
        nome: item.nome,
        tipo: item.tipo,
        quantidade: item.quantidade,
        unidade: item.unidade,
        demandaSemanal: demanda > 0 ? demanda : undefined,
        coberturaDias: coberturaDias ?? undefined,
        status,
        dataValidade: item.dataValidade,
      }
    })

    return new Response(JSON.stringify({
      itens,
      updatedAt: data.updated_at,
      ultimaImportacaoMov: supplyChainData.ultimaImportacaoMov || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
