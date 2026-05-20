import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/core/layouts/ModulePlaceholder";

export default function OperacoesPage() {
  return (
    <ModulePlaceholder
      title="Operações"
      icon={ClipboardList}
      description="Tasks, projetos e reuniões operacionais da NICE FOODS."
      features={[
        "Tasks e backlog por prioridade",
        "Pré-reunião geral (score do negócio)",
        "Reunião de Ads e performance",
        "Modo Ritmo: tarefas diárias/semanais/mensais",
        "Projetos e próximas ações",
      ]}
    />
  );
}
