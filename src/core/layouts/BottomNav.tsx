import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "../store/navigation";
import { MODULES } from "./modules";

// Mostra os 5 módulos mais usados no bottom nav
const BOTTOM_MODULES = ["financeiro", "b2b", "supply", "ecommerce", "marketing"];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveModule } = useNavigation();

  const visibleModules = MODULES.filter((m) => BOTTOM_MODULES.includes(m.id));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe
                    bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          const isActive = location.pathname.startsWith(mod.path);
          return (
            <button
              key={mod.id}
              onClick={() => {
                setActiveModule(mod.id);
                navigate(mod.path);
              }}
              className={cn("bottom-nav-item", isActive && "bottom-nav-item-active")}
            >
              <Icon
                size={20}
                className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className={cn(isActive && "text-primary font-semibold")}>
                {mod.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
