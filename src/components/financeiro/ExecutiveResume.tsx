import { FinanceiroExports } from '@/types/focus-mode';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, Flame, Timer, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/modeStatusCalculator';

interface ExecutiveResumeProps {
  exports: FinanceiroExports;
}

export function ExecutiveResume({ exports }: ExecutiveResumeProps) {
  const {
    caixaLivreReal,
    statusFinanceiro,
    queimaOperacional,
    folegoEmDias,
    resultadoEsperado30d,
    adsMaximoPermitido,
    alertaRisco30d,
  } = exports;

  const getStatusConfig = () => {
    switch (statusFinanceiro) {
      case 'estrategia':
        return {
          label: 'ESTRATÉGIA',
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          badgeBg: 'bg-green-500',
          textColor: 'text-green-700 dark:text-green-400',
          icon: CheckCircle2,
        };
      case 'atencao':
        return {
          label: 'ATENÇÃO',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          badgeBg: 'bg-yellow-500',
          textColor: 'text-yellow-700 dark:text-yellow-400',
          icon: Clock,
        };
      default:
        return {
          label: 'SOBREVIVÊNCIA',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badgeBg: 'bg-destructive',
          textColor: 'text-red-700 dark:text-red-400',
          icon: AlertTriangle,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const queimaDiaria = queimaOperacional / 30;

  const getRiscoColor = (risco: string) => {
    switch (risco) {
      case 'verde': return 'text-green-600';
      case 'amarelo': return 'text-yellow-600';
      default: return 'text-destructive';
    }
  };

  return (
    <Card className={cn('border-2', config.border, config.bg)}>
      <CardContent className="p-4">
        {/* Header com status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={cn('px-3 py-1', config.badgeBg)}>
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {config.label}
            </Badge>
          </div>
          <span className={cn('text-sm font-medium', getRiscoColor(alertaRisco30d))}>
            Risco 30d: {alertaRisco30d === 'verde' ? '🟢' : alertaRisco30d === 'amarelo' ? '🟡' : '🔴'}
          </span>
        </div>

        {/* Grid de métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Caixa Livre Real */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Caixa Livre Real</p>
            <p className={cn('text-xl font-bold', caixaLivreReal >= 0 ? 'text-foreground' : 'text-destructive')}>
              {formatCurrency(caixaLivreReal)}
            </p>
          </div>

          {/* Queima/dia */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Queima/dia
            </p>
            <p className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(queimaDiaria)}
            </p>
          </div>

          {/* Fôlego */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Fôlego
            </p>
            <p className={cn(
              'text-lg font-semibold',
              folegoEmDias === null ? 'text-green-600' :
              folegoEmDias === 0 ? 'text-destructive' :
              folegoEmDias < 30 ? 'text-yellow-600' : 'text-foreground'
            )}>
              {folegoEmDias === null ? '∞' : `${folegoEmDias} dias`}
            </p>
          </div>

          {/* Resultado 30d */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Resultado 30d
            </p>
            <p className={cn(
              'text-lg font-semibold',
              resultadoEsperado30d >= 0 ? 'text-green-600' : 'text-destructive'
            )}>
              {resultadoEsperado30d >= 0 ? '+' : ''}{formatCurrency(resultadoEsperado30d)}
            </p>
          </div>

          {/* Ads Máximo */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ads Máx/mês</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(adsMaximoPermitido)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
