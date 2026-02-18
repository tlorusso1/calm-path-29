import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ContaFluxo, FinanceiroContas } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, isToday, addDays, isAfter, isBefore } from 'date-fns';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

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

  const contas = useMemo(() => {
    if (!contasBancarias) return { ccFoods: 0, cdbFoods: 0, ccEcom: 0, cdbEcom: 0 };
    return {
      ccFoods:  parseValorFlexivel(contasBancarias.itauNiceFoods.saldo || ''),
      cdbFoods: parseValorFlexivel(contasBancarias.itauNiceFoods.cdb || ''),
      ccEcom:   parseValorFlexivel(contasBancarias.itauNiceEcom.saldo || ''),
      cdbEcom:  parseValorFlexivel(contasBancarias.itauNiceEcom.cdb || ''),
    };
  }, [contasBancarias]);

  // Saldo CC: já disponível para pagar
  const saldoCC = contas.ccFoods + contas.ccEcom;
  // CDB: precisa resgatar
  const saldoCDB = contas.cdbFoods + contas.cdbEcom;
  // Total combinado
  const saldoTotal = saldoCC + saldoCDB;

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
      totalPagar5d:  contas5d.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0),
      totalPagarHoje: hoje_.reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0),
      contasPagar5d: contas5d.length,
    };
  }, [contasFluxo, hoje, limite5d]);

  // Saldo CC já cobre?
  const ccCobre = saldoCC >= totalPagar5d;
  // Precisará resgatar CDB?
  const precisaCDB = !ccCobre && saldoTotal >= totalPagar5d;
  // Nem com CDB cobre
  const falta = saldoTotal < totalPagar5d;

  const saldo = saldoTotal - totalPagar5d;

  return (
    <Card className={falta ? 'border-destructive/60 bg-destructive/5' : 'border-border'}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {falta
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          }
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Caixa Itaú vs A Pagar (5 dias) · {contasPagar5d} conta(s)
          </span>
        </div>

        {/* Grid principal: CC | vs | A Pagar */}
        <div className="grid grid-cols-3 gap-3 items-center">
          {/* Saldo CC (disponível agora) */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CC disponível</p>
            <p className={`text-xl font-bold ${ccCobre ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {fmt(saldoCC)}
            </p>
            {/* Breakdown por banco */}
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">Foods:</span> {fmt(contas.ccFoods)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">Ecom:</span> {fmt(contas.ccEcom)}
              </p>
            </div>
          </div>

          {/* Centro: resultado */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className={`text-sm font-bold ${
              ccCobre ? 'text-emerald-600 dark:text-emerald-400' :
              precisaCDB ? 'text-yellow-600 dark:text-yellow-400' :
              'text-destructive'
            }`}>
              {falta
                ? `falta ${fmt(Math.abs(saldo))}`
                : ccCobre
                  ? `sobra ${fmt(saldo)}`
                  : `precisa CDB`
              }
            </span>
            {totalPagarHoje > 0 && (
              <span className="text-[10px] text-destructive font-medium">
                hoje: {fmt(totalPagarHoje)}
              </span>
            )}
            {precisaCDB && !falta && (
              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
                resgatar CDB
              </span>
            )}
          </div>

          {/* A Pagar */}
          <div className="space-y-1 text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Pagar (5d)</p>
            <p className={`text-xl font-bold ${falta ? 'text-destructive' : 'text-foreground'}`}>
              {fmt(totalPagar5d)}
            </p>
            <p className="text-[10px] text-muted-foreground">{contasPagar5d} lançamentos</p>
          </div>
        </div>

        {/* Linha de CDB — só mostra se tem valor */}
        {saldoCDB > 0 && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div className="flex gap-4">
              <span className="text-[10px] text-muted-foreground">
                CDB Foods: <span className="font-medium text-foreground">{fmt(contas.cdbFoods)}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                CDB Ecom: <span className="font-medium text-foreground">{fmt(contas.cdbEcom)}</span>
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              total c/ CDB: <span className="font-medium text-foreground">{fmt(saldoTotal)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
