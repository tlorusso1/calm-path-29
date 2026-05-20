import { useState } from "react";
import { AlertTriangle, Send, CheckCircle, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAsaasOverdue, useDeleteAsaasPayment } from "@/modules/financeiro/hooks/useFinanceiroData";
import { sendAsaasNotification, asaasPaymentUrl } from "@/modules/financeiro/api/asaas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function diasEmAtraso(dueDate: string): number {
  try { return differenceInDays(new Date(), parseISO(dueDate)); }
  catch { return 0; }
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return iso; }
}

export function B2BCobrancas() {
  const { data, isLoading } = useAsaasOverdue();
  const deletePayment = useDeleteAsaasPayment();
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
      setTimeout(() => setEnviados(prev => { const s = new Set(prev); s.delete(id); return s; }), 30000);
    } catch {
      toast({ title: "Erro ao reenviar", description: "Tente novamente em instantes.", variant: "destructive" });
    }
    setEnviando(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function excluir(id: string, descricao: string) {
    try {
      await deletePayment.mutateAsync(id);
      toast({ title: "🗑 Cobrança excluída", description: `"${descricao || "Cobrança"}" removida do Asaas.` });
    } catch {
      toast({ title: "Erro ao excluir", description: "Verifique o Asaas e tente novamente.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
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
          const excluindo = deletePayment.isPending;

          const urgencyClass =
            dias > 90 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" :
            dias > 30 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900" :
            "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900";

          const urgencyText =
            dias > 90 ? "text-red-600 dark:text-red-400" :
            dias > 30 ? "text-amber-600 dark:text-amber-400" :
            "text-yellow-600 dark:text-yellow-400";

          return (
            <div key={p.id} className={cn("rounded-xl border overflow-hidden", urgencyClass)}>
              {/* Main row */}
              <div className="flex items-center gap-3 px-3 py-3">
                {/* Badge dias */}
                <div className={cn("text-center shrink-0 w-11", urgencyText)}>
                  <p className="text-base font-bold leading-none">{dias}</p>
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
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-1.5 px-3 pb-2.5">
                {/* Ver no Asaas */}
                <a
                  href={asaasPaymentUrl(p.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-muted border border-border hover:border-primary/40 text-foreground transition-colors"
                >
                  <ExternalLink size={10} />
                  Ver no Asaas
                </a>

                {/* Reenviar notificação */}
                <button
                  onClick={() => reenviar(p.id)}
                  disabled={carregando || jaEnviado}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors",
                    jaEnviado
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-default"
                      : "bg-white dark:bg-muted border border-border hover:border-primary/40 text-foreground disabled:opacity-50"
                  )}
                >
                  {jaEnviado ? (
                    <><CheckCircle size={10} /> Enviado</>
                  ) : carregando ? (
                    <><Loader2 size={10} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Send size={10} /> Reenviar</>
                  )}
                </button>

                <div className="flex-1" />

                {/* Excluir cobrança */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={excluindo}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-muted border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={10} />
                      Excluir
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A cobrança <strong>"{p.description || "Cobrança"}"</strong> de{" "}
                        <strong>{fmt(p.value)}</strong> será removida permanentemente do Asaas.
                        <br /><br />
                        Use apenas se a cobrança foi criada por engano. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => excluir(p.id, p.description)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
