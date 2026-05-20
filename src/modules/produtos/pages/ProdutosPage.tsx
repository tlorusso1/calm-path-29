import { Lightbulb } from "lucide-react";
import { ModulePlaceholder } from "@/core/layouts/ModulePlaceholder";

export default function ProdutosPage() {
  return (
    <ModulePlaceholder
      title="Produtos & Trends"
      icon={Lightbulb}
      description="Inteligência de mercado para identificar produtos com potencial nos marketplaces."
      features={[
        "Análise de tendências por categoria (ML, Amazon, Shopee)",
        "Estudo de concorrentes: preço, avaliações, volume estimado",
        "Score de oportunidade por produto/nicho",
        "Validação de demanda antes de desenvolver",
        "Comparativo de margem por canal antes de lançar",
        "Histórico de produtos analisados",
      ]}
    />
  );
}
