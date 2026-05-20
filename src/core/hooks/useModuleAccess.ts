import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleId } from "../store/navigation";

type AppRole = "admin" | "marketing" | "operacional" | "comercial";

// Map of role → allowed modules
export const ROLE_MODULES: Record<AppRole, ModuleId[]> = {
  admin:       ["financeiro", "ecommerce", "marketing", "atendimento", "supply", "produtos", "operacoes", "b2b"],
  marketing:   ["marketing", "ecommerce", "produtos"],
  operacional: ["supply", "operacoes", "b2b"],
  comercial:   ["b2b"],
};

// Default redirect path per role (first module in their list)
export const ROLE_DEFAULT_PATH: Record<AppRole, string> = {
  admin:       "/financeiro",
  marketing:   "/marketing",
  operacional: "/supply",
  comercial:   "/b2b",
};

interface ModuleAccessState {
  roles: AppRole[];
  allowedModules: ModuleId[];
  defaultPath: string;
  isLoading: boolean;
  canAccess: (mod: ModuleId) => boolean;
}

export function useModuleAccess(): ModuleAccessState {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error || !data) {
          // Default to admin if no roles found (keeps existing behaviour)
          setRoles(["admin"]);
        } else {
          const fetchedRoles = data.map((r) => r.role as AppRole);
          setRoles(fetchedRoles.length > 0 ? fetchedRoles : ["admin"]);
        }
        setIsLoading(false);
      });
  }, [user?.id]);

  // admin always sees everything
  const isAdmin = roles.includes("admin");
  const allowedModules: ModuleId[] = isAdmin
    ? ROLE_MODULES.admin
    : [...new Set(roles.flatMap((r) => ROLE_MODULES[r] ?? []))];

  // Default path = first allowed module's path, falling back to /financeiro
  const primaryRole: AppRole = roles[0] ?? "admin";
  const defaultPath = ROLE_DEFAULT_PATH[primaryRole] ?? "/financeiro";

  const canAccess = (mod: ModuleId) => isAdmin || allowedModules.includes(mod);

  return { roles, allowedModules, defaultPath, isLoading, canAccess };
}
