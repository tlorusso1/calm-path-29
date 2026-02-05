import { CustosFixosDetalhados, CustoFixoItem, Emprestimo } from '@/types/focus-mode';

export const DEFAULT_EMPRESTIMOS: Emprestimo[] = [
  {
    id: 'emp1',
    empresa: 'NICE FOODS ECOMMERCE LTDA',
    banco: 'Itaú',
    produto: 'PRONAMPE 2025',
    valorContratado: 150000,
    saldoDevedor: 152891.69,
    taxaJurosAnual: 20.76,
    taxaJurosMensal: 1.73,
    parcelasRestantes: 36,
    parcelasTotais: 48,
    parcelaMedia: 4621.15,
    diaVencimento: 20,
    vencimentoFinal: 'abr.2029',
    carencia: '12 meses',
  },
  {
    id: 'emp2',
    empresa: 'NICE FOODS ECOMMERCE LTDA',
    banco: 'Itaú',
    produto: 'PRONAMPE 2026',
    valorContratado: 97376,
    saldoDevedor: 100699.91,
    taxaJurosAnual: 20.88,
    taxaJurosMensal: 1.74,
    parcelasRestantes: 48,
    parcelasTotais: 48,
    parcelaMedia: 2350.52,
    diaVencimento: 26,
    vencimentoFinal: 'abr.2030',
    primeiraParcelaData: 'mai.2026',
    carencia: '3 meses',
  },
  {
    id: 'emp3',
    empresa: 'NICE FOODS LTDA',
    banco: 'Itaú',
    produto: 'PRONAMPE PJ-2026',
    valorContratado: 65734,
    saldoDevedor: 67977.70,
    taxaJurosAnual: 20.88,
    taxaJurosMensal: 1.74,
    parcelasRestantes: 48,
    parcelasTotais: 48,
    parcelaMedia: 1586.72,
    diaVencimento: 26,
    vencimentoFinal: 'abr.2030',
    primeiraParcelaData: 'mai.2026',
    carencia: '3 meses',
  },
  {
    id: 'emp4',
    empresa: 'NICE FOODS LTDA',
    banco: 'Itaú',
    produto: 'PRONAMPE PJ-2025',
    valorContratado: 95000,
    saldoDevedor: 104278.97,
    taxaJurosAnual: 20.88,
    taxaJurosMensal: 1.74,
    parcelasRestantes: 48,
    parcelasTotais: 48,
    parcelaMedia: 2433.07,
    diaVencimento: 7,
    vencimentoFinal: 'jan.2030',
    primeiraParcelaData: 'fev.2026',
    carencia: '12 meses',
  },
  {
    id: 'emp5',
    empresa: 'NICE FOODS LTDA',
    banco: 'Itaú',
    produto: 'PEAC FGI 2025',
    valorContratado: 450000,
    saldoDevedor: 481110.48,
    taxaJurosAnual: 28.56,
    taxaJurosMensal: 2.38,
    parcelasRestantes: 48,
    parcelasTotais: 48,
    parcelaMedia: 11076.37,
    diaVencimento: 8,
    vencimentoFinal: 'jan.2030',
    carencia: '5 meses',
    notas: 'Parcela reduzida nos primeiros 5 meses, depois R$ 17.500',
  },
  {
    id: 'emp6',
    empresa: 'NICE FOODS ECOMMERCE LTDA',
    banco: 'Receita Federal',
    produto: 'SIMPLES NACIONAL PARCELAMENTO',
    valorContratado: 34079.32,
    saldoDevedor: 27750.92,
    taxaJurosAnual: 0,
    taxaJurosMensal: 0,
    parcelasRestantes: 50,
    parcelasTotais: 60,
    parcelaMedia: 632.84,
    diaVencimento: 25,
    vencimentoFinal: '',
  },
];

