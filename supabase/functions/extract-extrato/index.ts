import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um especialista em processar extratos bancários brasileiros.
Analise o texto do extrato e extraia cada lançamento como uma conta paga ou recebida.

Regras de extração:
1. Cada linha do extrato é um lançamento separado
2. Extraia: descrição (resumida), valor, data e tipo
3. Valor:
   - Negativo (com "-" ou "débito"): tipo = "pagar", valor como número positivo
   - Positivo (sem "-" ou "crédito"): tipo = "receber"
   - Formato: número puro (ex: "1234.56" para R$ 1.234,56)
4. Descrição: Simplifique para identificar o pagamento (ex: "PIX ENVIADO FULANO" -> "PIX Fulano")
5. Data: 
   - Se houver dia/mês no início da linha (ex: "30"), assuma mês/ano atual
   - Se não houver data clara, use a data de hoje
   - Formato ISO: YYYY-MM-DD
6. Ignore: rendimentos automáticos (REND PAGO), aplicações (CDB, TRUST), transferências entre contas próprias (SAME PERSON)
7. IMPORTANTE: Marque pago=true pois são lançamentos já realizados

Use a função extract_lancamento para CADA lançamento encontrado.`;

const tools = [
  {
    type: "function",
    function: {
      name: "extract_lancamento",
      description: "Extrai um lançamento do extrato bancário",
      parameters: {
        type: "object",
        properties: {
          descricao: {
            type: "string",
            description: "Descrição resumida do lançamento"
          },
          valor: {
            type: "string",
            description: "Valor absoluto em formato numérico (ex: 1234.56)"
          },
          dataVencimento: {
            type: "string",
            description: "Data do lançamento em formato ISO (YYYY-MM-DD)"
          },
          tipo: {
            type: "string",
            enum: ["pagar", "receber"],
            description: "pagar para débitos/saídas, receber para créditos/entradas"
          },
          categoria: {
            type: "string",
            description: "Categoria original do extrato se disponível"
          }
        },
        required: ["descricao", "valor", "dataVencimento", "tipo"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto, mesAno } = await req.json();
    
    if (!texto || typeof texto !== 'string') {
      return new Response(
        JSON.stringify({ error: "texto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adiciona contexto de mês/ano se fornecido
    const contextoData = mesAno ? `\n\nContexto: Os lançamentos são do mês/ano ${mesAno}.` : '';

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt + contextoData },
          {
            role: "user",
            content: `Analise este extrato bancário e extraia cada lançamento relevante:\n\n${texto}`
          }
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar extrato" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract ALL tool calls
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const lancamentos = toolCalls
      .filter((tc: any) => tc.function?.name === "extract_lancamento")
      .map((tc: any) => {
        const parsed = JSON.parse(tc.function.arguments);
        return {
          ...parsed,
          pago: true, // Lançamentos de extrato já foram realizados
        };
      });

    if (lancamentos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum lançamento encontrado no extrato", contas: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ contas: lancamentos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-extrato:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
