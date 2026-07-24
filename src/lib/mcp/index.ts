import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjectsTool from "./tools/list-projects";
import createProjectTool from "./tools/create-project";
import whoamiTool from "./tools/whoami";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nice-os-mcp",
  title: "NICE OS",
  version: "0.1.0",
  instructions:
    "Ferramentas do NICE OS (Nice Foods). Use `whoami` para verificar a sessão, `list_projects` para listar os projetos do usuário e `create_project` para criar um novo projeto.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listProjectsTool, createProjectTool],
});
