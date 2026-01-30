import { FocusMode, PreReuniaoAdsStage, FinanceiroExports, MarketingExports, DEFAULT_PREREUNIAO_ADS_DATA } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Target, Lock, TrendingUp, Leaf, AlertTriangle } from 'lucide-react';
import { formatCurrency, parseCurrency, getRoasStatus, getCpaStatus, getLeituraCombinada, MARGEM_OPERACIONAL } from '@/utils/modeStatusCalculator';

interface PreReuniaoAdsModeProps {
  mode: FocusMode;
  financeiroExports: FinanceiroExports;
  prioridadeSemana: string | null;
  marketingExports: MarketingExports;
  onUpdatePreReuniaoAdsData: (data: Partial<PreReuniaoAdsStage>) => void;
}

const getStatusColor = (status: 'verde' | 'amarelo' | 'vermelho') => {
  switch (status) {
    case 'verde': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'amarelo': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    default: return 'text-destructive bg-destructive/10';
  }
};

const getTermometroBarColor = (status: 'verde' | 'amarelo' | 'vermelho') => {
  switch (status) {
    case 'verde': return 'bg-green-500';
    case 'amarelo': return 'bg-yellow-500';
    default: return 'bg-destructive';
  }
};

export function PreReuniaoAdsMode({
  mode,
  financeiroExports,
  prioridadeSemana,
  marketingExports,
  onUpdatePreReuniaoAdsData,
}: PreReuniaoAdsModeProps) {
  // Merge com defaults
  const data: PreReuniaoAdsStage = {
    ...DEFAULT_PREREUNIAO_ADS_DATA,
    ...mode.preReuniaoAdsData,
  };

  // Calcular status dos indicadores
  const roasValue = parseFloat(data.roasMedio7d) || 0;
  const cpaValue = parseCurrency(data.cpaMedio);
  const ticketValue = parseCurrency(data.ticketMedio);
  
  const roasStatus = getRoasStatus(roasValue);
  const cpaStatus = getCpaStatus(cpaValue, ticketValue);
  
  // CPA máximo permitido
  const cpaMaximo = ticketValue * MARGEM_OPERACIONAL;
  const cpaPercentual = cpaMaximo > 0 ? (cpaValue / cpaMaximo) * 100 : 0;

  // Leitura combinada (agora inclui orgânico)
  const leitura = getLeituraCombinada(
    financeiroExports.statusFinanceiro,
    marketingExports.statusOrganico,
    roasStatus,
    'organico'
  );

  // Verificar se escalar está bloqueado
  // Bloqueado se: prioridade = preservar_caixa OU (orgânico fraco + financeiro atenção)
  const organicoFraco = marketingExports.statusOrganico === 'fraco';
  const financeiroAtencao = financeiroExports.statusFinanceiro === 'atencao';
  const financeiroSobrevivencia = financeiroExports.statusFinanceiro === 'sobrevivencia';
  
  const escalarBloqueado = 
    prioridadeSemana === 'preservar_caixa' ||
    financeiroSobrevivencia ||
    (organicoFraco && financeiroAtencao);
  
  const motivoBloqueio = financeiroSobrevivencia 
    ? 'Bloqueado: financeiro em sobrevivência'
    : prioridadeSemana === 'preservar_caixa'
    ? 'Bloqueado: prioridade é preservar caixa'
    : (organicoFraco && financeiroAtencao)
    ? 'Bloqueado: orgânico fraco + financeiro em atenção'
    : null;

  // Recomendação baseada no orgânico
  const getRecomendacaoOrganico = () => {
    if (marketingExports.statusOrganico === 'fraco') {
      return 'Ads deve compensar com mais topo de funil';
    } else if (marketingExports.statusOrganico === 'forte') {
      return 'Ads pode focar em remarketing e conversão';
    }
    return 'Manter distribuição equilibrada';
  };

  // Calcular orçamentos se decisão for escalar ou manter
  const gastoAtual = parseCurrency(data.gastoAdsAtual);
  const orcamentoSemanal = data.decisaoSemana === 'escalar' 
    ? Math.min(gastoAtual * 1.2, financeiroExports.adsMaximoPermitido)
    : data.decisaoSemana === 'reduzir'
    ? gastoAtual * 0.7
    : gastoAtual;
  const orcamentoDiario = orcamentoSemanal / 7;

  return (
    <div className="space-y-6">
      {/* ========== LIMITES RECEBIDOS ========== */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Limites do Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ads máximo permitido</span>
            <span className="font-bold text-primary">{formatCurrency(financeiroExports.adsMaximoPermitido)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prioridade da semana</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              prioridadeSemana === 'preservar_caixa' ? 'bg-destructive/10 text-destructive' :
              prioridadeSemana === 'crescer_agressivo' ? 'bg-green-100 text-green-600' :
              'bg-muted text-foreground'
            )}>
              {prioridadeSemana === 'preservar_caixa' ? '🔴 Preservar caixa' :
               prioridadeSemana === 'repor_estoque' ? '📦 Repor estoque' :
               prioridadeSemana === 'crescer_controlado' ? '🟡 Crescer controlado' :
               prioridadeSemana === 'crescer_agressivo' ? '🟢 Crescer agressivo' :
               '— Não definida'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ========== STATUS DO MARKETING (SEGUNDA) ========== */}
      <Card className={cn(
        "border-l-4",
        marketingExports.statusOrganico === 'forte' ? 'border-l-green-500' :
        marketingExports.statusOrganico === 'medio' ? 'border-l-yellow-500' :
        'border-l-destructive'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Status do Marketing (segunda)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <span className={cn(
                "block text-lg font-bold",
                marketingExports.statusOrganico === 'forte' ? 'text-green-600' :
                marketingExports.statusOrganico === 'medio' ? 'text-yellow-600' :
                'text-destructive'
              )}>
                {marketingExports.scoreOrganico}
              </span>
              <span className="text-xs text-muted-foreground">Orgânico</span>
            </div>
            <div className="space-y-1">
              <span className={cn(
                "block text-lg font-bold",
                marketingExports.statusDemanda === 'forte' ? 'text-green-600' :
                marketingExports.statusDemanda === 'neutro' ? 'text-yellow-600' :
                'text-destructive'
              )}>
                {marketingExports.scoreDemanda}
              </span>
              <span className="text-xs text-muted-foreground">Demanda</span>
            </div>
            <div className="space-y-1">
              <span className={cn(
                "block text-lg font-bold",
                marketingExports.statusSessoes === 'forte' ? 'text-green-600' :
                marketingExports.statusSessoes === 'neutro' ? 'text-yellow-600' :
                'text-destructive'
              )}>
                {marketingExports.scoreSessoes > 0 ? `+${marketingExports.scoreSessoes}%` : 
                 marketingExports.scoreSessoes < 0 ? `${marketingExports.scoreSessoes}%` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Sessões</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              marketingExports.statusOrganico === 'forte' ? 'bg-green-100 text-green-600' :
              marketingExports.statusOrganico === 'medio' ? 'bg-yellow-100 text-yellow-600' :
              'bg-destructive/10 text-destructive'
            )}>
              {marketingExports.statusOrganico === 'forte' ? '🟢 Orgânico Forte' :
               marketingExports.statusOrganico === 'medio' ? '🟡 Orgânico Médio' :
               '🔴 Orgânico Fraco'}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground italic border-t pt-2">
            💡 {getRecomendacaoOrganico()}
          </p>
        </CardContent>
      </Card>

      {/* ========== ALERTA DE BLOQUEIO ========== */}
      {escalarBloqueado && (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">{motivoBloqueio}</p>
              <p className="text-xs text-muted-foreground">Escalar Ads está bloqueado esta semana</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== INPUTS DE PERFORMANCE ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 7d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio7d}
                onChange={(e) => onUpdatePreReuniaoAdsData({ roasMedio7d: e.target.value })}
                className="h-9 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 14d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio14d}
                onChange={(e) => onUpdatePreReuniaoAdsData({ roasMedio14d: e.target.value })}
                className="h-9 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 30d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio30d}
                onChange={(e) => onUpdatePreReuniaoAdsData({ roasMedio30d: e.target.value })}
                className="h-9 text-center"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CPA médio</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.cpaMedio}
                  onChange={(e) => onUpdatePreReuniaoAdsData({ cpaMedio: e.target.value })}
                  className="h-9 pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ticket médio</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.ticketMedio}
                  onChange={(e) => onUpdatePreReuniaoAdsData({ ticketMedio: e.target.value })}
                  className="h-9 pl-7"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gasto atual semanal</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.gastoAdsAtual}
                onChange={(e) => onUpdatePreReuniaoAdsData({ gastoAdsAtual: e.target.value })}
                className="h-10 pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== TERMÔMETROS ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Termômetros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ROAS */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ROAS</span>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(roasStatus))}>
                {roasValue > 0 ? roasValue.toFixed(1) : '—'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getTermometroBarColor(roasStatus))}
                style={{ width: `${Math.min((roasValue / 5) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Meta: ROAS ≥ 3.0
            </p>
          </div>
          
          {/* CPA */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">CPA vs Máximo</span>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(cpaStatus))}>
                {cpaValue > 0 ? `${Math.round(cpaPercentual)}%` : '—'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getTermometroBarColor(cpaStatus))}
                style={{ width: `${Math.min(cpaPercentual, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              CPA máx: {formatCurrency(cpaMaximo)} (Ticket × 40%)
            </p>
          </div>
          
          {/* Financeiro */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status Financeiro</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                financeiroExports.statusFinanceiro === 'estrategia' ? 'bg-green-100 text-green-600' :
                financeiroExports.statusFinanceiro === 'atencao' ? 'bg-yellow-100 text-yellow-600' :
                'bg-destructive/10 text-destructive'
              )}>
                {financeiroExports.statusFinanceiro === 'estrategia' ? '🟢 Estratégia' :
                 financeiroExports.statusFinanceiro === 'atencao' ? '🟡 Atenção' : '🔴 Sobrevivência'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  financeiroExports.statusFinanceiro === 'estrategia' ? 'bg-green-500' :
                  financeiroExports.statusFinanceiro === 'atencao' ? 'bg-yellow-500' : 'bg-destructive'
                )}
                style={{ width: `${financeiroExports.scoreFinanceiro}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== LEITURA COMBINADA ========== */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-center">
            "{leitura}"
          </p>
        </CardContent>
      </Card>

      {/* ========== DECISÃO DA SEMANA ========== */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Decisão da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.decisaoSemana ?? ''}
            onValueChange={(value) => onUpdatePreReuniaoAdsData({ 
              decisaoSemana: value as PreReuniaoAdsStage['decisaoSemana'] 
            })}
            className="space-y-2"
          >
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              escalarBloqueado ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:bg-muted/50',
              data.decisaoSemana === 'escalar' && !escalarBloqueado && 'border-green-500 bg-green-50'
            )}>
              <RadioGroupItem value="escalar" id="escalar" disabled={escalarBloqueado} />
              <Label htmlFor="escalar" className={cn("flex-1", escalarBloqueado && 'cursor-not-allowed')}>
                <span className="font-medium flex items-center gap-2">
                  🚀 Escalar
                  {escalarBloqueado && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
                <p className="text-xs text-muted-foreground">
                  {escalarBloqueado ? motivoBloqueio : 'Aumentar investimento'}
                </p>
              </Label>
            </div>
            
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
              data.decisaoSemana === 'manter' && 'border-yellow-500 bg-yellow-50'
            )}>
              <RadioGroupItem value="manter" id="manter" />
              <Label htmlFor="manter" className="flex-1 cursor-pointer">
                <span className="font-medium">⏸️ Manter</span>
                <p className="text-xs text-muted-foreground">Continuar no ritmo atual</p>
              </Label>
            </div>
            
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
              data.decisaoSemana === 'reduzir' && 'border-destructive bg-destructive/5'
            )}>
              <RadioGroupItem value="reduzir" id="reduzir" />
              <Label htmlFor="reduzir" className="flex-1 cursor-pointer">
                <span className="font-medium">📉 Reduzir</span>
                <p className="text-xs text-muted-foreground">Diminuir investimento</p>
              </Label>
            </div>
          </RadioGroup>
          
          {/* Orçamento calculado */}
          {data.decisaoSemana && gastoAtual > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orçamento semanal</span>
                <span className="font-bold">{formatCurrency(orcamentoSemanal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orçamento diário</span>
                <span className="font-medium">{formatCurrency(orcamentoDiario)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
