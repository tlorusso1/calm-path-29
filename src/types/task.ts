export interface Task {
  id: string;
  text: string;
  type: 'critical' | 'operational' | 'light';
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  skippedCount: number;
  projectId?: string;
  delegatedTo?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  status: 'active' | 'waiting' | 'done';
  createdAt: string;
  lastCheckedAt?: string;
  nextAction?: string;
}

export interface DayState {
  date: string;
  criticalTaskId: string | null;
  criticalCompleted: boolean;
  openItems: string;
  dayClosedAt?: string;
  skippedToday: string[];
  projectsCheckedToday: string[];
}

export type TimeBlock = 
  | 'opening'      // 09:00–09:20
  | 'focus'        // 09:20–10:10
  | 'responses'    // 11:00–11:30
  | 'meetings'     // 14:00–15:30
  | 'tracking'     // 15:30–16:00
  | 'closing'      // 16:30–16:45
  | 'free';        // Qualquer outro horário

export interface BlockConfig {
  type: TimeBlock;
  title: string;
  phrases: string[];
}
