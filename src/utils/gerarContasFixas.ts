import { ContaFluxo, CustosFixosDetalhados, Emprestimo, CustoFixoItem } from '@/types/focus-mode';
import { format, addMonths, setDate, isWeekend, addDays } from 'date-fns';

// Mapeamento de serviços para dias de vencimento
const SERVICOS_DIAS: Record<string, number> = {
  'gioia': 15,
  'verter': 20,
  'vegui': 15,
  'matheus': 25,
};

// Calcula o 5º dia útil do mês
function get5thBusinessDay(year: number, month: number): Date {
  let date = new Date(year, month, 1);
  let businessDays = 0;
  
  while (businessDays < 5) {
    if (!isWeekend(date)) {
      businessDays++;
    }
    if (businessDays < 5) {
      date = addDays(date, 1);
    }
  }
  
  return date;
}

// Detecta o dia de vencimento de um serviço pelo nome
function detectarDiaServico(nome: string): number {
  const nomeLower = nome.toLowerCase();
  for (const [key, dia] of Object.entries(SERVICOS_DIAS)) {
    if (nomeLower.includes(key)) {
      return dia;
    }
  }
  return 25; // Default
}

interface GerarContasFixasResult {
  contasGeradas: Omit<ContaFluxo, 'id'>[];
  contasJaExistentes: number;
}

