import { ScoreNegocio, FinanceiroExports } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, Package, Target, Megaphone } from 'lucide-react';
import { formatCurrency } from '@/utils/modeStatusCalculator';

interface ScoreNegocioCardProps {
  score: ScoreNegocio;
  compact?: boolean;
  financeiroExports?: FinanceiroExports;
}

const getStatusColor = (status: ScoreNegocio['status']) => {
  switch (status) {
    case 'saudavel':
      return 'text-green-600';
    case 'atencao':
      return 'text-yellow-600';
    case 'risco':
      return 'text-destructive';
  }
};

const getStatusBgColor = (status: ScoreNegocio['status']) => {
  switch (status) {
    case 'saudavel':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'atencao':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'risco':
      return 'bg-destructive/10';
  }
};

const getBarColor = (score: number) => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-destructive';
};

const getAlertaRiscoIcon = (alerta: 'verde' | 'amarelo' | 'vermelho') => {
  switch (alerta) {
    case 'verde': return '🟢';
    case 'amarelo': return '🟡';
    case 'vermelho': return '🔴';
  }
};

export function ScoreNegocioCard({ score, compact = false, financeiroExports }: ScoreNegocioCardProps) {
  const statusLabel = 
    score.status === 'saudavel' ? 'Saudável — Pode crescer' :
    score.status === 'atencao' ? 'Atenção — Crescer com cautela' :
    'Risco — Preservar caixa';

  if (compact) {
    return (
      <Card className={cn("border-2", 
        score.status === 'saudavel' ? 'border-green-300' :
        score.status === 'atencao' ? 'border-yellow-300' :
        'border-destructive/30'
      )}>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Score do Negócio</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-2xl font-bold", getStatusColor(score.status))}>
              {score.total}
            </span>
            <span className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              getStatusBgColor(score.status),
              getStatusColor(score.status)
            )}>
              {score.status === 'saudavel' ? '🟢' : score.status === 'atencao' ? '🟡' : '🔴'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2", 
      score.status === 'saudavel' ? 'border-green-300' :
      score.status === 'atencao' ? 'border-yellow-300' :
      'border-destructive/30'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" />
          Score Semanal do Negócio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Score combinado</span>
          <span className={cn("text-3xl font-bold", getStatusColor(score.status))}>
            {score.total}/100
          </span>
        </div>
        
        {/* Barra de progresso */}
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", getBarColor(score.total))}
            style={{ width: `${score.total}%` }}
          />
        </div>
        
        {/* Status Badge */}
        <div className={cn(
          "px-3 py-2 rounded-lg text-center font-medium text-sm",
          getStatusBgColor(score.status),
          getStatusColor(score.status)
        )}>
          {score.status === 'saudavel' ? '🟢' : score.status === 'atencao' ? '🟡' : '🔴'} {statusLabel}
        </div>
        
        {/* Detalhes por Pilar */}
        <div className={cn("grid gap-2 text-center", financeiroExports ? "grid-cols-4" : "grid-cols-3")}>
          <div className="p-2 bg-muted/50 rounded-lg space-y-1">
            <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Financeiro</p>
            <p className="font-bold text-sm">{score.financeiro.score}/40</p>
            <p className="text-[10px]">{getAlertaRiscoIcon(score.financeiro.alertaRisco)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg space-y-1">
            <Package className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Estoque</p>
            <p className="font-bold text-sm">{score.estoque.score}/30</p>
            <p className="text-[10px] text-muted-foreground truncate">{score.estoque.cobertura}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg space-y-1">
            <Target className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Demanda</p>
            <p className="font-bold text-sm">{score.demanda.score}/30</p>
            <p className="text-[10px] text-muted-foreground truncate">{score.demanda.tendencia}</p>
          </div>
          {/* NOVO: Status de Ads */}
          {financeiroExports && (
            <div className={cn(
              "p-2 rounded-lg space-y-1",
              financeiroExports.motivoBloqueioAds 
                ? "bg-destructive/10" 
                : "bg-muted/50"
            )}>
              <Megaphone className={cn(
                "h-4 w-4 mx-auto",
                financeiroExports.motivoBloqueioAds 
                  ? "text-destructive" 
                  : "text-muted-foreground"
              )} />
              <p className="text-xs text-muted-foreground">Ads</p>
              <p className={cn(
                "font-bold text-sm",
                financeiroExports.motivoBloqueioAds 
                  ? "text-destructive" 
                  : "text-foreground"
              )}>
                {financeiroExports.adsMaximoPermitido > 0 
                  ? formatCurrency(financeiroExports.adsMaximoPermitido) 
                  : 'R$ 0'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {financeiroExports.motivoBloqueioAds 
                  ? '🔴 Bloqueado' 
                  : `max 10% fat.`}
              </p>
            </div>
          )}
        </div>
        
        {/* Legenda de regras */}
        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p>• <span className="text-green-600 font-medium">70+</span>: Pode crescer</p>
          <p>• <span className="text-yellow-600 font-medium">40-69</span>: Crescer com cautela</p>
          <p>• <span className="text-destructive font-medium">&lt;40</span>: Foco em caixa</p>
        </div>
      </CardContent>
    </Card>
  );
}
