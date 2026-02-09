import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_LINHAS_POR_CHUNK = 30;

const systemPrompt = `Você é um especialista em processar extratos bancários brasileiros.
Analise o texto do extrato e extraia cada lançamento como uma conta paga ou recebida.

Regras de extração:
1. Cada linha do extrato é um lançamento separado
2. Extraia: descrição (resumida), valor, data e tipo
3. Valor:
   - Negativo (com "-" ou "débito"): tipo baseado na classificação abaixo
   - Positivo (sem "-" ou "crédito"): tipo baseado na classificação abaixo
   - Formato: número puro (ex: "1234.56" para R$ 1.234,56)
4. Descrição: Simplifique para identificar o pagamento (ex: "PIX ENVIADO FULANO" -> "PIX Fulano")
5. Data: 
   - Se houver dia/mês no início da linha (ex: "30"), assuma mês/ano atual
   - Se não houver data clara, use a data de hoje
   - Formato ISO: YYYY-MM-DD
   - IMPORTANTE: Valide datas (fev max 28/29, meses 30/31 dias). Use último dia válido se inválido.

6. CLASSIFICAÇÃO DE TIPO (IMPORTANTE):
   - "aplicacao": APLICACAO CDB, APLICACAO TRUST, APLICACAO IDSELICEMP INT, LCI, LCA, TESOURO (saídas que são investimentos)
   - "resgate": RESGATE CDB, RESGATE TRUST (entradas de resgate de investimento)
   - "intercompany": NÃO classifique como intercompany. Classifique como "pagar" ou "receber" normalmente. A detecção de intercompany será feita automaticamente após o processamento.
   - "cartao": pagamento consolidado de fatura de cartão de crédito (BUSINESS 4004-0126, VISA, MASTERCARD) - NÃO entra no DRE
   - "pagar": débitos/saídas normais (boletos, fornecedores, despesas)
   - "receber": créditos/entradas normais (vendas, recebimentos)

7. Ignore completamente: REND PAGO, rendimentos automáticos
8. IMPORTANTE: Marque pago=true pois são lançamentos já realizados

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
            description: "Descrição resumida do lançamento",
          },
          valor: {
            type: "string",
            description: "Valor absoluto em formato numérico (ex: 1234.56)",
          },
          dataVencimento: {
            type: "string",
            description: "Data do lançamento em formato ISO (YYYY-MM-DD)",
          },
          tipo: {
            type: "string",
            enum: ["pagar", "receber", "intercompany", "aplicacao", "resgate", "cartao"],
            description:
              "pagar=débitos normais, receber=créditos normais, intercompany=transferências entre empresas do grupo, aplicacao=investimentos CDB/TRUST/etc, resgate=resgates de investimentos, cartao=pagamento consolidado de fatura cartão (não entra no DRE)",
          },
          subtipo: {
            type: "string",
            enum: ["cdb", "trust", "renda_fixa", "lci", "lca", "tesouro", "outro"],
            description: "Subtipo para aplicações/resgates (opcional)",
          },
          categoria: {
            type: "string",
            description: "Categoria original do extrato se disponível",
          },
        },
        required: ["descricao", "valor", "dataVencimento", "tipo"],
        additionalProperties: false,
      },
    },
  },
];

// Valida e corrige datas inválidas (ex: 30/02 -> 28/02)
function validarData(dataStr: string): string {
  try {
    const [ano, mes, dia] = dataStr.split("-").map(Number);
    if (!ano || !mes || !dia) return new Date().toISOString().split("T")[0];

    // Encontrar último dia válido do mês
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const diaValido = Math.min(dia, ultimoDia);

    return `${ano}-${String(mes).padStart(2, "0")}-${String(diaValido).padStart(2, "0")}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Processa um chunk do extrato
