import { FocusMode, MarketingStage, DEFAULT_MARKETING_DATA } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { calculateMarketingStatusSimples } from '@/utils/modeStatusCalculator';

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

export function MarketingMode({
  mode,
  onUpdateMarketingData,
}: MarketingModeProps) {
  // Merge com defaults
  const data: MarketingStage = {
    ...DEFAULT_MARKETING_DATA,
    ...mode.marketingData,
    verificacoes: {
      ...DEFAULT_MARKETING_DATA.verificacoes,
      ...mode.marketingData?.verificacoes,
    },
  };

  // Calcular status
  const { status, checks } = calculateMarketingStatusSimples(data.verificacoes);
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  const handleVerificacaoChange = (key: keyof MarketingStage['verificacoes'], checked: boolean) => {
    onUpdateMarketingData({
      verificacoes: {
        ...data.verificacoes,
        [key]: checked,
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

  return (
    <div className="space-y-6">
      {/* ========== STATUS AUTOMÁTICO ========== */}
      <Card className={cn("border-2", statusInfo.border)}>
        <CardContent className={cn("p-4", statusInfo.bg)}>
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("h-6 w-6", statusInfo.color)} />
            <div className="flex-1">
              <p className={cn("font-medium", statusInfo.color)}>
                {statusInfo.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-2xl font-bold", statusInfo.color)}>
                {checks}/5
              </p>
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                status === 'saudavel' ? 'bg-green-500' :
                status === 'fragil' ? 'bg-yellow-500' : 'bg-destructive'
              )}
              style={{ width: `${(checks / 5) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ========== CHECKLIST SEMANAL ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            👀 O que preciso ver / cobrar
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Se tiver "não", alguém está devendo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
      </Card>

      {/* ========== INSIGHT ========== */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-center text-muted-foreground">
            {status === 'saudavel' && (
              <>
                <span className="text-green-600 font-medium">Bom trabalho!</span>
                <br />
                Marketing está sustentando a demanda fora do Ads.
              </>
            )}
            {status === 'fragil' && (
              <>
                <span className="text-yellow-600 font-medium">Atenção</span>
                <br />
                Alguns canais precisam ser cobrados ou ativados.
              </>
            )}
            {status === 'dependente' && (
              <>
                <span className="text-destructive font-medium">Alerta</span>
                <br />
                Quase toda demanda vem de Ads. Se parar, para tudo.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Texto âncora */}
      <p className="text-xs text-muted-foreground italic text-center pt-2">
        "Marketing não é fazer mais. É escolher onde prestar atenção."
      </p>
    </div>
  );
}
