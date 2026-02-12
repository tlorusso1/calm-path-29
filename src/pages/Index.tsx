import { useState, useEffect, useCallback } from "react";
import { useFocusModes } from "@/hooks/useFocusModes";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ModeSelector } from "@/components/ModeSelector";
import { ModeContent } from "@/components/ModeContent";
import { NoModeSelected } from "@/components/NoModeSelected";
import { LocalStorageMigration } from "@/components/LocalStorageMigration";
import { RitmoStatusBar, taskToMode } from "@/components/RitmoStatusBar";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import niceFoodsLogo from "@/assets/nice-foods-logo.png";
import { RitmoTaskId } from "@/types/focus-mode";

const FOCUS_MODES_KEY = "focoagora_focus_modes";
const PROJECTS_KEY = "focoagora_projects";

const Index = () => {
  const { signOut } = useAuth();
  const { canAccess } = useUserRole();
  const { theme, setTheme } = useTheme();
  const [showMigration, setShowMigration] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  const {
    activeMode,
    modes,
    lastCompletedMode,
    isLoading,
    flushSave,
    saveStatus,
    financeiroExports,
    prioridadeSemana,
    marketingExports,
    supplyExports,
    scoreNegocio,
    ritmoExpectativa,
    updateTimestamp,
    setActiveMode,
    toggleItemComplete,
    setItemClassification,
    setItemDecision,
    setItemNotes,
    addItem,
    removeItem,
    completeMode,
    // Financeiro
    updateFinanceiroData,
    addFinanceiroItem,
    toggleFinanceiroItemComplete,
    setFinanceiroItemClassification,
    removeFinanceiroItem,
    // Marketing
    updateMarketingData,
    // Supply Chain
    updateSupplyChainData,
    addSupplyItem,
    updateSupplyItem,
    removeSupplyItem,
    // Pre-Reunião Geral
    updatePreReuniaoGeralData,
    // Reunião Ads
    updateReuniaoAdsData,
    addReuniaoAdsAcao,
    removeReuniaoAdsAcao,
    // Tasks
    updateBacklogData,
    addBacklogTarefa,
    updateBacklogTarefa,
    removeBacklogTarefa,
    addBacklogIdeia,
    updateBacklogIdeia,
    removeBacklogIdeia,
    setTarefaEmFoco,
  } = useFocusModes();

  useEffect(() => {
    if (!isLoading && !migrationChecked) {
      const focusModesData = localStorage.getItem(FOCUS_MODES_KEY);
      const projectsData = localStorage.getItem(PROJECTS_KEY);
      if (focusModesData || projectsData) {
        setShowMigration(true);
      }
      setMigrationChecked(true);
    }
  }, [isLoading, migrationChecked]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (showMigration) {
    return <LocalStorageMigration onComplete={() => setShowMigration(false)} />;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={niceFoodsLogo} alt="NICE FOODS" className="h-8 object-contain dark:invert" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-foreground">NICE TASKS</h1>
              <p className="text-[10px] text-muted-foreground">Thiago Edition v1.0 Beta</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <RitmoStatusBar
        ritmo={ritmoExpectativa}
        onNavigateTo={(modeId, taskId) => {
          setActiveMode(modeId as any);

          // Scroll para o elemento específico após navegação
          if (taskId) {
            const { elementId } = taskToMode[taskId];
            setTimeout(() => {
              const element = document.getElementById(elementId);
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                // Highlight temporário
                element.classList.add("ring-2", "ring-primary", "ring-offset-2");
                setTimeout(() => {
                  element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                }, 2000);
              }
            }, 100);
          }
        }}
      />

      <ModeSelector activeMode={activeMode} modes={modes} onSelectMode={setActiveMode} canAccess={canAccess} />

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
        {activeMode ? (
          <ModeContent
            mode={modes[activeMode]}
            onComplete={() => completeMode(activeMode)}
            onToggleItem={(itemId) => toggleItemComplete(activeMode, itemId)}
            onSetClassification={(itemId, c) => setItemClassification(activeMode, itemId, c)}
            onSetDecision={(itemId, d) => setItemDecision(activeMode, itemId, d)}
            onSetNotes={(itemId, n) => setItemNotes(activeMode, itemId, n)}
            onAddItem={(text) => addItem(activeMode, text)}
            onRemoveItem={(itemId) => removeItem(activeMode, itemId)}
            // Persistência
            flushSave={flushSave}
            saveStatus={saveStatus}
            // Financeiro
            onUpdateFinanceiroData={updateFinanceiroData}
            onAddFinanceiroItem={addFinanceiroItem}
            onToggleFinanceiroItem={toggleFinanceiroItemComplete}
            onSetFinanceiroItemClassification={setFinanceiroItemClassification}
            onRemoveFinanceiroItem={removeFinanceiroItem}
            // Marketing
            onUpdateMarketingData={updateMarketingData}
            // Supply Chain
            onUpdateSupplyChainData={updateSupplyChainData}
            onAddSupplyItem={addSupplyItem}
            onUpdateSupplyItem={updateSupplyItem}
            onRemoveSupplyItem={removeSupplyItem}
            // Pre-Reunião Geral
            financeiroExports={financeiroExports}
            supplyExports={supplyExports}
            scoreNegocio={scoreNegocio}
            onUpdatePreReuniaoGeralData={updatePreReuniaoGeralData}
            // Reunião Ads
            prioridadeSemana={prioridadeSemana}
            marketingExports={marketingExports}
            onUpdateReuniaoAdsData={updateReuniaoAdsData}
            onAddReuniaoAdsAcao={addReuniaoAdsAcao}
            onRemoveReuniaoAdsAcao={removeReuniaoAdsAcao}
            // Tasks
            onUpdateBacklogData={updateBacklogData}
            onAddBacklogTarefa={addBacklogTarefa}
            onUpdateBacklogTarefa={updateBacklogTarefa}
            onRemoveBacklogTarefa={removeBacklogTarefa}
            onAddBacklogIdeia={addBacklogIdeia}
            onUpdateBacklogIdeia={updateBacklogIdeia}
            onRemoveBacklogIdeia={removeBacklogIdeia}
            onSetBacklogTarefaEmFoco={setTarefaEmFoco}
            ritmoExpectativa={ritmoExpectativa}
            onUpdateTimestamp={updateTimestamp}
          />
        ) : (
          <NoModeSelected lastCompletedMode={lastCompletedMode} ritmo={ritmoExpectativa} onNavigateTo={setActiveMode} />
        )}
      </main>
    </div>
  );
};

export default Index;
