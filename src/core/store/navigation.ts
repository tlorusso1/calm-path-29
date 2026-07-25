import { create } from "zustand";

export type ModuleId =
  | "financeiro"
  | "ecommerce"
  | "canais"
  | "marketing"
  | "atendimento"
  | "supply"
  | "produtos"
  | "operacoes"
  | "b2b"
  | "canais";

interface NavigationStore {
  activeModule: ModuleId;
  sidebarCollapsed: boolean;
  setActiveModule: (module: ModuleId) => void;
  toggleSidebar: () => void;
}

export const useNavigation = create<NavigationStore>((set) => ({
  activeModule: "financeiro",
  sidebarCollapsed: false,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
