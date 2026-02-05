import { FocusMode, ReuniaoAdsStage, ReuniaoAdsAcao, FinanceiroExports, MarketingExports, DEFAULT_REUNIAO_ADS_DATA, ScoreNegocio, MARGEM_OPERACIONAL, WeeklySnapshot } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BarChart3, Plus, Trash2, Target, Zap, Lock, TrendingUp, Leaf, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, parseCurrency, getRoasStatus, getCpaStatus, getLeituraCombinada } from '@/utils/modeStatusCalculator';
import { ScoreNegocioCard } from '@/components/ScoreNegocioCard';
import { LoopAprendizado } from '@/components/financeiro/LoopAprendizado';

interface ReuniaoAdsModeProps {
  mode: FocusMode;
  financeiroExports: FinanceiroExports;
  prioridadeSemana: string | null;
  marketingExports: MarketingExports;
  scoreNegocio?: ScoreNegocio;
  historicoSemanas?: WeeklySnapshot[];
  onUpdateReuniaoAdsData: (data: Partial<ReuniaoAdsStage>) => void;
  onAddAcao: (acao: Omit<ReuniaoAdsAcao, 'id'>) => ReuniaoAdsAcao;
  onRemoveAcao: (id: string) => void;
}

const ACAO_TIPOS: { value: ReuniaoAdsAcao['tipo']; label: string; icon: string }[] = [
  { value: 'escalar', label: 'Escalar', icon: '🚀' },
  { value: 'pausar', label: 'Pausar', icon: '⏸️' },
  { value: 'testar', label: 'Testar', icon: '🧪' },
  { value: 'otimizar', label: 'Otimizar', icon: '🔧' },
];

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

