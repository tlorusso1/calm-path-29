import {
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Megaphone,
  MessageCircle,
  Package,
  Lightbulb,
  ClipboardList,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { ModuleId } from "../store/navigation";

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export const MODULES: ModuleConfig[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    shortLabel: "Finance",
    icon: TrendingUp,
    path: "/financeiro",
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    shortLabel: "Ecom",
    icon: ShoppingCart,
    path: "/ecommerce",
  },
  {
    id: "canais",
    label: "Vendas por Canal",
    shortLabel: "Canais",
    icon: BarChart3,
    path: "/canais",
  },
  {
    id: "marketing",
    label: "Marketing",
    shortLabel: "Mkt",
    icon: Megaphone,
    path: "/marketing",
  },
  {
    id: "atendimento",
    label: "Atendimento",
    shortLabel: "CS",
    icon: MessageCircle,
    path: "/atendimento",
  },
  {
    id: "supply",
    label: "Supply Chain",
    shortLabel: "Supply",
    icon: Package,
    path: "/supply",
  },
  {
    id: "produtos",
    label: "Produtos & Trends",
    shortLabel: "Trends",
    icon: Lightbulb,
    path: "/produtos",
  },
  {
    id: "operacoes",
    label: "Operações",
    shortLabel: "Ops",
    icon: ClipboardList,
    path: "/operacoes",
  },
  {
    id: "b2b",
    label: "B2B",
    shortLabel: "B2B",
    icon: Users,
    path: "/b2b",
  },
  {
    id: "canais",
    label: "Vendas por Canal",
    shortLabel: "Canais",
    icon: BarChart3,
    path: "/canais",
  },
];
