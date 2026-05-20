import { MessageCircle } from "lucide-react";
import { ModulePlaceholder } from "@/core/layouts/ModulePlaceholder";

export default function AtendimentoPage() {
  return (
    <ModulePlaceholder
      title="Atendimento"
      icon={MessageCircle}
      description="Inbox unificado do WhatsApp com triagem e respostas por IA."
      features={[
        "Inbox WhatsApp Business em tempo real",
        "Categorização automática por IA (pedido, reclamação, dúvida)",
        "Resposta sugerida com status do pedido incluso",
        "Escalação para humano com contexto",
        "Métricas: TMA, volume e categorias",
        "Histórico de conversas por cliente",
      ]}
    />
  );
}
