import { useState, useEffect, useCallback } from 'react';
import { 
  FocusModeId, 
  FocusModeState, 
  FocusMode, 
  ChecklistItem,
  ModeStatus,
  FinanceiroStage,
  MODE_CONFIGS, 
  DEFAULT_CHECKLISTS,
  DEFAULT_FINANCEIRO_DATA
} from '@/types/focus-mode';

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

    // Reset daily modes if new day
    if (state.date !== today) {
      (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
        if (MODE_CONFIGS[id].frequency === 'daily') {
          updatedModes[id] = createDefaultMode(id);
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

    if (needsUpdate) {
      return {
        date: today,
        weekStart: currentWeekStart,
        activeMode: null,
        modes: updatedModes,
      };
    }
    
    return state;
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
      const newModes = { ...prev.modes };
      
      // Set previous active mode back to neutral if it wasn't completed
      if (prev.activeMode && newModes[prev.activeMode].status === 'in-progress') {
        newModes[prev.activeMode] = {
          ...newModes[prev.activeMode],
          status: 'neutral',
        };
      }
      
      // Set new active mode to in-progress
      if (modeId && newModes[modeId].status !== 'completed') {
        newModes[modeId] = {
          ...newModes[modeId],
          status: 'in-progress',
        };
      }
      
      return { ...prev, activeMode: modeId, modes: newModes };
    });
  }, []);

  const toggleItemComplete = useCallback((modeId: FocusModeId, itemId: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: prev.modes[modeId].items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        },
      },
    }));
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
    
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: [...prev.modes[modeId].items, newItem],
        },
      },
    }));
    
    return newItem;
  }, []);

  const removeItem = useCallback((modeId: FocusModeId, itemId: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        [modeId]: {
          ...prev.modes[modeId],
          items: prev.modes[modeId].items.filter(item => item.id !== itemId),
        },
      },
    }));
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
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: {
            ...prev.modes.financeiro.financeiroData!,
            ...data,
          },
        },
      },
    }));
  }, []);

  const addFinanceiroItem = useCallback((text: string) => {
    const newItem: ChecklistItem = {
      id: generateId(),
      text: text.trim(),
      completed: false,
    };
    
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: {
            ...prev.modes.financeiro.financeiroData!,
            itensVencimento: [...(prev.modes.financeiro.financeiroData?.itensVencimento || []), newItem],
          },
        },
      },
    }));
    
    return newItem;
  }, []);

  const toggleFinanceiroItemComplete = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: {
            ...prev.modes.financeiro.financeiroData!,
            itensVencimento: prev.modes.financeiro.financeiroData!.itensVencimento.map(item =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          },
        },
      },
    }));
  }, []);

  const setFinanceiroItemClassification = useCallback((itemId: string, classification: 'A' | 'B' | 'C') => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: {
            ...prev.modes.financeiro.financeiroData!,
            itensVencimento: prev.modes.financeiro.financeiroData!.itensVencimento.map(item =>
              item.id === itemId ? { ...item, classification } : item
            ),
          },
        },
      },
    }));
  }, []);

  const removeFinanceiroItem = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      modes: {
        ...prev.modes,
        financeiro: {
          ...prev.modes.financeiro,
          financeiroData: {
            ...prev.modes.financeiro.financeiroData!,
            itensVencimento: prev.modes.financeiro.financeiroData!.itensVencimento.filter(item => item.id !== itemId),
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
  };
}
