import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FocusModeState } from '@/types/focus-mode';
import { Project } from '@/types/task';
import type { Json } from '@/integrations/supabase/types';

const DEBOUNCE_MS = 1000;

export function useSupabaseFocusModesSync(
  state: FocusModeState,
  onLoad: (state: FocusModeState) => void
) {
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Load data from Supabase on mount
  useEffect(() => {
    if (!user || initialLoadDone.current) return;

    const loadFromSupabase = async () => {
      const { data, error } = await supabase
        .from('focus_mode_states')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading focus modes:', error);
        return;
      }

      if (data) {
        const loadedState: FocusModeState = {
          date: data.date,
          weekStart: data.week_start,
          activeMode: data.active_mode as FocusModeState['activeMode'],
          modes: data.modes as unknown as FocusModeState['modes'],
          lastCompletedMode: data.last_completed_mode as FocusModeState['lastCompletedMode'],
        };
        onLoad(loadedState);
      }
      initialLoadDone.current = true;
    };

    loadFromSupabase();
  }, [user, onLoad]);

  // Save to Supabase with debounce
  const saveToSupabase = useCallback(async (stateToSave: FocusModeState) => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      date: stateToSave.date,
      week_start: stateToSave.weekStart,
      active_mode: stateToSave.activeMode,
      modes: JSON.parse(JSON.stringify(stateToSave.modes)) as Json,
      last_completed_mode: stateToSave.lastCompletedMode,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('focus_mode_states')
      .upsert([payload], { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving focus modes:', error);
    }
  }, [user]);

  // Debounced save effect
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveToSupabase(state);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state, user, saveToSupabase]);

  return { isReady: initialLoadDone.current };
}

export function useSupabaseProjectsSync(
  projects: Project[],
  setProjects: (projects: Project[]) => void
) {
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Load projects from Supabase on mount
  useEffect(() => {
    if (!user || initialLoadDone.current) return;

    const loadFromSupabase = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading projects:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedProjects: Project[] = data.map(p => ({
          id: p.id,
          name: p.name,
          owner: p.owner ?? undefined,
          status: p.status as Project['status'],
          nextAction: p.next_action ?? undefined,
          lastCheckedAt: p.last_checked_at ?? undefined,
          createdAt: p.created_at,
        }));
        setProjects(loadedProjects);
      }
      initialLoadDone.current = true;
    };

    loadFromSupabase();
  }, [user, setProjects]);

  // Save projects to Supabase with debounce
  const saveToSupabase = useCallback(async (projectsToSave: Project[]) => {
    if (!user) return;

    // Get existing projects from Supabase
    const { data: existingData } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    const existingIds = new Set(existingData?.map(p => p.id) || []);
    const currentIds = new Set(projectsToSave.map(p => p.id));

    // Delete removed projects
    const toDelete = [...existingIds].filter(id => !currentIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from('projects').delete().in('id', toDelete);
    }

    // Upsert all current projects
    if (projectsToSave.length > 0) {
      const payload = projectsToSave.map(p => ({
        id: p.id,
        user_id: user.id,
        name: p.name,
        owner: p.owner ?? null,
        status: p.status,
        next_action: p.nextAction ?? null,
        last_checked_at: p.lastCheckedAt ?? null,
        created_at: p.createdAt,
      }));

      const { error } = await supabase
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Error saving projects:', error);
      }
    }
  }, [user]);

  // Debounced save effect
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveToSupabase(projects);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [projects, user, saveToSupabase]);

  return { isReady: initialLoadDone.current };
}
