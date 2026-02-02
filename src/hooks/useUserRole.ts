import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FocusModeId } from '@/types/focus-mode';

export type AppRole = 'admin' | 'marketing' | 'operacional';

// Mapeamento de módulos para roles que podem acessá-los
const MODE_ROLE_MAP: Record<FocusModeId, AppRole[]> = {
  'financeiro': ['admin'],
  'marketing': ['admin', 'marketing'],
  'supplychain': ['admin'],
  'pre-reuniao-geral': ['admin'],
  'reuniao-ads': ['admin', 'marketing'],
  'pre-reuniao-verter': ['admin'],
  'tasks': ['admin', 'operacional'],
};

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching roles:', error);
          // Se não tem roles atribuídas, é admin por padrão (para o Thiago)
          setRoles(['admin']);
        } else if (data && data.length > 0) {
          setRoles(data.map(r => r.role as AppRole));
        } else {
          // Usuário sem role explícita é admin (owner do sistema)
          setRoles(['admin']);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setRoles(['admin']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const canAccess = useCallback((modeId: FocusModeId): boolean => {
    // Se carregando, permite tudo (será re-avaliado depois)
    if (isLoading) return true;
    
    // Se é admin ou não tem role (owner), pode tudo
    if (roles.length === 0 || roles.includes('admin')) return true;
    
    // Verifica se alguma das roles do usuário está na lista permitida
    const allowedRoles = MODE_ROLE_MAP[modeId] ?? [];
    return allowedRoles.some(role => roles.includes(role));
  }, [roles, isLoading]);

  const isAdmin = roles.includes('admin') || roles.length === 0;

  return { 
    roles, 
    isLoading, 
    canAccess, 
    isAdmin,
  };
}
