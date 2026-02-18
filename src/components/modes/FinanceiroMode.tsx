import { FocusMode, FinanceiroStage, FinanceiroExports, DEFAULT_FINANCEIRO_DATA, DEFAULT_FINANCEIRO_CONTAS, ContaFluxo, Fornecedor, UserRitmoExpectativa, RitmoTimestamps, MapeamentoDescricaoFornecedor, SupplyExports, ReuniaoAdsStage } from '@/types/focus-mode';
import { gerarContasReceberProjecao } from '@/utils/gerarContasReceberProjecao';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, AlertTriangle, Building2, Info } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calculateFinanceiroV2, formatCurrency, parseCurrency } from '@/utils/modeStatusCalculator';
import { FluxoCaixaChart } from '@/components/financeiro/FluxoCaixaChart';
import { FluxoCaixaDiarioChart } from '@/components/financeiro/FluxoCaixaDiarioChart';
import { ContasFluxoSection } from '@/components/financeiro/ContasFluxoSection';
import { ConciliacaoSection } from '@/components/financeiro/ConciliacaoSection';
import { MetaVendasCard } from '@/components/financeiro/MetaVendasCard';
import { MetaMensalCard } from '@/components/financeiro/MetaMensalCard';
import { DRESection } from '@/components/financeiro/DRESection';
import { CustosFixosCard } from '@/components/financeiro/CustosFixosCard';
import { ExecutiveResume } from '@/components/financeiro/ExecutiveResume';
import { MargemRealCard } from '@/components/financeiro/MargemRealCard';
import { EntradaMediaRealChart } from '@/components/financeiro/EntradaMediaRealChart';
import { SnapshotsMensais } from '@/components/financeiro/SnapshotsMensais';
import { SectionHeader } from '@/components/financeiro/SectionHeader';
import { CaixaContratadoCard } from '@/components/financeiro/CaixaContratadoCard';
import { RitmoChecklist } from '@/components/financeiro/RitmoChecklist';
import { RitmoContextualAlert } from '@/components/RitmoContextualAlert';
import { FornecedoresManager } from '@/components/financeiro/FornecedoresManager';
import { GerarContasFixasButton } from '@/components/financeiro/GerarContasFixasButton';
import { AlertaCaixaInsuficiente } from '@/components/financeiro/AlertaCaixaInsuficiente';
import { CaixaVsAPagar5d } from '@/components/financeiro/CaixaVsAPagar5d';
import { OrcadoRealizadoSection } from '@/components/financeiro/OrcadoRealizadoSection';
import { calcularFluxoCaixa } from '@/utils/fluxoCaixaCalculator';
import { CMVGerencialCard } from '@/components/financeiro/CMVGerencialCard';
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
  flushSave?: () => Promise<void>;
  cmvSupply?: number;
  supplyExports?: SupplyExports;
  reuniaoAdsData?: ReuniaoAdsStage;
}

