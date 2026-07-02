/**
 * proxy-ga4 — Supabase Edge Function
 *
 * Gera um access token OAuth2 a partir de um Service Account do Google
 * (fluxo server-to-server / JWT bearer) e faz proxy para a
 * Google Analytics 4 Data API (https://analyticsdata.googleapis.com).
 *
 * O front (src/modules/marketing/api/ga4.ts) chama:
 *   {SUPABASE_URL}/functions/v1/proxy-ga4/v1beta/properties/XXXX:runReport
 * e esta função injeta o Authorization: Bearer <token> e repassa.
 *
 * Secrets necessários:
 *   supabase secrets set GOOGLE_SA_KEY_JSON=<base64 do JSON da service account>
 *
 * Pré-requisitos no Google:
 *   1. Google Cloud Console → IAM → criar Service Account
 *   2. Habilitar "Google Analytics Data API" no projeto
 *   3. Na propriedade GA4 (Admin → Acesso à propriedade) → adicionar o e-mail
 *      da service account com papel "Visualizador"
 *   4. Gerar chave JSON → base64 -i sa-key.json | pbcopy  → vira o secret acima
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
};

const SA_B64 = Deno.env.get("GOOGLE_SA_KEY_JSON") ?? "";
const TARGET = "https://analyticsdata.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Cache do token enquanto o isolate estiver quente (evita gerar JWT a cada request).
let cachedToken = "";
let cachedExp = 0;

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64Url(s: string): string {
  return bytesToB64Url(new TextEncoder().encode(s));
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExp - 60 > now) return cachedToken;

  const sa = JSON.parse(atob(SA_B64)); // { client_email, private_key, ... }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${strToB64Url(JSON.stringify(header))}.${strToB64Url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${bytesToB64Url(new Uint8Array(sigBuf))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tok = await res.json();
  if (!tok.access_token) throw new Error(`token error: ${JSON.stringify(tok)}`);

  cachedToken = tok.access_token;
  cachedExp = now + (tok.expires_in ?? 3600);
  return cachedToken;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!SA_B64) {
    return new Response(
      JSON.stringify({ error: "GA4 service account not configured (GOOGLE_SA_KEY_JSON)" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/proxy-ga4/, "")
    .replace(/^\/functions\/v1\/proxy-ga4/, "") || "/";
  const targetUrl = `${TARGET}${path}${url.search}`;

  try {
    const token = await getAccessToken();
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...CORS, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    // Devolve 200 com erro no corpo pra o front cair no mock em vez de quebrar a UI.
    return new Response(
      JSON.stringify({ error: "GA4_PROXY_ERROR", message: String(e) }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
