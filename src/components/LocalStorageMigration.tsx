import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FocusModeState } from '@/types/focus-mode';
import { Project } from '@/types/task';
import type { Json } from '@/integrations/supabase/types';

const FOCUS_MODES_KEY = 'focoagora_focus_modes';
const PROJECTS_KEY = 'focoagora_projects';

interface Props {
  onComplete: () => void;
}

export function LocalStorageMigration({ onComplete }: Props) {
  const { user } = useAuth();
  const [hasLocalData, setHasLocalData] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const focusModesData = localStorage.getItem(FOCUS_MODES_KEY);
    const projectsData = localStorage.getItem(PROJECTS_KEY);
    setHasLocalData(!!(focusModesData || projectsData));
  }, []);

  const handleMigrate = async () => {
    if (!user) return;
    setMigrating(true);

    try {
      // Migrate focus modes
      const focusModesData = localStorage.getItem(FOCUS_MODES_KEY);
      if (focusModesData) {
        const state: FocusModeState = JSON.parse(focusModesData);
        await supabase.from('focus_mode_states').upsert([{
          user_id: user.id,
          date: state.date,
          week_start: state.weekStart,
          active_mode: state.activeMode,
          modes: JSON.parse(JSON.stringify(state.modes)) as Json,
          last_completed_mode: state.lastCompletedMode,
        }], { onConflict: 'user_id' });
      }

      // Migrate projects
      const projectsData = localStorage.getItem(PROJECTS_KEY);
      if (projectsData) {
        const projects: Project[] = JSON.parse(projectsData);
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
          await supabase.from('projects').upsert(payload, { onConflict: 'id' });
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(FOCUS_MODES_KEY);
      localStorage.removeItem(PROJECTS_KEY);
      
      onComplete();
    } catch (error) {
      console.error('Migration error:', error);
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // Clear localStorage and continue
    localStorage.removeItem(FOCUS_MODES_KEY);
    localStorage.removeItem(PROJECTS_KEY);
    onComplete();
  };

  if (!hasLocalData) {
    onComplete();
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">📦 Dados encontrados</CardTitle>
          <CardDescription>
            Encontramos dados salvos neste navegador. Deseja importá-los para sua conta?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleMigrate} 
            className="w-full" 
            disabled={migrating}
          >
            {migrating ? 'Importando...' : 'Sim, importar meus dados'}
          </Button>
          <Button 
            onClick={handleSkip} 
            variant="outline" 
            className="w-full"
            disabled={migrating}
          >
            Não, começar do zero
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
