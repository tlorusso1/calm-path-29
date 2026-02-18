import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wallet, X } from 'lucide-react';
import { ContaFluxo, FinanceiroContas } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, isToday, addDays, isBefore, isAfter } from 'date-fns';

interface AlertaCaixaInsuficienteProps {
  contasFluxo: ContaFluxo[];
  contasBancarias: FinanceiroContas | undefined;
  onDismiss?: () => void;
}

export function AlertaCaixaInsuficiente({
  contasFluxo,
  contasBancarias,
  onDismiss,
}: AlertaCaixaInsuficienteProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const limite5d = addDays(hoje, 5);

  // Mesma lógica do CaixaVsAPagar5d: CC vs CDB separados
  const contas = useMemo(() => {
    if (!contasBancarias) return { ccFoods: 0, cdbFoods: 0, ccEcom: 0, cdbEcom: 0 };
    return {
      ccFoods:  parseValorFlexivel(contasBancarias.itauNiceFoods.saldo || ''),
      cdbFoods: parseValorFlexivel(contasBancarias.itauNiceFoods.cdb || ''),
      ccEcom:   parseValorFlexivel(contasBancarias.itauNiceEcom.saldo || ''),
      cdbEcom:  parseValorFlexivel(contasBancarias.itauNiceEcom.cdb || ''),
    };
  }, [contasBancarias]);

  const saldoCC = contas.ccFoods + contas.ccEcom;
  const saldoCDB = contas.cdbFoods + contas.cdbEcom;
  const saldoTotal = saldoCC + saldoCDB;

  // Total a pagar nos próximos 5 dias (mesma lógica do CaixaVsAPagar5d)
  const totalPagar5d = useMemo(() => {
    return contasFluxo
      .filter(c => {
        if (c.pago || c.tipo !== 'pagar') return false;
        const data = parseISO(c.dataVencimento);
        return (isToday(data) || isAfter(data, hoje)) && isBefore(data, limite5d);
      })
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  }, [contasFluxo, hoje, limite5d]);

  // Total a pagar HOJE
  const totalPagarHoje = useMemo(() => {
    return contasFluxo
      .filter(c => !c.pago && c.tipo === 'pagar' && isToday(parseISO(c.dataVencimento)))
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  }, [contasFluxo]);

  // Só alerta quando NEM CC + CDB cobre (falta real, não apenas "precisa resgatar CDB")
  const falta = saldoTotal < totalPagar5d;
  const faltaHoje = saldoTotal < totalPagarHoje;
  const valorFaltante = faltaHoje
    ? totalPagarHoje - saldoTotal
    : totalPagar5d - saldoTotal;

  useEffect(() => {
    if (falta && !dismissed) {
      setIsOpen(true);
    }
  }, [falta, dismissed]);

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissed(true);
    onDismiss?.();
  };

  const fmt = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Só mostra quando há falta real (nem CC + CDB cobre)
  if (!falta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            {faltaHoje ? '⚠️ CAIXA INSUFICIENTE HOJE' : '⚠️ CAIXA INSUFICIENTE (5 dias)'}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {faltaHoje
              ? 'Pagamentos de hoje excedem todo o saldo Itaú (CC + CDB).'
              : 'Nos próximos 5 dias, seus pagamentos excedem o saldo total Itaú (CC + CDB).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">Saldo CC Itaú</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(saldoCC)}</p>
              {saldoCDB > 0 && (
                <p className="text-[10px] text-muted-foreground">+ CDB {fmt(saldoCDB)}</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-xs text-muted-foreground">
                {faltaHoje ? 'A Pagar Hoje' : 'A Pagar (5 dias)'}
              </p>
              <p className="text-lg font-bold text-destructive">
                {fmt(faltaHoje ? totalPagarHoje : totalPagar5d)}
              </p>
            </div>
          </div>

          {/* Valor Faltante */}
          <div className="p-4 rounded-lg bg-destructive/20 border-2 border-destructive text-center">
            <p className="text-sm text-destructive font-medium mb-1">FALTA (mesmo com CDB)</p>
            <p className="text-2xl font-bold text-destructive">{fmt(valorFaltante)}</p>
          </div>

          {/* Sugestão */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Sugestão: Puxar de outras contas
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-6 list-disc">
              <li>Asaas (Antecipar recebíveis)</li>
              <li>Pagar.me (Antecipar recebíveis)</li>
              <li>Nuvemshop (Solicitar antecipação)</li>
              <li>Mercado Pago (Transferir saldo)</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-1" />
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
