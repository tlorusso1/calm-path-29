import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  PreReuniaoGeralStage,
  PreReuniaoAdsStage,
  ReuniaoAdsStage,
  ReuniaoAdsAcao,
  FinanceiroExports,
  ItemEstoque,
  MODE_CONFIGS, 
  DEFAULT_CHECKLISTS,
  DEFAULT_FINANCEIRO_DATA,
  DEFAULT_MARKETING_DATA,
  DEFAULT_SUPPLYCHAIN_DATA,
  DEFAULT_BACKLOG_DATA,
  DEFAULT_PREREUNIAO_GERAL_DATA,
  DEFAULT_PREREUNIAO_ADS_DATA,
  DEFAULT_REUNIAO_ADS_DATA,
} from '@/types/focus-mode';
import {
  calculateFinanceiroStatus,
  calculateMarketingStatus,
  calculateSupplyChainStatus,
  calculateChecklistStatus,
  calculateModeStatus,
  calculatePreReuniaoGeralStatus,
  calculatePreReuniaoAdsStatus,
  calculateReuniaoAdsStatus,
  calculateFinanceiroV2,
  calculateMarketingOrganico,
  parseCurrency,
  calcScoreNegocioV2,
  calculateSupplyExports,
} from '@/utils/modeStatusCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const DEBOUNCE_MS = 1000;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
    mode.financeiroData = { ...DEFAULT_FINANCEIRO_DATA };
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

  if (id === 'pre-reuniao-geral') {
    mode.preReuniaoGeralData = { ...DEFAULT_PREREUNIAO_GERAL_DATA };
  }

  if (id === 'pre-reuniao-ads') {
    mode.preReuniaoAdsData = { ...DEFAULT_PREREUNIAO_ADS_DATA };
  }

  if (id === 'reuniao-ads') {
    mode.reuniaoAdsData = { ...DEFAULT_REUNIAO_ADS_DATA };
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

interface ProcessResult {
  state: FocusModeState;
  shouldSaveSnapshot: boolean;
  prevWeekStart: string | null;
}

function processLoadedState(state: FocusModeState | null): ProcessResult {
  if (!state) {
    return {
      state: createDefaultState(),
      shouldSaveSnapshot: false,
      prevWeekStart: null,
    };
  }

  const today = getTodayDate();
  const currentWeekStart = getWeekStart();
  
  let needsUpdate = false;
  let shouldSaveSnapshot = false;
  const prevWeekStart = state.weekStart;
  const updatedModes = { ...state.modes };

  // Ensure all modes exist (for new modes like reuniao-ads)
  (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
    if (!updatedModes[id]) {
      updatedModes[id] = createDefaultMode(id);
      needsUpdate = true;
    }
  });

  // Reset daily modes if new day (EXCEPT backlog which persists)
  if (state.date !== today) {
    (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
      if (MODE_CONFIGS[id].frequency === 'daily') {
        if (id === 'backlog') {
          // PROTEÇÃO: Garantir que backlog sempre tenha arrays válidos
          const existingBacklog = state.modes.backlog?.backlogData;
          updatedModes[id] = {
            ...createDefaultMode(id),
            backlogData: {
              tempoDisponivelHoje: existingBacklog?.tempoDisponivelHoje ?? 480,
              tarefas: Array.isArray(existingBacklog?.tarefas) ? existingBacklog.tarefas : [],
              ideias: Array.isArray(existingBacklog?.ideias) ? existingBacklog.ideias : [],
            },
          };
        } else if (id === 'financeiro') {
          // FINANCEIRO: Preservar dados estruturais, resetar apenas checklist diário
          const existingFinanceiro = state.modes.financeiro?.financeiroData;
          updatedModes[id] = {
            ...createDefaultMode(id),
            financeiroData: {
              ...existingFinanceiro,
              checklistDiario: {
                atualizouCaixa: false,
                olhouResultado: false,
                decidiu: false,
              },
            },
          };
        } else {
          updatedModes[id] = createDefaultMode(id);
        }
        needsUpdate = true;
      }
    });
  }

  // Reset weekly modes if new week - SAVE SNAPSHOT FIRST
  if (state.weekStart !== currentWeekStart) {
    shouldSaveSnapshot = true; // Flag to save before reset
    
    (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
      if (MODE_CONFIGS[id].frequency === 'weekly') {
        updatedModes[id] = createDefaultMode(id);
        needsUpdate = true;
      }
    });
  }

  // Recalculate status for all modes
  (Object.keys(updatedModes) as FocusModeId[]).forEach(id => {
    updatedModes[id] = {
      ...updatedModes[id],
      status: calculateModeStatus(updatedModes[id]),
    };
  });

  if (needsUpdate) {
    return {
      state: {
        date: today,
        weekStart: currentWeekStart,
        activeMode: null,
        modes: updatedModes,
      },
      shouldSaveSnapshot,
      prevWeekStart,
    };
  }
  
  return {
    state: {
      ...state,
      modes: updatedModes,
    },
    shouldSaveSnapshot: false,
    prevWeekStart: null,
  };
}

