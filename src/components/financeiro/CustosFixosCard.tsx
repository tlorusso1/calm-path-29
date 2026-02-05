import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Users, 
  Monitor, 
  Megaphone, 
  Wrench, 
  Package,
  Scissors,
  Landmark
} from 'lucide-react';
import { CustosFixosDetalhados, CustoFixoItem, CustoFixoTipo, Emprestimo } from '@/types/focus-mode';
import { formatCurrency } from '@/utils/modeStatusCalculator';
import { cn } from '@/lib/utils';

interface CustosFixosCardProps {
  data: CustosFixosDetalhados;
  onUpdate: (data: CustosFixosDetalhados) => void;
}

// Categorias regulares (sem empréstimos)
type CategoriaRegularId = 'pessoas' | 'software' | 'marketing' | 'servicos' | 'armazenagem';

const CATEGORIA_CONFIG: Record<CategoriaRegularId, { nome: string; icone: React.ReactNode }> = {
  pessoas: { nome: 'Pessoas', icone: <Users className="h-4 w-4" /> },
  software: { nome: 'Software', icone: <Monitor className="h-4 w-4" /> },
  marketing: { nome: 'Marketing Estrutural', icone: <Megaphone className="h-4 w-4" /> },
  servicos: { nome: 'Serviços', icone: <Wrench className="h-4 w-4" /> },
  armazenagem: { nome: 'Armazenagem', icone: <Package className="h-4 w-4" /> },
};

const CATEGORIAS_ORDEM: CategoriaRegularId[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];

