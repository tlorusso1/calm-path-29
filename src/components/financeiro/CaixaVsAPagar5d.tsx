import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ContaFluxo, FinanceiroContas } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, isToday, addDays, isAfter, isBefore } from 'date-fns';
import { Wallet, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CaixaVsAPagar5dProps {
  contasFluxo: ContaFluxo[];
  contasBancarias: FinanceiroContas | undefined;
}

const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CaixaVsAPagar5d({ contasFluxo, contasBancarias }: CaixaVsAPagar5dProps) {
  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const limite5d = addDays(hoje, 5);

  const saldoItau = useMemo(() => {
    if (!contasBancarias) return 0;
    return (
      parseValorFlexivel(contasBancarias.itauNiceFoods.saldo || '') +
      parseValorFlexivel(contasBancarias.itauNiceFoods.cdb || '') +
      parseValorFlexivel(contasBancarias.itauNiceEcom.saldo || '') +
      parseValorFlexivel(contasBancarias.itauNiceEcom.cdb || '')
    );
  }, [contasBancarias]);

  const { totalPagar5d, totalPagarHoje, contasPagar5d } = useMemo(() => {
    const contas5d = contasFluxo.filter(c => {
      if (c.pago || c.tipo !== 'pagar') return false;
      const data = parseISO(c.dataVencimento);
      return (isToday(data) || isAfter(data, hoje)) && isBefore(data, limite5d);
    });

    const hoje_ = contasFluxo.filter(c =>
      !c.pago && c.tipo === 'pagar' && isToday(parseISO(c.dataVencimento))
    );

    return {
      totalPagar5d: contas5d.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0),
      totalPagarHoje: hoje_.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0),
      contasPagar5d: contas5d.length,
    };
  }, [contasFluxo, hoje, limite5d]);

  const saldo = saldoItau - totalPagar5d;
  const falta = saldo < 0;
  const folga = !falta;

  return (
    <Card className={falta ? 'border-destructive/60 bg-destructive/5' : 'border-border'}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {falta
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <CheckCircle2 className="h-4 w-4 text-green-500" />
          }
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Caixa Itaú vs A Pagar (5 dias) · {contasPagar5d} conta(s)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 items-center">
          {/* Caixa Itaú */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <Wallet className="h-3 w-3 inline mr-0.5" />
              Caixa Itaú
            </p>
            <p className="text-lg font-bold text-foreground">{fmt(saldoItau)}</p>
            <p className="text-[10px] text-muted-foreground">(Itaú + CDB)</p>
          </div>

          {/* Seta */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className={`text-sm font-bold ${falta ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {falta ? `falta ${fmt(Math.abs(saldo))}` : `sobra ${fmt(saldo)}`}
            </span>
            {totalPagarHoje > 0 && (
              <span className="text-[10px] text-destructive font-medium">
                hoje: {fmt(totalPagarHoje)}
              </span>
            )}
          </div>

          {/* A Pagar */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              A Pagar (5d)
            </p>
            <p className={`text-lg font-bold ${falta ? 'text-destructive' : 'text-foreground'}`}>
              {fmt(totalPagar5d)}
            </p>
            <p className="text-[10px] text-muted-foreground">({contasPagar5d} lançamentos)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
