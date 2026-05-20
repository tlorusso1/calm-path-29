import { Phone, Mail, MapPin, ShoppingBag, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthBadge } from "./HealthBadge";
import type { ClienteB2B } from "../hooks/useB2BClientes";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  cliente: ClienteB2B;
  onClick: () => void;
}

export function ClienteCard({ cliente, onClick }: Props) {
  const { nome, fantasia, cidade, uf, telefone, totalPedidos, receitaTotal, ticketMedio, diasSemComprar, health } = cliente;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors",
        health === "risco"   && "border-l-4 border-l-amber-400",
        health === "perdido" && "border-l-4 border-l-red-400",
        health === "ativo"   && "border-l-4 border-l-emerald-400",
        health === "novo"    && "border-l-4 border-l-blue-400",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{fantasia || nome}</p>
          {fantasia && fantasia !== nome && (
            <p className="text-xs text-muted-foreground truncate">{nome}</p>
          )}
        </div>
        <HealthBadge status={health} />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        {(cidade || uf) && (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {cidade}{uf ? `/${uf}` : ""}
          </span>
        )}
        {telefone && (
          <span className="flex items-center gap-1">
            <Phone size={10} />
            {telefone}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Pedidos</p>
          <p className="text-sm font-semibold flex items-center justify-center gap-1">
            <ShoppingBag size={11} className="text-muted-foreground" />
            {totalPedidos}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Receita</p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {fmt(receitaTotal)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Última compra</p>
          <p className={cn(
            "text-xs font-semibold flex items-center justify-center gap-1",
            diasSemComprar === null ? "text-muted-foreground" :
            diasSemComprar > 60 ? "text-red-500" :
            diasSemComprar > 30 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
          )}>
            <Clock size={10} />
            {diasSemComprar === null ? "—" : `${diasSemComprar}d`}
          </p>
        </div>
      </div>
    </button>
  );
}
