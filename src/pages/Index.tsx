import { useState, useEffect } from 'react';
import { useFocusModes } from '@/hooks/useFocusModes';
import { useAuth } from '@/contexts/AuthContext';
import { ModeSelector } from '@/components/ModeSelector';
import { ModeContent } from '@/components/ModeContent';
import { NoModeSelected } from '@/components/NoModeSelected';
import { LocalStorageMigration } from '@/components/LocalStorageMigration';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const FOCUS_MODES_KEY = 'focoagora_focus_modes';
const PROJECTS_KEY = 'focoagora_projects';

const Index = () => {
  const { signOut } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  const {
    activeMode,
    modes,
    lastCompletedMode,
    isLoading,
    financeiroExports,
    prioridadeSemana,
    marketingExports,
    scoreNegocio,
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
    // Pre-Reunião Geral
    updatePreReuniaoGeralData,
    // Pre-Reunião Ads
    updatePreReuniaoAdsData,
    // Reunião Ads
    updateReuniaoAdsData,
    addReuniaoAdsAcao,
    removeReuniaoAdsAcao,
    // Backlog
    updateBacklogData,
    addBacklogTarefa,
    updateBacklogTarefa,
    removeBacklogTarefa,
    addBacklogIdeia,
    removeBacklogIdeia,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-3 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <ModeSelector
        activeMode={activeMode}
        modes={modes}
        onSelectMode={setActiveMode}
      />

      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
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
            // Pre-Reunião Geral
            financeiroExports={financeiroExports}
            scoreNegocio={scoreNegocio}
            onUpdatePreReuniaoGeralData={updatePreReuniaoGeralData}
            // Pre-Reunião Ads
            prioridadeSemana={prioridadeSemana}
            marketingExports={marketingExports}
            onUpdatePreReuniaoAdsData={updatePreReuniaoAdsData}
            // Reunião Ads
            onUpdateReuniaoAdsData={updateReuniaoAdsData}
            onAddReuniaoAdsAcao={addReuniaoAdsAcao}
            onRemoveReuniaoAdsAcao={removeReuniaoAdsAcao}
            // Backlog
            onUpdateBacklogData={updateBacklogData}
            onAddBacklogTarefa={addBacklogTarefa}
            onUpdateBacklogTarefa={updateBacklogTarefa}
            onRemoveBacklogTarefa={removeBacklogTarefa}
            onAddBacklogIdeia={addBacklogIdeia}
            onRemoveBacklogIdeia={removeBacklogIdeia}
          />
        ) : (
          <NoModeSelected lastCompletedMode={lastCompletedMode} />
        )}
      </main>
    </div>
  );
};

export default Index;
