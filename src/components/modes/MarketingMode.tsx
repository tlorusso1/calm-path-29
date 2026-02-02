import { FocusMode, MarketingStage, MarketingInfluencer, DEFAULT_MARKETING_DATA, DEFAULT_MARKETING_ORGANICO, Tendencia, Marketing90DMedias, DEFAULT_MARKETING_90D } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock, Plus, Trash2, Mail, Users, Megaphone, TrendingUp, TrendingDown, Minus, Globe, Activity, ShoppingCart, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { calculateMarketingStatusSimples, calculateMarketingOrganico } from '@/utils/modeStatusCalculator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useWeeklyHistory, calcularMediasHistoricas } from '@/hooks/useWeeklyHistory';

interface MarketingModeProps {
  mode: FocusMode;
  onUpdateMarketingData: (data: Partial<MarketingStage>) => void;
}

const getStatusInfo = (status: 'saudavel' | 'fragil' | 'dependente') => {
  switch (status) {
    case 'saudavel':
      return {
        icon: CheckCircle2,
        label: 'Saudável',
        color: 'text-green-600',
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-300',
        description: 'Marketing está sustentando a demanda',
      };
    case 'fragil':
      return {
        icon: Clock,
        label: 'Frágil',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-300',
        description: 'Alguns canais precisam de atenção',
      };
    default:
      return {
        icon: AlertTriangle,
        label: 'Dependente de Ads',
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        description: 'Muito dependente de anúncios pagos',
      };
  }
};

const getOrganicoStatusInfo = (status: 'forte' | 'medio' | 'fraco') => {
  switch (status) {
    case 'forte':
      return {
        icon: TrendingUp,
        label: 'Orgânico Forte',
        color: 'text-green-600',
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-300',
        description: 'Ajuda Ads — pode focar remarketing',
      };
    case 'medio':
      return {
        icon: Minus,
        label: 'Orgânico Médio',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-300',
        description: 'Ads sustenta — manter estrutura',
      };
    default:
      return {
        icon: TrendingDown,
        label: 'Orgânico Fraco',
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        description: 'Ads compensa — mais topo de funil',
      };
  }
};

const getDemandaStatusInfo = (status: 'forte' | 'neutro' | 'fraco') => {
  switch (status) {
    case 'forte':
      return {
        color: 'text-green-600',
        bg: 'bg-green-500',
        label: '🟢 Forte',
      };
    case 'neutro':
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-500',
        label: '🟡 Neutro',
      };
    default:
      return {
        color: 'text-destructive',
        bg: 'bg-destructive',
        label: '🔴 Fraco',
      };
  }
};

const getSessoesStatusInfo = (status: 'forte' | 'neutro' | 'fraco') => {
  switch (status) {
    case 'forte':
      return { label: '🟢 Acima', description: '+10% vs média' };
    case 'neutro':
      return { label: '🟡 Na média', description: '±10%' };
    default:
      return { label: '🔴 Abaixo', description: '-10% vs média' };
  }
};

const getTendenciaIcon = (tendencia: Tendencia) => {
  switch (tendencia) {
    case 'acima':
      return { Icon: ArrowUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: '↑ Acima' };
    case 'abaixo':
      return { Icon: ArrowDown, color: 'text-destructive', bg: 'bg-red-100 dark:bg-red-900/30', label: '↓ Abaixo' };
    default:
      return { Icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: '= Média' };
  }
};

