import { X, Phone, Mail, MapPin, ShoppingBag, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HealthBadge } from "./HealthBadge";
import type { ClienteB2B } from "../hooks/useB2BClientes";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return iso; }
}

export function ClienteDetalhe({ cliente, onClose }: { cliente: ClienteB2B; onClose: () => void }) {
  const whatsappNum = cliente.telefone.replace(/\D/g, "");
  const whatsappMsg = `Olá ${cliente.fantasia || cliente.nome}! Tudo bem? Passando para verificar se precisa repor algum produto NICE FOODS. 😊`;
  const whatsappUrl = `https://wa.me/55${whatsappNum}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border sticky top-0 bg-background">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base">{cliente.fantasia || cliente.nome}</h2>
              <HealthBadge status={cliente.health} />
            </div>
            {cliente.fantasia && <p className="text-xs text-muted-foreground">{cliente.nome}</p>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Contato */}
          <section className="grid grid-cols-2 gap-2 text-sm">
            {cliente.telefone && (
              <a href={whatsappUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
              >
                <Phone size={14} />
                <span className="truncate">{cliente.telefone}</span>
                <ExternalLink size={11} className="ml-auto shrink-0" />
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`}
                className="flex items-center gap-2 p-2.5 bg-muted rounded-lg text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <Mail size={14} />
                <span className="truncate text-xs">{cliente.email}</span>
              </a>
            )}
            {(cliente.cidade || cliente.uf) && (
              <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg text-muted-foreground col-span-2">
                <MapPin size={14} />
                <span className="text-xs">{cliente.cidade}{cliente.uf ? ` / ${cliente.uf}` : ""}</span>
                {cliente.cnpj && <span className="ml-auto text-xs font-mono">{cliente.cnpj}</span>}
              </div>
            )}
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-3 gap-2">
            {[
              { label: "Pedidos", value: String(cliente.totalPedidos) },
              { label: "Receita total", value: fmt(cliente.receitaTotal) },
              { label: "Ticket médio", value: fmt(cliente.ticketMedio) },
              { label: "Última compra", value: formatDate(cliente.ultimaCompra) },
              { label: "Dias sem comprar", value: cliente.diasSemComprar != null ? `${cliente.diasSemComprar} dias` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-xs font-semibold">{value}</p>
              </div>
            ))}
          </section>

          {/* Alerta de reativação */}
          {(cliente.health === "risco" || cliente.health === "perdido") && (
            <div className={cn(
              "flex items-start gap-2 p-3 rounded-lg text-sm border",
              cliente.health === "risco"
                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
            )}>
              <span className="text-lg">{cliente.health === "risco" ? "⚠️" : "🔴"}</span>
              <p className="text-xs leading-relaxed">
                {cliente.health === "risco"
                  ? `Não compra há ${cliente.diasSemComprar} dias. Momento ideal para entrar em contato e garantir a reposição antes de perder o cliente.`
                  : `Cliente inativo há ${cliente.diasSemComprar} dias. Envie uma mensagem de reativação com uma condição especial.`
                }
              </p>
            </div>
          )}

          {/* Histórico de pedidos */}
          {cliente.pedidos.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Histórico de pedidos
              </p>
              <div className="space-y-1.5">
                {cliente.pedidos.slice(0, 10).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg text-sm">
                    <ShoppingBag size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{p.data_pedido}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                      p.situacao?.toLowerCase() === "entregue" || p.situacao?.toLowerCase() === "aprovado"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {p.situacao}
                    </span>
                    <span className="ml-auto tabular-nums text-xs font-medium">{fmt(p.valor)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notas */}
          {cliente.obs && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{cliente.obs}</p>
            </section>
          )}

          {/* Ação WhatsApp */}
          {whatsappNum && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <Phone size={15} />
              Enviar WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