export const DEFAULT_CUSTOS_FIXOS: CustosFixosDetalhados = {
  pessoas: [
    { id: 'p1', nome: 'Paola - Distribuição lucros', valor: 5000, tipo: 'fixo' },
    { id: 'p2', nome: 'Paola - Pró-labore', valor: 1351.02, tipo: 'fixo' },
    { id: 'p3', nome: 'Thiago - Distribuição lucros', valor: 8000, tipo: 'fixo' },
    { id: 'p4', nome: 'Thiago - Pró-labore', valor: 1351.02, tipo: 'fixo' },
    { id: 'p5', nome: 'Gabrielle - CLT', valor: 1901.87, tipo: 'fixo' },
    { id: 'p6', nome: 'Julia - CLT', valor: 1282.87, tipo: 'fixo' },
    { id: 'p7', nome: 'Amanda - PJ', valor: 2382.60, tipo: 'cortavel' },
    { id: 'p8', nome: 'Geral - Auxílios', valor: 1250, tipo: 'cortavel' },
  ],
  software: [
    { id: 's1', nome: 'Bling (ERP Ecom)', valor: 450, tipo: 'fixo' },
    { id: 's2', nome: 'Tiny B2B (Nice Foods matriz)', valor: 162.42, tipo: 'fixo' },
    { id: 's3', nome: 'Tiny B2B (Nice Foods filial SP)', valor: 162.42, tipo: 'fixo' },
    { id: 's4', nome: 'Nuvemshop', valor: 394, tipo: 'fixo' },
    { id: 's5', nome: 'Google GSUITE', valor: 560, tipo: 'fixo' },
    { id: 's6', nome: 'Perfit (Email MKT)', valor: 476, tipo: 'cortavel' },
    { id: 's7', nome: 'Empreender.com', valor: 169.51, tipo: 'cortavel' },
    { id: 's8', nome: 'Adobe', valor: 124, tipo: 'cortavel' },
    { id: 's9', nome: 'Canva', valor: 44.99, tipo: 'cortavel' },
    { id: 's10', nome: 'Claspo.io', valor: 48.04, tipo: 'cortavel' },
    { id: 's11', nome: 'Cashing', valor: 99.90, tipo: 'cortavel' },
    { id: 's12', nome: 'Pluga', valor: 89, tipo: 'cortavel' },
    { id: 's13', nome: 'Chipbot', valor: 49.01, tipo: 'cortavel' },
    { id: 's14', nome: 'ML nível 6', valor: 17.99, tipo: 'fixo' },
    { id: 's15', nome: 'Apple iCloud', valor: 14.90, tipo: 'cortavel' },
  ],
  marketing: [
    { id: 'm1', nome: 'Vegui - Influencer', valor: 1500, tipo: 'cortavel' },
    { id: 'm2', nome: 'Matheus - Conteúdo', valor: 2500, tipo: 'cortavel' },
    { id: 'm3', nome: 'Impressos', valor: 1000, tipo: 'cortavel' },
  ],
  servicos: [
    { id: 'sv1', nome: 'Gioia - Contabilidade', valor: 3000, tipo: 'fixo' },
    { id: 'sv2', nome: 'Verter - Consultoria', valor: 5000, tipo: 'cortavel' },
  ],
  armazenagem: [
    { id: 'a1', nome: 'Galpão/Estoque', valor: 1800, tipo: 'fixo' },
  ],
  emprestimos: DEFAULT_EMPRESTIMOS,
};

// Categorias padrão (sem empréstimos que tem estrutura diferente)
const CATEGORIAS_CUSTO_FIXO: (keyof CustosFixosDetalhados)[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];

// Helper para calcular total
export function calcularTotalCustosFixos(data: CustosFixosDetalhados): number {
  const totalCategorias = CATEGORIAS_CUSTO_FIXO.reduce((sum, cat) => {
    return sum + ((data[cat] as CustoFixoItem[]) || []).reduce((s, item) => s + item.valor, 0);
  }, 0);
  
  // Adicionar parcelas de empréstimos
  const totalEmprestimos = (data.emprestimos || []).reduce((s, emp) => s + emp.parcelaMedia, 0);
  
  return totalCategorias + totalEmprestimos;
}

// Helper para calcular total de cortáveis
export function calcularTotalCortavel(data: CustosFixosDetalhados): number {
  return CATEGORIAS_CUSTO_FIXO.reduce((sum, cat) => {
    return sum + ((data[cat] as CustoFixoItem[]) || [])
      .filter(item => item.tipo === 'cortavel')
      .reduce((s, item) => s + item.valor, 0);
  }, 0);
}

// Helper para calcular total de empréstimos (parcelas mensais)
export function calcularTotalEmprestimos(data: CustosFixosDetalhados): number {
  return (data.emprestimos || []).reduce((s, emp) => s + emp.parcelaMedia, 0);
}
