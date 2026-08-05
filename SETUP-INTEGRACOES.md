# 🔌 Setup das integrações — GA4, Nuvemshop, Perfit

As três integrações usam o mesmo padrão: **em produção** o front chama uma
**Supabase Edge Function** `proxy-<serviço>` que injeta o token guardado como
*secret* (nunca exposto no browser). Este guia lista o que gerar e os comandos.

> Projeto Supabase: `ibxzyodvtmagnetpyyfz`
> Todos os `secrets set` / `functions deploy` rodam a partir da raiz do repo,
> com o Supabase CLI logado (`supabase login` + `supabase link --project-ref ibxzyodvtmagnetpyyfz`).

---

## 🛒 Nuvemshop  (código pronto — só faltam credenciais)

**Gerar credenciais:**
1. Painel Nuvemshop → **Meus apps / Aplicativos** → criar um **app personalizado**.
2. Instalar o app na sua loja → ele devolve **`access_token`** e o **`store_id`** (o user_id da loja).

**Configurar + deploy:**
```sh
supabase secrets set NUVEMSHOP_TOKEN=<access_token>
supabase secrets set NUVEMSHOP_STORE_ID=<store_id>
supabase functions deploy proxy-nuvemshop
```
> Se der `NUVEMSHOP_INVALID_TOKEN` (401): reinstale o app e use o token + store_id **da mesma instalação**.

---

## 📩 Perfit / Nuvem Marketing  (código pronto — só faltam credenciais)

**Gerar credenciais:**
1. Painel **Nuvem Marketing** → **Integrações** → **Obter chave API** (uso server-side).
2. Anotar o **nome da conta** (ex: `nicefoods`).

**Configurar + deploy:**
```sh
supabase secrets set PERFIT_API_KEY=<api_key>
supabase secrets set PERFIT_ACCOUNT=nicefoods
supabase functions deploy proxy-perfit
```

---

## 📈 GA4  (edge function `proxy-ga4` criada agora — falta a Service Account)

**Gerar credenciais (Google Cloud):**
1. Google Cloud Console → **APIs e serviços** → habilitar **"Google Analytics Data API"**.
2. **IAM → Contas de serviço** → criar Service Account (ex: `nice-os-ga4`).
3. Copiar o **e-mail** da service account (`...@...iam.gserviceaccount.com`).
4. No **GA4** → Admin → **Acesso à propriedade** → adicionar esse e-mail com papel **Visualizador**.
5. Na service account → **Chaves → Adicionar chave → JSON** → baixar.
6. Converter pra base64:
   ```sh
   base64 -i sa-key.json | pbcopy   # (macOS) — cola no comando abaixo
   ```
7. Pegar o **Property ID** do GA4 (Admin → Detalhes da propriedade → número, ex: `123456789`).

**Configurar + deploy:**
```sh
supabase secrets set GOOGLE_SA_KEY_JSON=<base64_colado>
supabase functions deploy proxy-ga4
```

**Ligar no front (variáveis de build — no Lovable: Project Settings → Env, ou no `.env.local`):**
```sh
VITE_GA4_CONFIGURED=true
VITE_GA4_PROPERTY_ID=properties/123456789   # troque pelo seu Property ID
```
> Enquanto `VITE_GA4_CONFIGURED` não for `true`, o `ga4.ts` mostra **mock** de propósito
> (não quebra a UI). Assim que ligar, os componentes `GA4ChannelTable` / `OrganicVsPaidCard`
> passam a mostrar dados reais — e aí dá pra investigar o **pico do dia 29** por canal.

---

## ✅ Checklist rápido

- [ ] Nuvemshop: app instalado → `NUVEMSHOP_TOKEN`, `NUVEMSHOP_STORE_ID` → deploy
- [ ] Perfit: API key → `PERFIT_API_KEY`, `PERFIT_ACCOUNT` → deploy
- [ ] GA4: service account + Viewer na propriedade → `GOOGLE_SA_KEY_JSON` → deploy + `VITE_GA4_*`

Depois de tudo no ar: no NICE OS, a aba **Marketing** mostra tráfego por canal (GA4),
e-mail (Perfit) e a aba **Ecommerce** puxa pedidos/visitas (Nuvemshop).
