import { useState } from "react";
import { X, Phone, Copy, ExternalLink, CheckCircle } from "lucide-react";
import type { ClienteB2B } from "../hooks/useB2BClientes";

interface Props {
  clientes: ClienteB2B[];
  onClose: () => void;
}

const MSG_PADRAO = "Olá {nome}! Tudo bem? Passando para verificar se precisa repor algum produto NICE FOODS. 😊";

export function ReativacaoEmMassa({ clientes, onClose }: Props) {
  const [mensagem, setMensagem] = useState(MSG_PADRAO);
  const [copiado, setCopiado] = useState(false);

  function getMsgCliente(c: ClienteB2B) {
    return mensagem.replace("{nome}", c.fantasia || c.nome);
  }

  function getWhatsappUrl(c: ClienteB2B) {
    const num = c.telefone.replace(/\D/g, "");
    if (!num) return null;
    return `https://wa.me/55${num}?text=${encodeURIComponent(getMsgCliente(c))}`;
  }

  function copiarLista() {
    const texto = clientes
      .map((c) => `${c.fantasia || c.nome} — ${c.telefone}`)
      .join("\n");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  function abrirTodos() {
    clientes.forEach((c, i) => {
      const url = getWhatsappUrl(c);
      if (url) setTimeout(() => window.open(url, "_blank"), i * 500);
    });
  }

  const comTelefone = clientes.filter((c) => c.telefone);
  const semTelefone = clientes.filter((c) => !c.telefone);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base">Reativação em massa</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} clientes selecionados</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Editor de mensagem */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Mensagem (use {"{nome}"} para personalizar)
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Aviso sem telefone */}
          {semTelefone.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
              ⚠️ {semTelefone.length} cliente(s) sem telefone cadastrado não aparecem abaixo.
            </p>
          )}

          {/* Lista de clientes */}
          <div className="space-y-1.5">
            {comTelefone.map((c) => {
              const url = getWhatsappUrl(c);
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.fantasia || c.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{c.telefone}</p>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0"
                    >
                      <Phone size={10} />
                      WhatsApp
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer com ações globais */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={copiarLista}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border border-border rounded-xl hover:bg-muted transition-colors"
          >
            {copiado ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copiado ? "Copiado!" : "Copiar lista"}
          </button>
          <button
            onClick={abrirTodos}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
          >
            <Phone size={13} />
            Abrir todos no WhatsApp ({comTelefone.length})
          </button>
        </div>
      </div>
    </div>
  );
}
