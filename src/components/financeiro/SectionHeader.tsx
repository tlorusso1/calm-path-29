import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ icon, title, subtitle, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-2 mb-4', className)}>
      <div className="flex items-start gap-2">
        <span className="text-lg leading-tight">{icon}</span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {badge && <div>{badge}</div>}
    </div>
  );
}