export function CustosFixosCard({ data, onUpdate }: CustosFixosCardProps) {
  const [openCategories, setOpenCategories] = useState<Record<CategoriaRegularId | 'emprestimos', boolean>>({
    pessoas: false,
    software: false,
    marketing: false,
    servicos: false,
    armazenagem: false,
    emprestimos: false,
  });

  const [newItemName, setNewItemName] = useState<Record<CategoriaRegularId, string>>({
    pessoas: '',
    software: '',
    marketing: '',
    servicos: '',
    armazenagem: '',
  });

  const toggleCategory = (cat: CategoriaRegularId | 'emprestimos') => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getCategoryTotal = (cat: CategoriaRegularId) => {
    return (data[cat] || []).reduce((sum, item) => sum + item.valor, 0);
  };

  const getEmprestimosTotal = () => {
    return (data.emprestimos || []).reduce((sum, emp) => sum + emp.parcelaMedia, 0);
  };

  const getTotalGeral = () => {
    const totalCategorias = CATEGORIAS_ORDEM.reduce((sum, cat) => sum + getCategoryTotal(cat), 0);
    return totalCategorias + getEmprestimosTotal();
  };

  const getTotalCortavel = () => {
    return CATEGORIAS_ORDEM.reduce((sum, cat) => {
      return sum + (data[cat] || [])
        .filter(item => item.tipo === 'cortavel')
        .reduce((s, item) => s + item.valor, 0);
    }, 0);
  };

  const handleUpdateItem = (cat: CategoriaRegularId, itemId: string, updates: Partial<CustoFixoItem>) => {
    const newData = { ...data };
    newData[cat] = (newData[cat] || []).map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate(newData);
  };

  const handleRemoveItem = (cat: CategoriaRegularId, itemId: string) => {
    const newData = { ...data };
    newData[cat] = (newData[cat] || []).filter(item => item.id !== itemId);
    onUpdate(newData);
  };

  const handleAddItem = (cat: CategoriaRegularId) => {
    const nome = newItemName[cat].trim();
    if (!nome) return;

    const newItem: CustoFixoItem = {
      id: crypto.randomUUID(),
      nome,
      valor: 0,
      tipo: 'cortavel',
    };

    const newData = { ...data };
    newData[cat] = [...(newData[cat] || []), newItem];
    onUpdate(newData);
    setNewItemName(prev => ({ ...prev, [cat]: '' }));
  };

  // === Empréstimos ===
  const handleAddEmprestimo = () => {
    const newEmp: Emprestimo = {
      id: crypto.randomUUID(),
      empresa: '',
      banco: '',
      produto: '',
      valorContratado: 0,
      saldoDevedor: 0,
      taxaJurosAnual: 0,
      taxaJurosMensal: 0,
      parcelasRestantes: 0,
      parcelasTotais: 0,
      parcelaMedia: 0,
      diaVencimento: 1,
      vencimentoFinal: '',
    };
    const newData = { ...data };
    newData.emprestimos = [...(newData.emprestimos || []), newEmp];
    onUpdate(newData);
  };

  const handleUpdateEmprestimo = (empId: string, updates: Partial<Emprestimo>) => {
    const newData = { ...data };
    newData.emprestimos = (newData.emprestimos || []).map(emp =>
      emp.id === empId ? { ...emp, ...updates } : emp
    );
    onUpdate(newData);
  };

  const handleRemoveEmprestimo = (empId: string) => {
    const newData = { ...data };
    newData.emprestimos = (newData.emprestimos || []).filter(emp => emp.id !== empId);
    onUpdate(newData);
  };

  const cycleTipo = (tipo: CustoFixoTipo): CustoFixoTipo => {
    if (tipo === 'fixo') return 'cortavel';
    if (tipo === 'cortavel') return 'variavel';
    return 'fixo';
  };

  const getTipoBadge = (tipo: CustoFixoTipo) => {
    switch (tipo) {
      case 'fixo':
        return <Badge variant="secondary" className="text-[10px] px-1.5">Fixo</Badge>;
      case 'cortavel':
        return <Badge variant="destructive" className="text-[10px] px-1.5 bg-amber-500 hover:bg-amber-600">Cortável</Badge>;
      case 'variavel':
        return <Badge variant="outline" className="text-[10px] px-1.5">Variável</Badge>;
    }
  };

  const emprestimos = data.emprestimos || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            Custos Fixos Detalhados
          </span>
          <span className="text-sm font-normal">
            Total: <span className="font-semibold">{formatCurrency(getTotalGeral())}</span>
          </span>
        </CardTitle>
        {getTotalCortavel() > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Scissors className="h-3 w-3" />
            {formatCurrency(getTotalCortavel())} identificados como cortáveis
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Categorias regulares */}
        {CATEGORIAS_ORDEM.map(cat => {
          const config = CATEGORIA_CONFIG[cat];
          const items = data[cat] || [];
          const total = getCategoryTotal(cat);
          const cortavel = items.filter(i => i.tipo === 'cortavel').reduce((s, i) => s + i.valor, 0);

          return (
            <Collapsible 
              key={cat} 
              open={openCategories[cat]} 
              onOpenChange={() => toggleCategory(cat)}
            >
              <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                  "bg-muted/50 hover:bg-muted"
                )}>
                  <div className="flex items-center gap-2">
                    {config.icone}
                    <span className="font-medium text-sm">{config.nome}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cortavel > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        -{formatCurrency(cortavel)}
                      </span>
                    )}
                    <span className="text-sm font-medium">{formatCurrency(total)}</span>
                    {openCategories[cat] ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted ml-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded bg-background">
                      <button
                        onClick={() => handleUpdateItem(cat, item.id, { tipo: cycleTipo(item.tipo) })}
                        className="shrink-0"
                        title="Clique para alternar tipo"
                      >
                        {getTipoBadge(item.tipo)}
                      </button>
                      <Input
                        value={item.nome}
                        onChange={(e) => handleUpdateItem(cat, item.id, { nome: e.target.value })}
                        className="h-7 text-xs flex-1"
                        placeholder="Nome"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          value={item.valor || ''}
                          onChange={(e) => handleUpdateItem(cat, item.id, { valor: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs pl-7 text-right"
                          placeholder="0,00"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveItem(cat, item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 p-2">
                    <Input
                      value={newItemName[cat]}
                      onChange={(e) => setNewItemName(prev => ({ ...prev, [cat]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(cat)}
                      className="h-7 text-xs flex-1"
                      placeholder="Novo item..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddItem(cat)}
                      disabled={!newItemName[cat].trim()}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Seção de Empréstimos */}
        <Collapsible 
          open={openCategories.emprestimos} 
          onOpenChange={() => toggleCategory('emprestimos')}
        >
          <CollapsibleTrigger asChild>
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
              "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-sm">Empréstimos</span>
                <span className="text-xs text-muted-foreground">({emprestimos.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(getEmprestimosTotal())}/mês</span>
                {openCategories.emprestimos ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3 pl-2 border-l-2 border-blue-300 dark:border-blue-700 ml-3">
              {emprestimos.map(emp => (
                <EmprestimoItem 
                  key={emp.id} 
                  emprestimo={emp}
                  onUpdate={(updates) => handleUpdateEmprestimo(emp.id, updates)}
                  onRemove={() => handleRemoveEmprestimo(emp.id)}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full"
                onClick={handleAddEmprestimo}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Empréstimo
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Componente para editar um empréstimo
function EmprestimoItem({
  emprestimo,
  onUpdate,
  onRemove,
}: {
  emprestimo: Emprestimo;
  onUpdate: (updates: Partial<Emprestimo>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!emprestimo.produto);

  return (
    <div className="p-3 rounded-lg bg-background border space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {emprestimo.produto || 'Novo empréstimo'}
            </span>
            {emprestimo.banco && (
              <Badge variant="outline" className="text-[10px]">{emprestimo.banco}</Badge>
            )}
          </div>
          {emprestimo.parcelaMedia > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(emprestimo.parcelaMedia)}/mês • {emprestimo.parcelasRestantes}/{emprestimo.parcelasTotais} parcelas
            </p>
          )}
        </button>
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <label className="text-[10px] text-muted-foreground">Empresa</label>
            <Input
              value={emprestimo.empresa}
              onChange={(e) => onUpdate({ empresa: e.target.value })}
              className="h-7 text-xs"
              placeholder="NICE FOODS LTDA"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Banco</label>
            <Input
              value={emprestimo.banco}
              onChange={(e) => onUpdate({ banco: e.target.value })}
              className="h-7 text-xs"
              placeholder="Itaú"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-muted-foreground">Produto</label>
            <Input
              value={emprestimo.produto}
              onChange={(e) => onUpdate({ produto: e.target.value })}
              className="h-7 text-xs"
              placeholder="PRONAMPE 2025, PEAC FGI, etc."
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Valor Contratado</label>
            <Input
              type="number"
              value={emprestimo.valorContratado || ''}
              onChange={(e) => onUpdate({ valorContratado: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Saldo Devedor</label>
            <Input
              type="number"
              value={emprestimo.saldoDevedor || ''}
              onChange={(e) => onUpdate({ saldoDevedor: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Taxa Anual (%)</label>
            <Input
              type="number"
              step="0.01"
              value={emprestimo.taxaJurosAnual || ''}
              onChange={(e) => onUpdate({ taxaJurosAnual: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="20.88"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Taxa Mensal (%)</label>
            <Input
              type="number"
              step="0.01"
              value={emprestimo.taxaJurosMensal || ''}
              onChange={(e) => onUpdate({ taxaJurosMensal: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="1.74"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Parcela Média (R$)</label>
            <Input
              type="number"
              value={emprestimo.parcelaMedia || ''}
              onChange={(e) => onUpdate({ parcelaMedia: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs font-medium"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Dia Vencimento</label>
            <Input
              type="number"
              min={1}
              max={31}
              value={emprestimo.diaVencimento || ''}
              onChange={(e) => onUpdate({ diaVencimento: parseInt(e.target.value) || 1 })}
              className="h-7 text-xs"
              placeholder="20"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Parcelas Restantes</label>
            <Input
              type="number"
              value={emprestimo.parcelasRestantes || ''}
              onChange={(e) => onUpdate({ parcelasRestantes: parseInt(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="36"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Parcelas Totais</label>
            <Input
              type="number"
              value={emprestimo.parcelasTotais || ''}
              onChange={(e) => onUpdate({ parcelasTotais: parseInt(e.target.value) || 0 })}
              className="h-7 text-xs"
              placeholder="48"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Vencimento Final</label>
            <Input
              value={emprestimo.vencimentoFinal}
              onChange={(e) => onUpdate({ vencimentoFinal: e.target.value })}
              className="h-7 text-xs"
              placeholder="abr.2029"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Carência</label>
            <Input
              value={emprestimo.carencia || ''}
              onChange={(e) => onUpdate({ carencia: e.target.value })}
              className="h-7 text-xs"
              placeholder="12 meses"
            />
          </div>
        </div>
      )}
    </div>
  );
}