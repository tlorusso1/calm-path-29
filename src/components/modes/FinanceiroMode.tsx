import { FocusMode, FinanceiroStage } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ExternalLink, TrendingUp, CheckSquare, FileText } from 'lucide-react';
import { useState } from 'react';

interface FinanceiroModeProps {
  mode: FocusMode;
  onUpdateFinanceiroData: (data: Partial<FinanceiroStage>) => void;
  onAddItem: (text: string) => void;
  onToggleItem: (itemId: string) => void;
  onSetClassification: (itemId: string, classification: 'A' | 'B' | 'C') => void;
  onRemoveItem: (itemId: string) => void;
}

const PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/1xNwAHMM6f8j1NWdWceHks76zLr8zQGHzZ99VHn6VKiM/edit?gid=548762562#gid=548762562';

// Funções de formatação de moeda
const parseCurrency = (value: string): number => {
  const cleaned = value
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

// Feedback visual do fôlego
const getFolegoStatus = (folego: number) => {
  if (folego >= 50000) return { 
    color: 'bg-green-500', 
    textColor: 'text-green-600',
    label: 'Confortável',
    percentage: 100 
  };
  if (folego >= 20000) return { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-600',
    label: 'Atenção',
    percentage: 60 
  };
  return { 
    color: 'bg-red-500', 
    textColor: 'text-red-600',
    label: 'Crítico',
    percentage: 30 
  };
};

export function FinanceiroMode({
  mode,
  onUpdateFinanceiroData,
  onAddItem,
  onToggleItem,
  onRemoveItem,
}: FinanceiroModeProps) {
  const [newItemText, setNewItemText] = useState('');
  
  // Merge with defaults to handle partial/missing data
  const data: FinanceiroStage = {
    caixaNiceFoods: mode.financeiroData?.caixaNiceFoods ?? '',
    caixaEcommerce: mode.financeiroData?.caixaEcommerce ?? '',
    saidasInevitaveis: mode.financeiroData?.saidasInevitaveis ?? '',
    vencimentos: {
      dda: mode.financeiroData?.vencimentos?.dda ?? false,
      email: mode.financeiroData?.vencimentos?.email ?? false,
      whatsapp: mode.financeiroData?.vencimentos?.whatsapp ?? false,
      planilha: mode.financeiroData?.vencimentos?.planilha ?? false,
    },
    itensVencimento: mode.financeiroData?.itensVencimento ?? [],
    agendamentoConfirmado: mode.financeiroData?.agendamentoConfirmado ?? false,
    decisaoPagar: mode.financeiroData?.decisaoPagar ?? '',
    decisaoSegurar: mode.financeiroData?.decisaoSegurar ?? '',
    decisaoRenegociar: mode.financeiroData?.decisaoRenegociar ?? '',
  };
  
  // Cálculos
  const total = parseCurrency(data.caixaNiceFoods) + parseCurrency(data.caixaEcommerce);
  const saidas = parseCurrency(data.saidasInevitaveis);
  const folego = total - saidas;
  const folegoStatus = getFolegoStatus(folego);
  const hasValues = total > 0 || saidas > 0;

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== BLOCO 0: PAINEL DE DECISÃO ========== */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Painel de Decisão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Caixa NICE FOODS */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Caixa hoje NICE FOODS
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[180px]">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaNiceFoods}
                onChange={(e) => onUpdateFinanceiroData({ caixaNiceFoods: e.target.value })}
                className="h-9 text-sm text-right"
              />
            </div>
          </div>
          
          {/* Caixa NICE FOODS ECOM */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Caixa hoje NICE FOODS ECOM
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[180px]">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaEcommerce}
                onChange={(e) => onUpdateFinanceiroData({ caixaEcommerce: e.target.value })}
                className="h-9 text-sm text-right"
              />
            </div>
          </div>
          
          {/* TOTAL */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <span className="text-sm font-bold text-foreground">TOTAL</span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
          
          <Separator />
          
          {/* Saídas Inevitáveis */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Saídas inevitáveis nos próximos 30 dias
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.saidasInevitaveis}
                onChange={(e) => onUpdateFinanceiroData({ saidasInevitaveis: e.target.value })}
                className="h-9 text-sm text-right max-w-[180px]"
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Fôlego Estimado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-foreground">FÔLEGO ESTIMADO</span>
              <span className={cn("text-sm font-bold", folegoStatus.textColor)}>
                {formatCurrency(folego)}
              </span>
            </div>
            
            {hasValues && (
              <>
                <Progress 
                  value={folegoStatus.percentage} 
                  className="h-2"
                  style={{
                    ['--progress-background' as string]: folegoStatus.color.replace('bg-', '')
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", folegoStatus.color)} />
                  <span className={cn("text-xs font-medium", folegoStatus.textColor)}>
                    {folegoStatus.label}
                  </span>
                </div>
              </>
            )}
            
            <p className="text-xs text-muted-foreground italic pt-2">
              "Este número governa as decisões da semana."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== BLOCO 1: CHECKLIST DE EXECUÇÃO ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            Checklist de Execução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verificações */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={data.vencimentos.dda}
                onCheckedChange={(checked) => 
                  onUpdateFinanceiroData({ 
                    vencimentos: { ...data.vencimentos, dda: checked === true } 
                  })
                }
              />
              <span className="text-sm">Verifiquei DDA</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={data.vencimentos.email}
                onCheckedChange={(checked) => 
                  onUpdateFinanceiroData({ 
                    vencimentos: { ...data.vencimentos, email: checked === true } 
                  })
                }
              />
              <span className="text-sm">Verifiquei E-mail</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={data.vencimentos.whatsapp}
                onCheckedChange={(checked) => 
                  onUpdateFinanceiroData({ 
                    vencimentos: { ...data.vencimentos, whatsapp: checked === true } 
                  })
                }
              />
              <span className="text-sm">Verifiquei WhatsApp</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={data.vencimentos.planilha}
                onCheckedChange={(checked) => 
                  onUpdateFinanceiroData({ 
                    vencimentos: { ...data.vencimentos, planilha: checked === true } 
                  })
                }
              />
              <span className="text-sm">
                Coloquei na planilha
                <a 
                  href={PLANILHA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </span>
            </label>
          </div>
          
          <Separator />
          
          {/* Itens que vencem */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Itens que vencem:</p>
            
            {data.itensVencimento.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border border-border bg-muted/30",
                  item.completed && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => onToggleItem(item.id)}
                    className="mt-0.5"
                  />
                  <span className={cn(
                    "flex-1 text-sm",
                    item.completed && "line-through text-muted-foreground"
                  )}>
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Add new item */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item de vencimento..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="h-9 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddItem}
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Confirmei agendamento */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={data.agendamentoConfirmado}
              onCheckedChange={(checked) => 
                onUpdateFinanceiroData({ agendamentoConfirmado: checked === true })
              }
            />
            <span className="text-sm">Confirmei o que foi ou não agendado</span>
          </label>
        </CardContent>
      </Card>

      {/* ========== BLOCO 2: DECISÃO DA SEMANA ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Decisão da Semana
          </CardTitle>
          <p className="text-xs text-muted-foreground italic">
            "Preencher apenas após olhar o fôlego."
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* O que vou pagar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              💵 O que vou pagar:
            </label>
            <Textarea
              placeholder="Ex: Fornecedor X, conta de luz..."
              value={data.decisaoPagar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoPagar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
          
          {/* O que vou segurar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              ⏸️ O que vou segurar:
            </label>
            <Textarea
              placeholder="Ex: Compra de estoque, renovação..."
              value={data.decisaoSegurar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoSegurar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
          
          {/* O que vou renegociar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              🤝 O que vou renegociar:
            </label>
            <Textarea
              placeholder="Ex: Parcela do banco, prazo com fornecedor..."
              value={data.decisaoRenegociar}
              onChange={(e) => onUpdateFinanceiroData({ decisaoRenegociar: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
