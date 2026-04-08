import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SKUData {
  nome: string;
  qtdVendida: number;
  receitaTotal: number;
  custoUnitario: number;
}

interface PrecoMedioSKUCardProps {
  skus: SKUData[];
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PrecoMedioSKUCard({ skus }: PrecoMedioSKUCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dados = useMemo(() => {
    return skus
      .filter(s => s.qtdVendida > 0 && s.receitaTotal > 0)
      .map(s => {
        const precoMedio = s.receitaTotal / s.qtdVendida;
        const markup = s.custoUnitario > 0 ? ((precoMedio / s.custoUnitario) - 1) * 100 : 0;
        return {
          nome: s.nome,
          qtd: s.qtdVendida,
          receita: s.receitaTotal,
          precoMedio,
          custo: s.custoUnitario,
          markup,
        };
      })
      .sort((a, b) => b.receita - a.receita);
  }, [skus]);

  if (!dados.length) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                💰 Preço Médio por SKU
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">90 DIAS</span>
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">SKU</th>
                    <th className="text-right py-1.5 font-medium">Qtd</th>
                    <th className="text-right py-1.5 font-medium">Receita</th>
                    <th className="text-right py-1.5 font-medium">Preço Méd.</th>
                    <th className="text-right py-1.5 font-medium">Custo</th>
                    <th className="text-right py-1.5 font-medium">Markup</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="py-1.5 max-w-[160px] truncate" title={d.nome}>{d.nome}</td>
                      <td className="text-right py-1.5 text-muted-foreground">{d.qtd}</td>
                      <td className="text-right py-1.5">{fmt(d.receita)}</td>
                      <td className="text-right py-1.5 font-medium">{fmt(d.precoMedio)}</td>
                      <td className="text-right py-1.5 text-muted-foreground">{d.custo > 0 ? fmt(d.custo) : '—'}</td>
                      <td className={cn(
                        "text-right py-1.5 font-bold",
                        d.markup >= 100 ? "text-green-600" : d.markup >= 50 ? "text-amber-600" : "text-destructive"
                      )}>
                        {d.custo > 0 ? `${d.markup.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">
              Dados das saídas dos últimos 90 dias · Preço = Receita ÷ Quantidade · Markup = (Preço/Custo - 1)
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
