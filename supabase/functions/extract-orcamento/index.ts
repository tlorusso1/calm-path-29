import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um especialista em extração de dados de orçamentos comerciais brasileiros.
Analise o documento (imagem ou PDF) e extraia as informações do orçamento.

Tipos de documentos comuns:
- Orçamento de embalagens (caixas, potes, rótulos, tampas, sachês)
- Orçamento de matéria-prima (ingredientes, insumos)
- Orçamento de mão de obra / industrialização (serviço de produção terceirizada)

Regras de extração:
1. Fornecedor: Nome da empresa que está fornecendo o orçamento
2. Data do orçamento: Data de emissão em formato ISO (YYYY-MM-DD)
3. Prazo de entrega: Texto livre (ex: "15 dias úteis", "30 dias após confirmação")
4. Condição de pagamento: Texto livre (ex: "30/60/90 DDL", "50% antecipado + 50% na entrega", "à vista")
5. Itens: Extraia TODOS os itens/produtos listados com nome, quantidade, unidade, valor unitário e valor total
6. Valor total: Valor total do orçamento

Se não conseguir extrair algum campo com certeza, retorne string vazia.
Use a função extract_orcamento para retornar os dados estruturados.`;

const tools = [
  {
    type: "function",
    function: {
      name: "extract_orcamento",
      description: "Extrai dados de um orçamento comercial",
      parameters: {
        type: "object",
        properties: {
          fornecedor: { type: "string", description: "Nome da empresa fornecedora" },
          dataOrcamento: { type: "string", description: "Data de emissão em formato ISO (YYYY-MM-DD)" },
          prazoEntrega: { type: "string", description: "Prazo de entrega (texto livre)" },
          condicaoPagamento: { type: "string", description: "Condição de pagamento (texto livre)" },
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Nome do item/produto" },
                quantidade: { type: "number", description: "Quantidade" },
                unidade: { type: "string", description: "Unidade (un, kg, cx, etc)" },
                valorUnitario: { type: "number", description: "Valor unitário em reais (ex: 12.50)" },
                valorTotal: { type: "number", description: "Valor total do item em reais" },
              },
              required: ["nome"],
            },
            description: "Lista de itens do orçamento",
          },
          valorTotal: { type: "string", description: "Valor total do orçamento em formato numérico (ex: 1234.56)" },
          confianca: { type: "number", description: "Nível de confiança da extração de 0 a 1" },
        },
        required: ["fornecedor", "itens"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, tipo } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mimeType = "image/jpeg";
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) mimeType = match[1];
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const isPdf = mimeType === "application/pdf";

    const userContent: any[] = [
      { type: "text", text: `Analise este orçamento de ${tipo || 'fornecedor'} e extraia todos os dados.` },
    ];

    if (isPdf) {
      userContent.push({
        type: "file",
        file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${base64Data}` },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Data}` },
      });
    }

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
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_orcamento" } },
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
        JSON.stringify({ error: "Erro ao processar documento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const extracted = toolCalls.find((tc: any) => tc.function?.name === "extract_orcamento");

    if (!extracted) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados do orçamento" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orcamento = JSON.parse(extracted.function.arguments);

    return new Response(
      JSON.stringify({ orcamento }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-orcamento:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
