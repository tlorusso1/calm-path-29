import { useState, useEffect, useCallback } from 'react';
import { Task, DayState, TimeBlock } from '@/types/task';

const TASKS_KEY = 'focoagora_tasks';
const DAY_STATE_KEY = 'focoagora_day_state';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function loadTasks(): Task[] {
  try {
    const stored = localStorage.getItem(TASKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function loadDayState(): DayState {
  try {
    const stored = localStorage.getItem(DAY_STATE_KEY);
    const state = stored ? JSON.parse(stored) : null;
    
    // Reset if it's a new day
    if (!state || state.date !== getTodayDate()) {
      return {
        date: getTodayDate(),
        criticalTaskId: null,
        criticalCompleted: false,
        openItems: '',
      };
    }
    return state;
  } catch {
    return {
      date: getTodayDate(),
      criticalTaskId: null,
      criticalCompleted: false,
      openItems: '',
    };
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [dayState, setDayState] = useState<DayState>(loadDayState);

  // Persist tasks
  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Persist day state
  useEffect(() => {
    localStorage.setItem(DAY_STATE_KEY, JSON.stringify(dayState));
  }, [dayState]);

  const addTask = useCallback((text: string, type: Task['type'] = 'light') => {
    const newTask: Task = {
      id: generateId(),
      text: text.trim(),
      type,
      completed: false,
      createdAt: new Date().toISOString(),
      skippedCount: 0,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, completed: true, completedAt: new Date().toISOString() }
          : task
      )
    );
    
    // Check if it was the critical task
    if (dayState.criticalTaskId === id) {
      setDayState(prev => ({ ...prev, criticalCompleted: true }));
    }
  }, [dayState.criticalTaskId]);

  const skipTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, skippedCount: task.skippedCount + 1 }
          : task
      )
    );
  }, []);

  const setCriticalTask = useCallback((id: string) => {
    setDayState(prev => ({ ...prev, criticalTaskId: id }));
  }, []);

  const setOpenItems = useCallback((text: string) => {
    setDayState(prev => ({ ...prev, openItems: text }));
  }, []);

  const closeDay = useCallback(() => {
    setDayState(prev => ({ ...prev, dayClosedAt: new Date().toISOString() }));
  }, []);

  const getNextTask = useCallback((block: TimeBlock): Task | null => {
    const pending = tasks.filter(t => !t.completed);
    
    if (block === 'focus' && dayState.criticalTaskId) {
      return pending.find(t => t.id === dayState.criticalTaskId) || null;
    }
    
    if (block === 'responses') {
      return pending.find(t => t.type === 'light' || t.type === 'operational') || null;
    }
    
    if (block === 'meetings') {
      return pending.find(t => t.type === 'operational') || pending[0] || null;
    }
    
    // Default priority: critical > operational > light
    const critical = pending.find(t => t.type === 'critical');
    if (critical) return critical;
    
    const operational = pending.find(t => t.type === 'operational');
    if (operational) return operational;
    
    return pending[0] || null;
  }, [tasks, dayState.criticalTaskId]);

  const getSuggestedCritical = useCallback((): Task | null => {
    const pending = tasks.filter(t => !t.completed);
    // Suggest the oldest non-completed task or one with highest skip count
    return pending.sort((a, b) => b.skippedCount - a.skippedCount)[0] || null;
  }, [tasks]);

  return {
    tasks,
    dayState,
    addTask,
    completeTask,
    skipTask,
    setCriticalTask,
    setOpenItems,
    closeDay,
    getNextTask,
    getSuggestedCritical,
  };
}
