import { useState, useEffect, useCallback } from 'react';
import { 
  FocusModeId, 
  FocusModeState, 
  FocusMode, 
  ChecklistItem,
  MODE_CONFIGS, 
  DEFAULT_CHECKLISTS 
} from '@/types/focus-mode';

const FOCUS_MODES_KEY = 'focoagora_focus_modes';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function createDefaultMode(id: FocusModeId): FocusMode {
  const config = MODE_CONFIGS[id];
  const defaultItems = DEFAULT_CHECKLISTS[id];
  
  return {
    ...config,
    items: defaultItems.map(item => ({
      ...item,
      id: generateId(),
      completed: false,
    })),
  };
}

function createDefaultState(): FocusModeState {
  const modes = {} as Record<FocusModeId, FocusMode>;
  
  (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
    modes[id] = createDefaultMode(id);
  });
  
  return {
    date: getTodayDate(),
    activeMode: null,
    modes,
  };
}

function loadState(): FocusModeState {
  try {
    const stored = localStorage.getItem(FOCUS_MODES_KEY);
    const state = stored ? JSON.parse(stored) : null;
    
    // Reset if it's a new day
    if (!state || state.date !== getTodayDate()) {
      return createDefaultState();
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
    setState(prev => ({ ...prev, activeMode: modeId }));
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
  };
}
