import { FocusMode, FinanceiroStage, FinanceiroExports, DEFAULT_FINANCEIRO_DATA, MARGEM_OPERACIONAL, DEFAULT_FINANCEIRO_CONTAS, FinanceiroContas, ContaBancaria, ContaFluxo, WeeklySnapshot, Fornecedor, UserRitmoExpectativa, RitmoTimestamps, CustosFixosDetalhados, MapeamentoDescricaoFornecedor } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TrendingUp, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, Flame, Timer, Info, Target, Building2 } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calculateFinanceiroV2, formatCurrency, parseCurrency } from '@/utils/modeStatusCalculator';
import { FluxoCaixaChart } from '@/components/financeiro/FluxoCaixaChart';
import { ContasFluxoSection } from '@/components/financeiro/ContasFluxoSection';
import { ConciliacaoSection } from '@/components/financeiro/ConciliacaoSection';
import { MetaVendasCard } from '@/components/financeiro/MetaVendasCard';
import { MetaMensalCard } from '@/components/financeiro/MetaMensalCard';
import { SugestoesIACard, SugestoesIAState } from '@/components/financeiro/SugestoesIACard';
import { DRESection } from '@/components/financeiro/DRESection';
import { FaturamentoCanaisCard } from '@/components/financeiro/FaturamentoCanaisCard';
import { CustosFixosCard } from '@/components/financeiro/CustosFixosCard';
import { ExecutiveResume } from '@/components/financeiro/ExecutiveResume';
import { MargemRealCard } from '@/components/financeiro/MargemRealCard';
import { FaturamentoInconsistenciaAlert } from '@/components/financeiro/FaturamentoInconsistenciaAlert';
import { GargaloIdentifier } from '@/components/GargaloIdentifier';
import { RitmoContextualAlert } from '@/components/RitmoContextualAlert';
import { calcularFluxoCaixa } from '@/utils/fluxoCaixaCalculator';
import { useWeeklyHistory } from '@/hooks/useWeeklyHistory';
import { DEFAULT_CUSTOS_FIXOS, calcularTotalCustosFixos, DEFAULT_EMPRESTIMOS } from '@/data/custos-fixos-default';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { loadFornecedores } from '@/utils/loadFornecedores';

interface FinanceiroModeProps {
  mode: FocusMode;
  onUpdateFinanceiroData: (data: Partial<FinanceiroStage>) => void;
  ritmoExpectativa?: UserRitmoExpectativa;
  onUpdateTimestamp?: (key: keyof RitmoTimestamps) => void;
}

// Status visual do Caixa Livre Real
const getCaixaLivreStatus = (valor: number) => {
  if (valor <= 0) return { 
    color: 'bg-destructive', 
    textColor: 'text-destructive',
    bgLight: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    label: 'Sobrevivência',
    icon: AlertTriangle,
  };
  if (valor < 30000) return { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-300',
    label: 'Atenção',
    icon: Clock,
  };
  return { 
    color: 'bg-green-500', 
    textColor: 'text-green-600',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300',
    label: 'Estratégia',
    icon: CheckCircle2,
  };
};

// Status visual do risco
const getRiscoColor = (risco: 'verde' | 'amarelo' | 'vermelho') => {
  switch (risco) {
    case 'verde': return 'bg-green-500';
    case 'amarelo': return 'bg-yellow-500';
    case 'vermelho': return 'bg-destructive';
  }
};

