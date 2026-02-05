import { cn } from '@/lib/utils';

type InfoType = 'parametro' | 'leitura' | 'input';

interface InfoLabelProps {
  type: InfoType;
  children?: React.ReactNode;
  className?: string;
}

const styles = {
  parametro: { 
    icon: '⚙️', 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-700 dark:text-blue-400', 
    label: 'PARÂMETRO' 
  },
  leitura: { 
    icon: '📊', 
    bg: 'bg-cyan-50 dark:bg-cyan-900/20', 
    text: 'text-cyan-700 dark:text-cyan-400', 
    label: 'LEITURA' 
  },
  input: { 
    icon: '✏️', 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    text: 'text-amber-700 dark:text-amber-400', 
    label: 'INPUT' 
  },
};

export function InfoLabel({ type, children, className }: InfoLabelProps) {
  const s = styles[type];
  
  return (
    <div className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5', s.bg, className)}>
      <span className={cn('text-[10px] font-bold', s.text)}>
        {s.icon} {s.label}
      </span>
      {children && <span className="text-xs">{children}</span>}
    </div>
  );
}

export function InfoBadge({ type }: { type: InfoType }) {
  const s = styles[type];
  
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium',
      s.bg, s.text
    )}>
      {s.icon}
    </span>
  );
}
