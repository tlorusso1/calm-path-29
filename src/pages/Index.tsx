import { useFocusModes } from '@/hooks/useFocusModes';
import { ModeSelector } from '@/components/ModeSelector';
import { ModeContent } from '@/components/ModeContent';
import { NoModeSelected } from '@/components/NoModeSelected';

const Index = () => {
  const {
    activeMode,
    modes,
    lastCompletedMode,
    setActiveMode,
    toggleItemComplete,
    setItemClassification,
    setItemDecision,
    setItemNotes,
    addItem,
    removeItem,
    completeMode,
    // Financeiro-specific
    updateFinanceiroData,
    addFinanceiroItem,
    toggleFinanceiroItemComplete,
    setFinanceiroItemClassification,
    removeFinanceiroItem,
    // Marketing-specific
    updateMarketingData,
    // Supply Chain-specific
    updateSupplyChainData,
    // Backlog-specific
    updateBacklogData,
    addBacklogTarefa,
    updateBacklogTarefa,
    removeBacklogTarefa,
    addBacklogIdeia,
    removeBacklogIdeia,
  } = useFocusModes();

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            // Financeiro-specific
            onUpdateFinanceiroData={updateFinanceiroData}
            onAddFinanceiroItem={addFinanceiroItem}
            onToggleFinanceiroItem={toggleFinanceiroItemComplete}
            onSetFinanceiroItemClassification={setFinanceiroItemClassification}
            onRemoveFinanceiroItem={removeFinanceiroItem}
            // Marketing-specific
            onUpdateMarketingData={updateMarketingData}
            // Supply Chain-specific
            onUpdateSupplyChainData={updateSupplyChainData}
            // Backlog-specific
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
