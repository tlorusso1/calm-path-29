import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, History, ArrowRight } from 'lucide-react';
import { WeeklySnapshot } from '@/types/focus-mode';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/modeStatusCalculator';

interface LoopAprendizadoProps {
  historicoSemanas: WeeklySnapshot[];
  roasAtual?: number;
  faturamentoAtual?: number;
  caixaAtual?: number;
}

interface ResultadoComparativo {
  decisaoAnterior: string | null;
  roasAnterior: number | null;
  roasAtual: number | null;
  caixaAnterior: number | null;
  caixaAtual: number | null;
  gastoAnterior: number | null;
  melhorou: boolean | null;
  temDados: boolean;
  mensagem: string;
  tipo: 'sucesso' | 'atencao' | 'neutro';
}

function analisarResultado(
  snapshotAnterior: WeeklySnapshot | undefined,
  roasAtual?: number,
  caixaAtual?: number
): ResultadoComparativo {
  if (!snapshotAnterior) {
    return {
      decisaoAnterior: null,
      roasAnterior: null,
      roasAtual: roasAtual ?? null,
      caixaAnterior: null,
      caixaAtual: caixaAtual ?? null,
      gastoAnterior: null,
      melhorou: null,
      temDados: false,
      mensagem: 'Sem histórico suficiente para análise.',
      tipo: 'neutro',
    };
  }

  const decisao = snapshotAnterior.decisao_ads;
  const roasAnt = snapshotAnterior.roas_medio;
  const caixaAnt = snapshotAnterior.caixa_livre_real;
  const gastoAnt = snapshotAnterior.gasto_ads;

  // Análise baseada na decisão anterior
  let mensagem = '';
  let tipo: 'sucesso' | 'atencao' | 'neutro' = 'neutro';
  let melhorou: boolean | null = null;

  if (decisao === 'escalar') {
    if (roasAtual && roasAnt) {
      const delta = roasAtual - roasAnt;
      if (delta >= 0) {
        mensagem = `Semana passada você decidiu ESCALAR. Resultado: ROAS manteve/subiu (${roasAnt.toFixed(1)} → ${roasAtual.toFixed(1)}). ✓ Decisão validada.`;
        tipo = 'sucesso';
        melhorou = true;
      } else {
        mensagem = `Semana passada você decidiu ESCALAR. Resultado: ROAS caiu de ${roasAnt.toFixed(1)} → ${roasAtual.toFixed(1)}. Ajustar estratégia.`;
        tipo = 'atencao';
        melhorou = false;
      }
    } else {
      mensagem = 'Semana passada você decidiu ESCALAR. Preencha o ROAS atual para avaliar.';
    }
  } else if (decisao === 'manter') {
    mensagem = `Semana passada você decidiu MANTER. ROAS: ${roasAnt?.toFixed(1) ?? '-'} → ${roasAtual?.toFixed(1) ?? '-'}.`;
    tipo = 'neutro';
  } else if (decisao === 'reduzir') {
    if (caixaAtual && caixaAnt) {
      const delta = caixaAtual - caixaAnt;
      if (delta >= 0) {
        mensagem = `Semana passada você decidiu REDUZIR. Caixa melhorou: ${formatCurrency(caixaAnt)} → ${formatCurrency(caixaAtual)}. ✓ Decisão validada.`;
        tipo = 'sucesso';
        melhorou = true;
      } else {
        mensagem = `Semana passada você decidiu REDUZIR. Caixa ainda caiu. Verificar outros custos.`;
        tipo = 'atencao';
        melhorou = false;
      }
    } else {
      mensagem = 'Semana passada você decidiu REDUZIR. Aguardando dados de caixa.';
    }
  } else {
    mensagem = 'Nenhuma decisão de Ads registrada na semana anterior.';
    tipo = 'neutro';
  }

  return {
    decisaoAnterior: decisao,
    roasAnterior: roasAnt,
    roasAtual: roasAtual ?? null,
    caixaAnterior: caixaAnt,
    caixaAtual: caixaAtual ?? null,
    gastoAnterior: gastoAnt,
    melhorou,
    temDados: true,
    mensagem,
    tipo,
  };
}

export function LoopAprendizado({ 
  historicoSemanas, 
  roasAtual,
  faturamentoAtual,
  caixaAtual,
}: LoopAprendizadoProps) {
  const resultado = useMemo(() => {
    // Pegar snapshot da semana anterior (index 0 é a atual ou mais recente)
    const snapshotAnterior = historicoSemanas[0];
    return analisarResultado(snapshotAnterior, roasAtual, caixaAtual);
  }, [historicoSemanas, roasAtual, caixaAtual]);

  if (!resultado.temDados || !resultado.decisaoAnterior) {
    return null;
  }

  const getColorClasses = () => {
    switch (resultado.tipo) {
      case 'sucesso':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-400',
          icon: CheckCircle2,
        };
      case 'atencao':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-400',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-muted/50',
          border: 'border-muted',
          text: 'text-muted-foreground',
          icon: History,
        };
    }
  };

  const colors = getColorClasses();
  const Icon = colors.icon;

  return (
    <Card className={cn('border', colors.border, colors.bg)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          📈 Loop de Aprendizado
          <Badge variant="outline" className="text-[10px]">LEITURA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', colors.text)} />
          <div className="flex-1">
            <p className={cn('text-sm', colors.text)}>
              {resultado.mensagem}
            </p>
            
            {resultado.decisaoAnterior && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Decisão:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {resultado.decisaoAnterior === 'escalar' ? '🚀 ESCALAR' :
                     resultado.decisaoAnterior === 'manter' ? '➖ MANTER' :
                     resultado.decisaoAnterior === 'reduzir' ? '📉 REDUZIR' :
                     resultado.decisaoAnterior}
                  </Badge>
                </div>
                
                {resultado.roasAnterior !== null && resultado.roasAtual !== null && (
                  <div className="flex items-center gap-1">
                    <span>ROAS:</span>
                    <span>{resultado.roasAnterior.toFixed(1)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className={cn(
                      resultado.roasAtual > resultado.roasAnterior ? 'text-green-600' :
                      resultado.roasAtual < resultado.roasAnterior ? 'text-destructive' :
                      ''
                    )}>
                      {resultado.roasAtual.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
