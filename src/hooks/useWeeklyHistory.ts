import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { WeeklySnapshot, HistoricoMedias } from '@/types/focus-mode';

export function useWeeklyHistory(weeks: number = 12) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WeeklySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('weekly_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(weeks);

      if (error) {
        console.error('Error fetching weekly history:', error);
      } else {
        setHistory((data as unknown as WeeklySnapshot[]) || []);
      }
    } catch (err) {
      console.error('Error fetching weekly history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, weeks]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, refetch: fetchHistory };
}

/**
 * Calcula as médias históricas das últimas 4 semanas
 * para comparação relativa do Score de Demanda
 */
export function calcularMediasHistoricas(
  snapshots: WeeklySnapshot[]
): HistoricoMedias {
  // Pegar últimas 4 semanas (excluindo a atual que é index 0)
  const ultimas4 = snapshots.slice(1, 5);
  
  if (ultimas4.length < 2) {
    return { 
      temDados: false, 
      scoreOrganico: 0, 
      sessoesSemana: 0, 
      pedidosSemana: 0 
    };
  }
  
  const media = (arr: number[]) => {
    const valid = arr.filter(v => v != null && !isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };
  
  return {
    temDados: true,
    scoreOrganico: media(ultimas4.map(s => s.score_organico || 0)),
    sessoesSemana: media(ultimas4.map(s => s.sessoes_semana || 0)),
    pedidosSemana: media(ultimas4.map(s => (s as any).pedidos_semana || 0)),
  };
}
