import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um especialista em extração de dados de documentos financeiros brasileiros.
Analise a imagem e extraia as informações de pagamento.

Tipos de documentos comuns:
- Boleto bancário: procure linha digitável, beneficiário, valor, data de vencimento
- Nota Fiscal (NF-e/NFS-e): procure fornecedor/prestador, valor total, data de emissão, prazo de pagamento
- DDA (Débito Direto Autorizado): procure sacado/pagador, valor, vencimento
- Fatura/Invoice: procure empresa, valor devido, data de vencimento

Regras de extração:
1. Descrição: Use o nome do beneficiário, fornecedor ou sacado (quem vai receber o dinheiro)
2. Valor: Extraia o valor total em formato numérico (ex: "1234.56" para R$ 1.234,56)
3. Data: Converta para formato ISO (YYYY-MM-DD)
4. Tipo: 
   - "pagar" para boletos, faturas, NFs de fornecedores (você precisa pagar)
   - "receber" para NFs emitidas por você, notas de serviço prestado

Se não conseguir extrair algum campo com certeza, retorne uma string vazia para esse campo.
Use a função extract_conta para retornar os dados estruturados.`;

const tools = [
  {
    type: "function",
    function: {
      name: "extract_conta",
      description: "Extrai dados de um documento financeiro",
      parameters: {
        type: "object",
        properties: {
          descricao: {
            type: "string",
            description: "Nome do beneficiário, fornecedor ou sacado"
          },
          valor: {
            type: "string",
            description: "Valor em formato numérico (ex: 1234.56)"
          },
          dataVencimento: {
            type: "string",
            description: "Data de vencimento em formato ISO (YYYY-MM-DD)"
          },
          tipo: {
            type: "string",
            enum: ["pagar", "receber"],
            description: "Tipo da conta: pagar ou receber"
          },
          confianca: {
            type: "number",
            description: "Nível de confiança da extração de 0 a 1"
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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 é obrigatório" }),
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

    // Detect mime type from base64 header or default to jpeg
    let mimeType = "image/jpeg";
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
      }
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de documento financeiro e extraia os dados de pagamento."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_conta" } },
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
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract ALL tool calls (support multiple accounts from one image)
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const extractedContas = toolCalls
      .filter((tc: any) => tc.function?.name === "extract_conta")
      .map((tc: any) => JSON.parse(tc.function.arguments));

    if (extractedContas.length === 0) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados do documento" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ contas: extractedContas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-documento:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
