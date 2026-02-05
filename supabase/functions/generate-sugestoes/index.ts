const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Contexto {
  caixaLivre: number;
  folegoDias: number | null;
  statusRisco: 'verde' | 'amarelo' | 'vermelho';
  faturamentoMes: number;
  metaMensal: number;
  progressoMeta: number;
  custoFixo: number;
  marketingEstrutural: number;
  contasPagar30d: number;
  topCategoriasDespesa: string[];
}

interface Sugestao {
  tipo: 'urgente' | 'custo' | 'vendas' | 'estoque' | 'marketing';
  titulo: string;
  descricao: string;
  impactoEstimado?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contexto } = await req.json() as { contexto: Contexto };

    if (!contexto) {
      return new Response(
        JSON.stringify({ error: 'Contexto financeiro não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formatCurrency = (value: number) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const systemPrompt = `Você é um consultor financeiro especializado em pequenas empresas e e-commerce no Brasil.
Analise a situação financeira apresentada e forneça 3-5 sugestões práticas e acionáveis para melhorar o caixa.

FOCO das sugestões:
1. **Ações urgentes (24-72h)**: Promoções relâmpago, levanta-caixa, contato com clientes inativos
2. **Redução de custos fixos**: Renegociação de contratos, cancelamento de assinaturas, otimização de fornecedores
3. **Otimização de marketing**: Realocar verba, pausar campanhas ruins, focar no que converte
4. **Gestão de estoque**: Desovar produtos parados, criar combos, liquidação seletiva
5. **Renegociação de prazos**: Fornecedores, impostos, empréstimos

REGRAS:
- Cada sugestão deve ser ESPECÍFICA e ACIONÁVEL (não genérica)
- Incluir estimativa de impacto quando possível (ex: "economia de R$ 500-1.500/mês")
- Priorizar por urgência (urgente > curto prazo > médio prazo)
- Considerar o contexto brasileiro (impostos, sazonalidade, comportamento de consumo)
- Se a situação estiver crítica (risco vermelho), focar 100% em ações de curto prazo

Responda APENAS com um JSON válido no formato:
{
  "sugestoes": [
    {
      "tipo": "urgente" | "custo" | "vendas" | "estoque" | "marketing",
      "titulo": "Título curto e direto",
      "descricao": "Descrição detalhada da ação a ser tomada",
      "impactoEstimado": "R$ X-Y/mês ou % de melhoria esperada"
    }
  ]
}`;

    const userPrompt = `Situação financeira atual:

- Caixa Livre: ${formatCurrency(contexto.caixaLivre)} (${contexto.statusRisco === 'verde' ? 'Saudável' : contexto.statusRisco === 'amarelo' ? 'Atenção' : 'CRÍTICO'})
- Fôlego de Caixa: ${contexto.folegoDias === null ? 'Operação se sustenta' : `${contexto.folegoDias} dias`}
- Faturamento do Mês: ${formatCurrency(contexto.faturamentoMes)}
- Meta Mensal: ${formatCurrency(contexto.metaMensal)}
- Progresso da Meta: ${(contexto.progressoMeta * 100).toFixed(0)}%
- Custo Fixo Mensal: ${formatCurrency(contexto.custoFixo)}
- Marketing Estrutural: ${formatCurrency(contexto.marketingEstrutural)}
- Contas a Pagar (próx. 30d): ${formatCurrency(contexto.contasPagar30d)}
- Top Categorias de Despesa: ${contexto.topCategoriasDespesa.join(', ') || 'Não identificadas'}

Gere sugestões práticas e específicas para melhorar essa situação.`;

    // Usar Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('Erro na API Lovable:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar sugestões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do JSON
    let sugestoes: Sugestao[];
    try {
      const parsed = JSON.parse(content);
      sugestoes = parsed.sugestoes || [];
    } catch {
      console.error('Erro ao parsear resposta:', content);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ sugestoes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no generate-sugestoes:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