// Helper function to save weekly snapshot
async function saveWeeklySnapshot(
  userId: string,
  weekStart: string,
  modes: FocusModeState['modes']
) {
  const finExports = calculateFinanceiroV2(modes.financeiro.financeiroData);
  const preAds = modes['pre-reuniao-ads'].preReuniaoAdsData;
  const preGeral = modes['pre-reuniao-geral'].preReuniaoGeralData;
  const marketing = modes.marketing.marketingData;
  const organico = calculateMarketingOrganico(marketing?.organico);
  
  const snapshot = {
    user_id: userId,
    week_start: weekStart,
    caixa_livre_real: finExports.caixaLivreReal,
    status_financeiro: finExports.statusFinanceiro,
    score_financeiro: finExports.scoreFinanceiro,
    resultado_mes: finExports.resultadoMes,
    total_defasados: finExports.totalDefasados,
    ads_maximo: finExports.adsMaximoPermitido,
    roas_medio: parseFloat(preAds?.roasMedio7d || '0'),
    cpa_medio: parseCurrency(preAds?.cpaMedio || ''),
    ticket_medio: parseCurrency(preAds?.ticketMedio || ''),
    gasto_ads: parseCurrency(preAds?.gastoAdsAtual || ''),
    decisao_ads: preAds?.decisaoSemana ?? null,
    score_demanda: organico.scoreDemanda,
    status_demanda: organico.statusDemanda,
    score_sessoes: organico.scoreSessoes,
    sessoes_semana: parseCurrency(marketing?.organico?.sessoesSemana || ''),
    score_organico: organico.scoreOrganico,
    status_organico: organico.statusOrganico,
    prioridade_semana: preGeral?.decisaoSemana ?? null,
    registro_decisao: preGeral?.registroDecisao ?? null,
  };
  
  const { error } = await supabase.from('weekly_snapshots').upsert([snapshot], {
    onConflict: 'user_id,week_start'
  });
  
  if (error) {
    console.error('Error saving weekly snapshot:', error);
  } else {
    console.log('Weekly snapshot saved for week:', weekStart);
  }
}

