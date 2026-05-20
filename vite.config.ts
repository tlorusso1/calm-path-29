import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // Carrega TODAS as variáveis de ambiente (prefixo "" = todas)
  const env = loadEnv(mode, process.cwd(), "");

  const asaasToken = env.ASAAS_TOKEN    ?? "";
  const tinyToken  = env.TINY_TOKEN     ?? "";
  const metaToken  = env.META_ADS_TOKEN ?? "";

  console.log("[NICE BIRD] Asaas token loaded:", asaasToken ? `${asaasToken.slice(0, 10)}…` : "VAZIO ⚠");
  console.log("[NICE BIRD] Tiny token loaded:",  tinyToken  ? `${tinyToken.slice(0, 8)}…`  : "VAZIO ⚠");
  console.log("[NICE BIRD] Meta token loaded:",  metaToken  ? `${metaToken.slice(0, 8)}…`  : "VAZIO ⚠");

  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: "all",
      proxy: {
        // ── Asaas ──────────────────────────────────────────────
        "/api/asaas": {
          target: "https://api.asaas.com",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/asaas/, "/v3"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              proxyReq.setHeader("access_token", asaasToken);
              proxyReq.setHeader("User-Agent", "NiceBirdOS/1.0");
              console.log(`[proxy → Asaas] ${req.method} ${req.url}`);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log(`[proxy ← Asaas] ${proxyRes.statusCode} ${req.url}`);
            });
          },
        },
        // ── Meta Ads ───────────────────────────────────────────
        "/api/meta": {
          target: "https://graph.facebook.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/meta/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              // Injeta o token como query param (Meta não usa header de auth)
              const url = new URL(`https://graph.facebook.com${proxyReq.path}`);
              url.searchParams.set("access_token", metaToken);
              proxyReq.path = url.pathname + url.search;
              console.log(`[proxy → Meta] ${req.method} ${req.url}`);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log(`[proxy ← Meta] ${proxyRes.statusCode} ${req.url}`);
            });
          },
        },
        // ── Tiny ───────────────────────────────────────────────
        "/api/tiny": {
          target: "https://api.tiny.com.br",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/tiny/, "/api2"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log(`[proxy → Tiny] ${req.method} ${req.url}`);
            });
          },
        },
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/*.png"],
        manifest: {
          name: "NICE BIRD — Operations OS",
          short_name: "NICE BIRD",
          description: "Sistema operacional da NICE FOODS",
          theme_color: "#0D1117",
          background_color: "#0D1117",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: "/",
          lang: "pt-BR",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"] },
      }),
    ].filter(Boolean),
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  };
});
