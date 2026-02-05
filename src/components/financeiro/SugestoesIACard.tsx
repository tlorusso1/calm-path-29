import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, RefreshCw, Loader2, Flame, TrendingDown, ShoppingBag, BarChart3, Scissors } from 'lucide-react';
import { ContaFluxo, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SugestaoIA {
  tipo: 'urgente' | 'custo' | 'vendas' | 'estoque' | 'marketing';
  titulo: string;
  descricao: string;
  impactoEstimado?: string;
}

export interface SugestoesIAState {
  sugestoes: SugestaoIA[];
  geradoEm: string;
  contextoHash: string;
}

interface SugestoesIACardProps {
  contasFluxo: ContaFluxo[];
  caixaLivre: number;
  folegoEmDias: number | null;
  statusRisco: 'verde' | 'amarelo' | 'vermelho';
  faturamentoMes: string;
  custoFixo: string;
  marketingEstrutural: string;
  faturamentoCanais?: {
    b2b: string;
    ecomNuvem: string;
    ecomShopee: string;
    ecomAssinaturas: string;
  };
  sugestoesState?: SugestoesIAState;
  onUpdateSugestoes: (sugestoes: SugestoesIAState) => void;
}

function getIcon(tipo: SugestaoIA['tipo']) {
  switch (tipo) {
    case 'urgente': return <Flame className="h-4 w-4 text-destructive" />;
    case 'custo': return <Scissors className="h-4 w-4 text-yellow-600" />;
    case 'vendas': return <TrendingDown className="h-4 w-4 text-green-600" />;
    case 'estoque': return <ShoppingBag className="h-4 w-4 text-blue-600" />;
    case 'marketing': return <BarChart3 className="h-4 w-4 text-purple-600" />;
  }
}

function getTipoLabel(tipo: SugestaoIA['tipo']) {
  switch (tipo) {
    case 'urgente': return 'PRIORIDADE ALTA';
    case 'custo': return 'CUSTO FIXO';
    case 'vendas': return 'VENDAS';
    case 'estoque': return 'ESTOQUE';
    case 'marketing': return 'MARKETING';
  }
}

function getTipoColor(tipo: SugestaoIA['tipo']) {
  switch (tipo) {
    case 'urgente': return 'bg-destructive/10 border-destructive/30';
    case 'custo': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300';
    case 'vendas': return 'bg-green-50 dark:bg-green-900/20 border-green-300';
    case 'estoque': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300';
    case 'marketing': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-300';
  }
}

export function SugestoesIACard({
  contasFluxo,
  caixaLivre,
  folegoEmDias,
  statusRisco,
  faturamentoMes,
  custoFixo,
  marketingEstrutural,
  faturamentoCanais,
  sugestoesState,
  onUpdateSugestoes,
}: SugestoesIACardProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Calcular contexto atual
  const contexto = useMemo(() => {
    const faturadoAtual = faturamentoCanais
      ? parseValorFlexivel(faturamentoCanais.b2b) +
        parseValorFlexivel(faturamentoCanais.ecomNuvem) +
        parseValorFlexivel(faturamentoCanais.ecomShopee) +
        parseValorFlexivel(faturamentoCanais.ecomAssinaturas)
      : 0;

    // Contas a pagar próximos 30 dias
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const em30diasStr = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const contasPagar30d = contasFluxo
      .filter(c => !c.pago && c.tipo === 'pagar' && c.dataVencimento >= hojeStr && c.dataVencimento <= em30diasStr)
      .reduce((sum, c) => sum + parseValorFlexivel(c.valor), 0);

    const custoFixoVal = parseValorFlexivel(custoFixo);
    const mktEstrutural = parseValorFlexivel(marketingEstrutural);
    const totalSaidas = contasPagar30d + custoFixoVal + mktEstrutural;
    const metaMensal = totalSaidas / MARGEM_OPERACIONAL;
    const progressoMeta = metaMensal > 0 ? faturadoAtual / metaMensal : 0;

    // Identificar top categorias de despesa (simplificado)
    const despesasPorCategoria: Record<string, number> = {};
    contasFluxo
      .filter(c => c.pago && c.tipo === 'pagar')
      .forEach(c => {
        const cat = c.categoria || 'Outros';
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + parseValorFlexivel(c.valor);
      });
    
    const topCategorias = Object.entries(despesasPorCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    return {
      caixaLivre,
      folegoDias: folegoEmDias,
      statusRisco,
      faturamentoMes: faturadoAtual,
      metaMensal,
      progressoMeta,
      custoFixo: custoFixoVal,
      marketingEstrutural: mktEstrutural,
      contasPagar30d,
      topCategoriasDespesa: topCategorias,
    };
  }, [contasFluxo, caixaLivre, folegoEmDias, statusRisco, custoFixo, marketingEstrutural, faturamentoCanais]);

  // Hash simples do contexto para detectar mudanças
  const contextoHash = useMemo(() => {
    return JSON.stringify({
      caixa: Math.round(contexto.caixaLivre / 1000),
      folego: contexto.folegoDias,
      status: contexto.statusRisco,
      progresso: Math.round(contexto.progressoMeta * 100),
    });
  }, [contexto]);

  // Verificar se precisa atualizar
  const precisaAtualizar = useMemo(() => {
    if (!sugestoesState) return true;
    
    // Contexto mudou significativamente
    if (sugestoesState.contextoHash !== contextoHash) return true;
    
    // Mais de 7 dias
    const geradoEm = new Date(sugestoesState.geradoEm);
    const diasPassados = (Date.now() - geradoEm.getTime()) / (1000 * 60 * 60 * 24);
    return diasPassados > 7;
  }, [sugestoesState, contextoHash]);

  const handleGerarSugestoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sugestoes', {
        body: { contexto },
      });

      if (error) {
        console.error('Erro ao gerar sugestões:', error);
        toast.error('Erro ao gerar sugestões. Tente novamente.');
        return;
      }

      if (data?.sugestoes) {
        onUpdateSugestoes({
          sugestoes: data.sugestoes,
          geradoEm: new Date().toISOString(),
          contextoHash,
        });
        toast.success('Sugestões atualizadas!');
      }
    } catch (err) {
      console.error('Erro ao gerar sugestões:', err);
      toast.error('Erro ao gerar sugestões.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tempoDesdeAtualizacao = sugestoesState?.geradoEm
    ? formatDistanceToNow(new Date(sugestoesState.geradoEm), { locale: ptBR, addSuffix: true })
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Sugestões da Semana
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGerarSugestoes}
            disabled={isLoading}
            className="gap-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                {precisaAtualizar ? 'Gerar' : 'Atualizar'}
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contexto atual */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Baseado na sua situação atual:</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>• Caixa Livre: {formatCurrency(contexto.caixaLivre)} ({contexto.statusRisco === 'verde' ? 'Saudável' : contexto.statusRisco === 'amarelo' ? 'Atenção' : 'Crítico'})</p>
            <p>• Fôlego: {contexto.folegoDias === null ? '∞' : `${contexto.folegoDias} dias`}</p>
            <p>• Meta vs Realizado: {(contexto.progressoMeta * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Sugestões */}
        {sugestoesState?.sugestoes && sugestoesState.sugestoes.length > 0 ? (
          <div className="space-y-3">
            {sugestoesState.sugestoes.map((sugestao, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getTipoColor(sugestao.tipo)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getIcon(sugestao.tipo)}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {getTipoLabel(sugestao.tipo)}
                  </span>
                </div>
                <p className="text-sm font-medium">{sugestao.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{sugestao.descricao}</p>
                {sugestao.impactoEstimado && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Impacto: {sugestao.impactoEstimado}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Clique em "Gerar" para receber sugestões personalizadas</p>
          </div>
        )}

        {/* Última atualização */}
        {tempoDesdeAtualizacao && (
          <p className="text-xs text-muted-foreground text-center">
            Última atualização: {tempoDesdeAtualizacao}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
