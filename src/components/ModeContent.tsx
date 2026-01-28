import { FocusMode, FocusModeId } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { FinanceiroMode } from '@/components/modes/FinanceiroMode';
import { MarketingMode } from '@/components/modes/MarketingMode';
import { SupplyChainMode } from '@/components/modes/SupplyChainMode';
import { PreReuniaoGeralMode } from '@/components/modes/PreReuniaoGeralMode';
import { PreReuniaoAdsMode } from '@/components/modes/PreReuniaoAdsMode';
import { PreReuniaoVerterMode } from '@/components/modes/PreReuniaoVerterMode';
import { BacklogMode } from '@/components/modes/BacklogMode';

interface ModeContentProps {
  mode: FocusMode;
  onComplete: () => void;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onSetDecision: (itemId: string, decision: string) => void;
  onSetNotes: (itemId: string, notes: string) => void;
  onAddItem: (text: string) => void;
  onRemoveItem: (itemId: string) => void;
}

export function ModeContent({
  mode,
  onComplete,
  onToggleItem,
  onSetClassification,
  onSetDecision,
  onSetNotes,
  onAddItem,
  onRemoveItem,
}: ModeContentProps) {
  const renderModeContent = () => {
    const commonProps = {
      mode,
      onToggleItem,
      onSetClassification,
      onSetDecision,
      onSetNotes,
      onAddItem,
      onRemoveItem,
    };

    switch (mode.id) {
      case 'financeiro':
        return <FinanceiroMode {...commonProps} />;
      case 'marketing':
        return <MarketingMode {...commonProps} />;
      case 'supplychain':
        return <SupplyChainMode {...commonProps} />;
      case 'pre-reuniao-geral':
        return <PreReuniaoGeralMode {...commonProps} />;
      case 'pre-reuniao-ads':
        return <PreReuniaoAdsMode {...commonProps} />;
      case 'pre-reuniao-verter':
        return <PreReuniaoVerterMode {...commonProps} />;
      case 'backlog':
        return <BacklogMode {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8">
      {/* Mode Header */}
      <div className="text-center space-y-2">
        <p className="text-3xl">{mode.icon}</p>
        <h1 className="text-xl font-semibold text-foreground">
          Você está no modo: {mode.title}
        </h1>
        <p className="text-sm text-muted-foreground italic">
          "{mode.fixedText}"
        </p>
      </div>

      {/* Mode-specific content */}
      <div className="flex-1">
        {renderModeContent()}
      </div>

      {/* Complete button */}
      <div className="pt-4 border-t border-border">
        <Button 
          onClick={onComplete}
          className="w-full h-12 text-base font-medium"
          variant="outline"
        >
          Concluído por agora
        </Button>
      </div>
    </div>
  );
}
