import { 
  ModeStatus, 
  FocusMode, 
  FinanceiroStage, 
  MarketingStage, 
  SupplyChainStage,
  ChecklistItem 
} from '@/types/focus-mode';

/**
 * Calcula o status do modo Financeiro baseado no preenchimento dos campos
 */
export function calculateFinanceiroStatus(data?: FinanceiroStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    (data.caixaNiceFoods ?? '').trim() !== '',
    (data.caixaEcommerce ?? '').trim() !== '',
    (data.vencimentos?.dda || data.vencimentos?.email || 
      data.vencimentos?.whatsapp || data.vencimentos?.planilha) ?? false,
    data.agendamentoConfirmado ?? false,
  ];
  
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'neutral';
  if (filled === fields.length) return 'completed';
  return 'in-progress';
}

/**
 * Calcula o status do modo Marketing baseado no preenchimento dos campos
 */
export function calculateMarketingStatus(data?: MarketingStage): ModeStatus {
  if (!data) return 'neutral';
  
  const fields = [
    data.mesFechouPositivo !== null && data.mesFechouPositivo !== undefined,
    (data.verbaAds ?? '').trim() !== '',
    (data.focoSemana ?? '').trim() !== '',
    data.verificacoes ? Object.values(data.verificacoes).some(Boolean) : false,
    data.decisaoSemana !== null && data.decisaoSemana !== undefined,
  ];
  
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'neutral';
  if (filled === fields.length) return 'completed';
  return 'in-progress';
}

/**
 * Calcula o status do modo Supply Chain baseado no ritmo atual selecionado
 */
export function calculateSupplyChainStatus(data?: SupplyChainStage): ModeStatus {
  if (!data) return 'neutral';
  
  const ritmoAtual = data.ritmoAtual ?? 'semanal';
  const ritmo = data[ritmoAtual];
  
  if (!ritmo) return 'neutral';
  
  const checks = Object.values(ritmo).filter(Boolean).length;
  const total = Object.keys(ritmo).length;
  
  if (checks === 0) return 'neutral';
  if (checks === total) return 'completed';
  return 'in-progress';
}

/**
 * Calcula o status de modos com checklist genérico (pré-reunião)
 */
export function calculateChecklistStatus(items?: ChecklistItem[]): ModeStatus {
  if (!items || items.length === 0) return 'neutral';
  
  const completed = items.filter(i => i.completed).length;
  if (completed === 0) return 'neutral';
  if (completed === items.length) return 'completed';
  return 'in-progress';
}

/**
 * Calcula o status de qualquer modo baseado no seu tipo e dados
 */
export function calculateModeStatus(mode: FocusMode): ModeStatus {
  switch (mode.id) {
    case 'financeiro':
      return calculateFinanceiroStatus(mode.financeiroData);
    case 'marketing':
      return calculateMarketingStatus(mode.marketingData);
    case 'supplychain':
      return calculateSupplyChainStatus(mode.supplyChainData);
    case 'backlog':
      return 'neutral'; // Backlog não usa status automático - é um depósito
    default:
      // Modos pré-reunião usam checklist genérico
      return calculateChecklistStatus(mode.items);
  }
}
