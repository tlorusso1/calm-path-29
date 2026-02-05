import { FinanceiroExports, SupplyExports, MarketingExports } from '@/types/focus-mode';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GargaloIdentifierProps {
  financeiroExports: FinanceiroExports;
  supplyExports?: SupplyExports | null;
  marketingExports?: MarketingExports;
  compact?: boolean;
}

interface GargaloResult {
  gargalo: 'FINANCEIRO' | 'ESTOQUE' | 'DEMANDA' | 'NENHUM';
  areaSoberana: string;
  descricao: string;
  severidade: 'alta' | 'media' | 'baixa';
  icon: typeof Wallet;
}

function identificarGargalo(
  financeiroExports: FinanceiroExports,
  supplyExports?: SupplyExports | null,
  marketingExports?: MarketingExports
): GargaloResult {
  // Prioridade 1: Financeiro crítico
  if (financeiroExports.caixaLivreReal <= 0) {
    return {
      gargalo: 'FINANCEIRO',
      areaSoberana: 'Financeiro',
      descricao: 'Caixa livre negativo. Foco total em preservar caixa.',
      severidade: 'alta',
      icon: Wallet,
    };
  }

  // Prioridade 2: Estoque em ruptura
  if (supplyExports?.riscoRuptura) {
    return {
      gargalo: 'ESTOQUE',
      areaSoberana: 'Financeiro',
      descricao: 'Risco de ruptura de estoque. Priorizar reposição.',
      severidade: 'alta',
      icon: Package,
    };
  }

  // Prioridade 3: Demanda fraca
  if (marketingExports?.statusDemanda === 'fraco') {
    return {
      gargalo: 'DEMANDA',
      areaSoberana: 'Financeiro',
      descricao: 'Demanda fraca. Verificar campanhas e orgânico.',
      severidade: 'media',
      icon: TrendingDown,
    };
  }

  // Prioridade 4: Financeiro em atenção
  if (financeiroExports.statusFinanceiro === 'atencao') {
    return {
      gargalo: 'FINANCEIRO',
      areaSoberana: 'Financeiro',
      descricao: 'Caixa em atenção. Crescer com cautela.',
      severidade: 'media',
      icon: Wallet,
    };
  }

  // Prioridade 5: Estoque em atenção
  if (supplyExports?.statusEstoque === 'amarelo') {
    return {
      gargalo: 'ESTOQUE',
      areaSoberana: 'Financeiro',
      descricao: 'Estoque em atenção. Monitorar reposição.',
      severidade: 'baixa',
      icon: Package,
    };
  }

  return {
    gargalo: 'NENHUM',
    areaSoberana: 'Financeiro',
    descricao: 'Nenhum gargalo crítico identificado.',
    severidade: 'baixa',
    icon: AlertTriangle,
  };
}

export function GargaloIdentifier({ 
  financeiroExports, 
  supplyExports, 
  marketingExports,
  compact = false,
}: GargaloIdentifierProps) {
  const gargalo = identificarGargalo(financeiroExports, supplyExports, marketingExports);
  
  if (gargalo.gargalo === 'NENHUM' && compact) {
    return null; // Não mostra se não tem gargalo em modo compacto
  }

  const getColorClasses = () => {
    switch (gargalo.severidade) {
      case 'alta':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          badge: 'bg-destructive',
          text: 'text-destructive',
        };
      case 'media':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-300 dark:border-yellow-700',
          badge: 'bg-yellow-500',
          text: 'text-yellow-700 dark:text-yellow-400',
        };
      default:
        return {
          bg: 'bg-muted/50',
          border: 'border-muted',
          badge: 'bg-muted-foreground',
          text: 'text-muted-foreground',
        };
    }
  };

  const colors = getColorClasses();
  const Icon = gargalo.icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 p-2 rounded-lg', colors.bg, 'border', colors.border)}>
        <Icon className={cn('h-4 w-4', colors.text)} />
        <span className={cn('text-sm font-medium', colors.text)}>
          Gargalo: {gargalo.gargalo}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn('border', colors.border, colors.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', colors.badge)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">Gargalo da Semana</span>
              <Badge variant="outline" className="text-[10px]">📊 LEITURA</Badge>
            </div>
            <p className={cn('text-lg font-bold', colors.text)}>
              {gargalo.gargalo === 'NENHUM' ? '✓ Nenhum' : gargalo.gargalo}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {gargalo.descricao}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { identificarGargalo };
export type { GargaloResult };
