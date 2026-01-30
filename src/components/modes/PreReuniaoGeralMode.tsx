import { FocusMode, PreReuniaoGeralStage, FinanceiroExports, PreReuniaoAdsStage, DEFAULT_PREREUNIAO_GERAL_DATA, ScoreNegocio } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, Package, Target, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, calcTermometroRisco, getLeituraCombinada, getRoasStatus } from '@/utils/modeStatusCalculator';
import { ScoreNegocioCard } from '@/components/ScoreNegocioCard';

interface PreReuniaoGeralModeProps {
  mode: FocusMode;
  financeiroExports: FinanceiroExports;
  preReuniaoAdsData?: PreReuniaoAdsStage;
  scoreNegocio: ScoreNegocio;
  onUpdatePreReuniaoGeralData: (data: Partial<PreReuniaoGeralStage>) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'estrategia':
    case 'saudavel':
      return CheckCircle2;
    case 'atencao':
      return Clock;
    default:
      return AlertTriangle;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'estrategia':
    case 'saudavel':
    case 'verde':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'atencao':
    case 'amarelo':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    default:
      return 'text-destructive bg-destructive/10';
  }
};

const getTermometroColor = (score: number) => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-destructive';
};

export function PreReuniaoGeralMode({
  mode,
  financeiroExports,
  preReuniaoAdsData,
  scoreNegocio,
  onUpdatePreReuniaoGeralData,
}: PreReuniaoGeralModeProps) {
  // Merge com defaults
  const data: PreReuniaoGeralStage = {
    ...DEFAULT_PREREUNIAO_GERAL_DATA,
    ...mode.preReuniaoGeralData,
    estoque: {
      ...DEFAULT_PREREUNIAO_GERAL_DATA.estoque,
      ...mode.preReuniaoGeralData?.estoque,
    },
  };

  // Calcular termômetro
  const termometro = calcTermometroRisco(
    financeiroExports,
    data.estoque.coberturaMedia,
    preReuniaoAdsData?.roasMedio7d || '',
    preReuniaoAdsData?.cpaMedio || '',
    preReuniaoAdsData?.ticketMedio || ''
  );

  // Calcular ROAS status
  const roasValue = parseFloat(preReuniaoAdsData?.roasMedio7d || '0') || 0;
  const roasStatus = getRoasStatus(roasValue);

  // Leitura combinada
  const leitura = getLeituraCombinada(
    financeiroExports.statusFinanceiro,
    data.estoque.coberturaMedia,
    roasStatus
  );

  const FinanceiroIcon = getStatusIcon(financeiroExports.statusFinanceiro);

  return (
    <div className="space-y-6">
      {/* ========== SCORE SEMANAL DO NEGÓCIO (NOVO) ========== */}
      <ScoreNegocioCard score={scoreNegocio} financeiroExports={financeiroExports} />

      {/* ========== TERMÔMETRO DE RISCO (LEGADO - mantido para comparação) ========== */}
      <Card className="border border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            Termômetro Legado (para referência)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Score */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Score combinado</span>
            <span className={cn(
              "text-lg font-bold",
              termometro.status === 'saudavel' ? 'text-green-600' :
              termometro.status === 'atencao' ? 'text-yellow-600' : 'text-destructive'
            )}>
              {termometro.score}/100
            </span>
          </div>
          
          {/* Barra */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getTermometroColor(termometro.score))}
              style={{ width: `${termometro.score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ========== PILAR 1: FINANCEIRO (readonly) ========== */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            1. Financeiro
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded text-xs font-medium",
              getStatusColor(financeiroExports.statusFinanceiro)
            )}>
              <FinanceiroIcon className="h-3 w-3 inline mr-1" />
              {financeiroExports.statusFinanceiro === 'estrategia' ? 'Estratégia' :
               financeiroExports.statusFinanceiro === 'atencao' ? 'Atenção' : 'Sobrevivência'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Caixa Livre Real</span>
            <span className="font-medium">{formatCurrency(financeiroExports.caixaLivreReal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Defasados 30d</span>
            <span className="font-medium text-orange-600">−{formatCurrency(financeiroExports.totalDefasados)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ads máximo</span>
            <span className="font-medium text-primary">{formatCurrency(financeiroExports.adsMaximoPermitido)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ========== PILAR 2: ESTOQUE (inputs) ========== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            2. Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Top 3 = % do faturamento</Label>
            <Input
              placeholder="Ex: 65%"
              value={data.estoque.top3Percentual}
              onChange={(e) => onUpdatePreReuniaoGeralData({ 
                estoque: { ...data.estoque, top3Percentual: e.target.value } 
              })}
              className="h-9"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cobertura média</Label>
            <RadioGroup
              value={data.estoque.coberturaMedia ?? ''}
              onValueChange={(value) => onUpdatePreReuniaoGeralData({ 
                estoque: { ...data.estoque, coberturaMedia: value as PreReuniaoGeralStage['estoque']['coberturaMedia'] } 
              })}
              className="flex gap-2"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="menos15" id="menos15" />
                <Label htmlFor="menos15" className="text-sm cursor-pointer">&lt;15d</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="15a30" id="15a30" />
                <Label htmlFor="15a30" className="text-sm cursor-pointer">15-30d</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="mais30" id="mais30" />
                <Label htmlFor="mais30" className="text-sm cursor-pointer">&gt;30d</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status compras</Label>
            <RadioGroup
              value={data.estoque.statusCompras ?? ''}
              onValueChange={(value) => onUpdatePreReuniaoGeralData({ 
                estoque: { ...data.estoque, statusCompras: value as PreReuniaoGeralStage['estoque']['statusCompras'] } 
              })}
              className="flex gap-2"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="pendente" id="pendente" />
                <Label htmlFor="pendente" className="text-sm cursor-pointer">Pendente</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="em_producao" id="em_producao" />
                <Label htmlFor="em_producao" className="text-sm cursor-pointer">Em produção</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="ok" id="ok" />
                <Label htmlFor="ok" className="text-sm cursor-pointer">OK</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* ========== PILAR 3: DEMANDA (readonly) ========== */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            3. Demanda
            {roasValue > 0 && (
              <span className={cn(
                "ml-auto px-2 py-0.5 rounded text-xs font-medium",
                getStatusColor(roasStatus)
              )}>
                ROAS {roasValue.toFixed(1)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preReuniaoAdsData?.roasMedio7d ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROAS 7d</span>
                <span className="font-medium">{preReuniaoAdsData.roasMedio7d}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPA médio</span>
                <span className="font-medium">{preReuniaoAdsData.cpaMedio || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Decisão sugerida</span>
                <span className="font-medium capitalize">{preReuniaoAdsData.decisaoSemana || '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Preencha a Pré-Reunião Ads primeiro
            </p>
          )}
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
          <CardTitle className="text-base">⚡ Decisão da Semana</CardTitle>
          <p className="text-xs text-muted-foreground">
            Escolha uma única prioridade
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.decisaoSemana ?? ''}
            onValueChange={(value) => onUpdatePreReuniaoGeralData({ 
              decisaoSemana: value as PreReuniaoGeralStage['decisaoSemana'] 
            })}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="preservar_caixa" id="preservar_caixa" />
              <Label htmlFor="preservar_caixa" className="flex-1 cursor-pointer">
                <span className="font-medium">🔴 Preservar caixa</span>
                <p className="text-xs text-muted-foreground">Foco em sobrevivência</p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="repor_estoque" id="repor_estoque" />
              <Label htmlFor="repor_estoque" className="flex-1 cursor-pointer">
                <span className="font-medium">📦 Repor estoque crítico</span>
                <p className="text-xs text-muted-foreground">Priorizar reposição</p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="crescer_controlado" id="crescer_controlado" />
              <Label htmlFor="crescer_controlado" className="flex-1 cursor-pointer">
                <span className="font-medium">🟡 Crescer controlado</span>
                <p className="text-xs text-muted-foreground">Aumentar com cautela</p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="crescer_agressivo" id="crescer_agressivo" />
              <Label htmlFor="crescer_agressivo" className="flex-1 cursor-pointer">
                <span className="font-medium">🟢 Crescer agressivo</span>
                <p className="text-xs text-muted-foreground">Acelerar investimentos</p>
              </Label>
            </div>
          </RadioGroup>
          
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Registro (opcional)</Label>
            <Textarea
              placeholder="Justificativa da decisão..."
              value={data.registroDecisao}
              onChange={(e) => onUpdatePreReuniaoGeralData({ registroDecisao: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
