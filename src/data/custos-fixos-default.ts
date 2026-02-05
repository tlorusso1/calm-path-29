import { CustosFixosDetalhados } from '@/types/focus-mode';

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
    // Ads Base vai para campo separado, não entra aqui
  ],
  servicos: [
    { id: 'sv1', nome: 'Gioia - Contabilidade', valor: 3000, tipo: 'fixo' },
    { id: 'sv2', nome: 'Verter - Consultoria', valor: 5000, tipo: 'cortavel' },
  ],
  armazenagem: [
    { id: 'a1', nome: 'Galpão/Estoque', valor: 1800, tipo: 'fixo' },
  ],
};

// Helper para calcular total
export function calcularTotalCustosFixos(data: CustosFixosDetalhados): number {
  const categorias: (keyof CustosFixosDetalhados)[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];
  return categorias.reduce((sum, cat) => {
    return sum + (data[cat] || []).reduce((s, item) => s + item.valor, 0);
  }, 0);
}

// Helper para calcular total de cortáveis
export function calcularTotalCortavel(data: CustosFixosDetalhados): number {
  const categorias: (keyof CustosFixosDetalhados)[] = ['pessoas', 'software', 'marketing', 'servicos', 'armazenagem'];
  return categorias.reduce((sum, cat) => {
    return sum + (data[cat] || [])
      .filter(item => item.tipo === 'cortavel')
      .reduce((s, item) => s + item.valor, 0);
  }, 0);
}
