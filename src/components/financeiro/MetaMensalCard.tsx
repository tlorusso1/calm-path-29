import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle, Calendar, Package } from 'lucide-react';
import { ContaFluxo, Fornecedor, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseValorFlexivel, isCapitalGiro } from '@/utils/fluxoCaixaCalculator';
import { parseISO, addDays, differenceInDays, getDaysInMonth } from 'date-fns';

interface MetaMensalCardProps {
  contasFluxo: ContaFluxo[];
  custoFixoMensal: string;
  marketingEstrutural: string;
  adsBase: string;
  faturamentoCanais?: {
    b2b: string;
    ecomNuvem: string;
    ecomShopee: string;
    ecomAssinaturas: string;
  };
  faturamentoMes?: string;
  fornecedores?: Fornecedor[]; // Para identificar Capital de Giro
}

interface MetaMensalData {
  // Contas separadas por natureza
  contasOperacionais30d: number;  // Impactam meta
  capitalGiro30d: number;         // NÃO impactam meta
  // Custos fixos e marketing
  custoFixo: number;
  marketingEstrutural: number;
  adsBase: number;
  // Totais
  totalSaidasOperacionais: number;  // Para cálculo da meta
  necessidadeCaixa30d: number;      // Para stress test (inclui tudo)
  faturamentoNecessario: number;
  faturadoAtual: number;
  progressoPercent: number;
  diasRestantes: number;
  metaDiariaRestante: number;
  pressao: 'baixa' | 'media' | 'alta';
}

