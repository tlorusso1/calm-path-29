import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get the most recent focus_mode_states for this user
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

    // Extract only stock-relevant data (no financial data)
    const itens = (supplyChainData.itens || []).map((item: any) => ({
      nome: item.nome,
      tipo: item.tipo,
      quantidade: item.quantidade,
      unidade: item.unidade,
      demandaSemanal: item.demandaSemanal,
      coberturaDias: item.coberturaDias,
      status: item.status,
      dataValidade: item.dataValidade,
    }))

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
