import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaturamentoCanais {
  b2b: string;
  ecomNuvem: string;
  ecomShopee: string;
  ecomAssinaturas: string;
}

interface FaturamentoCanaisCardProps {
  faturamentoCanais: FaturamentoCanais;
  onUpdate: (canais: FaturamentoCanais) => void;
}

interface CanalInfo {
  key: keyof FaturamentoCanais;
  label: string;
  color: string;
}

const CANAIS: CanalInfo[] = [
  { key: 'b2b', label: 'B2B', color: 'bg-blue-500' },
  { key: 'ecomNuvem', label: 'ECOM-NUVEM', color: 'bg-purple-500' },
  { key: 'ecomShopee', label: 'ECOM-SHOPEE', color: 'bg-orange-500' },
  { key: 'ecomAssinaturas', label: 'ECOM-ASSINATURAS (RITS)', color: 'bg-green-500' },
];

function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FaturamentoCanaisCard({
  faturamentoCanais,
  onUpdate,
}: FaturamentoCanaisCardProps) {
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaDoMes;
  
  // Calcular projeções
  const calculos = useMemo(() => {
    const resultado = CANAIS.map(canal => {
      const valorAtual = parseCurrency(faturamentoCanais[canal.key]);
      // Projeção: (valor atual / dia atual) * dias no mês
      const projecaoMes = diaDoMes > 0 ? (valorAtual / diaDoMes) * diasNoMes : 0;
      // Média diária atual
      const mediaDiaria = diaDoMes > 0 ? valorAtual / diaDoMes : 0;
      
      return {
        ...canal,
        valorAtual,
        projecaoMes,
        mediaDiaria,
      };
    });
    
    const totalAtual = resultado.reduce((acc, c) => acc + c.valorAtual, 0);
    const totalProjecao = resultado.reduce((acc, c) => acc + c.projecaoMes, 0);
    
    return { canais: resultado, totalAtual, totalProjecao };
  }, [faturamentoCanais, diaDoMes, diasNoMes]);
  
  const handleChange = (key: keyof FaturamentoCanais, value: string) => {
    onUpdate({
      ...faturamentoCanais,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            📈 Faturamento por Canal
          </span>
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Dia {diaDoMes}/{diasNoMes}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[1fr,100px,100px] gap-2 text-[10px] text-muted-foreground font-medium px-1">
          <span>Canal</span>
          <span className="text-right">Atual</span>
          <span className="text-right">Projeção Mês</span>
        </div>
        
        {/* Canais */}
        <div className="space-y-3">
          {calculos.canais.map(canal => (
            <div key={canal.key} className="space-y-1">
              <div className="grid grid-cols-[1fr,100px,100px] gap-2 items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", canal.color)} />
                  <span className="text-xs font-medium truncate">{canal.label}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                  <Input
                    value={faturamentoCanais[canal.key]}
                    onChange={(e) => handleChange(canal.key, e.target.value)}
                    placeholder="0,00"
                    className="h-7 text-xs pl-6 text-right"
                  />
                </div>
                <span className="text-xs text-right text-muted-foreground">
                  {formatCurrency(canal.projecaoMes)}
                </span>
              </div>
              {/* Barra de progresso do mês */}
              <div className="flex items-center gap-2 pl-4">
                <Progress 
                  value={(diaDoMes / diasNoMes) * 100} 
                  className={cn("h-1 flex-1", canal.color)} 
                />
                <span className="text-[9px] text-muted-foreground w-14 text-right">
                  ~{formatCurrency(canal.mediaDiaria).replace('R$', '')}/d
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div className="border-t pt-3 mt-3">
          <div className="grid grid-cols-[1fr,100px,100px] gap-2 items-center">
            <span className="text-sm font-bold">TOTAL</span>
            <span className="text-sm font-bold text-right">
              {formatCurrency(calculos.totalAtual)}
            </span>
            <span className="text-sm font-bold text-right text-primary">
              {formatCurrency(calculos.totalProjecao)}
            </span>
          </div>
        </div>
        
        {/* Insights */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Projeção:</strong> Baseada na média diária atual ({diaDoMes} dias)
          </p>
          <p className="text-xs text-muted-foreground">
            📅 Faltam <strong>{diasRestantes} dias</strong> para fechar o mês
          </p>
          {calculos.totalProjecao > 0 && (
            <p className="text-xs text-muted-foreground">
              📊 Média diária necessária para manter: <strong>
                {formatCurrency(calculos.totalProjecao / diasNoMes)}
              </strong>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
