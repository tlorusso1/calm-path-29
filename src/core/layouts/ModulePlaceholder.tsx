import { type LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export function ModulePlaceholder({ title, description, icon: Icon, features }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon size={26} className="text-primary" />
      </div>
      <h1 className="text-xl font-semibold mb-1">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>

      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 text-left">
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={13} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em construção — Parte {getFase(title)}</span>
        </div>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getFase(title: string): string {
  const map: Record<string, string> = {
    "Financeiro": "2",
    "Ecommerce": "3",
    "Marketing": "5",
    "Atendimento": "6",
    "Supply Chain": "4",
    "Produtos & Trends": "7",
    "Operações": "4",
  };
  return map[title] ?? "–";
}
