/**
 * proxy-nuvemshop — Supabase Edge Function
 * Injeta NUVEMSHOP_TOKEN e faz proxy para https://api.nuvemshop.com.br/v1/{store_id}
 *
 * Secrets necessários:
 *   supabase secrets set NUVEMSHOP_TOKEN=<access_token>
 *   supabase secrets set NUVEMSHOP_STORE_ID=<user_id_da_loja>
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NS_TOKEN = Deno.env.get("NUVEMSHOP_TOKEN") ?? "";
const NS_STORE_ID = Deno.env.get("NUVEMSHOP_STORE_ID") ?? "";
const TARGET = `https://api.nuvemshop.com.br/v1/${NS_STORE_ID}`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/proxy-nuvemshop/, "")
    .replace(/^\/functions\/v1\/proxy-nuvemshop/, "") || "/";
  const targetUrl = `${TARGET}${path}${url.search}`;

  const headers = new Headers();
  headers.set("Authentication", `bearer ${NS_TOKEN}`);
  headers.set("User-Agent", "NiceBirdOS/1.0 (thiago@nicefoods.com.br)");
  headers.set("Content-Type", "application/json");

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
