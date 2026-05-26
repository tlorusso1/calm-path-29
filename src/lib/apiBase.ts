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

const SUPABASE_FUNCTIONS_URL =
  "https://ibxzyodvtmagnetpyyfz.supabase.co/functions/v1";

export function apiBase(service: string): string {
  if (import.meta.env.DEV) {
    return `/api/${service}`;
  }
  return `${SUPABASE_FUNCTIONS_URL}/proxy-${service}`;
}
