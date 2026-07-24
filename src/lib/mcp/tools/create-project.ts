import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "create_project",
  title: "Criar projeto",
  description:
    "Cria um novo projeto no NICE OS para o usuário autenticado.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Nome do projeto."),
    owner: z.string().trim().optional().describe("Responsável pelo projeto."),
    status: z.string().trim().optional().describe("Status inicial (ex.: ativo)."),
    next_action: z.string().trim().optional().describe("Próxima ação prevista."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("projects")
      .insert({
        user_id: ctx.getUserId(),
        name: input.name,
        owner: input.owner ?? null,
        status: input.status ?? null,
        next_action: input.next_action ?? null,
      })
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }
    return {
      content: [
        { type: "text", text: `Projeto criado: ${data.name} (${data.id})` },
      ],
      structuredContent: { project: data },
    };
  },
});
