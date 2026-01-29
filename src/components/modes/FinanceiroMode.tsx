import { FocusMode, FinanceiroStage } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ExternalLink, TrendingUp, CheckSquare, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

// Status visual do saldo projetado
const getSaldoStatus = (saldo: number) => {
  if (saldo >= 50000) return { 
    color: 'bg-green-500', 
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Confortável'
  };
  if (saldo >= 20000) return { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Atenção'
  };
  if (saldo > 0) return { 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Risco'
  };
  return { 
    color: 'bg-red-500', 
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Crítico'
  };
};

// Componente de barra comparativa
const BarraComparativa = ({ 
  label, 
  valor, 
  maxValor, 
  corClasse,
  icon: Icon
}: { 
  label: string; 
  valor: number; 
  maxValor: number; 
  corClasse: string;
  icon?: React.ElementType;
}) => {
  const percentage = maxValor > 0 ? (valor / maxValor) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className="font-medium">{formatCurrency(valor)}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", corClasse)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
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
    entradaMediaConservadora: mode.financeiroData?.entradaMediaConservadora ?? '',
    entradasGarantidas: mode.financeiroData?.entradasGarantidas ?? '',
    custosFixosMensais: mode.financeiroData?.custosFixosMensais ?? '',
    operacaoMinima: mode.financeiroData?.operacaoMinima ?? '',
    impostosEstimados: mode.financeiroData?.impostosEstimados ?? '',
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
  
  // Cálculos automáticos
  const totalCaixa = parseCurrency(data.caixaNiceFoods) + parseCurrency(data.caixaEcommerce);
  const totalEntradas = parseCurrency(data.entradaMediaConservadora) + parseCurrency(data.entradasGarantidas);
  const totalSaidas = parseCurrency(data.custosFixosMensais) + parseCurrency(data.operacaoMinima) + parseCurrency(data.impostosEstimados);
  const saldoProjetado = totalCaixa + totalEntradas - totalSaidas;
  
  const saldoStatus = getSaldoStatus(saldoProjetado);
  const hasValues = totalCaixa > 0 || totalEntradas > 0 || totalSaidas > 0;
  const maxValorComparativo = Math.max(totalCaixa, saldoProjetado, 1);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== PAINEL DE PREVISÃO DE CAIXA — 30 DIAS ========== */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Previsão de Caixa — 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          
          {/* BLOCO 1: CAIXA ATUAL */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Caixa Atual
            </h4>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">NICE FOODS</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.caixaNiceFoods}
                  onChange={(e) => onUpdateFinanceiroData({ caixaNiceFoods: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">NICE FOODS ECOM</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.caixaEcommerce}
                  onChange={(e) => onUpdateFinanceiroData({ caixaEcommerce: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-foreground">TOTAL CAIXA</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(totalCaixa)}
              </span>
            </div>
          </div>

          {/* BLOCO 2: ENTRADAS PREVISTAS */}
          <div className="space-y-3 p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200/50">
            <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Entradas Previstas
            </h4>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">Entrada média conservadora</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.entradaMediaConservadora}
                  onChange={(e) => onUpdateFinanceiroData({ entradaMediaConservadora: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">Entradas já garantidas</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.entradasGarantidas}
                  onChange={(e) => onUpdateFinanceiroData({ entradasGarantidas: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <Separator className="bg-green-200/50" />
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-green-700 dark:text-green-400">TOTAL ENTRADAS</span>
              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                {formatCurrency(totalEntradas)}
              </span>
            </div>
          </div>

          {/* BLOCO 3: SAÍDAS INEVITÁVEIS */}
          <div className="space-y-3 p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50">
            <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Saídas Inevitáveis
            </h4>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">Custos fixos mensais</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.custosFixosMensais}
                  onChange={(e) => onUpdateFinanceiroData({ custosFixosMensais: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">Operação mínima</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.operacaoMinima}
                  onChange={(e) => onUpdateFinanceiroData({ operacaoMinima: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">Impostos estimados</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.impostosEstimados}
                  onChange={(e) => onUpdateFinanceiroData({ impostosEstimados: e.target.value })}
                  className="h-9 text-sm text-right w-[140px]"
                />
              </div>
            </div>
            
            <Separator className="bg-red-200/50" />
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-red-700 dark:text-red-400">TOTAL SAÍDAS</span>
              <span className="text-sm font-bold text-red-700 dark:text-red-400">
                {formatCurrency(totalSaidas)}
              </span>
            </div>
          </div>

          {/* BLOCO 4: RESULTADO */}
          <div className={cn(
            "space-y-3 p-4 rounded-lg border-2",
            saldoStatus.bgLight,
            saldoStatus.borderColor
          )}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Resultado — Saldo Projetado
            </h4>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Caixa + Entradas − Saídas
              </span>
              <span className={cn("text-xl font-bold", saldoStatus.textColor)}>
                {formatCurrency(saldoProjetado)}
              </span>
            </div>
            
            {hasValues && (
              <>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", saldoStatus.color)}
                    style={{ 
                      width: `${Math.max(Math.min((saldoProjetado / 100000) * 100, 100), 5)}%` 
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", saldoStatus.color)} />
                  <span className={cn("text-sm font-medium", saldoStatus.textColor)}>
                    {saldoStatus.label}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* BLOCO 5: COMPARATIVO VISUAL */}
          {hasValues && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Comparativo
              </h4>
              
              <div className="space-y-3">
                <BarraComparativa 
                  label="Caixa Hoje" 
                  valor={totalCaixa} 
                  maxValor={maxValorComparativo}
                  corClasse="bg-primary"
                />
                <BarraComparativa 
                  label="Saldo Projetado" 
                  valor={saldoProjetado} 
                  maxValor={maxValorComparativo}
                  corClasse={saldoStatus.color}
                  icon={saldoProjetado >= totalCaixa ? ArrowUpRight : ArrowDownRight}
                />
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground italic text-center pt-2">
            "Este painel governa as decisões da semana."
          </p>
        </CardContent>
      </Card>

      {/* ========== BLOCO: CHECKLIST DE EXECUÇÃO ========== */}
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

      {/* ========== BLOCO: DECISÃO DA SEMANA ========== */}
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
