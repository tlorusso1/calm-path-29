import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, TrendingUp, BarChart3, ArrowLeftRight, Settings } from 'lucide-react';

export type FinanceiroTab = 'resumo' | 'contas' | 'projecao' | 'analise' | 'conciliacao' | 'config';

const tabs: { id: FinanceiroTab; label: string; icon: React.ElementType }[] = [
  { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
  { id: 'contas', label: 'Contas', icon: FileText },
  { id: 'projecao', label: 'Projeção', icon: TrendingUp },
  { id: 'analise', label: 'Análise', icon: BarChart3 },
  { id: 'conciliacao', label: 'Concil.', icon: ArrowLeftRight },
  { id: 'config', label: 'Config', icon: Settings },
];

interface FinanceiroBottomNavProps {
  activeTab: FinanceiroTab;
  onTabChange: (tab: FinanceiroTab) => void;
}

export function FinanceiroBottomNav({ activeTab, onTabChange }: FinanceiroBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 transition-colors text-[10px] font-medium",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span>{label}</span>
              {active && (
                <div className="absolute top-0 h-0.5 w-8 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
