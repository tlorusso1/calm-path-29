/**
 * proxy-asaas — Supabase Edge Function
 * Injeta ASAAS_TOKEN e faz proxy para https://api.asaas.com/v3
 *
 * Secret necessário:
 *   supabase secrets set ASAAS_TOKEN=<token>
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ASAAS_TOKEN = Deno.env.get("ASAAS_TOKEN") ?? "";
const TARGET = "https://api.asaas.com/v3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Extrai o caminho após /proxy-asaas
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/proxy-asaas/, "").replace(/^\/functions\/v1\/proxy-asaas/, "") || "/";
  const targetUrl = `${TARGET}${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set("access_token", ASAAS_TOKEN);
  headers.set("User-Agent", "NiceBirdOS/1.0");
  headers.delete("host");

  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { ...CORS, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