export function FinanceiroMode({
  mode,
  onUpdateFinanceiroData,
  ritmoExpectativa,
  onUpdateTimestamp,
}: FinanceiroModeProps) {
  const [openSections, setOpenSections] = useState({
    contas: true,
    custosFixos: false,
    defasados: false,
    fluxoContas: false,
    conciliacao: false,
    dre: false,
    diario: true,
    semanal: false,
    mensal: false,
  });
  
  // Carregar fornecedores do CSV uma vez
  const fornecedoresCarregados = useMemo(() => loadFornecedores(), []);
  
  // Merge com defaults para garantir estrutura V2
  const data: FinanceiroStage = useMemo(() => ({
    ...DEFAULT_FINANCEIRO_DATA,
    ...mode.financeiroData,
    contas: {
      ...DEFAULT_FINANCEIRO_CONTAS,
      ...mode.financeiroData?.contas,
    },
    custosDefasados: {
      ...DEFAULT_FINANCEIRO_DATA.custosDefasados,
      ...mode.financeiroData?.custosDefasados,
    },
    checklistDiario: {
      ...DEFAULT_FINANCEIRO_DATA.checklistDiario,
      ...mode.financeiroData?.checklistDiario,
    },
    checklistSemanal: {
      ...DEFAULT_FINANCEIRO_DATA.checklistSemanal,
      ...mode.financeiroData?.checklistSemanal,
    },
    checklistMensal: {
      ...DEFAULT_FINANCEIRO_DATA.checklistMensal,
      ...mode.financeiroData?.checklistMensal,
    },
    // Custos Fixos Detalhados - merge inteligente
    custosFixosDetalhados: (() => {
      const existing = mode.financeiroData?.custosFixosDetalhados;
      if (!existing) return DEFAULT_CUSTOS_FIXOS;
      // Se emprestimos está vazio ou undefined, usar defaults
      return {
        ...existing,
        emprestimos: existing.emprestimos?.length ? existing.emprestimos : DEFAULT_EMPRESTIMOS,
      };
    })(),
    // Usar fornecedores do CSV se não tiver customizados
    fornecedores: mode.financeiroData?.fornecedores?.length 
      ? mode.financeiroData.fornecedores 
      : fornecedoresCarregados,
  }), [mode.financeiroData, fornecedoresCarregados]);
  
  // Calcular total dos custos fixos detalhados
  const totalCustosFixos = useMemo(() => {
    return calcularTotalCustosFixos(data.custosFixosDetalhados || DEFAULT_CUSTOS_FIXOS);
  }, [data.custosFixosDetalhados]);
  
  // Calcular totais das contas bancárias
  const totaisContas = useMemo(() => {
    const contas = data.contas || DEFAULT_FINANCEIRO_CONTAS;
    
    const caixaTotal = 
      parseCurrency(contas.itauNiceFoods.saldo || '') +
      parseCurrency(contas.itauNiceFoods.cdb || '') +
      parseCurrency(contas.itauNiceEcom.saldo || '') +
      parseCurrency(contas.itauNiceEcom.cdb || '') +
      parseCurrency(contas.asaas.saldo || '') +
      parseCurrency(contas.nuvem.saldo || '') +
      parseCurrency(contas.pagarMe.saldo || '') +
      parseCurrency(contas.mercadoPagoEcom.disponivel || '');
    
    const aReceber = 
      parseCurrency(contas.asaas.aReceber || '') +
      parseCurrency(contas.nuvem.aReceber || '') +
      parseCurrency(contas.pagarMe.aReceber || '') +
      parseCurrency(contas.mercadoPagoEcom.saldo || ''); // Saldo total MP = a receber
    
    return { caixaTotal, aReceber };
  }, [data.contas]);
  
  // Buscar histórico para projeção
  const { history: historicoSemanas } = useWeeklyHistory(4);
  
  // Calcular exports
  const exports: FinanceiroExports = calculateFinanceiroV2(data);
  const caixaLivreStatus = getCaixaLivreStatus(exports.caixaLivreReal);
  const StatusIcon = caixaLivreStatus.icon;
  
  // Calcular fluxo de caixa com histórico
  const fluxoCaixa = useMemo(
    () => calcularFluxoCaixa(data, historicoSemanas),
    [data, historicoSemanas]
  );
  const caixaMinimo = parseCurrency(data.caixaMinimo || '');

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Handlers para contas do fluxo de caixa
  const handleAddConta = (conta: Omit<ContaFluxo, 'id'>) => {
    const novasConta: ContaFluxo = {
      ...conta,
      id: crypto.randomUUID(),
    };
    onUpdateFinanceiroData({
      contasFluxo: [...(data.contasFluxo || []), novasConta],
    });
  };
  
  const handleAddMultipleContas = (novasContas: Omit<ContaFluxo, 'id'>[]) => {
    const contasComId: ContaFluxo[] = novasContas.map(c => ({
      ...c,
      id: crypto.randomUUID(),
    }));
    onUpdateFinanceiroData({
      contasFluxo: [...(data.contasFluxo || []), ...contasComId],
    });
  };
  
  const handleRemoveConta = (id: string) => {
    onUpdateFinanceiroData({
      contasFluxo: (data.contasFluxo || []).filter(c => c.id !== id),
    });
  };
  
  const handleUpdateConta = (id: string, updates: Partial<ContaFluxo>) => {
    onUpdateFinanceiroData({
      contasFluxo: (data.contasFluxo || []).map(c => 
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };
  
  const handleTogglePago = (id: string) => {
    onUpdateFinanceiroData({
      contasFluxo: (data.contasFluxo || []).map(c => 
        c.id === id ? { ...c, pago: !c.pago } : c
      ),
    });
  };
  
  const handleToggleAgendado = (id: string) => {
    onUpdateFinanceiroData({
      contasFluxo: (data.contasFluxo || []).map(c => 
        c.id === id ? { ...c, agendado: !c.agendado } : c
      ),
    });
  };
  
  // Auto-baixa de contas agendadas cujo vencimento chegou
  const hasRunAutoBaixa = useRef(false);
  useEffect(() => {
    if (hasRunAutoBaixa.current) return;
    
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const contasParaDarBaixa = (data.contasFluxo || []).filter(c => 
      c.agendado && 
      !c.pago && 
      c.dataVencimento <= hoje
    );
    
    if (contasParaDarBaixa.length > 0) {
      hasRunAutoBaixa.current = true;
      const contasAtualizadas = (data.contasFluxo || []).map(c => {
        if (contasParaDarBaixa.find(cp => cp.id === c.id)) {
          return { ...c, pago: true };
        }
        return c;
      });
      onUpdateFinanceiroData({ contasFluxo: contasAtualizadas });
      toast.success(`${contasParaDarBaixa.length} conta(s) agendada(s) marcada(s) como paga(s)`);
    }
  }, [data.contasFluxo, onUpdateFinanceiroData]);

  // Ritmo: Get task status for contextual alerts
  const getCaixaStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'caixa')?.status ?? 'ok';
  const getContasHojeStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'contas-hoje')?.status ?? 'ok';
  const getConciliacaoStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'conciliacao')?.status ?? 'ok';
  const getPremissasStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'premissas')?.status ?? 'ok';

  return (
    <div className="space-y-6">
      {/* Ritmo Contextual Alerts */}
      <RitmoContextualAlert taskId="caixa" status={getCaixaStatus()} />
      <RitmoContextualAlert taskId="contas-hoje" status={getContasHojeStatus()} />
      
      {/* ========== EXECUTIVE RESUME (NOVO) ========== */}
      <ExecutiveResume exports={exports} />
      
      {/* ========== ALERTA DE INCONSISTÊNCIA DE FATURAMENTO ========== */}
      <FaturamentoInconsistenciaAlert 
        faturamentoEsperado30d={data.faturamentoEsperado30d}
        faturamentoCanais={data.faturamentoCanais}
      />
      
      {/* ========== GARGALO DA SEMANA (LEITURA AUTOMÁTICA) ========== */}
      <GargaloIdentifier financeiroExports={exports} compact />
      
      {/* ========== INPUTS BÁSICOS ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Dados Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                Faturamento mês atual
                <span className="text-[10px] text-muted-foreground/70">(acumulado)</span>
              </label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Total faturado até hoje no mês corrente
              </p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.faturamentoMes}
                  onChange={(e) => onUpdateFinanceiroData({ faturamentoMes: e.target.value })}
                  className="h-9 text-sm pl-8 text-right"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Custo fixo/mês (total)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={formatCurrency(totalCustosFixos).replace('R$', '').trim()}
                  readOnly
                  className="h-9 text-sm pl-8 text-right bg-muted/50 cursor-pointer"
                  onClick={() => toggleSection('custosFixos')}
                  title="Clique para ver breakdown"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Clique para detalhar</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Ads base</label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Mínimo para campanhas vivas
              </p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.adsBase}
                  onChange={(e) => onUpdateFinanceiroData({ adsBase: e.target.value })}
                  className="h-9 text-sm pl-8 text-right"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Caixa mínimo</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.caixaMinimo}
                  onChange={(e) => onUpdateFinanceiroData({ caixaMinimo: e.target.value })}
                  className="h-9 text-sm pl-8 text-right"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div id="ritmo-caixa" className="space-y-1.5 scroll-mt-20">
            <label className="text-sm font-medium">Caixa atual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaAtual}
                onChange={(e) => onUpdateFinanceiroData({ caixaAtual: e.target.value })}
                className="h-11 text-base pl-10 text-right font-medium"
              />
            </div>
          </div>
          
          <Separator />
          
          {/* NOVO: Faturamento Esperado 30d */}
          <div id="ritmo-premissas" className="space-y-1.5 scroll-mt-20">
            <label className="text-sm font-medium flex items-center gap-1.5">
              Faturamento esperado (próx. 30d)
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </label>
            <p className="text-xs text-muted-foreground">
              Cenário mínimo conservador. Não é meta, é piso.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.faturamentoEsperado30d}
                onChange={(e) => onUpdateFinanceiroData({ faturamentoEsperado30d: e.target.value })}
                className="h-11 text-base pl-10 text-right font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== CONTAS BANCÁRIAS ========== */}
      <Collapsible open={openSections.contas} onOpenChange={() => toggleSection('contas')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Contas Bancárias
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatCurrency(totaisContas.caixaTotal)}
                  </span>
                  {openSections.contas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* ITAÚ NICE FOODS */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">ITAÚ NICE FOODS</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Saldo</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.itauNiceFoods.saldo || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            itauNiceFoods: { ...data.contas!.itauNiceFoods, saldo: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">CDB</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.itauNiceFoods.cdb || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            itauNiceFoods: { ...data.contas!.itauNiceFoods, cdb: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ITAÚ NICE ECOM */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">ITAÚ NICE ECOM</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Saldo</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.itauNiceEcom.saldo || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            itauNiceEcom: { ...data.contas!.itauNiceEcom, saldo: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">CDB</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.itauNiceEcom.cdb || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            itauNiceEcom: { ...data.contas!.itauNiceEcom, cdb: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* GATEWAYS - ASAAS, NUVEM, PAGAR.ME */}
              {[
                { key: 'asaas', label: 'ASAAS' },
                { key: 'nuvem', label: 'NUVEM' },
                { key: 'pagarMe', label: 'PAGAR.ME' },
              ].map(({ key, label }) => (
                <div key={key} className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Saldo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          placeholder="0,00"
                          value={(data.contas as any)?.[key]?.saldo || ''}
                          onChange={(e) => onUpdateFinanceiroData({ 
                            contas: { 
                              ...data.contas!, 
                              [key]: { ...(data.contas as any)![key], saldo: e.target.value } 
                            } 
                          })}
                          className="h-8 text-sm pl-7 text-right"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">A receber</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          placeholder="0,00"
                          value={(data.contas as any)?.[key]?.aReceber || ''}
                          onChange={(e) => onUpdateFinanceiroData({ 
                            contas: { 
                              ...data.contas!, 
                              [key]: { ...(data.contas as any)![key], aReceber: e.target.value } 
                            } 
                          })}
                          className="h-8 text-sm pl-7 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* MERCADO PAGO ECOM */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">MERCADO PAGO ECOM</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Disponível</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.mercadoPagoEcom.disponivel || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            mercadoPagoEcom: { ...data.contas!.mercadoPagoEcom, disponivel: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Saldo total</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        placeholder="0,00"
                        value={data.contas?.mercadoPagoEcom.saldo || ''}
                        onChange={(e) => onUpdateFinanceiroData({ 
                          contas: { 
                            ...data.contas!, 
                            mercadoPagoEcom: { ...data.contas!.mercadoPagoEcom, saldo: e.target.value } 
                          } 
                        })}
                        className="h-8 text-sm pl-7 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* TOTAIS */}
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Caixa Total (saldos + CDBs + disponível)</span>
                  <span className="font-bold text-primary">{formatCurrency(totaisContas.caixaTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Total A Receber</span>
                  <span className="font-bold text-green-600">{formatCurrency(totaisContas.aReceber)}</span>
                </div>
              </div>
              
              {/* Botão para aplicar ao caixa atual */}
              {totaisContas.caixaTotal > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onUpdateFinanceiroData({ caixaAtual: formatCurrency(totaisContas.caixaTotal).replace('R$', '').trim() })}
                >
                  Usar como Caixa Atual
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ========== CUSTOS FIXOS DETALHADOS ========== */}
      <Collapsible open={openSections.custosFixos} onOpenChange={() => toggleSection('custosFixos')}>
        <CustosFixosCard
          data={data.custosFixosDetalhados || DEFAULT_CUSTOS_FIXOS}
          onUpdate={(custosFixosDetalhados) => onUpdateFinanceiroData({ custosFixosDetalhados })}
        />
      </Collapsible>

      {/* ========== CUSTOS DEFASADOS ========== */}
      <Collapsible open={openSections.defasados} onOpenChange={() => toggleSection('defasados')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Custos Defasados (30d)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatCurrency(exports.totalDefasados)}
                  </span>
                  {openSections.defasados ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground italic mb-3">
                Valores já comprometidos que saem nos próximos 30 dias
              </p>
              
              {/* Impostos calculados automaticamente (16%) */}
              <div className="flex items-center justify-between gap-3 p-2 rounded bg-muted/50">
                <label className="text-sm text-foreground flex-1">
                  Impostos próx. mês (16%)
                </label>
                <span className="text-sm font-medium text-right w-[130px]">
                  {formatCurrency(parseCurrency(data.faturamentoMes) * 0.16)}
                </span>
              </div>
              
              {/* Campos manuais */}
              {[
                { key: 'adsCartaoAnterior', label: 'Ads (cartão anterior)' },
                { key: 'parcelasEmprestimos', label: 'Parcelas empréstimos' },
                { key: 'comprasEstoqueComprometidas', label: 'Compras estoque contratadas' },
                { key: 'outrosCompromissos', label: 'Outros compromissos' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-foreground flex-1">{label}</label>
                  <div className="relative w-[130px]">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      placeholder="0,00"
                      value={data.custosDefasados[key as keyof typeof data.custosDefasados]}
                      onChange={(e) => onUpdateFinanceiroData({ 
                        custosDefasados: { 
                          ...data.custosDefasados, 
                          [key]: e.target.value 
                        } 
                      })}
                      className="h-8 text-sm pl-7 text-right"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ========== CAIXA LIVRE REAL ========== */}
      <Card className={cn("border-2", caixaLivreStatus.borderColor)}>
        <CardContent className={cn("p-4 space-y-3", caixaLivreStatus.bgLight)}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Caixa Livre Real
              </p>
              <p className="text-xs text-muted-foreground">
                Caixa − Mínimo − Defasados
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-2xl font-bold", caixaLivreStatus.textColor)}>
                {formatCurrency(exports.caixaLivreReal)}
              </p>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <StatusIcon className={cn("h-4 w-4", caixaLivreStatus.textColor)} />
                <span className={cn("text-sm font-medium", caixaLivreStatus.textColor)}>
                  {caixaLivreStatus.label}
                </span>
              </div>
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", caixaLivreStatus.color)}
              style={{ 
                width: `${Math.max(Math.min((exports.caixaLivreReal / 100000) * 100, 100), exports.caixaLivreReal > 0 ? 5 : 0)}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ========== QUEIMA OPERACIONAL + LIMITE ADS ========== */}
      <Card className="bg-muted/30 border-l-4 border-l-orange-500">
        <CardContent className="p-4 space-y-4">
          {/* Queima Operacional */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Queima Operacional Mensal
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo fixo</span>
                <span>{formatCurrency(parseCurrency(data.custoFixoMensal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketing estrutural</span>
                <span>{formatCurrency(exports.marketingEstrutural)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">{formatCurrency(exports.queimaOperacional)}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Limites de Ads */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Limites de Ads
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ads base</span>
                <span>{formatCurrency(exports.adsBase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incremento permitido</span>
                <span className={exports.adsIncremental > 0 ? "text-green-600" : "text-muted-foreground"}>
                  +{formatCurrency(exports.adsIncremental)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Ads máximo esta semana</span>
                <span className="text-primary">{formatCurrency(exports.adsMaximoPermitido)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Teto absoluto (10% fat. esperado)</span>
                <span>{formatCurrency(exports.tetoAdsAbsoluto)}</span>
              </div>
            </div>
            {exports.motivoBloqueioAds && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                {exports.motivoBloqueioAds}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== RESULTADO ESPERADO + FÔLEGO (NOVO) ========== */}
      {exports.faturamentoEsperado > 0 && (
        <Card className={cn(
          "border-2",
          exports.alertaRisco30d === 'verde' ? 'border-green-300' :
          exports.alertaRisco30d === 'amarelo' ? 'border-yellow-300' :
          'border-destructive/30'
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Resultado Esperado (30 dias)
              </p>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem esperada (40%)</span>
                <span className="text-green-600">+{formatCurrency(exports.faturamentoEsperado * MARGEM_OPERACIONAL)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queima operacional</span>
                <span className="text-orange-600">−{formatCurrency(exports.queimaOperacional)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Resultado</span>
                <span className={cn(
                  exports.resultadoEsperado30d >= 0 ? 'text-green-600' : 'text-destructive'
                )}>
                  {exports.resultadoEsperado30d >= 0 ? '+' : ''}{formatCurrency(exports.resultadoEsperado30d)}
                  <span className="ml-2 text-sm">
                    {exports.alertaRisco30d === 'verde' ? '🟢' :
                     exports.alertaRisco30d === 'amarelo' ? '🟡' : '🔴'}
                  </span>
                </span>
              </div>
            </div>
            
            {/* Fôlego de Caixa */}
            <div className={cn(
              "mt-3 p-3 rounded-lg text-center",
              exports.alertaRisco30d === 'verde' ? 'bg-green-50 dark:bg-green-900/20' :
              exports.alertaRisco30d === 'amarelo' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-destructive/10'
            )}>
              <div className="flex items-center justify-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="text-sm font-medium">Fôlego de Caixa:</span>
                <span className={cn(
                  "text-lg font-bold",
                  exports.alertaRisco30d === 'verde' ? 'text-green-600' :
                  exports.alertaRisco30d === 'amarelo' ? 'text-yellow-600' :
                  'text-destructive'
                )}>
                  {exports.folegoEmDias === null ? '∞' : `~${exports.folegoEmDias} dias`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {exports.folegoEmDias === null 
                  ? 'Operação se sustenta com o faturamento mínimo' 
                  : exports.folegoEmDias === 0 
                  ? 'Caixa negativo - ação urgente necessária'
                  : 'Tempo até o caixa zerar se nada mudar'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== LEGENDA ANTI-CONFUSÃO (NOVO) ========== */}
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Leitura correta:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Caixa Livre Real</strong> = situação agora</li>
            <li>• <strong>Resultado Esperado</strong> = futuro próximo</li>
            <li>• <em>Não devem ser somados ou confundidos</em></li>
          </ul>
        </CardContent>
      </Card>

      {/* ========== REGRA DE ADS ========== */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Ads Máximo Permitido
          </p>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>Base {formatCurrency(exports.adsBase)}</span>
              {exports.adsIncremental > 0 && (
                <span className="text-green-600"> + {formatCurrency(exports.adsIncremental)} incremental</span>
              )}
            </div>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(exports.adsMaximoPermitido)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ========== PROJEÇÃO 30/60/90 ========== */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
            Projeção de Risco (contábil)
          </p>
          <div className="flex items-center gap-4 justify-center">
            {[
              { label: '30d', risco: exports.risco30d },
              { label: '60d', risco: exports.risco60d },
              { label: '90d', risco: exports.risco90d },
            ].map(({ label, risco }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={cn("w-8 h-8 rounded-full", getRiscoColor(risco))} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========== GRÁFICO FLUXO DE CAIXA ========== */}
      <FluxoCaixaChart
        dados={fluxoCaixa.dados}
        caixaMinimo={caixaMinimo}
        modoProjecao={fluxoCaixa.modoProjecao}
        numContas={fluxoCaixa.numContas}
        fonteHistorico={fluxoCaixa.fonteHistorico}
        semanasHistorico={fluxoCaixa.semanasHistorico}
        onAddConta={() => toggleSection('fluxoContas')}
      />
      
      {/* ========== META DE VENDAS SEMANAL ========== */}
      <MetaVendasCard contas={data.contasFluxo || []} />
      
      {/* ========== META MENSAL DE FATURAMENTO ========== */}
      <MetaMensalCard
        contasFluxo={data.contasFluxo || []}
        custoFixoMensal={formatCurrency(totalCustosFixos).replace('R$', '').trim()}
        marketingEstrutural={data.marketingEstrutural || data.marketingBase || ''}
        adsBase={data.adsBase}
        faturamentoCanais={data.faturamentoCanais}
        faturamentoMes={data.faturamentoMes}
      />
      
      {/* ========== MARGEM REAL ESTIMADA (LEITURA) ========== */}
      <MargemRealCard
        contasFluxo={data.contasFluxo || []}
        faturamentoMes={data.faturamentoMes}
      />
      
      {/* ========== SUGESTÕES COM IA ========== */}
      <SugestoesIACard
        contasFluxo={data.contasFluxo || []}
        caixaLivre={exports.caixaLivreReal}
        folegoEmDias={exports.folegoEmDias}
        statusRisco={exports.alertaRisco30d}
        faturamentoMes={data.faturamentoMes}
        custoFixo={data.custoFixoMensal}
        marketingEstrutural={data.marketingEstrutural || data.marketingBase || ''}
        faturamentoCanais={data.faturamentoCanais}
        sugestoesState={data.sugestoesIA as SugestoesIAState | undefined}
        onUpdateSugestoes={(sugestoes) => onUpdateFinanceiroData({ sugestoesIA: sugestoes })}
      />
      
      {/* ========== FATURAMENTO POR CANAL ========== */}
      <FaturamentoCanaisCard
        faturamentoCanais={data.faturamentoCanais || { b2b: '', ecomNuvem: '', ecomShopee: '', ecomAssinaturas: '' }}
        onUpdate={(canais) => onUpdateFinanceiroData({ faturamentoCanais: canais })}
      />
      
      {/* ========== CONTAS A PAGAR/RECEBER ========== */}
      <div id="ritmo-contas-hoje" className="scroll-mt-20">
        <ContasFluxoSection
          contas={data.contasFluxo || []}
          onAddConta={handleAddConta}
          onAddMultipleContas={handleAddMultipleContas}
          onUpdateConta={handleUpdateConta}
          onRemoveConta={handleRemoveConta}
          onTogglePago={handleTogglePago}
          onToggleAgendado={handleToggleAgendado}
          isOpen={openSections.fluxoContas}
          onToggle={() => toggleSection('fluxoContas')}
        />
      </div>
      
      {/* ========== CONCILIAÇÃO BANCÁRIA ========== */}
      <div id="ritmo-conciliacao" className="scroll-mt-20">
        <ConciliacaoSection
        contasExistentes={data.contasFluxo || []}
        fornecedores={data.fornecedores || []}
        mapeamentos={data.mapeamentosDescricao || []}
        onAddMapeamento={(novoMapeamento: MapeamentoDescricaoFornecedor) => {
          onUpdateFinanceiroData({
            mapeamentosDescricao: [...(data.mapeamentosDescricao || []), novoMapeamento],
          });
        }}
        onConciliar={(result) => {
          // Marcar contas conciliadas como pagas
          const contasAtualizadas = (data.contasFluxo || []).map(c => {
            const conciliado = result.conciliados.find(cc => cc.id === c.id);
            if (conciliado) {
              return { ...c, pago: true, conciliado: true };
            }
            return c;
          });
          
          // Adicionar novos lançamentos
          const novasContas: ContaFluxo[] = result.novos.map(n => ({
            ...n,
            id: crypto.randomUUID(),
          }));
          
          onUpdateFinanceiroData({
            contasFluxo: [...contasAtualizadas, ...novasContas],
          });
        }}
        onCreateFornecedor={(novoFornecedor) => {
          const fornecedorComId: Fornecedor = {
            ...novoFornecedor,
            id: crypto.randomUUID(),
          };
          onUpdateFinanceiroData({
            fornecedores: [...(data.fornecedores || []), fornecedorComId],
          });
          toast.success(`Fornecedor "${novoFornecedor.nome}" criado!`);
        }}
        isOpen={openSections.conciliacao || false}
        onToggle={() => toggleSection('conciliacao')}
      />
      </div>
      
      {/* ========== DRE - RESULTADO DO EXERCÍCIO ========== */}
      <DRESection
        lancamentos={data.contasFluxo || []}
        fornecedores={data.fornecedores || []}
        isOpen={openSections.dre || false}
        onToggle={() => toggleSection('dre')}
      />

      {/* ========== CHECKLIST DIÁRIO ========== */}
      <Collapsible open={openSections.diario} onOpenChange={() => toggleSection('diario')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span>📅 Checklist Diário</span>
                {openSections.diario ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {[
                { key: 'atualizouCaixa', label: 'Atualizei o caixa' },
                { key: 'olhouResultado', label: 'Olhei o resultado' },
                { key: 'decidiu', label: 'Decidi o que fazer' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={data.checklistDiario[key as keyof typeof data.checklistDiario]}
                    onCheckedChange={(checked) => 
                      onUpdateFinanceiroData({ 
                        checklistDiario: { 
                          ...data.checklistDiario, 
                          [key]: checked === true 
                        } 
                      })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ========== CHECKLIST SEMANAL ========== */}
      <Collapsible open={openSections.semanal} onOpenChange={() => toggleSection('semanal')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span>📆 Checklist Semanal</span>
                {openSections.semanal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {[
                { key: 'dda', label: 'Verifiquei DDA' },
                { key: 'emails', label: 'Verifiquei e-mails' },
                { key: 'whatsapp', label: 'Verifiquei WhatsApp' },
                { key: 'agendouVencimentos', label: 'Agendei vencimentos' },
                { key: 'atualizouCaixaMinimo', label: 'Revisei caixa mínimo' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={data.checklistSemanal[key as keyof typeof data.checklistSemanal]}
                    onCheckedChange={(checked) => 
                      onUpdateFinanceiroData({ 
                        checklistSemanal: { 
                          ...data.checklistSemanal, 
                          [key]: checked === true 
                        } 
                      })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ========== CHECKLIST MENSAL ========== */}
      <Collapsible open={openSections.mensal} onOpenChange={() => toggleSection('mensal')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span>📅 Checklist Mensal</span>
                {openSections.mensal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {[
                { key: 'atualizouFaturamento', label: 'Atualizei faturamento médio' },
                { key: 'revisouCustoFixo', label: 'Revisei custo fixo' },
                { key: 'revisouMarketingBase', label: 'Revisei marketing base' },
                { key: 'atualizouDefasados', label: 'Atualizei custos defasados' },
                { key: 'comparouPrevistoRealizado', label: 'Comparei previsto x realizado' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={data.checklistMensal[key as keyof typeof data.checklistMensal]}
                    onCheckedChange={(checked) => 
                      onUpdateFinanceiroData({ 
                        checklistMensal: { 
                          ...data.checklistMensal, 
                          [key]: checked === true 
                        } 
                      })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Texto âncora */}
      <p className="text-xs text-muted-foreground italic text-center pt-2">
        "Financeiro se decide. Não se reage."
      </p>
    </div>
  );
}
