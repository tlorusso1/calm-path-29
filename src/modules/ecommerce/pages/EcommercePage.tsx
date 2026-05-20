import { ShoppingCart } from "lucide-react";
import { ModulePlaceholder } from "@/core/layouts/ModulePlaceholder";

export default function EcommercePage() {
  return (
    <ModulePlaceholder
      title="Ecommerce"
      icon={ShoppingCart}
      description="Vendas por canal e SKU, visitas, conversão e faturamento em tempo real."
      features={[
        "Vendas: site próprio, Mercado Livre, Amazon, Shopee",
        "Faturamento do dia/semana/mês por canal",
        "Performance por SKU",
        "Integração Google Analytics (visitas e conversão)",
        "Sincronização Tiny e Bling (pedidos e NFs)",
        "Devoluções e reclamações",
      ]}
    />
  );
}
