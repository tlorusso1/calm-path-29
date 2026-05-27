/**
 * apiBase — resolve a URL base correta por serviço.
 *
 * Em DEV (vite dev): usa /api/<service> que o Vite proxy injeta com tokens.
 * Em PROD (build estático): usa Supabase Edge Functions que guardam os secrets.
 *
 * Para adicionar um novo serviço:
 *   1. Crie supabase/functions/proxy-<service>/index.ts
 *   2. `supabase secrets set SERVICE_TOKEN=...`
 *   3. `supabase functions deploy proxy-<service>`
 *   4. Use `apiBase('service')` no arquivo de API.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function apiBase(service: string): string {
  if (import.meta.env.DEV) {
    return `/api/${service}`;
  }
  return `${SUPABASE_FUNCTIONS_URL}/proxy-${service}`;
}

export async function proxyFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const requestUrl = typeof input === "string" ? input : input.toString();

  if (!requestUrl.startsWith(SUPABASE_FUNCTIONS_URL)) {
    return fetch(input, init);
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);

  return fetch(input, { ...init, headers });
}