export function useFocusModes() {
  const { user } = useAuth();
  const [state, setState] = useState<FocusModeState>(createDefaultState);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = React.useRef(false);

  // Load from Supabase when user is available
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('focus_mode_states')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading focus modes:', error);
          const result = processLoadedState(null);
          setState(result.state);
        } else if (data) {
          const loadedState: FocusModeState = {
            date: data.date,
            weekStart: data.week_start,
            activeMode: data.active_mode as FocusModeState['activeMode'],
            modes: data.modes as unknown as FocusModeState['modes'],
            lastCompletedMode: data.last_completed_mode as FocusModeState['lastCompletedMode'],
          };
          const result = processLoadedState(loadedState);
          
          // Save snapshot before resetting weekly data
          if (result.shouldSaveSnapshot && result.prevWeekStart) {
            await saveWeeklySnapshot(user.id, result.prevWeekStart, loadedState.modes);
          }
          
          setState(result.state);
        } else {
          const result = processLoadedState(null);
          setState(result.state);
        }
      } catch (err) {
        console.error('Error loading focus modes:', err);
        const result = processLoadedState(null);
        setState(result.state);
      } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    };

    loadFromSupabase();
  }, [user]);

  // Helper function to build and save payload
  const saveToSupabase = useCallback(async () => {
    if (!user || !initialLoadDone.current) return;
    
    const payload = {
      user_id: user.id,
      date: state.date,
      week_start: state.weekStart,
      active_mode: state.activeMode,
      modes: JSON.parse(JSON.stringify(state.modes)) as Json,
      last_completed_mode: state.lastCompletedMode,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('focus_mode_states')
      .upsert([payload], { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving focus modes:', error);
    }
  }, [user, state]);

  // Save to Supabase with debounce
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(saveToSupabase, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state, user, saveToSupabase]);

  // Flush immediately on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && initialLoadDone.current) {
        // Cancel pending debounce
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        // Save immediately using sendBeacon for reliability
        const payload = {
          user_id: user.id,
          date: state.date,
          week_start: state.weekStart,
          active_mode: state.activeMode,
          modes: JSON.parse(JSON.stringify(state.modes)),
          last_completed_mode: state.lastCompletedMode,
          updated_at: new Date().toISOString(),
        };
        
        // Use sendBeacon for guaranteed delivery on page close
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/focus_mode_states?on_conflict=user_id`;
        const headers = {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        };
        
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, state]);

  // ============= Financeiro Exports (para outros modos) =============
  const getFinanceiroExports = useCallback((): FinanceiroExports => {
    return calculateFinanceiroV2(state.modes.financeiro.financeiroData);
  }, [state.modes.financeiro.financeiroData]);

  const financeiroExports = useMemo(() => getFinanceiroExports(), [getFinanceiroExports]);

  // ============= Marketing Exports (para Pre-Reunião Ads) =============
  const marketingExports = useMemo(() => {
    const marketing = state.modes.marketing?.marketingData;
    return calculateMarketingOrganico(marketing?.organico);
  }, [state.modes.marketing?.marketingData]);

  // ============= Supply Exports (para Score e Pre-Reunião Geral) =============
  const supplyExports = useMemo(() => {
    const supplyData = state.modes.supplychain?.supplyChainData;
    if (!supplyData || !supplyData.itens || supplyData.itens.length === 0) return null;
    return calculateSupplyExports(supplyData);
  }, [state.modes.supplychain?.supplyChainData]);

  // ============= Score do Negócio (V2 com Supply Exports) =============
  const scoreNegocio = useMemo(() => {
    return calcScoreNegocioV2(financeiroExports, supplyExports, marketingExports);
  }, [financeiroExports, supplyExports, marketingExports]);

  // ============= Prioridade da Semana (de Pre-Reuniao Geral) =============
  const prioridadeSemana = useMemo(() => 
    state.modes['pre-reuniao-geral']?.preReuniaoGeralData?.decisaoSemana ?? null,
    [state.modes['pre-reuniao-geral']?.preReuniaoGeralData?.decisaoSemana]
  );

  // ============= Ações Básicas =============
  const setActiveMode = useCallback((modeId: FocusModeId | null) => {
    setState(prev => ({ ...prev, activeMode: modeId }));
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

  // ============= Financeiro V2 =============
  const updateFinanceiroData = useCallback((data: Partial<FinanceiroStage>) => {
    setState(prev => {
      const currentData = prev.modes.financeiro.financeiroData ?? DEFAULT_FINANCEIRO_DATA;
      const newFinanceiroData: FinanceiroStage = {
        ...currentData,
        ...data,
        custosDefasados: {
          ...currentData.custosDefasados,
          ...data.custosDefasados,
        },
        checklistDiario: {
          ...currentData.checklistDiario,
          ...data.checklistDiario,
        },
        checklistSemanal: {
          ...currentData.checklistSemanal,
          ...data.checklistSemanal,
        },
        checklistMensal: {
          ...currentData.checklistMensal,
          ...data.checklistMensal,
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
        itensVencimento: (currentData.itensVencimento || []).map(item =>
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
        itensVencimento: (currentData.itensVencimento || []).map(item =>
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
        itensVencimento: (currentData.itensVencimento || []).filter(item => item.id !== itemId),
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

  // ============= Marketing =============
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

  // ============= Supply Chain V2 =============
  const updateSupplyChainData = useCallback((data: Partial<SupplyChainStage>) => {
    setState(prev => {
      const currentData = prev.modes.supplychain.supplyChainData ?? DEFAULT_SUPPLYCHAIN_DATA;
      const newSupplyChainData = {
        ...currentData,
        ...data,
        itens: data.itens ?? currentData.itens ?? [],
        semanal: {
          ...(currentData.semanal ?? DEFAULT_SUPPLYCHAIN_DATA.semanal),
          ...(data.semanal ?? {}),
        },
        quinzenal: {
          ...(currentData.quinzenal ?? DEFAULT_SUPPLYCHAIN_DATA.quinzenal),
          ...(data.quinzenal ?? {}),
        },
        mensal: {
          ...(currentData.mensal ?? DEFAULT_SUPPLYCHAIN_DATA.mensal),
          ...(data.mensal ?? {}),
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

  const addSupplyItem = useCallback((item: Omit<ItemEstoque, 'id'>) => {
    const newItem: ItemEstoque = {
      ...item,
      id: generateId(),
    };
    
    setState(prev => {
      const currentData = prev.modes.supplychain.supplyChainData ?? DEFAULT_SUPPLYCHAIN_DATA;
      const currentItens = currentData.itens ?? [];
      const newData = {
        ...currentData,
        itens: [...currentItens, newItem],
      };
      const newStatus = calculateSupplyChainStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          supplychain: {
            ...prev.modes.supplychain,
            supplyChainData: newData,
            status: newStatus,
          },
        },
      };
    });
    
    return newItem;
  }, []);

  const updateSupplyItem = useCallback((id: string, data: Partial<ItemEstoque>) => {
    setState(prev => {
      const currentData = prev.modes.supplychain.supplyChainData ?? DEFAULT_SUPPLYCHAIN_DATA;
      const currentItens = currentData.itens ?? [];
      const newData = {
        ...currentData,
        itens: currentItens.map(item =>
          item.id === id ? { ...item, ...data } : item
        ),
      };
      const newStatus = calculateSupplyChainStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          supplychain: {
            ...prev.modes.supplychain,
            supplyChainData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const removeSupplyItem = useCallback((id: string) => {
    setState(prev => {
      const currentData = prev.modes.supplychain.supplyChainData ?? DEFAULT_SUPPLYCHAIN_DATA;
      const currentItens = currentData.itens ?? [];
      const newData = {
        ...currentData,
        itens: currentItens.filter(item => item.id !== id),
      };
      const newStatus = calculateSupplyChainStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          supplychain: {
            ...prev.modes.supplychain,
            supplyChainData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // ============= Pre-Reunião Geral =============
  const updatePreReuniaoGeralData = useCallback((data: Partial<PreReuniaoGeralStage>) => {
    setState(prev => {
      const currentData = prev.modes['pre-reuniao-geral'].preReuniaoGeralData ?? DEFAULT_PREREUNIAO_GERAL_DATA;
      const newData: PreReuniaoGeralStage = {
        ...currentData,
        ...data,
        estoque: {
          ...currentData.estoque,
          ...data.estoque,
        },
      };
      const newStatus = calculatePreReuniaoGeralStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          'pre-reuniao-geral': {
            ...prev.modes['pre-reuniao-geral'],
            preReuniaoGeralData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // ============= Pre-Reunião Ads =============
  const updatePreReuniaoAdsData = useCallback((data: Partial<PreReuniaoAdsStage>) => {
    setState(prev => {
      const currentData = prev.modes['pre-reuniao-ads'].preReuniaoAdsData ?? DEFAULT_PREREUNIAO_ADS_DATA;
      const newData: PreReuniaoAdsStage = {
        ...currentData,
        ...data,
      };
      const newStatus = calculatePreReuniaoAdsStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          'pre-reuniao-ads': {
            ...prev.modes['pre-reuniao-ads'],
            preReuniaoAdsData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // ============= Reunião Ads =============
  const updateReuniaoAdsData = useCallback((data: Partial<ReuniaoAdsStage>) => {
    setState(prev => {
      const currentData = prev.modes['reuniao-ads'].reuniaoAdsData ?? DEFAULT_REUNIAO_ADS_DATA;
      const newData: ReuniaoAdsStage = {
        ...currentData,
        ...data,
        metricasMeta: {
          ...currentData.metricasMeta,
          ...data.metricasMeta,
        },
        metricasGoogle: {
          ...currentData.metricasGoogle,
          ...data.metricasGoogle,
        },
      };
      const newStatus = calculateReuniaoAdsStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          'reuniao-ads': {
            ...prev.modes['reuniao-ads'],
            reuniaoAdsData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  const addReuniaoAdsAcao = useCallback((acao: Omit<ReuniaoAdsAcao, 'id'>) => {
    const newAcao: ReuniaoAdsAcao = {
      ...acao,
      id: generateId(),
    };
    
    setState(prev => {
      const currentData = prev.modes['reuniao-ads'].reuniaoAdsData ?? DEFAULT_REUNIAO_ADS_DATA;
      const newData = {
        ...currentData,
        acoes: [...currentData.acoes, newAcao],
      };
      const newStatus = calculateReuniaoAdsStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          'reuniao-ads': {
            ...prev.modes['reuniao-ads'],
            reuniaoAdsData: newData,
            status: newStatus,
          },
        },
      };
    });
    
    return newAcao;
  }, []);

  const removeReuniaoAdsAcao = useCallback((id: string) => {
    setState(prev => {
      const currentData = prev.modes['reuniao-ads'].reuniaoAdsData ?? DEFAULT_REUNIAO_ADS_DATA;
      const newData = {
        ...currentData,
        acoes: currentData.acoes.filter(a => a.id !== id),
      };
      const newStatus = calculateReuniaoAdsStatus(newData);
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          'reuniao-ads': {
            ...prev.modes['reuniao-ads'],
            reuniaoAdsData: newData,
            status: newStatus,
          },
        },
      };
    });
  }, []);

  // ============= Backlog =============
  const updateBacklogData = useCallback((data: Partial<BacklogStage>) => {
    setState(prev => {
      // PROTEÇÃO: Garantir que backlogData nunca seja undefined
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              // Preserva valores existentes, só atualiza o que veio
              tempoDisponivelHoje: data.tempoDisponivelHoje ?? currentBacklog.tempoDisponivelHoje,
              tarefas: data.tarefas ?? currentBacklog.tarefas,
              ideias: data.ideias ?? currentBacklog.ideias,
            },
          },
        },
      };
    });
  }, []);

  const addBacklogTarefa = useCallback((tarefa: Omit<BacklogTarefa, 'id'>) => {
    const newTarefa: BacklogTarefa = {
      ...tarefa,
      id: generateId(),
    };
    
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              tarefas: [...(currentBacklog.tarefas || []), newTarefa],
            },
          },
        },
      };
    });
    
    return newTarefa;
  }, []);

  const updateBacklogTarefa = useCallback((id: string, data: Partial<BacklogTarefa>) => {
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              tarefas: (currentBacklog.tarefas || []).map(t =>
                t.id === id ? { ...t, ...data } : t
              ),
            },
          },
        },
      };
    });
  }, []);

  const removeBacklogTarefa = useCallback((id: string) => {
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              tarefas: (currentBacklog.tarefas || []).filter(t => t.id !== id),
            },
          },
        },
      };
    });
  }, []);

  const addBacklogIdeia = useCallback((texto: string) => {
    const newIdeia = {
      id: generateId(),
      texto: texto.trim(),
    };
    
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              ideias: [...(currentBacklog.ideias || []), newIdeia],
            },
          },
        },
      };
    });
    
    return newIdeia;
  }, []);

  const removeBacklogIdeia = useCallback((id: string) => {
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              ideias: (currentBacklog.ideias || []).filter(i => i.id !== id),
            },
          },
        },
      };
    });
  }, []);

  const updateBacklogIdeia = useCallback((id: string, texto: string) => {
    setState(prev => {
      const currentBacklog = prev.modes.backlog.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          backlog: {
            ...prev.modes.backlog,
            backlogData: {
              ...currentBacklog,
              ideias: (currentBacklog.ideias || []).map(ideia =>
                ideia.id === id ? { ...ideia, texto } : ideia
              ),
            },
          },
        },
      };
    });
  }, []);


  return {
    activeMode: state.activeMode,
    modes: state.modes,
    lastCompletedMode: state.lastCompletedMode,
    isLoading,
    // Exports para outros modos
    financeiroExports,
    supplyExports,
    prioridadeSemana,
    scoreNegocio,
    // Ações básicas
    setActiveMode,
    toggleItemComplete,
    setItemClassification,
    setItemDecision,
    setItemNotes,
    addItem,
    removeItem,
    completeMode,
    resetMode,
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
    // Pre-Reunião Ads
    marketingExports,
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
    updateBacklogIdeia,
    removeBacklogIdeia,
  };
}
