import { useEffect, useState } from "react";
import { Smartphone, Monitor, Share, Plus, CheckCircle2, Download } from "lucide-react";
import birdLogo from "@/assets/bird-logo-white.png";

// ── Platform detection ────────────────────────────────────────────

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// ── BeforeInstallPrompt type ──────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ── Step component ────────────────────────────────────────────────

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center">
        {num}
      </span>
      <div className="text-white/90 text-sm leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  const ios = isIOS();
  const android = isAndroid();
  const desktop = !ios && !android;
  const standalone = isStandalone();

  useEffect(() => {
    if (standalone) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [standalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
    setInstalling(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <img src={birdLogo} alt="NICE BIRD" className="w-14 h-14 object-contain" />
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">NICE BIRD</h1>
          <p className="text-white/50 text-sm mt-0.5">Operations OS</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.06] border border-white/10 rounded-2xl p-6 space-y-5">

        {/* Já instalado */}
        {(installed || standalone) ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={40} className="text-emerald-400" />
            <p className="text-white font-semibold text-lg">App instalado!</p>
            <p className="text-white/50 text-sm">
              Acesse pelo ícone na sua tela inicial.
            </p>
            <a
              href="/"
              className="mt-2 inline-flex items-center gap-2 bg-white text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
            >
              Abrir sistema
            </a>
          </div>

        ) : (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-semibold">
              {ios && <><Smartphone size={13} /> iOS — Safari</>}
              {android && <><Smartphone size={13} /> Android</>}
              {desktop && <><Monitor size={13} /> Desktop</>}
            </div>

            {/* iOS instructions */}
            {ios && (
              <div className="space-y-4">
                <p className="text-white/70 text-sm">
                  No Safari, toque no botão de compartilhamento e depois em{" "}
                  <strong className="text-white">"Adicionar à Tela de Início"</strong>.
                </p>
                <div className="space-y-3">
                  <Step num={1}>
                    Certifique-se de estar no <strong>Safari</strong> (não no Chrome)
                  </Step>
                  <Step num={2}>
                    Toque no ícone{" "}
                    <Share size={14} className="inline text-blue-400 align-middle" />{" "}
                    <strong>Compartilhar</strong> na barra inferior
                  </Step>
                  <Step num={3}>
                    Role para baixo e toque em{" "}
                    <strong>"Adicionar à Tela de Início"</strong>
                    <Plus size={13} className="inline text-white/50 ml-1 align-middle" />
                  </Step>
                  <Step num={4}>
                    Toque em <strong>Adicionar</strong> no canto superior direito
                  </Step>
                </div>
                <a
                  href="/"
                  className="block text-center text-white/50 text-xs underline underline-offset-2 pt-2"
                >
                  Ou acessar pelo navegador →
                </a>
              </div>
            )}

            {/* Android / Desktop with install prompt */}
            {(android || desktop) && (
              <div className="space-y-4">
                {deferredPrompt ? (
                  <>
                    <p className="text-white/70 text-sm">
                      Instale o NICE BIRD como app na sua{" "}
                      {desktop ? "área de trabalho" : "tela inicial"} para acesso rápido, mesmo offline.
                    </p>
                    <button
                      onClick={handleInstall}
                      disabled={installing}
                      className="w-full flex items-center justify-center gap-2 bg-white text-[#0D1117] font-semibold text-sm px-5 py-3 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      <Download size={16} />
                      {installing ? "Instalando..." : "Instalar agora"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm">
                      Para instalar, acesse pelo <strong className="text-white">Chrome</strong> e procure
                      o ícone de instalar na barra de endereço{" "}
                      {desktop ? "(ícone de monitor com seta)" : "(menu ⋮ → Adicionar à tela inicial)"}.
                    </p>
                    <div className="space-y-3">
                      {desktop ? (
                        <>
                          <Step num={1}>Abra este link no <strong>Chrome</strong></Step>
                          <Step num={2}>
                            Clique no ícone de instalar{" "}
                            <strong>(⊕)</strong> na barra de endereço
                          </Step>
                          <Step num={3}>Confirme clicando em <strong>Instalar</strong></Step>
                        </>
                      ) : (
                        <>
                          <Step num={1}>Abra no <strong>Chrome</strong></Step>
                          <Step num={2}>Toque no menu <strong>⋮</strong> (3 pontos)</Step>
                          <Step num={3}>Toque em <strong>"Adicionar à tela inicial"</strong></Step>
                        </>
                      )}
                    </div>
                  </>
                )}
                <a
                  href="/"
                  className="block text-center text-white/50 text-xs underline underline-offset-2 pt-1"
                >
                  Acessar pelo navegador →
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* URL hint */}
      <p className="text-white/30 text-xs mt-8 text-center">
        intranet.tasks-thiago-edition.nicefoods.com.br
      </p>
    </div>
  );
}
