import { FocusMode, FinanceiroStage, MarketingStage, SupplyChainStage, BacklogStage, BacklogTarefa, PreReuniaoGeralStage, PreReuniaoAdsStage, ReuniaoAdsStage, ReuniaoAdsAcao, FinanceiroExports, MarketingExports } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { FinanceiroMode } from '@/components/modes/FinanceiroMode';
import { MarketingMode } from '@/components/modes/MarketingMode';
import { SupplyChainMode } from '@/components/modes/SupplyChainMode';
import { PreReuniaoGeralMode } from '@/components/modes/PreReuniaoGeralMode';
import { PreReuniaoAdsMode } from '@/components/modes/PreReuniaoAdsMode';
import { PreReuniaoVerterMode } from '@/components/modes/PreReuniaoVerterMode';
import { ReuniaoAdsMode } from '@/components/modes/ReuniaoAdsMode';
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
  // Financeiro
  onUpdateFinanceiroData?: (data: Partial<FinanceiroStage>) => void;
  onAddFinanceiroItem?: (text: string) => void;
  onToggleFinanceiroItem?: (itemId: string) => void;
  onSetFinanceiroItemClassification?: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onRemoveFinanceiroItem?: (itemId: string) => void;
  // Marketing
  onUpdateMarketingData?: (data: Partial<MarketingStage>) => void;
  // Supply Chain
  onUpdateSupplyChainData?: (data: Partial<SupplyChainStage>) => void;
  // Pre-Reunião Geral
  financeiroExports?: FinanceiroExports;
  onUpdatePreReuniaoGeralData?: (data: Partial<PreReuniaoGeralStage>) => void;
  // Pre-Reunião Ads
  prioridadeSemana?: string | null;
  marketingExports?: MarketingExports;
  onUpdatePreReuniaoAdsData?: (data: Partial<PreReuniaoAdsStage>) => void;
  // Reunião Ads
  onUpdateReuniaoAdsData?: (data: Partial<ReuniaoAdsStage>) => void;
  onAddReuniaoAdsAcao?: (acao: Omit<ReuniaoAdsAcao, 'id'>) => ReuniaoAdsAcao;
  onRemoveReuniaoAdsAcao?: (id: string) => void;
  // Backlog
  onUpdateBacklogData?: (data: Partial<BacklogStage>) => void;
  onAddBacklogTarefa?: (tarefa: Omit<BacklogTarefa, 'id'>) => void;
  onUpdateBacklogTarefa?: (id: string, data: Partial<BacklogTarefa>) => void;
  onRemoveBacklogTarefa?: (id: string) => void;
  onAddBacklogIdeia?: (texto: string) => void;
  onRemoveBacklogIdeia?: (id: string) => void;
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
  onUpdateFinanceiroData,
  onAddFinanceiroItem,
  onToggleFinanceiroItem,
  onSetFinanceiroItemClassification,
  onRemoveFinanceiroItem,
  onUpdateMarketingData,
  onUpdateSupplyChainData,
  financeiroExports,
  onUpdatePreReuniaoGeralData,
  prioridadeSemana,
  marketingExports,
  onUpdatePreReuniaoAdsData,
  onUpdateReuniaoAdsData,
  onAddReuniaoAdsAcao,
  onRemoveReuniaoAdsAcao,
  onUpdateBacklogData,
  onAddBacklogTarefa,
  onUpdateBacklogTarefa,
  onRemoveBacklogTarefa,
  onAddBacklogIdeia,
  onRemoveBacklogIdeia,
}: ModeContentProps) {
  const renderModeContent = () => {
    switch (mode.id) {
      case 'financeiro':
        return (
          <FinanceiroMode 
            mode={mode}
            onUpdateFinanceiroData={onUpdateFinanceiroData!}
          />
        );
      case 'marketing':
        return (
          <MarketingMode 
            mode={mode}
            onUpdateMarketingData={onUpdateMarketingData!}
          />
        );
      case 'supplychain':
        return (
          <SupplyChainMode 
            mode={mode}
            onUpdateSupplyChainData={onUpdateSupplyChainData!}
          />
        );
      case 'pre-reuniao-geral':
        return (
          <PreReuniaoGeralMode 
            mode={mode}
            financeiroExports={financeiroExports!}
            preReuniaoAdsData={mode.preReuniaoAdsData}
            onUpdatePreReuniaoGeralData={onUpdatePreReuniaoGeralData!}
          />
        );
      case 'pre-reuniao-ads':
        return (
          <PreReuniaoAdsMode 
            mode={mode}
            financeiroExports={financeiroExports!}
            prioridadeSemana={prioridadeSemana ?? null}
            marketingExports={marketingExports!}
            onUpdatePreReuniaoAdsData={onUpdatePreReuniaoAdsData!}
          />
        );
      case 'reuniao-ads':
        return (
          <ReuniaoAdsMode 
            mode={mode}
            onUpdateReuniaoAdsData={onUpdateReuniaoAdsData!}
            onAddAcao={onAddReuniaoAdsAcao!}
            onRemoveAcao={onRemoveReuniaoAdsAcao!}
          />
        );
      case 'pre-reuniao-verter':
        return (
          <PreReuniaoVerterMode 
            mode={mode}
            onToggleItem={onToggleItem}
            onSetClassification={onSetClassification}
            onSetDecision={onSetDecision}
            onSetNotes={onSetNotes}
          />
        );
      case 'backlog':
        return (
          <BacklogMode 
            mode={mode}
            onUpdateBacklogData={onUpdateBacklogData!}
            onAddTarefa={onAddBacklogTarefa!}
            onUpdateTarefa={onUpdateBacklogTarefa!}
            onRemoveTarefa={onRemoveBacklogTarefa!}
            onAddIdeia={onAddBacklogIdeia!}
            onRemoveIdeia={onRemoveBacklogIdeia!}
          />
        );
      default:
        return null;
    }
  };

  const frequencyLabel = mode.frequency === 'daily' ? 'diário' : 'semanal';

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-3xl">{mode.icon}</p>
        <h1 className="text-xl font-semibold text-foreground">
          Você está no modo: {mode.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          Modo {frequencyLabel}
        </p>
        <p className="text-sm text-muted-foreground italic">
          "{mode.fixedText}"
        </p>
      </div>

      <div className="flex-1">
        {renderModeContent()}
      </div>

      <div className="pt-4 border-t border-border">
        <Button 
          onClick={onComplete}
          className="w-full h-12 text-base font-medium"
          variant="outline"
        >
          ✓ Concluído por agora
        </Button>
      </div>
    </div>
  );
}
