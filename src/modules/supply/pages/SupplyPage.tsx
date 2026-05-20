import { Package } from "lucide-react";
import { ModulePlaceholder } from "@/core/layouts/ModulePlaceholder";

export default function SupplyPage() {
  return (
    <ModulePlaceholder
      title="Supply Chain"
      icon={Package}
      description="Estoque, produção, compras e fornecedores integrados e automatizados."
      features={[
        "Estoque em tempo real (Crossdo + Tiny/Bling)",
        "Ordem de produção com BOM explosion automático",
        "Cálculo de compras por fornecedor com mínimos e lead times",
        "Mensagens WhatsApp/email geradas automaticamente",
        "Lotes e rastreabilidade completa",
        "Alertas de reposição antecipados",
      ]}
    />
  );
}
