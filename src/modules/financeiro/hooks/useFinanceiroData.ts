import { useQuery } from "@tanstack/react-query";
import { getAsaasBalance, getAsaasReceivables, getAsaasOverdue } from "../api/asaas";
import { getTinyPedidosMes, getTinyPedidosRecentes } from "../api/tiny";

// ── Asaas ─────────────────────────────────────────────────────
export function useAsaasBalance() {
  return useQuery({ queryKey: ["asaas", "balance"],     queryFn: getAsaasBalance,       staleTime: 1000*60*5, retry: 1 });
}
export function useAsaasReceivables() {
  return useQuery({ queryKey: ["asaas", "receivables"], queryFn: getAsaasReceivables,   staleTime: 1000*60*5, retry: 1 });
}
export function useAsaasOverdue() {
  return useQuery({ queryKey: ["asaas", "overdue"],     queryFn: getAsaasOverdue,       staleTime: 1000*60*5, retry: 1 });
}

// ── Tiny ──────────────────────────────────────────────────────
export function useTinyPedidosMes() {
  return useQuery({ queryKey: ["tiny", "pedidos", "mes"],      queryFn: getTinyPedidosMes,      staleTime: 1000*60*10, retry: 1 });
}
export function useTinyPedidosRecentes() {
  return useQuery({ queryKey: ["tiny", "pedidos", "recentes"], queryFn: getTinyPedidosRecentes, staleTime: 1000*60*10, retry: 1 });
}

// ── Consolidado ───────────────────────────────────────────────
export function useSaldoConsolidado() {
  const asaas = useAsaasBalance();
  return {
    total: asaas.data?.balance ?? 0,
    saldoAsaas: asaas.data?.balance ?? 0,
    isLoading: asaas.isLoading,
    isError: asaas.isError,
  };
}
