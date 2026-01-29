import { FocusMode, ReuniaoAdsStage, ReuniaoAdsAcao, DEFAULT_REUNIAO_ADS_DATA } from '@/types/focus-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { BarChart3, Plus, Trash2, Target, Zap } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, parseCurrency } from '@/utils/modeStatusCalculator';

interface ReuniaoAdsModeProps {
  mode: FocusMode;
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

export function ReuniaoAdsMode({
  mode,
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

  // Calcular distribuição
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

  return (
    <div className="space-y-6">
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

      {/* Texto âncora */}
      <p className="text-xs text-muted-foreground italic text-center pt-2">
        "Executa o que foi decidido. Sem improvisos."
      </p>
    </div>
  );
}