export function ReuniaoAdsMode({
  mode,
  financeiroExports,
  prioridadeSemana,
  marketingExports,
  scoreNegocio,
  historicoSemanas = [],
  onUpdateReuniaoAdsData,
  onAddAcao,
  onRemoveAcao,
}: ReuniaoAdsModeProps) {
  const [novaAcaoTipo, setNovaAcaoTipo] = useState<ReuniaoAdsAcao['tipo'] | ''>('');
  const [novaAcaoDescricao, setNovaAcaoDescricao] = useState('');

  // Merge com defaults
  const data: ReuniaoAdsStage = {
    ...DEFAULT_REUNIAO_ADS_DATA,
    ...mode.reuniaoAdsData,
    metricasMeta: {
      ...DEFAULT_REUNIAO_ADS_DATA.metricasMeta,
      ...mode.reuniaoAdsData?.metricasMeta,
    },
    metricasGoogle: {
      ...DEFAULT_REUNIAO_ADS_DATA.metricasGoogle,
      ...mode.reuniaoAdsData?.metricasGoogle,
    },
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

  // Leitura combinada
  const leitura = getLeituraCombinada(
    financeiroExports.statusFinanceiro,
    marketingExports.statusOrganico,
    roasStatus,
    'organico'
  );

  // Verificar se escalar está bloqueado (REGRAS DE GOVERNANÇA RÍGIDAS)
  const organicoFraco = marketingExports.statusOrganico === 'fraco';
  const financeiroAtencao = financeiroExports.statusFinanceiro === 'atencao';
  const financeiroSobrevivencia = financeiroExports.statusFinanceiro === 'sobrevivencia';
  
  // REGRA 1: Preservar Caixa = BLOQUEIO TOTAL de aumento
  const bloqueioPreservarCaixa = prioridadeSemana === 'preservar_caixa';
  
  // REGRA 2: Repor Estoque = Ads limitado ao Ads Base (sem incremental)
  const limitadoReporEstoque = prioridadeSemana === 'repor_estoque';
  
  // REGRA 3: Escalar bloqueado se sobrevivência ou (orgânico fraco + atenção)
  const escalarBloqueado = 
    bloqueioPreservarCaixa ||
    limitadoReporEstoque ||
    financeiroSobrevivencia ||
    (organicoFraco && financeiroAtencao);
  
  // Calcular Ads máximo efetivo baseado nas regras
  const adsMaximoEfetivo = limitadoReporEstoque 
    ? financeiroExports.adsBase 
    : financeiroExports.adsMaximoPermitido;
  
  const motivoBloqueio = financeiroSobrevivencia 
    ? 'Bloqueado: financeiro em sobrevivência'
    : bloqueioPreservarCaixa
    ? '🔴 BLOQUEIO: Prioridade "Preservar Caixa" ativa'
    : limitadoReporEstoque
    ? '🟡 LIMITADO: Ads apenas no base (prioridade é Repor Estoque)'
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

  // Distribuição
  const metaPercent = parseInt(data.distribuicaoMeta) || 70;
  const googlePercent = 100 - metaPercent;

  const handleAddAcao = () => {
    if (novaAcaoTipo && novaAcaoDescricao.trim()) {
      onAddAcao({
        tipo: novaAcaoTipo,
        descricao: novaAcaoDescricao.trim(),
      });
      setNovaAcaoTipo('');
      setNovaAcaoDescricao('');
    }
  };

  const handleDistribuicaoChange = (value: number[]) => {
    onUpdateReuniaoAdsData({
      distribuicaoMeta: value[0].toString(),
      distribuicaoGoogle: (100 - value[0]).toString(),
    });
  };

  // Calcular orçamentos baseado na decisão
  const gastoAtual = parseCurrency(data.gastoAdsAtual);
  const orcamentoCalculado = data.decisaoSemana === 'escalar' 
    ? Math.min(gastoAtual * 1.2, financeiroExports.adsMaximoPermitido)
    : data.decisaoSemana === 'reduzir'
    ? gastoAtual * 0.7
    : gastoAtual;

  // Verificar se tela está bloqueada (prioridade não definida)
  const telaBloqueada = !prioridadeSemana;
  
  return (
    <div className="space-y-6">
      {/* ========== ALERTA DE BLOQUEIO DE CONTEXTO ========== */}
      {telaBloqueada && (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Decisão da Semana não definida</p>
                <p className="text-xs text-muted-foreground">
                  Defina a prioridade na Pré-Reunião Geral para liberar esta tela.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* ========== CONTEÚDO PRINCIPAL (pode ficar opaco se bloqueado) ========== */}
      <div className={cn(telaBloqueada && 'opacity-50 pointer-events-none')}>
      
      {/* ========== LOOP DE APRENDIZADO ========== */}
      {historicoSemanas.length > 0 && (
        <LoopAprendizado 
          historicoSemanas={historicoSemanas}
          roasAtual={parseFloat(data.roasMedio7d) || undefined}
          caixaAtual={financeiroExports.caixaLivreReal}
        />
      )}
      
      {/* ========== ALERTA DE GOVERNANÇA ATIVA ========== */}
      {(bloqueioPreservarCaixa || limitadoReporEstoque) && (
        <Card className={cn(
          'border-2',
          bloqueioPreservarCaixa ? 'bg-destructive/5 border-destructive/30' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className={cn(
                'h-5 w-5 shrink-0',
                bloqueioPreservarCaixa ? 'text-destructive' : 'text-yellow-600'
              )} />
              <div>
                <p className={cn(
                  'font-medium',
                  bloqueioPreservarCaixa ? 'text-destructive' : 'text-yellow-700 dark:text-yellow-400'
                )}>
                  {bloqueioPreservarCaixa 
                    ? '🔴 Governança: PRESERVAR CAIXA ativa'
                    : '🟡 Governança: REPOR ESTOQUE ativa'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bloqueioPreservarCaixa 
                    ? 'Qualquer aumento de Ads está BLOQUEADO esta semana.'
                    : 'Ads limitado ao BASE. Incrementos bloqueados para preservar caixa para compras.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* ========== SCORE SEMANAL DO NEGÓCIO ========== */}
      {scoreNegocio && <ScoreNegocioCard score={scoreNegocio} compact financeiroExports={financeiroExports} />}

      {/* ========== LIMITES DE ADS (DO FINANCEIRO) ========== */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Limites de Ads (do Financeiro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ads base</span>
              <span>{formatCurrency(financeiroExports.adsBase)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Incremento permitido</span>
              <span className={cn(
                limitadoReporEstoque ? "text-muted-foreground line-through" :
                financeiroExports.adsIncremental > 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                +{formatCurrency(financeiroExports.adsIncremental)}
                {limitadoReporEstoque && <span className="ml-1 text-yellow-600 no-underline">(bloqueado)</span>}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Ads máximo esta semana</span>
              <span className={cn(
                limitadoReporEstoque ? 'text-yellow-600' : 'text-primary'
              )}>
                {formatCurrency(adsMaximoEfetivo)}
                {limitadoReporEstoque && <span className="text-xs font-normal ml-1">(limitado)</span>}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Teto absoluto (10% fat. esperado)</span>
              <span>{formatCurrency(financeiroExports.tetoAdsAbsoluto)}</span>
            </div>
          </div>
          
          {(financeiroExports.motivoBloqueioAds || motivoBloqueio) && (
            <div className="p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              {motivoBloqueio || financeiroExports.motivoBloqueioAds}
            </div>
          )}
          
          <Separator />
          
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

      {/* ========== STATUS DO MARKETING ========== */}
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

      {/* ========== PERFORMANCE (TODA TERÇA) ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Performance (preencher toda terça)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 7d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio7d}
                onChange={(e) => onUpdateReuniaoAdsData({ roasMedio7d: e.target.value })}
                className="h-9 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 14d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio14d}
                onChange={(e) => onUpdateReuniaoAdsData({ roasMedio14d: e.target.value })}
                className="h-9 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS 30d</Label>
              <Input
                placeholder="0.0"
                value={data.roasMedio30d}
                onChange={(e) => onUpdateReuniaoAdsData({ roasMedio30d: e.target.value })}
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
                  onChange={(e) => onUpdateReuniaoAdsData({ cpaMedio: e.target.value })}
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
                  onChange={(e) => onUpdateReuniaoAdsData({ ticketMedio: e.target.value })}
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
                onChange={(e) => onUpdateReuniaoAdsData({ gastoAdsAtual: e.target.value })}
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
            onValueChange={(value) => onUpdateReuniaoAdsData({ 
              decisaoSemana: value as ReuniaoAdsStage['decisaoSemana'] 
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
                <span className="text-muted-foreground">Orçamento semanal sugerido</span>
                <span className="font-bold">{formatCurrency(orcamentoCalculado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orçamento diário sugerido</span>
                <span className="font-medium">{formatCurrency(orcamentoCalculado / 7)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* ========== ORÇAMENTO APROVADO ========== */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Orçamento Aprovado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Diário</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.orcamentoDiario}
                  onChange={(e) => onUpdateReuniaoAdsData({ orcamentoDiario: e.target.value })}
                  className="h-10 pl-9 text-lg font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Semanal</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.orcamentoSemanal}
                  onChange={(e) => onUpdateReuniaoAdsData({ orcamentoSemanal: e.target.value })}
                  className="h-10 pl-9 text-lg font-medium"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== DISTRIBUIÇÃO POR CANAL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Distribuição por Canal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm font-medium">
            <span>Meta Ads: {metaPercent}%</span>
            <span>Google Ads: {googlePercent}%</span>
          </div>
          <Slider
            value={[metaPercent]}
            onValueChange={handleDistribuicaoChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <div className="flex h-3 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 transition-all"
              style={{ width: `${metaPercent}%` }}
            />
            <div 
              className="bg-green-500 transition-all"
              style={{ width: `${googlePercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ========== LIMITES ========== */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Limites de Operação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ROAS mínimo</Label>
              <Input
                placeholder="3.0"
                value={data.roasMinimoAceitavel}
                onChange={(e) => onUpdateReuniaoAdsData({ roasMinimoAceitavel: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CPA máximo</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.cpaMaximoAceitavel}
                  onChange={(e) => onUpdateReuniaoAdsData({ cpaMaximoAceitavel: e.target.value })}
                  className="h-9 pl-7"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== MÉTRICAS POR CANAL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            Métricas por Canal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meta Ads */}
          <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Meta Ads</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ROAS</Label>
                <Input
                  placeholder="0.0"
                  value={data.metricasMeta.roas}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasMeta: { ...data.metricasMeta, roas: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPA</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasMeta.cpa}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasMeta: { ...data.metricasMeta, cpa: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Spend</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasMeta.spend}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasMeta: { ...data.metricasMeta, spend: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Receita</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasMeta.receita}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasMeta: { ...data.metricasMeta, receita: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Google Ads */}
          <div className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/50">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Google Ads</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ROAS</Label>
                <Input
                  placeholder="0.0"
                  value={data.metricasGoogle.roas}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasGoogle: { ...data.metricasGoogle, roas: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPA</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasGoogle.cpa}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasGoogle: { ...data.metricasGoogle, cpa: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Spend</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasGoogle.spend}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasGoogle: { ...data.metricasGoogle, spend: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Receita</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={data.metricasGoogle.receita}
                  onChange={(e) => onUpdateReuniaoAdsData({ 
                    metricasGoogle: { ...data.metricasGoogle, receita: e.target.value } 
                  })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== AÇÕES ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Ações da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de ações */}
          {data.acoes.length > 0 && (
            <div className="space-y-2">
              {data.acoes.map((acao) => {
                const tipoInfo = ACAO_TIPOS.find(t => t.value === acao.tipo);
                return (
                  <div 
                    key={acao.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      acao.tipo === 'escalar' && 'bg-green-50 border-green-200',
                      acao.tipo === 'pausar' && 'bg-orange-50 border-orange-200',
                      acao.tipo === 'testar' && 'bg-purple-50 border-purple-200',
                      acao.tipo === 'otimizar' && 'bg-blue-50 border-blue-200',
                    )}
                  >
                    <span className="text-lg">{tipoInfo?.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tipoInfo?.label}</p>
                      <p className="text-sm text-muted-foreground">{acao.descricao}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveAcao(acao.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Adicionar ação */}
          <div className="flex gap-2">
            <Select value={novaAcaoTipo} onValueChange={(v) => setNovaAcaoTipo(v as ReuniaoAdsAcao['tipo'])}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {ACAO_TIPOS.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.icon} {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Descrição da ação..."
              value={novaAcaoDescricao}
              onChange={(e) => setNovaAcaoDescricao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAcao()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddAcao}
              disabled={!novaAcaoTipo || !novaAcaoDescricao.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== REGISTRO DA DECISÃO ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Registro da Decisão</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Resumo das decisões tomadas nesta reunião..."
            value={data.registroDecisao}
            onChange={(e) => onUpdateReuniaoAdsData({ registroDecisao: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>
      </div> {/* Fim do wrapper de bloqueio */}
    </div>
  );
}