export function MarketingMode({
  mode,
  onUpdateMarketingData,
}: MarketingModeProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  
  // Buscar histórico para cálculo relativo
  const { history } = useWeeklyHistory(5);
  const historicoMedias = calcularMediasHistoricas(history);
  
  // Merge com defaults
  const data: MarketingStage = {
    ...DEFAULT_MARKETING_DATA,
    ...mode.marketingData,
    verificacoes: {
      ...DEFAULT_MARKETING_DATA.verificacoes,
      ...mode.marketingData?.verificacoes,
    },
    organico: {
      ...DEFAULT_MARKETING_ORGANICO,
      ...mode.marketingData?.organico,
      influencers: mode.marketingData?.organico?.influencers || [],
      media90d: {
        ...DEFAULT_MARKETING_90D,
        ...mode.marketingData?.organico?.media90d,
      },
    },
  };
  
  // Handler para atualizar médias 90D
  const handleMedia90dChange = (field: keyof Marketing90DMedias, value: string) => {
    onUpdateMarketingData({
      organico: {
        ...data.organico!,
        media90d: {
          ...data.organico!.media90d!,
          [field]: value,
        },
      },
    });
  };

  // Calcular status do checklist
  const { status, checks } = calculateMarketingStatusSimples(data.verificacoes);
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;
  
  // Calcular termômetro orgânico COM histórico
  const organicoResult = calculateMarketingOrganico(data.organico, historicoMedias);
  const organicoInfo = getOrganicoStatusInfo(organicoResult.statusOrganico);
  const OrganicoIcon = organicoInfo.icon;
  
  // Tendências por pilar
  const tendenciaOrganicoInfo = getTendenciaIcon(organicoResult.tendenciaOrganico);
  const tendenciaSessoesInfo = getTendenciaIcon(organicoResult.tendenciaSessoes);
  const tendenciaPedidosInfo = getTendenciaIcon(organicoResult.tendenciaPedidos);

  const handleVerificacaoChange = (key: keyof MarketingStage['verificacoes'], checked: boolean) => {
    onUpdateMarketingData({
      verificacoes: {
        ...data.verificacoes,
        [key]: checked,
      },
    });
  };

  const handleOrganicoChange = (field: string, value: string | boolean) => {
    onUpdateMarketingData({
      organico: {
        ...data.organico!,
        [field]: value,
      },
    });
  };

  const handleAddInfluencer = () => {
    const newInfluencer: MarketingInfluencer = {
      id: crypto.randomUUID(),
      nome: '',
      conteudoNoAr: false,
      alcanceEstimado: '',
      linkCupomAtivo: false,
    };
    onUpdateMarketingData({
      organico: {
        ...data.organico!,
        influencers: [...data.organico!.influencers, newInfluencer],
      },
    });
  };

  const handleUpdateInfluencer = (id: string, field: string, value: string | boolean) => {
    onUpdateMarketingData({
      organico: {
        ...data.organico!,
        influencers: data.organico!.influencers.map(inf =>
          inf.id === id ? { ...inf, [field]: value } : inf
        ),
      },
    });
  };

  const handleRemoveInfluencer = (id: string) => {
    onUpdateMarketingData({
      organico: {
        ...data.organico!,
        influencers: data.organico!.influencers.filter(inf => inf.id !== id),
      },
    });
  };

  const checkItems = [
    { key: 'campanhasAtivas' as const, label: 'Campanhas ativas', description: 'Tem oferta rodando (não só ads ligado)' },
    { key: 'remarketingRodando' as const, label: 'Remarketing rodando', description: 'Visitantes, carrinho, clientes antigos' },
    { key: 'conteudoPublicado' as const, label: 'Conteúdo publicado/programado', description: 'Orgânico ou criativo novo para ads' },
    { key: 'emailEnviado' as const, label: 'E-mail/promoção enviado', description: 'Campanha, automação ou recuperação' },
    { key: 'influencersVerificados' as const, label: 'Influencers/parcerias verificados', description: 'Conteúdo no ar ou combinado' },
  ];

  const demandaInfo = getDemandaStatusInfo(organicoResult.statusDemanda);
  const sessoesInfo = getSessoesStatusInfo(organicoResult.statusSessoes);
  
  // Verificar se há histórico
  const temHistorico = historicoMedias.temDados;

  return (
    <div className="space-y-6">
      {/* ========== SCORE DE DEMANDA (VISÃO GERAL) ========== */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            DEMANDA — VISÃO GERAL
            {temHistorico && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                vs últimas 4 semanas
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid de tendências por pilar */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className={cn("p-3 rounded-lg", tendenciaOrganicoInfo.bg)}>
              <p className="text-xs text-muted-foreground mb-1">Orgânico</p>
              <p className={cn("font-semibold flex items-center justify-center gap-1", tendenciaOrganicoInfo.color)}>
                <tendenciaOrganicoInfo.Icon className="h-4 w-4" />
                {tendenciaOrganicoInfo.label}
              </p>
            </div>
            <div className={cn("p-3 rounded-lg", tendenciaSessoesInfo.bg)}>
              <p className="text-xs text-muted-foreground mb-1">Sessões</p>
              <p className={cn("font-semibold flex items-center justify-center gap-1", tendenciaSessoesInfo.color)}>
                <tendenciaSessoesInfo.Icon className="h-4 w-4" />
                {tendenciaSessoesInfo.label}
              </p>
            </div>
            <div className={cn("p-3 rounded-lg", tendenciaPedidosInfo.bg)}>
              <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
              <p className={cn("font-semibold flex items-center justify-center gap-1", tendenciaPedidosInfo.color)}>
                <tendenciaPedidosInfo.Icon className="h-4 w-4" />
                {tendenciaPedidosInfo.label}
              </p>
            </div>
          </div>
          
          {/* Score total */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Score de Demanda</p>
            <p className={cn("font-bold text-2xl", demandaInfo.color)}>
              {organicoResult.scoreDemanda}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          
          {/* Barra de demanda */}
          <div className="space-y-1">
            <div className="h-3 rounded-full overflow-hidden bg-muted">
              <div 
                className={cn("h-full transition-all duration-500", demandaInfo.bg)}
                style={{ width: `${organicoResult.scoreDemanda}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className={cn("font-medium", demandaInfo.color)}>
                {demandaInfo.label}
              </span>
              <span>100</span>
            </div>
          </div>
          
          {/* Leitura inteligente */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm text-center">
              <span className="font-medium">📊 Leitura:</span>
              <br />
              <span className="text-muted-foreground">{organicoResult.leituraDemanda}</span>
            </p>
          </div>
          
          {!temHistorico && (
            <p className="text-xs text-muted-foreground text-center italic">
              ⏳ Sem histórico suficiente. Score será mais preciso após 2+ semanas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========== PEDIDOS DA SEMANA ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
            Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Pedidos semana anterior</Label>
              <Input
                type="text"
                placeholder="Ex: 250"
                value={data.organico?.pedidosSemana || ''}
                onChange={(e) => handleOrganicoChange('pedidosSemana', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Média 90D
              </Label>
              <Input
                type="text"
                placeholder="Ex: 200"
                value={data.organico?.media90d?.pedidosSemana || ''}
                onChange={(e) => handleMedia90dChange('pedidosSemana', e.target.value)}
                className="h-9 border-dashed"
              />
            </div>
          </div>
          
          {/* Indicador de tendência */}
          <div className={cn(
            "p-3 rounded-lg border text-center",
            tendenciaPedidosInfo.bg
          )}>
            <p className={cn("text-sm font-medium flex items-center justify-center gap-2", tendenciaPedidosInfo.color)}>
              <tendenciaPedidosInfo.Icon className="h-4 w-4" />
              {tendenciaPedidosInfo.label} vs média histórica
            </p>
            {temHistorico && historicoMedias.pedidosSemana > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Média calculada: {Math.round(historicoMedias.pedidosSemana)} pedidos/semana
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== SESSÕES DO SITE ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-500" />
            Sessões do Site
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sessões da semana</Label>
              <Input
                type="text"
                placeholder="Ex: 12.000"
                value={data.organico?.sessoesSemana || ''}
                onChange={(e) => handleOrganicoChange('sessoesSemana', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Média 30 dias</Label>
              <Input
                type="text"
                placeholder="Ex: 10.000"
                value={data.organico?.sessoesMedia30d || ''}
                onChange={(e) => handleOrganicoChange('sessoesMedia30d', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          
          {/* Status das sessões */}
          <div className={cn(
            "p-3 rounded-lg border text-center",
            organicoResult.statusSessoes === 'forte' ? 'bg-green-50 dark:bg-green-900/20 border-green-200' :
            organicoResult.statusSessoes === 'neutro' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' :
            'bg-red-50 dark:bg-red-900/20 border-red-200'
          )}>
            <p className="text-sm font-medium">{sessoesInfo.label}</p>
            <p className="text-xs text-muted-foreground">{sessoesInfo.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* ========== TERMÔMETRO ORGÂNICO ========== */}
      <Card className={cn("border-2", organicoInfo.border)}>
        <CardContent className={cn("p-4", organicoInfo.bg)}>
          <div className="flex items-center gap-3">
            <OrganicoIcon className={cn("h-8 w-8", organicoInfo.color)} />
            <div className="flex-1">
              <p className={cn("font-semibold text-lg", organicoInfo.color)}>
                {organicoInfo.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {organicoInfo.description}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-bold", organicoInfo.color)}>
                {organicoResult.scoreOrganico}
              </p>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
          </div>
          
          {/* Barra de progresso com detalhes */}
          <div className="mt-4 space-y-2">
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${(organicoResult.detalhes.emailScore / 100) * 100}%` }}
                title="E-mail"
              />
              <div 
                className="bg-purple-500 transition-all duration-500"
                style={{ width: `${(organicoResult.detalhes.influencerScore / 100) * 100}%` }}
                title="Influencers"
              />
              <div 
                className="bg-pink-500 transition-all duration-500"
                style={{ width: `${(organicoResult.detalhes.socialScore / 100) * 100}%` }}
                title="Social"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                E-mail: {organicoResult.detalhes.emailScore}/30
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Influencers: {organicoResult.detalhes.influencerScore}/30
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-pink-500 rounded-full" />
                Social: {organicoResult.detalhes.socialScore}/40
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== RECOMENDAÇÃO ADS ========== */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-center">
            <span className="font-medium">👉 Recomendação para Ads:</span>
            <br />
            <span className="text-muted-foreground">{organicoResult.recomendacaoAds}</span>
          </p>
          {organicoResult.statusOrganico === 'fraco' && (
            <p className="text-xs text-center text-destructive mt-2">
              ⚠️ Orgânico fraco não justifica escalar Ads. Só reorganiza onde gastar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========== PILAR 1: E-MAIL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            E-mail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SEMANA */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">📆 Semana</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Enviados</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.organico?.emailEnviados || ''}
                  onChange={(e) => handleOrganicoChange('emailEnviados', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">% Abertura</Label>
                <Input
                  type="text"
                  placeholder="Ex: 25%"
                  value={data.organico?.emailAbertura || ''}
                  onChange={(e) => handleOrganicoChange('emailAbertura', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">% Conversões</Label>
                <Input
                  type="text"
                  placeholder="Ex: 2%"
                  value={data.organico?.emailConversoes || ''}
                  onChange={(e) => handleOrganicoChange('emailConversoes', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* MÉDIA 90D */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Média 90D <span className="text-muted-foreground/60 font-normal">(atualizar 1x ao mês)</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Enviados</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.organico?.media90d?.emailEnviados || ''}
                  onChange={(e) => handleMedia90dChange('emailEnviados', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">% Abertura</Label>
                <Input
                  type="text"
                  placeholder="Ex: 22%"
                  value={data.organico?.media90d?.emailAbertura || ''}
                  onChange={(e) => handleMedia90dChange('emailAbertura', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">% Conversões</Label>
                <Input
                  type="text"
                  placeholder="Ex: 1.5%"
                  value={data.organico?.media90d?.emailConversoes || ''}
                  onChange={(e) => handleMedia90dChange('emailConversoes', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            data.organico?.emailGerouClique 
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" 
              : "bg-muted/30 border-border hover:bg-muted/50"
          )}>
            <Checkbox
              checked={data.organico?.emailGerouClique || false}
              onCheckedChange={(checked) => handleOrganicoChange('emailGerouClique', checked === true)}
            />
            <span className="text-sm">Gerou cliques ou vendas?</span>
          </label>
        </CardContent>
      </Card>

      {/* ========== PILAR 2: INFLUENCERS ========== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Influencers / Parcerias
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddInfluencer}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.organico?.influencers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum influencer/parceria cadastrado esta semana
            </p>
          ) : (
            data.organico?.influencers.map((inf) => (
              <div key={inf.id} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nome do influencer/parceria"
                    value={inf.nome}
                    onChange={(e) => handleUpdateInfluencer(inf.id, 'nome', e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveInfluencer(inf.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className={cn(
                    "flex items-center gap-2 p-2 rounded border cursor-pointer text-xs",
                    inf.conteudoNoAr ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200" : "bg-background"
                  )}>
                    <Checkbox
                      checked={inf.conteudoNoAr}
                      onCheckedChange={(checked) => handleUpdateInfluencer(inf.id, 'conteudoNoAr', checked === true)}
                    />
                    <span>Conteúdo no ar</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-2 p-2 rounded border cursor-pointer text-xs",
                    inf.linkCupomAtivo ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200" : "bg-background"
                  )}>
                    <Checkbox
                      checked={inf.linkCupomAtivo}
                      onCheckedChange={(checked) => handleUpdateInfluencer(inf.id, 'linkCupomAtivo', checked === true)}
                    />
                    <span>Link/cupom ativo</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Código cupom</Label>
                    <Input
                      type="text"
                      placeholder="Ex: INFLUENCER10"
                      value={inf.codigoCupom || ''}
                      onChange={(e) => handleUpdateInfluencer(inf.id, 'codigoCupom', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Alcance estimado</Label>
                    <Input
                      type="text"
                      placeholder="Ex: 50.000"
                      value={inf.alcanceEstimado}
                      onChange={(e) => handleUpdateInfluencer(inf.id, 'alcanceEstimado', e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ========== PILAR 3: CONTEÚDO / SOCIAL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-pink-500" />
            Conteúdo / Social
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SEMANA */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">📆 Semana</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Posts publicados</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.organico?.postsPublicados || ''}
                  onChange={(e) => handleOrganicoChange('postsPublicados', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Taxa engajamento (%)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 3.5%"
                  value={data.organico?.taxaEngajamento || ''}
                  onChange={(e) => handleOrganicoChange('taxaEngajamento', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alcance total semana</Label>
                <Input
                  type="text"
                  placeholder="Ex: 150.000"
                  value={data.organico?.alcanceTotal || ''}
                  onChange={(e) => handleOrganicoChange('alcanceTotal', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Média últimas semanas</Label>
                <Input
                  type="text"
                  placeholder="Ex: 120.000"
                  value={data.organico?.alcanceMediaSemanas || ''}
                  onChange={(e) => handleOrganicoChange('alcanceMediaSemanas', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* MÉDIA 90D */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Média 90D <span className="text-muted-foreground/60 font-normal">(atualizar 1x ao mês)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Posts publicados</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.organico?.media90d?.postsPublicados || ''}
                  onChange={(e) => handleMedia90dChange('postsPublicados', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Taxa engajamento (%)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 3%"
                  value={data.organico?.media90d?.taxaEngajamento || ''}
                  onChange={(e) => handleMedia90dChange('taxaEngajamento', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Alcance total</Label>
                <Input
                  type="text"
                  placeholder="Ex: 130.000"
                  value={data.organico?.media90d?.alcanceTotal || ''}
                  onChange={(e) => handleMedia90dChange('alcanceTotal', e.target.value)}
                  className="h-9 border-dashed"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            data.organico?.postAcimaDaMedia 
              ? "bg-pink-50 dark:bg-pink-900/20 border-pink-200" 
              : "bg-muted/30 border-border hover:bg-muted/50"
          )}>
            <Checkbox
              checked={data.organico?.postAcimaDaMedia || false}
              onCheckedChange={(checked) => handleOrganicoChange('postAcimaDaMedia', checked === true)}
            />
            <span className="text-sm">Houve post que performou acima da média?</span>
          </label>
          
          {data.organico?.postAcimaDaMedia && (
            <div className="space-y-1.5">
              <Label className="text-xs">Link do post destaque</Label>
              <Input
                type="text"
                placeholder="https://..."
                value={data.organico?.postLinkDestaque || ''}
                onChange={(e) => handleOrganicoChange('postLinkDestaque', e.target.value)}
                className="h-9"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== CHECKLIST SEMANAL (COLAPSÁVEL) ========== */}
      <Collapsible open={showChecklist} onOpenChange={setShowChecklist}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  👀 Checklist Semanal
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", statusInfo.color)}>
                    {checks}/5
                  </span>
                  <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground">
                Se tiver "não", alguém está devendo.
              </p>
              {checkItems.map(({ key, label, description }) => (
                <label 
                  key={key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    data.verificacoes[key] 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200" 
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={data.verificacoes[key]}
                    onCheckedChange={(checked) => handleVerificacaoChange(key, checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className={cn(
                      "text-sm font-medium",
                      data.verificacoes[key] && "text-green-700 dark:text-green-400"
                    )}>
                      {label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {description}
                    </p>
                  </div>
                </label>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Texto âncora */}
      <p className="text-xs text-muted-foreground italic text-center pt-2">
        "O orgânico dessa semana ajudou a vender, foi neutro ou está fraco?"
      </p>
    </div>
  );
}