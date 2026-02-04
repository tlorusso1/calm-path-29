import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ContaFluxo } from '@/types/focus-mode';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContasFluxoSectionProps {
  contas: ContaFluxo[];
  onAddConta: (conta: Omit<ContaFluxo, 'id'>) => void;
  onRemoveConta: (id: string) => void;
  onTogglePago: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ContasFluxoSection({
  contas,
  onAddConta,
  onRemoveConta,
  onTogglePago,
  isOpen,
  onToggle,
}: ContasFluxoSectionProps) {
  const [tipo, setTipo] = useState<'pagar' | 'receber'>('pagar');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');

  const hoje = new Date();
  const limite30d = addDays(hoje, 30);

  // Filtrar contas dos próximos 30 dias e não pagas
  const contasPagar = contas
    .filter(c => c.tipo === 'pagar' && !c.pago)
    .filter(c => {
      const data = parseISO(c.dataVencimento);
      return isAfter(data, hoje) || format(data, 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd');
    })
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const contasReceber = contas
    .filter(c => c.tipo === 'receber' && !c.pago)
    .filter(c => {
      const data = parseISO(c.dataVencimento);
      return isAfter(data, hoje) || format(data, 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd');
    })
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

  const handleAdd = () => {
    if (!descricao.trim() || !valor || !dataVencimento) return;

    onAddConta({
      tipo,
      descricao: descricao.trim(),
      valor,
      dataVencimento,
      pago: false,
    });

    // Reset form
    setDescricao('');
    setValor('');
    setDataVencimento('');
  };

  const formatCurrency = (val: string): string => {
    const num = parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                📑 Contas a Pagar/Receber
              </span>
              <div className="flex items-center gap-2">
                {contas.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {contas.filter(c => !c.pago).length} pendente(s)
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Form para adicionar */}
            <div className="grid grid-cols-12 gap-2 p-3 rounded-lg border bg-muted/30">
              <div className="col-span-3">
                <Select value={tipo} onValueChange={(v) => setTipo(v as 'pagar' | 'receber')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Input
                  placeholder="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="h-8 text-xs pl-7 text-right"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="h-8 text-xs"
                  min={format(hoje, 'yyyy-MM-dd')}
                  max={format(limite30d, 'yyyy-MM-dd')}
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full"
                  onClick={handleAdd}
                  disabled={!descricao.trim() || !valor || !dataVencimento}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Lista A Pagar */}
            {contasPagar.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3 text-destructive" />
                  A Pagar (próx. 30d)
                </p>
                <div className="space-y-1">
                  {contasPagar.map((conta) => (
                    <div
                      key={conta.id}
                      className="flex items-center justify-between p-2 rounded border bg-destructive/5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">
                          {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
                        </span>
                        <span className="truncate max-w-[120px]">{conta.descricao}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-destructive">
                          {formatCurrency(conta.valor)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveConta(conta.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista A Receber */}
            {contasReceber.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-green-600" />
                  A Receber (próx. 30d)
                </p>
                <div className="space-y-1">
                  {contasReceber.map((conta) => (
                    <div
                      key={conta.id}
                      className="flex items-center justify-between p-2 rounded border bg-green-500/5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">
                          {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
                        </span>
                        <span className="truncate max-w-[120px]">{conta.descricao}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">
                          {formatCurrency(conta.valor)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveConta(conta.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conta lançada. O gráfico usa projeção baseada em médias.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
