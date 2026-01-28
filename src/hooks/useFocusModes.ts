import { useState, useEffect, useCallback } from 'react';
import { 
  FocusModeId, 
  FocusModeState, 
  FocusMode, 
  ChecklistItem,
  ModeStatus,
  FinanceiroStage,
  MarketingStage,
  SupplyChainStage,
  BacklogStage,
  BacklogTarefa,
  MODE_CONFIGS, 
  DEFAULT_CHECKLISTS,
  DEFAULT_FINANCEIRO_DATA,
  DEFAULT_MARKETING_DATA,
  DEFAULT_SUPPLYCHAIN_DATA,
  DEFAULT_BACKLOG_DATA
} from '@/types/focus-mode';
import {
  calculateFinanceiroStatus,
  calculateMarketingStatus,
  calculateSupplyChainStatus,
  calculateChecklistStatus,
  calculateModeStatus,
} from '@/utils/modeStatusCalculator';

const FOCUS_MODES_KEY = 'focoagora_focus_modes';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function createDefaultMode(id: FocusModeId): FocusMode {
  const config = MODE_CONFIGS[id];
  const defaultItems = DEFAULT_CHECKLISTS[id];
  
  const mode: FocusMode = {
    ...config,
    status: 'neutral' as ModeStatus,
    items: defaultItems.map(item => ({
      ...item,
      id: generateId(),
      completed: false,
    })),
  };

  if (id === 'financeiro') {
    mode.financeiroData = { ...DEFAULT_FINANCEIRO_DATA, itensVencimento: [] };
  }
  
  if (id === 'marketing') {
    mode.marketingData = { ...DEFAULT_MARKETING_DATA };
  }
  
  if (id === 'supplychain') {
    mode.supplyChainData = { ...DEFAULT_SUPPLYCHAIN_DATA };
  }

  if (id === 'backlog') {
    mode.backlogData = { ...DEFAULT_BACKLOG_DATA, tarefas: [], ideias: [] };
  }

  return mode;
}

function createDefaultState(): FocusModeState {
  const modes = {} as Record<FocusModeId, FocusMode>;
  
  (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
    modes[id] = createDefaultMode(id);
  });
  
  return {
    date: getTodayDate(),
    weekStart: getWeekStart(),
    activeMode: null,
    modes,
  };
}

function loadState(): FocusModeState {
  try {
    const stored = localStorage.getItem(FOCUS_MODES_KEY);
    const state: FocusModeState | null = stored ? JSON.parse(stored) : null;
    
    if (!state) {
      return createDefaultState();
    }

    const today = getTodayDate();
    const currentWeekStart = getWeekStart();
    
    let needsUpdate = false;
    const updatedModes = { ...state.modes };

    // Reset daily modes if new day (EXCEPT backlog which persists)
    if (state.date !== today) {
      (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
        if (MODE_CONFIGS[id].frequency === 'daily') {
          if (id === 'backlog') {
            // Preserve backlog data, only reset status
            updatedModes[id] = {
              ...createDefaultMode(id),
              backlogData: state.modes.backlog?.backlogData ?? { ...DEFAULT_BACKLOG_DATA, tarefas: [], ideias: [] },
            };
          } else {
            updatedModes[id] = createDefaultMode(id);
          }
          needsUpdate = true;
        }
      });
    }

    // Reset weekly modes if new week
    if (state.weekStart !== currentWeekStart) {
      (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
        if (MODE_CONFIGS[id].frequency === 'weekly') {
          updatedModes[id] = createDefaultMode(id);
          needsUpdate = true;
        }
      });
    }

    // Recalculate status for all modes based on their data
    (Object.keys(updatedModes) as FocusModeId[]).forEach(id => {
      updatedModes[id] = {
        ...updatedModes[id],
        status: calculateModeStatus(updatedModes[id]),
      };
    });

    if (needsUpdate) {
      return {
        date: today,
        weekStart: currentWeekStart,
        activeMode: null,
        modes: updatedModes,
      };
    }
    
    return {
      ...state,
      modes: updatedModes,
    };
  } catch {
    return createDefaultState();
  }
}