export function gerarContasFixas(
  custosFixos: CustosFixosDetalhados,
  contasExistentes: ContaFluxo[],
  faturamentoMesAnterior: number,
  adsBase: number,
  mesReferencia?: Date
): GerarContasFixasResult {
  const hoje = mesReferencia || new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  
  const contasGeradas: Omit<ContaFluxo, 'id'>[] = [];
  let contasJaExistentes = 0;
  
  // Helper para verificar se conta já existe
  const contaJaExiste = (descricao: string, mesVencimento: number): boolean => {
    return contasExistentes.some(c => {
      if (c.pago) return false; // Ignorar pagas
      const [anoC, mesC] = c.dataVencimento.split('-').map(Number);
      const mesmaDescricao = c.descricao.toLowerCase().includes(descricao.toLowerCase().slice(0, 20));
      return mesmaDescricao && mesC === mesVencimento + 1;
    });
  };
  
  // Helper para criar data de vencimento
  const criarDataVencimento = (dia: number): string => {
    const data = setDate(new Date(ano, mes, 1), Math.min(dia, 28));
    return format(data, 'yyyy-MM-dd');
  };
  
  // 1. PESSOAS - 5º dia útil
  const dia5Util = get5thBusinessDay(ano, mes);
  const dataVencPessoas = format(dia5Util, 'yyyy-MM-dd');
  
  (custosFixos.pessoas || []).forEach((item: CustoFixoItem) => {
    if (contaJaExiste(item.nome, mes)) {
      contasJaExistentes++;
      return;
    }
    contasGeradas.push({
      tipo: 'pagar',
      descricao: `Folha: ${item.nome}`,
      valor: item.valor.toFixed(2),
      dataVencimento: dataVencPessoas,
      pago: false,
    });
  });
  
  // 2. SOFTWARE - dia 23 (cartão)
  const dataSoftware = criarDataVencimento(23);
  (custosFixos.software || []).forEach((item: CustoFixoItem) => {
    if (contaJaExiste(item.nome, mes)) {
      contasJaExistentes++;
      return;
    }
    contasGeradas.push({
      tipo: 'cartao',
      descricao: `Software: ${item.nome}`,
      valor: item.valor.toFixed(2),
      dataVencimento: dataSoftware,
      pago: false,
    });
  });
  
  // 3. ADS BASE - dia 23 (cartão)
  if (adsBase > 0 && !contaJaExiste('Ads Base', mes)) {
    contasGeradas.push({
      tipo: 'cartao',
      descricao: 'Ads Base (Tráfego Pago)',
      valor: adsBase.toFixed(2),
      dataVencimento: dataSoftware,
      pago: false,
    });
  } else if (adsBase > 0) {
    contasJaExistentes++;
  }
  
  // 4. EMPRÉSTIMOS - dias específicos de cada um
  (custosFixos.emprestimos || []).forEach((emp: Emprestimo) => {
    const descricaoEmp = `Emp: ${emp.banco} ${emp.produto}`;
    if (contaJaExiste(descricaoEmp.slice(0, 20), mes)) {
      contasJaExistentes++;
      return;
    }
    
    // Verificar se empréstimo está em carência
    if (emp.primeiraParcelaData) {
      const [mesStr, anoStr] = emp.primeiraParcelaData.split('.');
      const mesesAbrev: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
      };
      const mesInicio = mesesAbrev[mesStr.toLowerCase()] ?? 0;
      const anoInicio = 2000 + parseInt(anoStr);
      const dataInicio = new Date(anoInicio, mesInicio, 1);
      
      if (hoje < dataInicio) {
        // Ainda em carência, não gerar
        return;
      }
    }
    
    contasGeradas.push({
      tipo: 'pagar',
      descricao: descricaoEmp,
      valor: emp.parcelaMedia.toFixed(2),
      dataVencimento: criarDataVencimento(emp.diaVencimento),
      pago: false,
    });
  });
  
  // 5. ARMAZENAGEM - dia 25
  const dataArmazenagem = criarDataVencimento(25);
  (custosFixos.armazenagem || []).forEach((item: CustoFixoItem) => {
    if (contaJaExiste(item.nome, mes)) {
      contasJaExistentes++;
      return;
    }
    contasGeradas.push({
      tipo: 'pagar',
      descricao: `Armazenagem: ${item.nome}`,
      valor: item.valor.toFixed(2),
      dataVencimento: dataArmazenagem,
      pago: false,
    });
  });
  
  // 6. SERVIÇOS - dias específicos
  (custosFixos.servicos || []).forEach((item: CustoFixoItem) => {
    if (contaJaExiste(item.nome, mes)) {
      contasJaExistentes++;
      return;
    }
    const diaVenc = detectarDiaServico(item.nome);
    contasGeradas.push({
      tipo: 'pagar',
      descricao: `Serviço: ${item.nome}`,
      valor: item.valor.toFixed(2),
      dataVencimento: criarDataVencimento(diaVenc),
      pago: false,
    });
  });
  
  // 7. MARKETING ESTRUTURAL - dias específicos
  (custosFixos.marketing || []).forEach((item: CustoFixoItem) => {
    if (contaJaExiste(item.nome, mes)) {
      contasJaExistentes++;
      return;
    }
    const diaVenc = detectarDiaServico(item.nome);
    contasGeradas.push({
      tipo: 'pagar',
      descricao: `Marketing: ${item.nome}`,
      valor: item.valor.toFixed(2),
      dataVencimento: criarDataVencimento(diaVenc),
      pago: false,
    });
  });
  
  // 8. IMPOSTOS - dia 20, 4 parcelas (2 DAS + 2 DARF INSS)
  if (faturamentoMesAnterior > 0) {
    const totalImpostos = faturamentoMesAnterior * 0.16;
    const parcelaImposto = totalImpostos / 4;
    const dataImpostos = criarDataVencimento(20);
    
    const impostosNomes = [
      'DAS Simples (NF Ecom)',
      'DAS Simples (NF Foods)',
      'DARF INSS (Ecom)',
      'DARF INSS (Foods)',
    ];
    
    impostosNomes.forEach((nome) => {
      if (contaJaExiste(nome, mes)) {
        contasJaExistentes++;
        return;
      }
      contasGeradas.push({
        tipo: 'pagar',
        descricao: `Imposto: ${nome}`,
        valor: parcelaImposto.toFixed(2),
        dataVencimento: dataImpostos,
        pago: false,
      });
    });
  }
  
  return { contasGeradas, contasJaExistentes };
}
