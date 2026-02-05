import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';

interface FaturamentoInconsistenciaAlertProps {
  faturamentoEsperado30d: string;
  faturamentoCanais?: {
    b2b: string;
    ecomNuvem: string;
    ecomShopee: string;
    ecomAssinaturas: string;
  };
}

export function FaturamentoInconsistenciaAlert({
  faturamentoEsperado30d,
  faturamentoCanais,
}: FaturamentoInconsistenciaAlertProps) {
  const inconsistencia = useMemo(() => {
    const esperado = parseValorFlexivel(faturamentoEsperado30d);
    if (!esperado || !faturamentoCanais) return null;

    const somaCanais = 
      parseValorFlexivel(faturamentoCanais.b2b) +
      parseValorFlexivel(faturamentoCanais.ecomNuvem) +
      parseValorFlexivel(faturamentoCanais.ecomShopee) +
      parseValorFlexivel(faturamentoCanais.ecomAssinaturas);

    if (somaCanais === 0) return null;

    const diferenca = Math.abs(esperado - somaCanais);
    const percentualDiferenca = diferenca / esperado;

    // Alerta se diferença > 15%
    if (percentualDiferenca > 0.15) {
      return {
        esperado,
        somaCanais,
        diferenca,
        percentual: percentualDiferenca * 100,
        somaEhMaior: somaCanais > esperado,
      };
    }

    return null;
  }, [faturamentoEsperado30d, faturamentoCanais]);

  if (!inconsistencia) return null;

  const formatCurrency = (v: number) => 
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Alert variant="destructive" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-700 dark:text-yellow-400">
        Inconsistência de Faturamento Detectada
      </AlertTitle>
      <AlertDescription className="text-yellow-600 dark:text-yellow-500 text-sm space-y-1">
        <p>
          A soma dos canais ({formatCurrency(inconsistencia.somaCanais)}) diverge{' '}
          <strong>{inconsistencia.percentual.toFixed(0)}%</strong> do faturamento esperado ({formatCurrency(inconsistencia.esperado)}).
        </p>
        <p className="text-xs">
          {inconsistencia.somaEhMaior 
            ? 'Projeção por canais está acima do esperado global. Ajuste uma das fontes.'
            : 'Projeção por canais está abaixo do esperado global. Verifique se há canal faltando.'}
        </p>
      </AlertDescription>
    </Alert>
  );
}