export function FinanceiroMode({
  mode,
  onUpdateFinanceiroData,
  ritmoExpectativa,
  onUpdateTimestamp,
  flushSave,
  cmvSupply,
  supplyExports,
  reuniaoAdsData,
}: FinanceiroModeProps) {
  const [openSections, setOpenSections] = useState({
    // Posição Atual (Real)
    contas: false,
    fluxoContas: false,
    historico: false,
    // Projeção (Estimado)
    fluxoGrafico: true,
    fluxoDiario: false,
    // Análise
    dre: false,
    margem: false,
    orcadoRealizado: false,
    // Configurações
    custosFixos: false,
    gerarContas: false,
    conciliacao: false,
    fornecedores: false,
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
    custosFixosDetalhados: (() => {
      const existing = mode.financeiroData?.custosFixosDetalhados;
      if (!existing) return DEFAULT_CUSTOS_FIXOS;
      return {
        ...existing,
        emprestimos: existing.emprestimos?.length ? existing.emprestimos : DEFAULT_EMPRESTIMOS,
      };
    })(),
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
      parseCurrency(contas.mercadoPagoEcom.saldo || '');
    
    // Breakdown por conta para CaixaContratadoCard
    const aReceberPorConta = {
      nuvemshop: parseCurrency(contas.nuvem.aReceber || ''),
      asaas: parseCurrency(contas.asaas.aReceber || ''),
      pagarMe: parseCurrency(contas.pagarMe.aReceber || ''),
      mercadoPago: parseCurrency(contas.mercadoPagoEcom.saldo || ''),
    };
    
    return { caixaTotal, aReceber, aReceberPorConta };
  }, [data.contas]);
  
  // Buscar histórico para projeção
  const { history: historicoSemanas } = useWeeklyHistory(4);
  
  // Calcular exports
  const exports: FinanceiroExports = calculateFinanceiroV2(data);
  
  // Calcular fluxo de caixa com histórico
  const fluxoCaixa = useMemo(
    () => calcularFluxoCaixa(data, historicoSemanas),
    [data, historicoSemanas]
  );
  const caixaMinimo = parseCurrency(data.caixaMinimo || '');
  
  // CMV Gerencial data
  const cmvGerencialCalc = useMemo(() => {
    const receitaBruta = supplyExports?.receitaBrutaSupply || 0;
    const cmvProduto = cmvSupply || 0;
    const ticketMedio = parseCurrency(reuniaoAdsData?.ticketMedio || '');
    const impostoPercentual = data.impostoPercentual ?? 0.16;
    
    if (receitaBruta <= 0 || cmvProduto <= 0) return null;
    
    const taxaCartao = 0.06;
    const fulfillment = 5.0;
    const materiais = 5.0;
    
    const impostos = receitaBruta * impostoPercentual;
    const taxaCartaoValor = receitaBruta * taxaCartao;
    const numPedidos = ticketMedio > 0 ? receitaBruta / ticketMedio : 0;
    const fulfillmentTotal = numPedidos * fulfillment;
    const materiaisTotal = numPedidos * materiais;
    const cmvGerencialTotal = cmvProduto + impostos + taxaCartaoValor + fulfillmentTotal + materiaisTotal;
    const margemGerencial = (receitaBruta - cmvGerencialTotal) / receitaBruta;
    
    return { margemGerencial, cmvGerencialTotal, receitaBruta };
  }, [supplyExports, cmvSupply, reuniaoAdsData?.ticketMedio, data.impostoPercentual]);

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
    flushSave?.();
  };
  
  const handleAddMultipleContas = (novasContas: Omit<ContaFluxo, 'id'>[]) => {
    const contasComId: ContaFluxo[] = novasContas.map(c => ({
      ...c,
      id: crypto.randomUUID(),
    }));
    onUpdateFinanceiroData({
      contasFluxo: [...(data.contasFluxo || []), ...contasComId],
    });
    flushSave?.();
  };
  
  const handleRemoveConta = (id: string) => {
    onUpdateFinanceiroData({
      contasFluxo: (data.contasFluxo || []).filter(c => c.id !== id),
    });
    flushSave?.();
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
    flushSave?.();
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

  // RITMO: Atualizar timestamp quando caixa muda
  const prevCaixaRef = useRef(data.caixaAtual);
  useEffect(() => {
    if (data.caixaAtual !== prevCaixaRef.current && data.caixaAtual) {
      prevCaixaRef.current = data.caixaAtual;
      onUpdateTimestamp?.('lastCaixaUpdate');
    }
  }, [data.caixaAtual, onUpdateTimestamp]);

  // RITMO: Atualizar timestamp quando premissas mudam
  const prevPremissasRef = useRef(data.faturamentoEsperado30d);
  useEffect(() => {
    if (data.faturamentoEsperado30d !== prevPremissasRef.current && data.faturamentoEsperado30d) {
      prevPremissasRef.current = data.faturamentoEsperado30d;
      onUpdateTimestamp?.('lastPremissasReview');
      
      // Gerar projeções de contas a receber por canal
      const valorNum = parseCurrency(data.faturamentoEsperado30d);
      if (valorNum > 0) {
        const contasAtualizadas = gerarContasReceberProjecao(valorNum, data.contasFluxo || []);
        onUpdateFinanceiroData({ contasFluxo: contasAtualizadas });
        flushSave?.();
      }
    }
  }, [data.faturamentoEsperado30d, onUpdateTimestamp]);

  // Ritmo: Get task status for contextual alerts
  const getCaixaStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'caixa')?.status ?? 'ok';
  const getContasHojeStatus = () => ritmoExpectativa?.tarefasHoje.find(t => t.id === 'contas-hoje')?.status ?? 'ok';

  return (
    <div className="space-y-6">
      {/* ========== HEADER FIXO — Alertas Contextuais ========== */}
      <div className="space-y-2">
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">🟢 FINANCEIRO — Modo Diário</h2>
          <p className="text-sm text-muted-foreground italic">"Financeiro se decide. Não se reage."</p>
        </div>
        <RitmoContextualAlert taskId="caixa" status={getCaixaStatus()} />
        <RitmoContextualAlert taskId="contas-hoje" status={getContasHojeStatus()} />
      </div>
      
      {/* ========== ALERTA DE CAIXA INSUFICIENTE ========== */}
      <AlertaCaixaInsuficiente 
        contasFluxo={data.contasFluxo || []}
        contasBancarias={data.contas}
      />
      
      {/* ========== 1. EXECUTIVE RESUME ========== */}
      <ExecutiveResume exports={exports} caixaContratado={totaisContas.aReceber} />
      
      {/* ========== CAIXA vs A PAGAR 5 DIAS ========== */}
      <CaixaVsAPagar5d contasFluxo={data.contasFluxo || []} contasBancarias={data.contas} />
      
      {/* ========== 2. POSIÇÃO ATUAL — REAL ========== */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4 space-y-4">
          <SectionHeader 
            icon="💰" 
            title="POSIÇÃO ATUAL — REAL"
            subtitle="(bate com banco. não é projeção.)"
          />
          
          {/* 2.1 Caixa Atual (INPUT principal) */}
          <div id="ritmo-caixa" className="scroll-mt-20 space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              ✏️ Caixa Atual
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={data.caixaAtual}
                onChange={(e) => onUpdateFinanceiroData({ caixaAtual: e.target.value })}
                className="h-11 text-base pl-10 text-right font-medium"
              />
            </div>
            <p className="text-xs text-muted-foreground">Atualizar HOJE</p>
          </div>
          
          {/* 2.2 Contas Bancárias [collapse] */}
          <Collapsible open={openSections.contas} onOpenChange={() => toggleSection('contas')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10 px-3 hover:bg-muted/50">
                <span className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  Contas Bancárias
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(totaisContas.caixaTotal)}
                  </span>
                  {openSections.contas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
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
              
              {/* GATEWAYS */}
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
              
              {/* MERCADO PAGO */}
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
              
              {/* Totais + Botão */}
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Caixa Total</span>
                  <span className="font-bold text-primary">{formatCurrency(totaisContas.caixaTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Total A Receber</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(totaisContas.aReceber)}</span>
                </div>
              </div>
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
            </CollapsibleContent>
          </Collapsible>
          
          {/* 2.3 Contas a Pagar/Receber [collapse] */}
          <div id="ritmo-contas-hoje" className="scroll-mt-20">
            <ContasFluxoSection
              contas={data.contasFluxo || []}
              fornecedores={data.fornecedores || []}
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
        </CardContent>
      </Card>
      
      {/* ========== 3. CAIXA CONTRATADO ========== */}
      <CaixaContratadoCard 
        aReceberPorConta={totaisContas.aReceberPorConta}
        total={totaisContas.aReceber}
      />
      
      {/* ========== 4. PROJEÇÃO — ESTIMADO ========== */}
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-4 space-y-4">
          <SectionHeader 
            icon="🔮" 
            title="PROJEÇÃO — ESTIMADO"
            subtitle="(depende de premissas)"
          />
          
          {/* 4.1 Premissas */}
          <div className="space-y-3">
            <div id="ritmo-premissas" className="space-y-1.5 scroll-mt-20">
              <label className="text-sm font-medium flex items-center gap-1.5">
                ⚙️ Faturamento esperado (30d)
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={data.faturamentoEsperado30d}
                  onChange={(e) => onUpdateFinanceiroData({ faturamentoEsperado30d: e.target.value })}
                  className="h-10 text-base pl-10 text-right"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">⚙️ Margem operacional</label>
                <div className="relative">
                  <Input
                    placeholder="40"
                    value="40"
                    readOnly
                    className="h-8 text-sm text-right bg-muted/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">⚙️ Ads base</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={data.adsBase}
                    onChange={(e) => onUpdateFinanceiroData({ adsBase: e.target.value })}
                    className="h-8 text-sm pl-7 text-right"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* 4.2 Fluxo de Caixa 30d */}
          <FluxoCaixaChart
            dados={fluxoCaixa.dados}
            caixaMinimo={caixaMinimo}
            modoProjecao={fluxoCaixa.modoProjecao}
            numContas={fluxoCaixa.numContas}
            fonteHistorico={fluxoCaixa.fonteHistorico}
            semanasHistorico={fluxoCaixa.semanasHistorico}
            onAddConta={() => toggleSection('fluxoContas')}
          />
          
          {/* 4.3 Projeção Diária */}
          <FluxoCaixaDiarioChart
            contasFluxo={data.contasFluxo || []}
            caixaAtual={parseCurrency(data.caixaAtual || '')}
            caixaMinimo={caixaMinimo}
          />
        </CardContent>
      </Card>
      
      {/* ========== 5. METAS — CONSEQUÊNCIA ========== */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4 space-y-4">
          <SectionHeader 
            icon="🎯" 
            title="METAS — CONSEQUÊNCIA"
            subtitle="(calculadas, não opinião)"
          />
          
          <MetaVendasCard contas={data.contasFluxo || []} />
          
          <EntradaMediaRealChart
            contasFluxo={data.contasFluxo || []}
            custoFixoMensal={totalCustosFixos}
            marketingEstrutural={parseCurrency(data.marketingEstrutural || data.marketingBase || '')}
            adsBase={parseCurrency(data.adsBase || '')}
          />
          
          <MetaMensalCard
            contasFluxo={data.contasFluxo || []}
            custoFixoMensal={formatCurrency(totalCustosFixos).replace('R$', '').trim()}
            marketingEstrutural={data.marketingEstrutural || data.marketingBase || ''}
            adsBase={data.adsBase}
            faturamentoCanais={data.faturamentoCanais}
            faturamentoMes={data.faturamentoMes}
            fornecedores={data.fornecedores || []}
          />
        </CardContent>
      </Card>
      
      {/* ========== 6. ANÁLISE ========== */}
      <Card className="border-l-4 border-l-cyan-500">
        <CardContent className="p-4 space-y-4">
          <SectionHeader 
            icon="📈" 
            title="ANÁLISE"
            subtitle="(entender, não agir)"
          />
          
          <DRESection
            lancamentos={data.contasFluxo || []}
            fornecedores={data.fornecedores || []}
            cmvSupply={cmvSupply}
            cmvGerencialData={cmvGerencialCalc || undefined}
            isOpen={openSections.dre || false}
            onToggle={() => toggleSection('dre')}
          />
          
          <CMVGerencialCard
            receitaBruta={supplyExports?.receitaBrutaSupply || 0}
            cmvProduto={cmvSupply || 0}
            ticketMedio={parseCurrency(reuniaoAdsData?.ticketMedio || '')}
            impostoPercentual={data.impostoPercentual ?? 0.16}
          />
          
          <OrcadoRealizadoSection
            contasFluxo={data.contasFluxo || []}
            fornecedores={data.fornecedores || []}
            isOpen={openSections.orcadoRealizado || false}
            onToggle={() => toggleSection('orcadoRealizado')}
          />
          
          <MargemRealCard
            contasFluxo={data.contasFluxo || []}
            faturamentoMes={data.faturamentoMes}
          />
          
          <SnapshotsMensais snapshots={data.snapshotsMensais || []} />
        </CardContent>
      </Card>
      
      {/* ========== 7. PARÂMETROS DO SISTEMA ========== */}
      <Card className="border-l-4 border-l-slate-500">
        <CardContent className="p-4 space-y-4">
          <SectionHeader 
            icon="⚙️" 
            title="PARÂMETROS DO SISTEMA"
            subtitle="(alterar aqui muda tudo acima)"
          />
          
          {/* 7.1 Custos Fixos */}
          <Collapsible open={openSections.custosFixos} onOpenChange={() => toggleSection('custosFixos')}>
            <CustosFixosCard
              data={data.custosFixosDetalhados || DEFAULT_CUSTOS_FIXOS}
              onUpdate={(custosFixosDetalhados) => onUpdateFinanceiroData({ custosFixosDetalhados })}
            />
          </Collapsible>
          
          {/* 7.2 Gerar Contas Fixas do Mês */}
          <GerarContasFixasButton
            custosFixos={data.custosFixosDetalhados || DEFAULT_CUSTOS_FIXOS}
            contasExistentes={data.contasFluxo || []}
            adsBase={parseCurrency(data.adsBase || '')}
            faturamentoMesAnterior={data.faturamentoMesAnterior || ''}
            onFaturamentoChange={(value) => onUpdateFinanceiroData({ faturamentoMesAnterior: value })}
            onGerarContas={(novasContas) => {
              const contasComId: ContaFluxo[] = novasContas.map(c => ({
                ...c,
                id: crypto.randomUUID(),
              }));
              onUpdateFinanceiroData({
                contasFluxo: [...(data.contasFluxo || []), ...contasComId],
              });
            }}
            isOpen={openSections.gerarContas || false}
            onToggle={() => toggleSection('gerarContas')}
          />
          
          {/* 7.3 Conciliação Bancária */}
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
                const contasAtualizadas = (data.contasFluxo || []).map(c => {
                   const conciliado = result.conciliados.find(cc => cc.id === c.id);
                   if (conciliado) {
                     return { 
                       ...c, 
                       pago: true, 
                       conciliado: true,
                       ...(conciliado.dataPagamento ? { dataPagamento: conciliado.dataPagamento } : {}),
                       ...(conciliado.lancamentoConciliadoId ? { lancamentoConciliadoId: conciliado.lancamentoConciliadoId } : {}),
                     };
                   }
                   return c;
                });
                
                const novasContas: ContaFluxo[] = result.novos.map(n => ({
                  ...n,
                  id: crypto.randomUUID(),
                }));
                
                const todasContas = [...contasAtualizadas, ...novasContas];
                
                // Gerar snapshot mensal automático
                const hoje = new Date();
                const mesAtual = format(hoje, 'yyyy-MM');
                const TIPOS_ENTRADA_SNAP = ['receber', 'resgate'];
                const TIPOS_SAIDA_SNAP = ['pagar', 'aplicacao', 'cartao'];
                
                let totalEntradas = 0;
                let totalSaidas = 0;
                for (const c of todasContas) {
                  if (!c.pago) continue;
                  if (!c.dataVencimento?.startsWith(mesAtual)) continue;
                  if (['intercompany'].includes(c.tipo)) continue;
                  const valor = parseCurrency(c.valor?.toString() || '');
                  if (TIPOS_ENTRADA_SNAP.includes(c.tipo)) totalEntradas += valor;
                  else if (TIPOS_SAIDA_SNAP.includes(c.tipo)) totalSaidas += valor;
                }
                
                const snapExistentes = (data.snapshotsMensais || []).filter(s => s.mesAno !== mesAtual);
                const novoSnapshot = {
                  mesAno: mesAtual,
                  entradas: totalEntradas,
                  saidas: totalSaidas,
                  saldo: totalEntradas - totalSaidas,
                  geradoEm: new Date().toISOString(),
                };
                
                onUpdateFinanceiroData({
                  contasFluxo: todasContas,
                  snapshotsMensais: [...snapExistentes, novoSnapshot],
                });
                
                if (result.conciliados.length > 0 || result.novos.length > 0) {
                  onUpdateTimestamp?.('lastConciliacaoCheck');
                  flushSave?.();
                }
              }}
              onCreateFornecedor={(novoFornecedor) => {
                const novoId = crypto.randomUUID();
                const fornecedorComId: Fornecedor = {
                  ...novoFornecedor,
                  id: novoId,
                };
                onUpdateFinanceiroData({
                  fornecedores: [...(data.fornecedores || []), fornecedorComId],
                });
                toast.success(`Fornecedor "${novoFornecedor.nome}" criado!`);
                return novoId; // Retorna ID para seleção automática
              }}
              onUpdateFornecedor={(id, updates) => {
                onUpdateFinanceiroData({
                  fornecedores: (data.fornecedores || []).map(f => 
                    f.id === id ? { ...f, ...updates } : f
                  ),
                });
              }}
              isOpen={openSections.conciliacao || false}
              onToggle={() => toggleSection('conciliacao')}
            />
          </div>
          
          {/* 7.4 Fornecedores Cadastrados */}
          <FornecedoresManager
            fornecedores={data.fornecedores || []}
            contasFluxo={data.contasFluxo || []}
            onAdd={(fornecedor) => {
              const novoId = crypto.randomUUID();
              onUpdateFinanceiroData({
                fornecedores: [...(data.fornecedores || []), { ...fornecedor, id: novoId }],
              });
            }}
            onUpdate={(id, updates) => {
              onUpdateFinanceiroData({
                fornecedores: (data.fornecedores || []).map(f => 
                  f.id === id ? { ...f, ...updates } : f
                ),
              });
            }}
            onRemove={(id) => {
              onUpdateFinanceiroData({
                fornecedores: (data.fornecedores || []).filter(f => f.id !== id),
              });
            }}
            isOpen={openSections.fornecedores || false}
            onToggle={() => toggleSection('fornecedores')}
          />
        </CardContent>
      </Card>
      
      {/* ========== 8. CHECKLIST FINAL — RITMO ========== */}
      <RitmoChecklist
        checklistDiario={data.checklistDiario}
        checklistSemanal={data.checklistSemanal}
        checklistMensal={data.checklistMensal}
        onUpdateDiario={(updates) => onUpdateFinanceiroData({ 
          checklistDiario: { ...data.checklistDiario, ...updates } 
        })}
        onUpdateSemanal={(updates) => onUpdateFinanceiroData({ 
          checklistSemanal: { ...data.checklistSemanal, ...updates } 
        })}
        onUpdateMensal={(updates) => onUpdateFinanceiroData({ 
          checklistMensal: { ...data.checklistMensal, ...updates } 
        })}
      />
    </div>
  );
}
