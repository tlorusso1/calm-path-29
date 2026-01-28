import { FocusMode, MarketingStage } from '@/types/focus-mode';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MarketingModeProps {
  mode: FocusMode;
  onUpdateMarketingData: (data: Partial<MarketingStage>) => void;
}

export function MarketingMode({
  mode,
  onUpdateMarketingData,
}: MarketingModeProps) {
  const defaultData: MarketingStage = {
    mesFechouPositivo: null,
    verbaAds: '',
    focoSemana: '',
    verificacoes: {
      campanhasAtivas: false,
      remarketingRodando: false,
      conteudoPublicado: false,
      emailEnviado: false,
      influencersVerificados: false,
    },
    naoFazerSemana: '',
    decisaoSemana: null,
    observacaoDecisao: '',
  };

  const data: MarketingStage = {
    ...defaultData,
    ...mode.marketingData,
    verificacoes: {
      ...defaultData.verificacoes,
      ...mode.marketingData?.verificacoes,
    },
  };

  const handleVerificacaoChange = (key: keyof MarketingStage['verificacoes'], checked: boolean) => {
    onUpdateMarketingData({
      verificacoes: {
        ...data.verificacoes,
        [key]: checked,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Seção 1: Contexto Mensal */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          📅 Contexto Mensal
        </h3>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Mês fechou positivo?
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateMarketingData({ mesFechouPositivo: true })}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  data.mesFechouPositivo === true
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                Sim
              </button>
              <button
                onClick={() => onUpdateMarketingData({ mesFechouPositivo: false })}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  data.mesFechouPositivo === false
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                Não
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Verba liberada para Ads
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                placeholder="0,00"
                value={data.verbaAds}
                onChange={(e) => onUpdateMarketingData({ verbaAds: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground italic">
          "Este valor não será revisto até o próximo fechamento."
        </p>
      </div>

      {/* Seção 2: Foco da Semana */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          🎯 Foco da Semana
        </h3>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Qual é o foco desta semana? (apenas um)
          </Label>
          <Input
            type="text"
            placeholder="Ex: Lançar campanha de remarketing"
            value={data.focoSemana}
            onChange={(e) => onUpdateMarketingData({ focoSemana: e.target.value })}
          />
        </div>
      </div>

      {/* Seção 3: O que preciso ver/cobrar */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          👁️ O que preciso ver / cobrar
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="campanhas"
              checked={data.verificacoes.campanhasAtivas}
              onCheckedChange={(checked) => handleVerificacaoChange('campanhasAtivas', checked as boolean)}
            />
            <Label htmlFor="campanhas" className="text-sm cursor-pointer">
              Campanhas ativas
            </Label>
          </div>
          
          <div className="flex items-center gap-3">
            <Checkbox
              id="remarketing"
              checked={data.verificacoes.remarketingRodando}
              onCheckedChange={(checked) => handleVerificacaoChange('remarketingRodando', checked as boolean)}
            />
            <Label htmlFor="remarketing" className="text-sm cursor-pointer">
              Remarketing rodando
            </Label>
          </div>
          
          <div className="flex items-center gap-3">
            <Checkbox
              id="conteudo"
              checked={data.verificacoes.conteudoPublicado}
              onCheckedChange={(checked) => handleVerificacaoChange('conteudoPublicado', checked as boolean)}
            />
            <Label htmlFor="conteudo" className="text-sm cursor-pointer">
              Conteúdo publicado/programado
            </Label>
          </div>
          
          <div className="flex items-center gap-3">
            <Checkbox
              id="email"
              checked={data.verificacoes.emailEnviado}
              onCheckedChange={(checked) => handleVerificacaoChange('emailEnviado', checked as boolean)}
            />
            <Label htmlFor="email" className="text-sm cursor-pointer">
              E-mail/promoção enviado/agendado
            </Label>
          </div>
          
          <div className="flex items-center gap-3">
            <Checkbox
              id="influencers"
              checked={data.verificacoes.influencersVerificados}
              onCheckedChange={(checked) => handleVerificacaoChange('influencersVerificados', checked as boolean)}
            />
            <Label htmlFor="influencers" className="text-sm cursor-pointer">
              Influencers/parcerias verificados
            </Label>
          </div>
        </div>
      </div>

      {/* Seção 4: O que NÃO fazer */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          🚫 O que NÃO vamos fazer esta semana
        </h3>
        
        <Input
          type="text"
          placeholder="Ex: Não vamos mexer na campanha principal"
          value={data.naoFazerSemana}
          onChange={(e) => onUpdateMarketingData({ naoFazerSemana: e.target.value })}
        />
      </div>

      {/* Seção 5: Decisão da Semana */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          ⚡ Decisão da Semana
        </h3>
        
        <RadioGroup
          value={data.decisaoSemana || ''}
          onValueChange={(value) => onUpdateMarketingData({ 
            decisaoSemana: value as 'manter' | 'ajuste' | 'pausar' 
          })}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="manter" id="manter" />
            <Label htmlFor="manter" className="text-sm cursor-pointer">
              Manter
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="ajuste" id="ajuste" />
            <Label htmlFor="ajuste" className="text-sm cursor-pointer">
              Ajuste pequeno
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="pausar" id="pausar" />
            <Label htmlFor="pausar" className="text-sm cursor-pointer">
              Pausar algo específico
            </Label>
          </div>
        </RadioGroup>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Observação (opcional)
          </Label>
          <Textarea
            placeholder="Detalhes da decisão..."
            value={data.observacaoDecisao}
            onChange={(e) => onUpdateMarketingData({ observacaoDecisao: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {/* Texto âncora final */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
        <p className="text-sm font-medium text-foreground italic">
          "Marketing não é fazer mais.<br />
          É escolher onde prestar atenção."
        </p>
      </div>
    </div>
  );
}
