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
  ReuniaoAdsStage,
  ReuniaoAdsAcao,
  FinanceiroExports,
  ItemEstoque,
  RitmoTimestamps,
  UserRitmoExpectativa,
  MODE_CONFIGS, 
  DEFAULT_CHECKLISTS,
  DEFAULT_FINANCEIRO_DATA,
  DEFAULT_MARKETING_DATA,
  DEFAULT_SUPPLYCHAIN_DATA,
  DEFAULT_BACKLOG_DATA,
  DEFAULT_PREREUNIAO_GERAL_DATA,
  DEFAULT_REUNIAO_ADS_DATA,
} from '@/types/focus-mode';
import {
  calculateFinanceiroStatus,
  calculateMarketingStatus,
  calculateSupplyChainStatus,
  calculateChecklistStatus,
  calculateModeStatus,
  calculatePreReuniaoGeralStatus,
  calculateReuniaoAdsStatus,
  calculateFinanceiroV2,
  calculateMarketingOrganico,
  parseCurrency,
  calcScoreNegocioV2,
  calculateSupplyExports,
} from '@/utils/modeStatusCalculator';
import { getRitmoExpectativa } from '@/utils/ritmoCalculator';
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

  if (id === 'tasks') {
    mode.backlogData = { ...DEFAULT_BACKLOG_DATA, tarefas: [], ideias: [] };
  }

  if (id === 'pre-reuniao-geral') {
    mode.preReuniaoGeralData = { ...DEFAULT_PREREUNIAO_GERAL_DATA };
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

interface ProcessResult {
  state: FocusModeState;
  shouldSaveSnapshot: boolean;
  prevWeekStart: string | null;
  hadRealData: boolean; // Track if loaded state had meaningful data
}

// Check if modes contain real user data (not just defaults)
function hasRealData(modes: FocusModeState['modes']): boolean {
  const finData = modes.financeiro?.financeiroData;
  const tasksData = modes.tasks?.backlogData;
  const supplyData = modes.supplychain?.supplyChainData;
  const marketingData = modes.marketing?.marketingData;
  
  // Check for any substantial data
  const hasFinanceiroBasico = !!(
    finData?.caixaAtual ||
    finData?.faturamentoMes ||
    finData?.contasFluxo?.length
  );
  
  // Check custos fixos (object with categories)
  const hasCustosFixos = !!(finData?.custosFixosDetalhados && (
    finData.custosFixosDetalhados.pessoas?.length ||
    finData.custosFixosDetalhados.software?.length ||
    finData.custosFixosDetalhados.marketing?.length ||
    finData.custosFixosDetalhados.servicos?.length ||
    finData.custosFixosDetalhados.armazenagem?.length
  ));
  
  // Check contas bancárias (contas, not contasBancarias)
  const hasContas = !!(finData?.contas && (
    finData.contas.itauNiceFoods?.saldo ||
    finData.contas.itauNiceEcom?.saldo ||
    finData.contas.asaas?.saldo ||
    finData.contas.mercadoPagoEcom?.saldo
  ));
  
  const hasFinanceiro = hasFinanceiroBasico || hasCustosFixos || hasContas;
  
  const hasTarefas = !!(
    tasksData?.tarefas?.length ||
    tasksData?.ideias?.length
  );
  
  const hasSupply = !!(
    supplyData?.itens?.length
  );
  
  const hasMarketing = !!(
    marketingData?.organico?.sessoesSemana ||
    marketingData?.organico?.pedidosSemana
  );
  
  return hasFinanceiro || hasTarefas || hasSupply || hasMarketing;
}

function processLoadedState(state: FocusModeState | null): ProcessResult {
  if (!state) {
    return {
      state: createDefaultState(),
      shouldSaveSnapshot: false,
      prevWeekStart: null,
      hadRealData: false,
    };
  }

  const today = getTodayDate();
  const currentWeekStart = getWeekStart();
  const hadRealData = hasRealData(state.modes);
  
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

  // Reset daily modes if new day (EXCEPT tasks which persists)
  if (state.date !== today) {
    (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
      if (MODE_CONFIGS[id].frequency === 'daily') {
        if (id === 'tasks') {
          // PROTEÇÃO: Garantir que tasks sempre tenha arrays válidos
          const existingTasks = state.modes.tasks?.backlogData;
          updatedModes[id] = {
            ...createDefaultMode(id),
            backlogData: {
              tempoDisponivelHoje: existingTasks?.tempoDisponivelHoje ?? 480,
              tarefas: Array.isArray(existingTasks?.tarefas) ? existingTasks.tarefas : [],
              ideias: Array.isArray(existingTasks?.ideias) ? existingTasks.ideias : [],
            },
          };
        } else if (id === 'financeiro') {
          // FINANCEIRO: Preservar TODOS os dados estruturais, resetar apenas checklist diário
          const existingFinanceiro = state.modes.financeiro?.financeiroData;
          
          // PROTEÇÃO CRÍTICA: Se tinha dados, preservar tudo
          if (existingFinanceiro?.contasFluxo?.length || 
              existingFinanceiro?.caixaAtual || 
              existingFinanceiro?.contas) {
            console.log('🔒 Preservando dados financeiros existentes no reset diário');
            updatedModes[id] = {
              ...updatedModes[id],
              financeiroData: {
                ...existingFinanceiro,
                // Apenas reset do checklist diário
                checklistDiario: {
                  atualizouCaixa: false,
                  olhouResultado: false,
                  decidiu: false,
                },
              },
            };
          } else {
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
          }
        } else {
          updatedModes[id] = createDefaultMode(id);
        }
        needsUpdate = true;
      }
    });
  }

  // Reset weekly modes if new week - SAVE SNAPSHOT FIRST
  // PROTEÇÃO: Verificar se realmente é uma nova semana E se tinha dados
  if (state.weekStart !== currentWeekStart) {
    shouldSaveSnapshot = hadRealData; // Only save snapshot if we had real data
    
    (Object.keys(MODE_CONFIGS) as FocusModeId[]).forEach(id => {
      if (MODE_CONFIGS[id].frequency === 'weekly') {
        // PROTEÇÃO ADICIONAL: Log detalhado de reset semanal
        console.log(`📅 Reset semanal do modo ${id} - semana ${state.weekStart} -> ${currentWeekStart}`);
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
      hadRealData,
    };
  }
  
  return {
    state: {
      ...state,
      modes: updatedModes,
    },
    shouldSaveSnapshot: false,
    prevWeekStart: null,
    hadRealData,
  };
}

// Helper function to save weekly snapshot with FULL BACKUP
async function saveWeeklySnapshot(
  userId: string,
  weekStart: string,
  modes: FocusModeState['modes']
) {
  const finExports = calculateFinanceiroV2(modes.financeiro.financeiroData);
  const preAds = (modes as any)['pre-reuniao-ads']?.preReuniaoAdsData;
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
    // NOVO: Backup completo de todos os modos para recuperação
    modes_full_backup: JSON.parse(JSON.stringify(modes)),
  };
  
  const { error } = await supabase.from('weekly_snapshots').upsert([snapshot], {
    onConflict: 'user_id,week_start'
  });
  
  if (error) {
    console.error('Error saving weekly snapshot:', error);
  } else {
    console.log('📸 Weekly snapshot saved with FULL BACKUP for week:', weekStart);
  }
}

export function useFocusModes() {
  const { user } = useAuth();
  const [state, setState] = useState<FocusModeState>(createDefaultState);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = React.useRef(false);
  const wasLoadedWithData = React.useRef(false); // Track if we loaded with real data

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
          
          // MIGRAÇÃO: backlog -> tasks
          // Se existe backlog com dados e tasks está vazio/inexistente, migrar
          const modesAny = loadedState.modes as any;
          if (modesAny.backlog?.backlogData && 
              (!loadedState.modes.tasks?.backlogData?.tarefas?.length)) {
            console.log('Migrando dados de backlog para tasks...', modesAny.backlog.backlogData);
            
            loadedState.modes.tasks = {
              ...loadedState.modes.tasks,
              ...createDefaultMode('tasks'),
              backlogData: modesAny.backlog.backlogData,
            };
            
            // Limpar backlog antigo para evitar confusão
            delete modesAny.backlog;
          }
          
          const result = processLoadedState(loadedState);
          
          // Track if we loaded with real data for save protection
          wasLoadedWithData.current = result.hadRealData;
          
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
    
    // 🔒 PROTEÇÃO ANTI-PERDA: Verificar se estamos tentando salvar dados vazios
    const currentHasData = hasRealData(state.modes);
    
    if (!currentHasData && wasLoadedWithData.current) {
      console.warn('⚠️ BLOQUEADO: Tentativa de salvar dados vazios quando havia dados carregados!');
      console.warn('Estado atual sem dados, mas wasLoadedWithData =', wasLoadedWithData.current);
      // NÃO SALVAR - isso protege contra resets acidentais
      return;
    }
    
    // Se agora temos dados, atualizar o flag
    if (currentHasData) {
      wasLoadedWithData.current = true;
    }
    
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
    } else {
      console.log('✅ Dados salvos com sucesso');
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
        // 🔒 PROTEÇÃO: Não salvar dados vazios via beacon também
        const currentHasData = hasRealData(state.modes);
        if (!currentHasData && wasLoadedWithData.current) {
          console.warn('⚠️ BEACON BLOQUEADO: Tentativa de salvar dados vazios');
          return;
        }
        
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
        console.log('📤 Dados salvos via beacon no unload');
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

  // ============= Tasks =============
  const updateBacklogData = useCallback((data: Partial<BacklogStage>) => {
    setState(prev => {
      // PROTEÇÃO: Garantir que backlogData nunca seja undefined
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
            backlogData: {
              ...currentBacklog,
              tarefas: (currentBacklog.tarefas || []).map(t =>
                t.id === id 
                  ? { 
                      ...t, 
                      ...data,
                      // Se completando, remove o foco automaticamente
                      emFoco: data.completed ? false : (data.emFoco ?? t.emFoco)
                    } 
                  : t
              ),
            },
          },
        },
      };
    });
  }, []);

  const setTarefaEmFoco = useCallback((id: string | null) => {
    setState(prev => {
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
            backlogData: {
              ...currentBacklog,
              tarefas: (currentBacklog.tarefas || []).map(t => ({
                ...t,
                emFoco: t.id === id, // Define foco na tarefa selecionada, remove das outras
              })),
            },
          },
        },
      };
    });
  }, []);

  const removeBacklogTarefa = useCallback((id: string) => {
    setState(prev => {
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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
      const currentBacklog = prev.modes.tasks.backlogData ?? {
        tempoDisponivelHoje: 480,
        tarefas: [],
        ideias: [],
      };
      
      return {
        ...prev,
        modes: {
          ...prev.modes,
          tasks: {
            ...prev.modes.tasks,
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

  // ============= Ritmo & Expectativa =============
  const updateTimestamp = useCallback((key: keyof RitmoTimestamps) => {
    setState(prev => ({
      ...prev,
      timestamps: {
        ...(prev.timestamps ?? {}),
        [key]: getTodayDate(),
      },
    }));
  }, []);

  const ritmoExpectativa = useMemo((): UserRitmoExpectativa => {
    return getRitmoExpectativa(state);
  }, [state]);

  return {
    activeMode: state.activeMode,
    modes: state.modes,
    lastCompletedMode: state.lastCompletedMode,
    isLoading,
    // Ritmo & Expectativa
    ritmoExpectativa,
    updateTimestamp,
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
    // Reunião Ads
    marketingExports,
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
    setTarefaEmFoco,
  };
}
