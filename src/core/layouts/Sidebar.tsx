import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, ChevronLeft, ChevronRight, Settings, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "../store/navigation";
import { MODULES } from "./modules";
import { supabase } from "@/integrations/supabase/client";
import { useModuleAccess } from "../hooks/useModuleAccess";
import birdLogo from "@/assets/bird-logo-white.png";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, setActiveModule } = useNavigation();
  const { canAccess } = useModuleAccess();

  const handleNav = (path: string, id: Parameters<typeof setActiveModule>[0]) => {
    setActiveModule(id);
    navigate(path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-200",
        "bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]",
        sidebarCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-5 border-b border-[hsl(var(--sidebar-border))]",
        sidebarCollapsed && "justify-center px-2"
      )}>
        <img src={birdLogo} alt="NICE BIRD" className="w-7 h-7 shrink-0" />
        {!sidebarCollapsed && (
          <div>
            <p className="text-[hsl(var(--sidebar-accent-foreground))] font-semibold text-sm leading-none">NICE BIRD</p>
            <p className="text-[hsl(var(--sidebar-foreground))] text-[10px] mt-0.5 leading-none">Operations OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {MODULES.filter((mod) => canAccess(mod.id)).map((mod) => {
          const Icon = mod.icon;
          const isActive = location.pathname.startsWith(mod.path);
          return (
            <button
              key={mod.id}
              onClick={() => handleNav(mod.path, mod.id)}
              className={cn(
                "nav-item w-full",
                isActive && "nav-item-active",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? mod.label : undefined}
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0",
                  isActive
                    ? "text-[hsl(var(--sidebar-primary))]"
                    : "text-[hsl(var(--sidebar-foreground))]"
                )}
              />
              {!sidebarCollapsed && (
                <span className={cn(isActive && "text-[hsl(var(--sidebar-accent-foreground))]")}>
                  {mod.label}
                </span>
              )}
              {isActive && !sidebarCollapsed && (
                <span className="nav-dot ml-auto w-1.5 h-1.5 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={cn(
        "px-2 py-3 border-t border-[hsl(var(--sidebar-border))] space-y-0.5",
        sidebarCollapsed && "flex flex-col items-center"
      )}>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="nav-item w-full"
          title="Alternar tema"
        >
          {theme === "dark"
            ? <Sun size={16} className="shrink-0" />
            : <Moon size={16} className="shrink-0" />
          }
          {!sidebarCollapsed && <span>Tema</span>}
        </button>

        <button
          onClick={() => navigate("/instalar")}
          className="nav-item w-full"
          title="Instalar app"
        >
          <Smartphone size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Instalar app</span>}
        </button>

        <button
          onClick={() => navigate("/configuracoes")}
          className="nav-item w-full"
          title="Configurações"
        >
          <Settings size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Configurações</span>}
        </button>

        <button
          onClick={handleSignOut}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Sair"
        >
          <LogOut size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-20 z-10",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--sidebar-border))]",
          "text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-accent-foreground))]",
          "transition-colors"
        )}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
