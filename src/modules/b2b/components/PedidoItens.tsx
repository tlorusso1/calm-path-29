import { useQuery } from "@tanstack/react-query";
import { getPedidoDetalhe } from "../api/tinyB2B";
import { Loader2 } from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function PedidoItens({ pedidoId }: { pedidoId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["b2b", "pedido", pedidoId],
    queryFn: () => getPedidoDetalhe(pedidoId),
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" />
        Carregando itens...
      </div>
    );
  }

  if (isError || !data?.itens?.length) {
    return (
      <p className="py-2 px-3 text-xs text-muted-foreground italic">
        {isError ? "Erro ao buscar itens." : "Nenhum item encontrado."}
      </p>
    );
  }

  return (
    <div className="mt-1 mx-3 mb-2 rounded-lg bg-background border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left px-3 py-1.5 font-medium">Produto</th>
            <th className="text-right px-3 py-1.5 font-medium w-12">Qtd</th>
            <th className="text-right px-3 py-1.5 font-medium w-20">Unit.</th>
            <th className="text-right px-3 py-1.5 font-medium w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.itens.map((item, i) => (
            <tr key={i} className="border-t border-border/50">
              <td className="px-3 py-1.5 truncate max-w-[160px]">{item.descricao}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{item.quantidade}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(item.valor_unitario)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(item.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
