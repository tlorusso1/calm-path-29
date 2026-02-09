import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wallet, ArrowRight, X } from 'lucide-react';
import { ContaFluxo, FinanceiroContas } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { parseISO, isToday, addDays, format, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertaCaixaInsuficienteProps {
  contasFluxo: ContaFluxo[];
  contasBancarias: FinanceiroContas | undefined;
  onDismiss?: () => void;
}

const parseCurrency = (val: string | undefined): number => {
  if (!val) return 0;
  return parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
};

export function AlertaCaixaInsuficiente({
  contasFluxo,
  contasBancarias,
  onDismiss,
}: AlertaCaixaInsuficienteProps) {
  const [dismissed, setDismissed] = useState(false);
  const [show5dWarning, setShow5dWarning] = useState(true);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite5d = addDays(hoje, 5);

  // Calcular saldo Itaú disponível
  const saldoItauTotal = useMemo(() => {
    if (!contasBancarias) return 0;
    return (
      parseCurrency(contasBancarias.itauNiceFoods.saldo) +
      parseCurrency(contasBancarias.itauNiceFoods.cdb) +
      parseCurrency(contasBancarias.itauNiceEcom.saldo) +
      parseCurrency(contasBancarias.itauNiceEcom.cdb)
    );
  }, [contasBancarias]);

  // Calcular total a pagar HOJE
  const totalPagarHoje = useMemo(() => {
    return contasFluxo
      .filter(c => !c.pago && c.tipo === 'pagar' && isToday(parseISO(c.dataVencimento)))
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  }, [contasFluxo]);

  // Calcular total a pagar nos próximos 5 dias
  const totalPagar5d = useMemo(() => {
    return contasFluxo
      .filter(c => {
        if (c.pago || c.tipo !== 'pagar') return false;
        const data = parseISO(c.dataVencimento);
        return (isToday(data) || isAfter(data, hoje)) && isBefore(data, limite5d);
      })
      .reduce((acc, c) => acc + parseValorFlexivel(c.valor), 0);
  }, [contasFluxo, hoje, limite5d]);

  // Saldo insuficiente?
  const faltaHoje = saldoItauTotal < totalPagarHoje;
  const falta5d = saldoItauTotal < totalPagar5d;
  const valorFaltante = faltaHoje 
    ? totalPagarHoje - saldoItauTotal 
    : totalPagar5d - saldoItauTotal;

  // Auto-abrir modal se faltar caixa
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Só abre se há falta e não foi dispensado nesta sessão
    if ((faltaHoje || falta5d) && !dismissed) {
      setIsOpen(true);
    }
  }, [faltaHoje, falta5d, dismissed]);

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissed(true);
    onDismiss?.();
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Não mostrar nada se não há problema
  if (!faltaHoje && !falta5d) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            {faltaHoje ? '⚠️ CAIXA INSUFICIENTE HOJE' : '⚠️ CAIXA INSUFICIENTE (5 dias)'}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {faltaHoje ? (
              <span>
                Você tem pagamentos vencendo <strong>hoje</strong> que excedem o saldo disponível no Itaú.
              </span>
            ) : (
              <span>
                Nos próximos 5 dias, seus pagamentos excedem o saldo disponível no Itaú.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo Financeiro */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">Saldo Itaú Disponível</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(saldoItauTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-xs text-muted-foreground">
                {faltaHoje ? 'A Pagar Hoje' : 'A Pagar (5 dias)'}
              </p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(faltaHoje ? totalPagarHoje : totalPagar5d)}
              </p>
            </div>
          </div>

          {/* Valor Faltante */}
          <div className="p-4 rounded-lg bg-destructive/20 border-2 border-destructive text-center">
            <p className="text-sm text-destructive font-medium mb-1">FALTA</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(valorFaltante)}</p>
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
