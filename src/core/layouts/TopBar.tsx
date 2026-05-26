import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, Menu } from "lucide-react";
import { MODULES } from "./modules";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
const birdLogo = "/icon-white.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useNavigation } from "../store/navigation";

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { setActiveModule } = useNavigation();

  const currentModule = MODULES.find((m) => location.pathname.startsWith(m.path));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 -ml-1">
            <Menu size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-[hsl(var(--sidebar-background))] border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[hsl(var(--sidebar-border))]">
            <img src="/logo-white.png" alt="NICE OS" className="h-7 object-contain" />
          </div>
          <nav className="px-2 py-3 space-y-0.5">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = location.pathname.startsWith(mod.path);
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod.id);
                    navigate(mod.path);
                  }}
                  className={cn("nav-item w-full", isActive && "nav-item-active")}
                >
                  <Icon size={16} className={cn("shrink-0", isActive ? "text-[hsl(var(--sidebar-primary))]" : "text-[hsl(var(--sidebar-foreground))]")} />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="px-2 py-3 border-t border-[hsl(var(--sidebar-border))] space-y-0.5">
            <button onClick={handleSignOut} className="nav-item w-full text-red-400">
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Module title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {currentModule && (
          <>
            <currentModule.icon size={16} className="text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">{currentModule.label}</span>
          </>
        )}
        {!currentModule && (
          <>
            <img src="/icon-white.png" alt="" className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">NICE OS</span>
          </>
        )}
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
    </header>
  );
}