export function MetaMensalCard({
  contasFluxo,
  custoFixoMensal,
  marketingEstrutural,
  adsBase,
  faturamentoCanais,
  faturamentoMes,
  fornecedores = [],
}: MetaMensalCardProps) {
  const data = useMemo<MetaMensalData>(() => {
    const hoje = new Date();
    const em30dias = addDays(hoje, 30);
    const hojeStr = hoje.toISOString().split('T')[0];
    const em30diasStr = em30dias.toISOString().split('T')[0];
    
    // 1. Separar contas a pagar: Operacionais vs Capital de Giro
    const { contasOperacionais30d, capitalGiro30d } = contasFluxo
      .filter(c => {
        if (c.pago) return false;
        if (c.tipo !== 'pagar') return false;
        return c.dataVencimento >= hojeStr && c.dataVencimento <= em30diasStr;
      })
      .reduce((acc, c) => {
        const valor = parseValorFlexivel(c.valor);
        if (isCapitalGiro(c, fornecedores)) {
          acc.capitalGiro30d += valor;
        } else {
          acc.contasOperacionais30d += valor;
        }
        return acc;
      }, { contasOperacionais30d: 0, capitalGiro30d: 0 });
    
    // 2. Custos fixos mensais
    const custoFixo = parseValorFlexivel(custoFixoMensal);
    const mktEstrutural = parseValorFlexivel(marketingEstrutural);
    const ads = parseValorFlexivel(adsBase);
    
    // 3. Total de saídas OPERACIONAIS (para cálculo da meta)
    const totalSaidasOperacionais = contasOperacionais30d + custoFixo + mktEstrutural + ads;
    
    // 4. Necessidade de caixa total (inclui capital de giro - para stress test)
    const necessidadeCaixa30d = totalSaidasOperacionais + capitalGiro30d;
    
    // 5. Faturamento necessário (usa APENAS saídas operacionais)
    const faturamentoNecessario = totalSaidasOperacionais / MARGEM_OPERACIONAL;
    
    // 6. Faturamento atual (soma dos canais OU fallback para faturamentoMes)
    const faturadoCanais = faturamentoCanais
      ? parseValorFlexivel(faturamentoCanais.b2b) +
        parseValorFlexivel(faturamentoCanais.ecomNuvem) +
        parseValorFlexivel(faturamentoCanais.ecomShopee) +
        parseValorFlexivel(faturamentoCanais.ecomAssinaturas)
      : 0;
    
    const faturadoAtual = faturadoCanais > 0 ? faturadoCanais : parseValorFlexivel(faturamentoMes || '0');
    
    // 7. Progresso
    const progressoPercent = faturamentoNecessario > 0
      ? Math.min(100, (faturadoAtual / faturamentoNecessario) * 100)
      : 0;
    
    // 8. Dias restantes no mês
    const diasNoMes = getDaysInMonth(hoje);
    const diaAtual = hoje.getDate();
    const diasRestantes = diasNoMes - diaAtual;
    
    // 9. Meta diária restante
    const faltaFaturar = Math.max(0, faturamentoNecessario - faturadoAtual);
    const metaDiariaRestante = diasRestantes > 0 ? faltaFaturar / diasRestantes : faltaFaturar;
    
    // 10. Pressão (baseada no progresso da meta operacional)
    let pressao: 'baixa' | 'media' | 'alta' = 'baixa';
    if (progressoPercent < 50) pressao = 'alta';
    else if (progressoPercent < 80) pressao = 'media';
    
    return {
      contasOperacionais30d,
      capitalGiro30d,
      custoFixo,
      marketingEstrutural: mktEstrutural,
      adsBase: ads,
      totalSaidasOperacionais,
      necessidadeCaixa30d,
      faturamentoNecessario,
      faturadoAtual,
      progressoPercent,
      diasRestantes,
      metaDiariaRestante,
      pressao,
    };
  }, [contasFluxo, custoFixoMensal, marketingEstrutural, adsBase, faturamentoCanais, faturamentoMes, fornecedores]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPressaoStyle = (pressao: 'baixa' | 'media' | 'alta') => {
    switch (pressao) {
      case 'alta':
        return { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Pressão Alta' };
      case 'media':
        return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600', label: 'Atenção' };
      case 'baixa':
        return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600', label: 'Saudável' };
    }
  };

  const pressaoStyle = getPressaoStyle(data.pressao);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta Mensal de Faturamento
          </span>
          <Badge variant="outline" className={`${pressaoStyle.bg} ${pressaoStyle.text} border-0`}>
            {data.pressao === 'alta' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {pressaoStyle.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saídas Operacionais (impactam meta) */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saídas Operacionais (próx. 30d)
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Contas operacionais</span>
              <span>{formatCurrency(data.contasOperacionais30d)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Custo fixo</span>
              <span>{formatCurrency(data.custoFixo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">├── Marketing estrutural</span>
              <span>{formatCurrency(data.marketingEstrutural)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">└── Ads base</span>
              <span>{formatCurrency(data.adsBase)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t font-medium">
              <span>TOTAL OPERACIONAL</span>
              <span>{formatCurrency(data.totalSaidasOperacionais)}</span>
            </div>
          </div>
        </div>

        {/* Capital de Giro (não impacta meta) */}
        {data.capitalGiro30d > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                Capital de Giro (não impacta meta)
              </p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-orange-600 dark:text-orange-400">└── Estoque/Insumos</span>
              <span className="font-medium text-orange-700 dark:text-orange-300">{formatCurrency(data.capitalGiro30d)}</span>
            </div>
            <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70">
              Compras de matéria-prima e embalagens não entram no cálculo da meta de faturamento
            </p>
          </div>
        )}

        {/* Cálculo da meta */}
        <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Margem operacional</span>
            <span>÷ {(MARGEM_OPERACIONAL * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">FATURAMENTO NECESSÁRIO</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(data.faturamentoNecessario)}
            </span>
          </div>
        </div>

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Faturado até agora</span>
            <span className="font-medium">{formatCurrency(data.faturadoAtual)}</span>
          </div>
          <Progress value={data.progressoPercent} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {data.progressoPercent.toFixed(0)}% da meta
          </p>
        </div>

        {/* Meta diária */}
        {data.diasRestantes > 0 && data.metaDiariaRestante > 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Meta diária restante ({data.diasRestantes} dias)
              </span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(data.metaDiariaRestante)}/dia
            </span>
          </div>
        )}

        {/* Breakdown Visual: Proporção de saídas */}
        <div className="space-y-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Composição das Saídas (próx. 30d)
          </p>
          
          {/* Stacked bar visual */}
          <div className="space-y-2">
            <div className="flex h-8 rounded-lg overflow-hidden bg-muted border">
              {/* Operacionais */}
              {data.totalSaidasOperacionais > 0 && (
                <div
                  className="bg-primary transition-all"
                  style={{
                    width: `${
                      (data.totalSaidasOperacionais /
                        (data.totalSaidasOperacionais + data.capitalGiro30d)) *
                      100
                    }%`,
                  }}
                  title="Saídas Operacionais"
                />
              )}
              
              {/* Capital de Giro */}
              {data.capitalGiro30d > 0 && (
                <div
                  className="bg-orange-500 transition-all"
                  style={{
                    width: `${
                      (data.capitalGiro30d /
                        (data.totalSaidasOperacionais + data.capitalGiro30d)) *
                      100
                    }%`,
                  }}
                  title="Capital de Giro"
                />
              )}
            </div>
            
            {/* Legenda */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" />
                <span className="text-muted-foreground">Operacionais</span>
                <span className="font-medium ml-auto">
                  {(
                    ((data.totalSaidasOperacionais /
                      (data.totalSaidasOperacionais + data.capitalGiro30d)) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              {data.capitalGiro30d > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-orange-500" />
                  <span className="text-muted-foreground">Estoque</span>
                  <span className="font-medium ml-auto">
                    {(
                      ((data.capitalGiro30d /
                        (data.totalSaidasOperacionais + data.capitalGiro30d)) ||
                        0) * 100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Resumo dos valores */}
          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Saídas Operacionais</span>
              <span className="font-medium">{formatCurrency(data.totalSaidasOperacionais)}</span>
            </div>
            {data.capitalGiro30d > 0 && (
              <div className="flex justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <span className="text-muted-foreground">Capital de Giro</span>
                <span className="font-medium text-orange-700 dark:text-orange-400">
                  {formatCurrency(data.capitalGiro30d)}
                </span>
              </div>
            )}
            <div className="flex justify-between p-2 rounded-lg bg-primary/10 border border-primary/20 font-medium">
              <span>NECESSIDADE TOTAL</span>
              <span className="text-primary">{formatCurrency(data.necessidadeCaixa30d)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
