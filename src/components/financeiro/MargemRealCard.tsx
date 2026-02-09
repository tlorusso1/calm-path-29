import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calculator } from 'lucide-react';
import { ContaFluxo, MARGEM_OPERACIONAL } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { cn } from '@/lib/utils';

interface MargemRealCardProps {
  contasFluxo: ContaFluxo[];
  faturamentoMes: string;
}

export function MargemRealCard({ contasFluxo, faturamentoMes }: MargemRealCardProps) {
  const data = useMemo(() => {
    const faturamento = parseValorFlexivel(faturamentoMes);
    if (faturamento <= 0) return null;

    // Identificar lançamentos de compra de produtos e logística (pagos, últimos 60 dias)
    const hoje = new Date();
    const limite60d = new Date(hoje);
    limite60d.setDate(limite60d.getDate() - 60);
    
    const comprasELogistica = contasFluxo
      .filter(c => {
        if (!c.pago || c.tipo !== 'pagar') return false;
        const tipoLower = c.tipo as string;
        if (tipoLower === 'intercompany') return false; // Excluir intercompany
        
        // Categorias que representam CMV (Custo de Mercadoria Vendida)
        const cat = (c.categoria || '').toLowerCase();
        const desc = (c.descricao || '').toLowerCase();
        
        const isCMV = 
          cat.includes('compra') ||
          cat.includes('produto') ||
          cat.includes('mercadoria') ||
          cat.includes('frete') ||
          cat.includes('logística') ||
          cat.includes('logistica') ||
          cat.includes('matéria') ||
          cat.includes('materia') ||
          cat.includes('embalagem') ||
          desc.includes('produção') ||
          desc.includes('producao') ||
          desc.includes('fornecedor');
        
        return isCMV;
      })
      .reduce((sum, c) => sum + parseValorFlexivel(c.valor), 0);

    // Margem Real = 1 - (CMV / Faturamento)
    const margemReal = 1 - (comprasELogistica / faturamento);
    const margemRealPercent = margemReal * 100;
    const margemPadraoPercent = MARGEM_OPERACIONAL * 100;
    const desvio = margemRealPercent - margemPadraoPercent;
    
    // Alerta se desvio > 5 p.p.
    const temAlerta = Math.abs(desvio) > 5;
    const alertaNegativo = desvio < -5;
    
    return {
      margemReal,
      margemRealPercent,
      margemPadraoPercent,
      desvio,
      temAlerta,
      alertaNegativo,
      totalCMV: comprasELogistica,
      faturamento,
    };
  }, [contasFluxo, faturamentoMes]);

  if (!data) {
    return null; // Não renderiza se não tem faturamento
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          📊 Margem Real Estimada
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">REAL</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(
              "text-2xl font-bold",
              data.alertaNegativo ? 'text-destructive' : 
              data.temAlerta ? 'text-yellow-600' : 'text-foreground'
            )}>
              {data.margemRealPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              vs {data.margemPadraoPercent.toFixed(0)}% padrão
            </p>
          </div>
          
          {data.temAlerta && (
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1",
                data.alertaNegativo 
                  ? 'bg-destructive/10 text-destructive border-destructive/30' 
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {data.desvio > 0 ? '+' : ''}{data.desvio.toFixed(1)} p.p.
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
          <div className="flex justify-between">
            <span>CMV identificado (60d)</span>
            <span>{data.totalCMV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Faturamento base</span>
            <span>{data.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>

        {data.alertaNegativo && (
          <p className="text-xs text-destructive bg-destructive/5 p-2 rounded">
            ⚠️ Margem abaixo do padrão. Revisar custos de aquisição/logística.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
