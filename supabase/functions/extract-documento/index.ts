import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um especialista em extração de dados de documentos financeiros brasileiros.
Analise o documento (imagem ou PDF) e extraia TODAS as informações de pagamento que encontrar.

IMPORTANTE: Se o documento contiver MÚLTIPLOS boletos, lançamentos ou transações,
você DEVE chamar a função extract_conta UMA VEZ PARA CADA lançamento encontrado.
NÃO agrupe múltiplos lançamentos em uma única chamada - extraia cada um separadamente.

Tipos de documentos comuns:
- Boleto bancário: procure linha digitável, beneficiário, valor, data de vencimento
- Nota Fiscal (NF-e/NFS-e): procure fornecedor/prestador, valor total, data de emissão, prazo de pagamento
- DDA (Débito Direto Autorizado): procure sacado/pagador, valor, vencimento
- Fatura/Invoice: procure empresa, valor devido, data de vencimento
- Print de tela bancária: pode ter MÚLTIPLOS lançamentos listados - extraia CADA UM
- Lista de pagamentos: extraia TODOS os itens visíveis

Regras de extração:
1. Descrição: Use o nome do beneficiário, fornecedor ou sacado (quem vai receber o dinheiro)
2. Valor: Extraia o valor total em formato numérico (ex: "1234.56" para R$ 1.234,56)
3. Data: Converta para formato ISO (YYYY-MM-DD). Se aparecer apenas dia/mês, assuma o ano atual.
4. Tipo: 
   - "pagar" para boletos, faturas, NFs de fornecedores, PIX enviados (você precisa pagar)
   - "receber" para NFs emitidas por você, notas de serviço prestado, PIX recebidos
5. Código de barras: Extraia a linha digitável completa do boleto (47 ou 48 dígitos)
6. PIX copia-e-cola: Se houver código PIX (geralmente começa com "00020126..."), extraia completo
7. Número da NF: Extraia o número da nota fiscal se presente
8. Chave DANFE: Extraia a chave de acesso da NFe/DANFE (44 dígitos numéricos)

Se não conseguir extrair algum campo com certeza, retorne uma string vazia para esse campo.
Use a função extract_conta para retornar os dados estruturados.
LEMBRE-SE: Chame extract_conta MÚLTIPLAS VEZES se houver múltiplos lançamentos no documento!`;

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
          codigoBarrasPix: {
            type: "string",
            description: "Linha digitável do boleto (47-48 dígitos) OU código PIX copia-e-cola completo. Vazio se não encontrado."
          },
          numeroNF: {
            type: "string",
            description: "Número da Nota Fiscal. Vazio se não encontrado."
          },
          chaveDanfe: {
            type: "string",
            description: "Chave de acesso da NFe/DANFE com 44 dígitos. Vazio se não encontrado."
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

    // Build content based on mime type
    const isPdf = mimeType === "application/pdf";
    
    const userContent: any[] = [
      {
        type: "text",
        text: "Analise este documento financeiro e extraia todos os dados de pagamento, incluindo código de barras, PIX, número de NF e chave DANFE quando disponíveis."
      }
    ];

    if (isPdf) {
      // For PDFs, use file content type (supported by Gemini)
      userContent.push({
        type: "file",
        file: {
          filename: "document.pdf",
          file_data: `data:application/pdf;base64,${base64Data}`
        }
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`
        }
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
          {
            role: "user",
            content: userContent
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
        JSON.stringify({ error: "Erro ao processar documento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract ALL tool calls (support multiple accounts from one document)
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
