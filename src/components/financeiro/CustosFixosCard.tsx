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
  Scissors
} from 'lucide-react';
import { CustosFixosDetalhados, CustoFixoItem, CustoFixoCategoriaId, CustoFixoTipo } from '@/types/focus-mode';
import { formatCurrency } from '@/utils/modeStatusCalculator';
import { cn } from '@/lib/utils';

interface CustosFixosCardProps {
  data: CustosFixosDetalhados;
  onUpdate: (data: CustosFixosDetalhados) => void;
}

const CATEGORIA_CONFIG: Record<CustoFixoCategoriaId, { nome: string; icone: React.ReactNode }> = {
  pessoas: { nome: 'Pessoas', icone: <Users className="h-4 w-4" /> },
  software: { nome: 'Software', icone: <Monitor className="h-4 w-4" /> },
  marketing: { nome: 'Marketing Estrutural', icone: <Megaphone className="h-4 w-4" /> },
  servicos: { nome: 'Serviços', icone: <Wrench className="h-4 w-4" /> },
  armazenagem: { nome: 'Armazenagem', icone: <Package className="h-4 w-4" /> },
};

const CATEGORIAS_ORDEM: CustoFixoCategoriaId[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];

export function CustosFixosCard({ data, onUpdate }: CustosFixosCardProps) {
  const [openCategories, setOpenCategories] = useState<Record<CustoFixoCategoriaId, boolean>>({
    pessoas: false,
    software: false,
    marketing: false,
    servicos: false,
    armazenagem: false,
  });

  const [newItemName, setNewItemName] = useState<Record<CustoFixoCategoriaId, string>>({
    pessoas: '',
    software: '',
    marketing: '',
    servicos: '',
    armazenagem: '',
  });

  const toggleCategory = (cat: CustoFixoCategoriaId) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getCategoryTotal = (cat: CustoFixoCategoriaId) => {
    return (data[cat] || []).reduce((sum, item) => sum + item.valor, 0);
  };

  const getTotalGeral = () => {
    return CATEGORIAS_ORDEM.reduce((sum, cat) => sum + getCategoryTotal(cat), 0);
  };

  const getTotalCortavel = () => {
    return CATEGORIAS_ORDEM.reduce((sum, cat) => {
      return sum + (data[cat] || [])
        .filter(item => item.tipo === 'cortavel')
        .reduce((s, item) => s + item.valor, 0);
    }, 0);
  };

  const handleUpdateItem = (cat: CustoFixoCategoriaId, itemId: string, updates: Partial<CustoFixoItem>) => {
    const newData = { ...data };
    newData[cat] = (newData[cat] || []).map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate(newData);
  };

  const handleRemoveItem = (cat: CustoFixoCategoriaId, itemId: string) => {
    const newData = { ...data };
    newData[cat] = (newData[cat] || []).filter(item => item.id !== itemId);
    onUpdate(newData);
  };

  const handleAddItem = (cat: CustoFixoCategoriaId) => {
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
      </CardContent>
    </Card>
  );
}
