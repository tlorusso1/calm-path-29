import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SnapshotMensal {
  mesAno: string;
  entradas: number;
  saidas: number;
  saldo: number;
  geradoEm: string;
}

interface SnapshotsMensaisProps {
  snapshots: SnapshotMensal[];
}

const MESES: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatMesAno(mesAno: string): string {
  const [ano, mes] = mesAno.split('-');
  return `${MESES[mes] || mes}/${ano}`;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function SnapshotsMensais({ snapshots }: SnapshotsMensaisProps) {
  if (!snapshots?.length) return null;

  const sorted = [...snapshots].sort((a, b) => b.mesAno.localeCompare(a.mesAno));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          📅 Resultado Mensal
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">REAL</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {sorted.map((s) => (
            <div key={s.mesAno} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
              <span className="text-sm font-medium">{formatMesAno(s.mesAno)}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  E: {formatCurrency(s.entradas)} · S: {formatCurrency(s.saidas)}
                </span>
                <span className={cn(
                  "font-semibold",
                  s.saldo >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"
                )}>
                  {s.saldo >= 0 ? '+' : ''}{formatCurrency(s.saldo)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
