import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { WeeklySnapshot } from '@/types/focus-mode';

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
