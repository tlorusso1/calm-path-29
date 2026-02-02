import { FocusMode, FinanceiroStage, MarketingStage, SupplyChainStage, BacklogStage, BacklogTarefa, PreReuniaoGeralStage, ReuniaoAdsStage, ReuniaoAdsAcao, FinanceiroExports, MarketingExports, ScoreNegocio, ItemEstoque } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { FinanceiroMode } from '@/components/modes/FinanceiroMode';
import { MarketingMode } from '@/components/modes/MarketingMode';
import { SupplyChainMode } from '@/components/modes/SupplyChainMode';
import { PreReuniaoGeralMode } from '@/components/modes/PreReuniaoGeralMode';
import { PreReuniaoVerterMode } from '@/components/modes/PreReuniaoVerterMode';
import { ReuniaoAdsMode } from '@/components/modes/ReuniaoAdsMode';
import { TasksMode } from '@/components/modes/TasksMode';

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
  onAddSupplyItem?: (item: Omit<ItemEstoque, 'id'>) => void;
  onUpdateSupplyItem?: (id: string, data: Partial<ItemEstoque>) => void;
  onRemoveSupplyItem?: (id: string) => void;
  // Pre-Reunião Geral
  financeiroExports?: FinanceiroExports;
  scoreNegocio?: ScoreNegocio;
  onUpdatePreReuniaoGeralData?: (data: Partial<PreReuniaoGeralStage>) => void;
  // Reunião Ads
  prioridadeSemana?: string | null;
  marketingExports?: MarketingExports;
  onUpdateReuniaoAdsData?: (data: Partial<ReuniaoAdsStage>) => void;
  onAddReuniaoAdsAcao?: (acao: Omit<ReuniaoAdsAcao, 'id'>) => ReuniaoAdsAcao;
  onRemoveReuniaoAdsAcao?: (id: string) => void;
  // Backlog
  onUpdateBacklogData?: (data: Partial<BacklogStage>) => void;
  onAddBacklogTarefa?: (tarefa: Omit<BacklogTarefa, 'id'>) => void;
  onUpdateBacklogTarefa?: (id: string, data: Partial<BacklogTarefa>) => void;
  onRemoveBacklogTarefa?: (id: string) => void;
  onAddBacklogIdeia?: (texto: string) => void;
  onUpdateBacklogIdeia?: (id: string, texto: string) => void;
  onRemoveBacklogIdeia?: (id: string) => void;
  onSetBacklogTarefaEmFoco?: (id: string | null) => void;
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
  onAddSupplyItem,
  onUpdateSupplyItem,
  onRemoveSupplyItem,
  financeiroExports,
  scoreNegocio,
  onUpdatePreReuniaoGeralData,
  prioridadeSemana,
  marketingExports,
  onUpdateReuniaoAdsData,
  onAddReuniaoAdsAcao,
  onRemoveReuniaoAdsAcao,
  onUpdateBacklogData,
  onAddBacklogTarefa,
  onUpdateBacklogTarefa,
  onRemoveBacklogTarefa,
  onAddBacklogIdeia,
  onUpdateBacklogIdeia,
  onRemoveBacklogIdeia,
  onSetBacklogTarefaEmFoco,
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
            onAddItem={onAddSupplyItem!}
            onUpdateItem={onUpdateSupplyItem!}
            onRemoveItem={onRemoveSupplyItem!}
          />
        );
      case 'pre-reuniao-geral':
        return (
          <PreReuniaoGeralMode 
            mode={mode}
            financeiroExports={financeiroExports!}
            reuniaoAdsData={mode.reuniaoAdsData}
            scoreNegocio={scoreNegocio!}
            onUpdatePreReuniaoGeralData={onUpdatePreReuniaoGeralData!}
          />
        );
      case 'reuniao-ads':
        return (
          <ReuniaoAdsMode 
            mode={mode}
            financeiroExports={financeiroExports!}
            prioridadeSemana={prioridadeSemana ?? null}
            marketingExports={marketingExports!}
            scoreNegocio={scoreNegocio}
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
      case 'tasks':
        return (
          <TasksMode 
            mode={mode}
            onUpdateBacklogData={onUpdateBacklogData!}
            onAddTarefa={onAddBacklogTarefa!}
            onUpdateTarefa={onUpdateBacklogTarefa!}
            onRemoveTarefa={onRemoveBacklogTarefa!}
            onAddIdeia={onAddBacklogIdeia!}
            onUpdateIdeia={onUpdateBacklogIdeia!}
            onRemoveIdeia={onRemoveBacklogIdeia!}
            onSetTarefaEmFoco={onSetBacklogTarefaEmFoco!}
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