export function useFocusModes() {
  const [state, setState] = useState<FocusModeState>(loadState);

  // Persist state
  useEffect(() => {
    localStorage.setItem(FOCUS_MODES_KEY, JSON.stringify(state));
  }, [state]);

  const setActiveMode = useCallback((modeId: FocusModeId | null) => {
    setState(prev => {
      return { ...prev, activeMode: modeId };
    });
  }, []);

  const toggleItemComplete = useCallback((modeId: FocusModeId, itemId: string) => {
    setState(prev => {
      const updatedItems = prev.modes[modeId].items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      const newStatus = calculateChecklistStatus(updatedItems);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          [modeId]: {
            ...prev.modes[modeId],
            items: updatedItems,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const setItemClassification = useCallback((modeId: FocusModeId, itemId: string, classification: 'A' | 'B' | 'C') => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: prev.modes[modeId].items.map(item =>
            item.id === itemId ? { ...item, classification } : item
          ),
        },
      },
    }));
  }, []);

  const setItemDecision = useCallback((modeId: FocusModeId, itemId: string, decision: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: prev.modes[modeId].items.map(item =>
            item.id === itemId ? { ...item, decision } : item
          ),
        },
      },
    }));
  }, []);

  const setItemNotes = useCallback((modeId: FocusModeId, itemId: string, notes: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: prev.modes[modeId].items.map(item =>
            item.id === itemId ? { ...item, notes } : item
          ),
        },
      },
    }));
  }, []);

  const addItem = useCallback((modeId: FocusModeId, text: string) => {
    const newItem: ChecklistItem = {
      id: generateId(),
      text: text.trim(),
      completed: false,
    };
    
    setState(prev => {
      const updatedItems = [...prev.modes[modeId].items, newItem];
      const newStatus = calculateChecklistStatus(updatedItems);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          [modeId]: {
            ...prev.modes[modeId],
            items: updatedItems,
            status: newStatus,
          },
        },
      };
    });
    
    return newItem;
  }, []);

  const removeItem = useCallback((modeId: FocusModeId, itemId: string) => {
    setState(prev => {
      const updatedItems = prev.modes[modeId].items.filter(item => item.id !== itemId);
      const newStatus = calculateChecklistStatus(updatedItems);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          [modeId]: {
            ...prev.modes[modeId],
            items: updatedItems,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const completeMode = useCallback((modeId: FocusModeId) => {
    setState(prev => ({
      ...prev,
      activeMode: null,
      lastCompletedMode: modeId,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          status: 'completed' as ModeStatus,
          completedAt: new Date().toISOString(),
        },
      },
    }));
  }, []);

  const resetMode = useCallback((modeId: FocusModeId) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: createDefaultMode(modeId),
      },
    }));
  }, []);

  // Financeiro-specific functions
  const updateFinanceiroData = useCallback((data: Partial<FinanceiroStage>) => {
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData = {
        ...currentData,
        ...data,
        vencimentos: {
          ...currentData.vencimentos,
          ...data.vencimentos,
        },
      };
      const newStatus = calculateFinanceiroStatus(newFinanceiroData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          financeiro: {
            ...prev.modes.financeiro,
            financeiroData: newFinanceiroData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const addFinanceiroItem = useCallback((text: string) => {
    const newItem: ChecklistItem = {
      id: generateId(),
      text: text.trim(),
      completed: false,
    };
    
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData = {
        ...currentData,
        itensVencimento: [...(currentData.itensVencimento || []), newItem],
      };
      const newStatus = calculateFinanceiroStatus(newFinanceiroData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          financeiro: {
            ...prev.modes.financeiro,
            financeiroData: newFinanceiroData,
            status: newStatus,
          },
        },
      };
    });
    
    return newItem;
  }, []);

  const toggleFinanceiroItemComplete = useCallback((itemId: string) => {
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData = {
        ...currentData,
        itensVencimento: currentData.itensVencimento.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
      const newStatus = calculateFinanceiroStatus(newFinanceiroData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          financeiro: {
            ...prev.modes.financeiro,
            financeiroData: newFinanceiroData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const setFinanceiroItemClassification = useCallback((itemId: string, classification: 'A' | 'B' | 'C') => {
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData = {
        ...currentData,
        itensVencimento: currentData.itensVencimento.map(item =>
          item.id === itemId ? { ...item, classification } : item
        ),
      };
      const newStatus = calculateFinanceiroStatus(newFinanceiroData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          financeiro: {
            ...prev.modes.financeiro,
            financeiroData: newFinanceiroData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const removeFinanceiroItem = useCallback((itemId: string) => {
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData = {
        ...currentData,
        itensVencimento: currentData.itensVencimento.filter(item => item.id !== itemId),
      };
      const newStatus = calculateFinanceiroStatus(newFinanceiroData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          financeiro: {
            ...prev.modes.financeiro,
            financeiroData: newFinanceiroData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // Marketing-specific functions
  const updateMarketingData = useCallback((data: Partial<MarketingStage>) => {
    setState(prev => {
      const currentData = prev.modes.marketing.marketingData ?? DEFAULT_MARKETING_DATA;
      const newMarketingData = {
        ...currentData,
        ...data,
        verificacoes: {
          ...currentData.verificacoes,
          ...data.verificacoes,
        },
      };
      const newStatus = calculateMarketingStatus(newMarketingData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          marketing: {
            ...prev.modes.marketing,
            marketingData: newMarketingData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // Supply Chain-specific functions
  const updateSupplyChainData = useCallback((data: Partial<SupplyChainStage>) => {
    setState(prev => {
      const currentData = prev.modes.supplychain.supplyChainData ?? DEFAULT_SUPPLYCHAIN_DATA;
      const newSupplyChainData = {
        ...currentData,
        ...data,
        semanal: {
          ...currentData.semanal,
          ...data.semanal,
        },
        quinzenal: {
          ...currentData.quinzenal,
          ...data.quinzenal,
        },
        mensal: {
          ...currentData.mensal,
          ...data.mensal,
        },
      };
      const newStatus = calculateSupplyChainStatus(newSupplyChainData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          supplychain: {
            ...prev.modes.supplychain,
            supplyChainData: newSupplyChainData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // Backlog-specific functions
  const updateBacklogData = useCallback((data: Partial<BacklogStage>) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            ...data,
          },
        },
      },
    }));
  }, []);

  const addBacklogTarefa = useCallback((tarefa: Omit<BacklogTarefa, 'id'>) => {
    const newTarefa: BacklogTarefa = {
      ...tarefa,
      id: generateId(),
    };
    
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            tarefas: [...(prev.modes.backlog.backlogData?.tarefas || []), newTarefa],
          },
        },
      },
    }));
    
    return newTarefa;
  }, []);

  const updateBacklogTarefa = useCallback((id: string, data: Partial<BacklogTarefa>) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            tarefas: prev.modes.backlog.backlogData!.tarefas.map(t =>
              t.id === id ? { ...t, ...data } : t
            ),
          },
        },
      },
    }));
  }, []);

  const removeBacklogTarefa = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            tarefas: prev.modes.backlog.backlogData!.tarefas.filter(t => t.id !== id),
          },
        },
      },
    }));
  }, []);

  const addBacklogIdeia = useCallback((texto: string) => {
    const newIdeia = {
      id: generateId(),
      texto: texto.trim(),
    };
    
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            ideias: [...(prev.modes.backlog.backlogData?.ideias || []), newIdeia],
          },
        },
      },
    }));
    
    return newIdeia;
  }, []);

  const removeBacklogIdeia = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        backlog: {
          ...prev.modes.backlog,
          backlogData: {
            ...prev.modes.backlog.backlogData!,
            ideias: prev.modes.backlog.backlogData!.ideias.filter(i => i.id !== id),
          },
        },
      },
    }));
  }, []);

  return {
    activeMode: state.activeMode,
    modes: state.modes,
    lastCompletedMode: state.lastCompletedMode,
    setActiveMode,
    toggleItemComplete,
    setItemClassification,
    setItemDecision,
    setItemNotes,
    addItem,
    removeItem,
    completeMode,
    resetMode,
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
  };
}
