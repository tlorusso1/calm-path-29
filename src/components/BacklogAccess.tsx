import { useState } from 'react';
import { Archive, X, Trash2, FolderOpen, CheckCircle } from 'lucide-react';
import { Task, Project } from '@/types/task';

interface BacklogAccessProps {
  tasks: Task[];
  projects: Project[];
  onDeleteTask: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCompleteProject: (id: string) => void;
}

export function BacklogAccess({ 
  tasks, 
  projects, 
  onDeleteTask, 
  onDeleteProject,
  onCompleteProject,
}: BacklogAccessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'tasks' | 'projects'>('tasks');
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const activeProjects = projects.filter(p => p.status !== 'done');
  const doneProjects = projects.filter(p => p.status === 'done');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
        aria-label="Ver backlog"
      >
        <Archive className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-40 animate-fade-in overflow-auto">
      <div className="p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-foreground">Backlog</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('tasks')}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              tab === 'tasks'
                ? 'bg-foreground text-background'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Tarefas
          </button>
          <button
            onClick={() => setTab('projects')}
            className={`px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 ${
              tab === 'projects'
                ? 'bg-foreground text-background'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Projetos
          </button>
        </div>
        
        {tab === 'tasks' ? (
          /* Tasks Tab */
          pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nada anotado ainda.
            </p>
          ) : (
            <div className="space-y-8">
              {pendingTasks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                    Pendentes ({pendingTasks.length})
                  </p>
                  <div className="space-y-2">
                    {pendingTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl"
                      >
                        <p className="flex-1 text-foreground">{task.text}</p>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {completedTasks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                    Concluídas ({completedTasks.length})
                  </p>
                  <div className="space-y-2">
                    {completedTasks.slice(0, 10).map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl"
                      >
                        <p className="flex-1 text-muted-foreground line-through">
                          {task.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Projects Tab */
          activeProjects.length === 0 && doneProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhum projeto criado.
            </p>
          ) : (
            <div className="space-y-8">
              {activeProjects.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                    Ativos ({activeProjects.length})
                  </p>
                  <div className="space-y-2">
                    {activeProjects.map(project => (
                      <div
                        key={project.id}
                        className="p-4 bg-muted/50 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-foreground font-medium">{project.name}</p>
                            {project.owner && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Com: {project.owner}
                              </p>
                            )}
                            {project.nextAction && (
                              <p className="text-sm text-muted-foreground mt-2 bg-background/50 rounded p-2">
                                {project.nextAction}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onCompleteProject(project.id)}
                              className="p-1 text-muted-foreground hover:text-green-500 transition-colors"
                              title="Concluir projeto"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteProject(project.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir projeto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {doneProjects.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                    Concluídos ({doneProjects.length})
                  </p>
                  <div className="space-y-2">
                    {doneProjects.slice(0, 5).map(project => (
                      <div
                        key={project.id}
                        className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl"
                      >
                        <p className="flex-1 text-muted-foreground line-through">
                          {project.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
