import { useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '@/types/task';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const PROJECTS_KEY = 'focoagora_projects';
const DEBOUNCE_MS = 1000;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Load from Supabase when user is available
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading projects:', error);
        } else if (data && data.length > 0) {
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
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    };

    loadFromSupabase();
  }, [user]);

  // Save to Supabase with debounce
  useEffect(() => {
    if (!user || !initialLoadDone.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      // Get existing projects from Supabase
      const { data: existingData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      const existingIds = new Set(existingData?.map(p => p.id) || []);
      const currentIds = new Set(projects.map(p => p.id));

      // Delete removed projects
      const toDelete = [...existingIds].filter(id => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from('projects').delete().in('id', toDelete);
      }

      // Upsert all current projects
      if (projects.length > 0) {
        const payload = projects.map(p => ({
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
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [projects, user]);

  const addProject = useCallback((name: string, owner?: string) => {
    const newProject: Project = {
      id: generateId(),
      name: name.trim(),
      owner,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === id ? { ...project, ...updates } : project
      )
    );
  }, []);

  const markChecked = useCallback((id: string) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === id
          ? { ...project, lastCheckedAt: new Date().toISOString() }
          : project
      )
    );
  }, []);

  const setNextAction = useCallback((id: string, nextAction: string) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === id ? { ...project, nextAction } : project
      )
    );
  }, []);

  const completeProject = useCallback((id: string) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === id ? { ...project, status: 'done' } : project
      )
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
  }, []);

  const getActiveProjects = useCallback(() => {
    return projects.filter(p => p.status === 'active' || p.status === 'waiting');
  }, [projects]);

  const getUncheckedToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return projects.filter(p => {
      if (p.status === 'done') return false;
      if (!p.lastCheckedAt) return true;
      return !p.lastCheckedAt.startsWith(today);
    });
  }, [projects]);

  return {
    projects,
    isLoading,
    addProject,
    updateProject,
    markChecked,
    setNextAction,
    completeProject,
    deleteProject,
    getActiveProjects,
    getUncheckedToday,
  };
}
