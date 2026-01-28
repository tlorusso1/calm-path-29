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
  } = useFocusModes();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ModeSelector
        activeMode={activeMode}
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
          />
        ) : (
          <NoModeSelected lastCompletedMode={lastCompletedMode} />
        )}
      </main>
    </div>
  );
};

export default Index;