async function processarChunk(texto: string, mesAno: string, apiKey: string): Promise<any[]> {
  const contextoData = mesAno ? `\n\nContexto: Os lançamentos são do mês/ano ${mesAno}.` : "";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt + contextoData },
        {
          role: "user",
          content: `Analise este extrato bancário e extraia cada lançamento relevante:\n\n${texto}`,
        },
      ],
      tools,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (response.status === 402) {
      throw new Error("NO_CREDITS");
    }
    throw new Error(`API_ERROR_${response.status}`);
  }

  const data = await response.json();

  const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
  return toolCalls
    .filter((tc: any) => tc.function?.name === "extract_lancamento")
    .map((tc: any) => {
      try {
        const parsed = JSON.parse(tc.function.arguments);

        // Classificação de fallback caso a IA não tenha detectado corretamente
        let tipo = parsed.tipo;
        let subtipo = parsed.subtipo;
        const desc = (parsed.descricao || "").toUpperCase();

        // Detectar aplicações
        if (/APLICACAO|APLIC\.|CDB DI|TRUST DI|IDSELICEMP/i.test(desc)) {
          tipo = "aplicacao";
          if (/CDB/i.test(desc)) subtipo = "cdb";
          else if (/TRUST/i.test(desc)) subtipo = "trust";
          else if (/LCI/i.test(desc)) subtipo = "lci";
          else if (/LCA/i.test(desc)) subtipo = "lca";
          else if (/TESOURO/i.test(desc)) subtipo = "tesouro";
          else subtipo = "outro";
        }

        // Detectar resgates
        if (/RESGATE|RESG\./i.test(desc)) {
          tipo = "resgate";
          if (/CDB/i.test(desc)) subtipo = "cdb";
          else if (/TRUST/i.test(desc)) subtipo = "trust";
        }

        // Intercompany é detectado por pós-processamento (pares de mesmo valor)
        
        // Detectar pagamento consolidado de cartão de crédito
        if (/BUSINESS \d{4}-\d{4}/i.test(desc)) {
          tipo = "cartao";
        }

        // SHPP/SHOPEE são recebimentos (marketplace B2C)
        if (/SHPP|SHOPEE/i.test(desc) && tipo !== "aplicacao" && tipo !== "resgate" && tipo !== "cartao") {
          tipo = "receber";
        }

        return {
          ...parsed,
          tipo,
          subtipo,
          dataVencimento: validarData(parsed.dataVencimento),
          pago: true,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Detecta intercompany por pares: 2 lançamentos de mesmo valor absoluto (±0.01),
// um sendo saída (pagar/cartao) e outro entrada (receber), são marcados como intercompany.
function detectarIntercompany(lancamentos: any[]): any[] {
  const usados = new Set<number>();

  for (let i = 0; i < lancamentos.length; i++) {
    if (usados.has(i)) continue;
    const a = lancamentos[i];
    const valA = Math.abs(parseFloat(a.valor) || 0);
    const tipoA = a.tipo;

    for (let j = i + 1; j < lancamentos.length; j++) {
      if (usados.has(j)) continue;
      const b = lancamentos[j];
      const valB = Math.abs(parseFloat(b.valor) || 0);
      const tipoB = b.tipo;

      const mesmovalor = Math.abs(valA - valB) <= 0.01;
      const parSaidaEntrada =
        (["pagar", "cartao"].includes(tipoA) && tipoB === "receber") ||
        (["pagar", "cartao"].includes(tipoB) && tipoA === "receber");

      if (mesmovalor && parSaidaEntrada) {
        lancamentos[i].tipo = "intercompany";
        lancamentos[j].tipo = "intercompany";
        usados.add(i);
        usados.add(j);
        break;
      }
    }
  }

  return lancamentos;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto, mesAno } = await req.json();

    if (!texto || typeof texto !== "string") {
      return new Response(JSON.stringify({ error: "texto é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dividir texto em chunks para evitar truncamento
    const linhas = texto.split("\n").filter((l: string) => l.trim());
    const chunks: string[] = [];

    for (let i = 0; i < linhas.length; i += MAX_LINHAS_POR_CHUNK) {
      chunks.push(linhas.slice(i, i + MAX_LINHAS_POR_CHUNK).join("\n"));
    }

    console.log(`Processing ${linhas.length} lines in ${chunks.length} chunk(s)`);

    // Processar cada chunk
    const todosLancamentos: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        const lancamentos = await processarChunk(chunks[i], mesAno || "", LOVABLE_API_KEY);
        todosLancamentos.push(...lancamentos);
        console.log(`Chunk ${i + 1}: ${lancamentos.length} items extracted`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing chunk ${i + 1}:`, errMsg);

        if (errMsg === "RATE_LIMIT") {
          return new Response(
            JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (errMsg === "NO_CREDITS") {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Continue com próximos chunks mesmo se um falhar
      }
    }

    // Pós-processamento: detectar intercompany por pares de mesmo valor
    const lancamentosProcessados = detectarIntercompany(todosLancamentos);
    console.log(`Total extracted: ${lancamentosProcessados.length} items`);

    if (lancamentosProcessados.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum lançamento encontrado no extrato", contas: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ contas: lancamentosProcessados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-extrato:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
