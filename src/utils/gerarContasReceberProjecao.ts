import { ContaFluxo } from '@/types/focus-mode';

const DISTRIBUICAO_CANAIS: Record<string, { percentual: number; label: string }> = {
  b2b: { percentual: 0.25, label: 'B2B' },
  ecomNuvem: { percentual: 0.66, label: 'ECOM-NUVEM' },
  ecomShopee: { percentual: 0.05, label: 'ECOM-SHOPEE' },
  ecomAssinaturas: { percentual: 0.04, label: 'ECOM-ASSINATURAS' },
};

function getProximasSegundas(count: number): string[] {
  const datas: string[] = [];
  const hoje = new Date();
  const dia = hoje.getDay(); // 0=dom, 1=seg...
  
  // Próxima segunda
  const diasAteSegunda = dia === 0 ? 1 : dia === 1 ? 7 : 8 - dia;
  const proximaSegunda = new Date(hoje);
  proximaSegunda.setDate(hoje.getDate() + diasAteSegunda);
  
  for (let i = 0; i < count; i++) {
    const data = new Date(proximaSegunda);
    data.setDate(proximaSegunda.getDate() + i * 7);
    datas.push(data.toISOString().split('T')[0]);
  }
  
  return datas;
}

/**
 * Gera contas a receber de projeção distribuídas semanalmente pelos canais.
 * Remove projeções antigas e gera 16 novas (4 canais × 4 semanas).
 */
export function gerarContasReceberProjecao(
  faturamentoEsperado30d: number,
  contasFluxoExistentes: ContaFluxo[]
): ContaFluxo[] {
  // Remove projeções antigas
  const contasSemProjecao = contasFluxoExistentes.filter(c => !c.projecao);
  
  if (faturamentoEsperado30d <= 0) {
    return contasSemProjecao;
  }
  
  const segundas = getProximasSegundas(4);
  const novasProjecoes: ContaFluxo[] = [];
  
  for (const [canalId, { percentual, label }] of Object.entries(DISTRIBUICAO_CANAIS)) {
    const valorSemanal = (faturamentoEsperado30d * percentual) / 4;
    
    for (let semana = 0; semana < 4; semana++) {
      novasProjecoes.push({
        id: crypto.randomUUID(),
        tipo: 'receber',
        descricao: `Projeção ${label} - Semana ${semana + 1}`,
        valor: valorSemanal.toFixed(2).replace('.', ','),
        dataVencimento: segundas[semana],
        pago: false,
        projecao: true,
        canalOrigem: canalId,
      });
    }
  }
  
  return [...contasSemProjecao, ...novasProjecoes];
}
