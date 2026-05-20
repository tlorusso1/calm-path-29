import { useState } from "react";
import { AlertTriangle, Send, CheckCircle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAsaasOverdue } from "@/modules/financeiro/hooks/useFinanceiroData";
import { sendAsaasNotification } from "@/modules/financeiro/api/asaas";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function diasEmAtraso(dueDate: string): number {
  try {
    return differenceInDays(new Date(), parseISO(dueDate));
  } catch {
    return 0;
  }
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return iso; }
}

export function B2BCobrancas() {
  const { data, isLoading } = useAsaasOverdue();
  const { toast } = useToast();
  const [enviando, setEnviando] = useState<Set<string>>(new Set());
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  const cobrancas = data?.data ?? [];
  const totalVencido = cobrancas.reduce((s, p) => s + p.value, 0);

  async function reenviar(id: string) {
    setEnviando(prev => new Set(prev).add(id));
    try {
      await sendAsaasNotification(id);
      setEnviados(prev => new Set(prev).add(id));
      toast({ title: "✅ Cobrança reenviada!", description: "O cliente receberá a notificação." });
      // Remove o estado "enviado" após 30s
      setTimeout(() => setEnviados(prev => { const s = new Set(prev); s.delete(id); return s; }), 30000);
    } catch {
      toast({ title: "Erro ao reenviar", description: "Tente novamente em instantes.", variant: "destructive" });
    }
    setEnviando(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  if (cobrancas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle size={32} className="mb-3 opacity-30 text-emerald-500" />
        <p className="text-sm font-medium">Nenhuma cobrança vencida</p>
        <p className="text-xs opacity-60">Tudo em dia no Asaas 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
        <AlertTriangle size={14} className="text-red-500 shrink-0" />
        <p className="text-xs text-red-800 dark:text-red-300">
          <strong>{cobrancas.length} cobranças vencidas</strong> · Total em aberto:{" "}
          <strong>{fmt(totalVencido)}</strong>
        </p>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {cobrancas.map((p) => {
          const dias = diasEmAtraso(p.dueDate);
          const jaEnviado = enviados.has(p.id);
          const carregando = enviando.has(p.id);

          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl border",
                dias > 90 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" :
                dias > 30 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900" :
                "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
              )}
            >
              {/* Badge dias */}
              <div className={cn(
                "text-center shrink-0 w-12",
                dias > 90 ? "text-red-600 dark:text-red-400" :
                dias > 30 ? "text-amber-600 dark:text-amber-400" : "text-yellow-600 dark:text-yellow-400"
              )}>
                <p className="text-lg font-bold leading-none">{dias}</p>
                <p className="text-[9px]">dias</p>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{p.description || "Cobrança"}</p>
                <p className="text-[10px] text-muted-foreground">
                  Venceu em {fmtDate(p.dueDate)} · {p.billingType}
                </p>
              </div>

              {/* Valor */}
              <span className="text-sm font-bold tabular-nums shrink-0">{fmt(p.value)}</span>

              {/* Botão reenviar */}
              <button
                onClick={() => reenviar(p.id)}
                disabled={carregando || jaEnviado}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors shrink-0",
                  jaEnviado
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-default"
                    : "bg-white dark:bg-muted border border-border hover:border-primary/40 text-foreground disabled:opacity-50"
                )}
              >
                {jaEnviado ? (
                  <><CheckCircle size={11} /> Enviado</>
                ) : (
                  <><Send size={11} /> {carregando ? "..." : "Reenviar"}</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
