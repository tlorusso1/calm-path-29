import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/types/task';

const PROJECTS_KEY = 'focoagora_projects';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

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
