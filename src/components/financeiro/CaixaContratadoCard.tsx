import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/modeStatusCalculator';
import { SectionHeader } from './SectionHeader';
import { CreditCard } from 'lucide-react';

interface CaixaContratadoData {
  nuvemshop: number;
  asaas: number;
  pagarMe: number;
  mercadoPago: number;
}

interface CaixaContratadoCardProps {
  aReceberPorConta: CaixaContratadoData;
  total: number;
}

const PRAZOS: Record<keyof CaixaContratadoData, string> = {
  nuvemshop: 'D+14',
  asaas: 'D+7',
  pagarMe: 'D+14',
  mercadoPago: 'D+14',
};

const LABELS: Record<keyof CaixaContratadoData, string> = {
  nuvemshop: 'Nuvemshop',
  asaas: 'Asaas (Assinaturas)',
  pagarMe: 'Pagar.me',
  mercadoPago: 'Mercado Pago',
};

export function CaixaContratadoCard({ aReceberPorConta, total }: CaixaContratadoCardProps) {
  const contas = Object.entries(aReceberPorConta).filter(([_, valor]) => valor > 0);
  
  if (total <= 0) return null;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <SectionHeader 
          icon="💳" 
          title="CAIXA CONTRATADO"
          subtitle="(vendas feitas, aguardando liquidação)"
        />
        
        <div className="space-y-2">
          {contas.map(([key, valor]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                {LABELS[key as keyof CaixaContratadoData]}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(valor)}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {PRAZOS[key as keyof CaixaContratadoData]}
                </span>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-2 mt-3 flex items-center justify-between">
            <span className="text-sm font-bold">TOTAL</span>
            <span className="text-lg font-bold text-blue-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
