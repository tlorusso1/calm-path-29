// Estrutura completa de categorias DRE baseada na planilha oficial

export type TipoDRE = 'RECEITAS' | 'DESPESAS';

export interface CategoriaDRE {
  tipo: TipoDRE;
  modalidade: string;
  grupo: string;
  categoria: string;
}

export const CATEGORIAS_DRE: CategoriaDRE[] = [
  // ============= RECEITAS =============
  { tipo: 'RECEITAS', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2B)' },
  { tipo: 'RECEITAS', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Receita Inter Company' },
  { tipo: 'RECEITAS', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2C)' },
  
  // ============= OUTRAS RECEITAS/DESPESAS (ENTRADAS) =============
  { tipo: 'RECEITAS', modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Entradas', categoria: 'Entradas a Reclassificar' },
  { tipo: 'RECEITAS', modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Entradas', categoria: 'Transferencias entre contas' },
  
  // ============= RECEITAS FINANCEIRAS =============
  { tipo: 'RECEITAS', modalidade: 'RECEITAS FINANCEIRAS', grupo: 'Receitas Financeiras', categoria: 'Emprestimos e Financiamentos' },
  { tipo: 'RECEITAS', modalidade: 'RECEITAS FINANCEIRAS', grupo: 'Receitas Financeiras', categoria: 'Rendimentos de Aplicações' },
  { tipo: 'RECEITAS', modalidade: 'RECEITAS FINANCEIRAS', grupo: 'Receitas Financeiras', categoria: 'Estornos de pagamentos' },
  
  // ============= DEDUÇÕES =============
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'Devoluções de vendas' },
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'ICMS' },
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'Simples Nacional (DAS)' },
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'PIS E COFINS' },
  { tipo: 'DESPESAS', modalidade: 'DEDUÇÕES', grupo: 'Deduções da receita', categoria: 'Taxas sobre vendas' },
  
  // ============= CUSTOS DE PRODUTO VENDIDO =============
  { tipo: 'DESPESAS', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Compra de Matéria Prima' },
  { tipo: 'DESPESAS', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Frete Compra' },
  { tipo: 'DESPESAS', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Industrialização' },
  { tipo: 'DESPESAS', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Embalagens' },
  { tipo: 'DESPESAS', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Mercadoria para Revenda' },
  
  // ============= DESPESAS DE PESSOAL =============
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Colaboradores PJ' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Salários CLT' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'INSS' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Pro Labore' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Seguro de Vida' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Despesas Gerais com Funcionário' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'FGTS' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'IRRF - Código 0561' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Vale Refeição/Alimentação' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Alimentação na empresa' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS DE PESSOAL', grupo: 'Despesas com Pessoal', categoria: 'Cursos e Treinamentos' },
  
  // ============= DESPESAS ADMINISTRATIVAS =============
  // Despesa com Materiais
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesa com Materiais', categoria: 'Material de Uso e Consumo' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesa com Materiais', categoria: 'Material para Manutenção Predial' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesa com Materiais', categoria: 'Limpeza e Higiene' },
  
  // Despesas com Ocupação e Utilidades
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Energia Elétrica' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Telefone/Internet' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Aluguel de Imóveis' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Água e Esgoto' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Armazenagem de Estoque' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Ocupação e Utilidades', categoria: 'Manutenção Predial' },
  
  // Despesas com Tecnologia
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Tecnologia', categoria: 'Assessoria e Consultoria em Informática' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Tecnologia', categoria: 'Licença de Software' },
  
  // Despesas Operacionais
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas Operacionais', categoria: 'Aluguel de Frota' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas Operacionais', categoria: 'Assinaturas e Mensalidades' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas Operacionais', categoria: 'Correios e Similares' },
  
  // Obrigações Tributárias
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Obrigações Tributárias', categoria: 'Licença e Alvará' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Obrigações Tributárias', categoria: 'IRRF sobre Aplicações Financeiras' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Obrigações Tributárias', categoria: 'IOF sobre Operações Financeiras' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Obrigações Tributárias', categoria: 'IOF sobre Faturamento' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Obrigações Tributárias', categoria: 'Taxas diversas' },
  
  // Serviços de Consultoria Operacional
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Jurídica' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Contábil' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Financeira' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria em Mídia Paga' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Serviços de Design' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Comercial' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Administrativa' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria em RH' },
  
  // Despesas com Viagens
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Viagens', categoria: 'Passagens e Locomoções' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Viagens', categoria: 'Aluguel de Frota' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Despesas com Viagens', categoria: 'Hospedagem' },
  
  // ============= DESPESAS COMERCIAIS =============
  // Despesas de Marketing
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Influencers' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Produções Fotográficas' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Criadores de Conteúdo' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Anuncios Online' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Materiais Impressos' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Eventos' },
  
  // Despesas de Vendas
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Vendas', categoria: 'Frete Venda' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Vendas', categoria: 'Brindes' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Vendas', categoria: 'Fullfilment' },
  
  // ============= OUTRAS RECEITAS/DESPESAS (SAÍDAS) =============
  { tipo: 'DESPESAS', modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria: 'Transferencias entre contas' },
  { tipo: 'DESPESAS', modalidade: 'OUTRAS RECEITAS/DESPESAS', grupo: 'Outras Saídas', categoria: 'Saídas a Reclassificar' },
  
  // ============= DESPESAS FINANCEIRAS =============
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Tarifas Bancárias' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Taxas Administrativas de Cartão' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Tarifa meio de pagamentos' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Custas e Emolumentos' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Juros sobre Empréstimo' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Depreciação' },
  { tipo: 'DESPESAS', modalidade: 'DESPESAS FINANCEIRAS', grupo: 'Despesas Financeiras / Bancos', categoria: 'Amortização' },
  
  // ============= ATIVIDADES NÃO OPERACIONAIS =============
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Pesquisa e Desenvolvimento', categoria: 'Gastos com P&D' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Pesquisa e Desenvolvimento', categoria: 'Assessoria em P&D' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Distribuição de Lucros', categoria: 'Participação de Resultados' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Bens Móveis', categoria: 'Mobília' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Máquinas e Equipamentos', categoria: 'Equipamentos de Informática' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Emprestimos e Financiamentos', categoria: 'Pagamento da Parcela Principal' },
  { tipo: 'DESPESAS', modalidade: 'ATIVIDADES NÃO OPERACIONAIS', grupo: 'Emprestimos e Financiamentos', categoria: 'Depósito caução' },
  
  // ============= IMPOSTOS =============
  { tipo: 'DESPESAS', modalidade: 'IMPOSTOS', grupo: 'Impostos sobre o lucro', categoria: 'Impostos sobre o lucro' },
];

// Ordem de exibição das modalidades no DRE
export const ORDEM_MODALIDADES_DRE = [
  'RECEITAS',
  'RECEITAS FINANCEIRAS',
  'DEDUÇÕES',
  'CUSTOS DE PRODUTO VENDIDO',
  'DESPESAS DE PESSOAL',
  'DESPESAS ADMINISTRATIVAS',
  'DESPESAS COMERCIAIS',
  'DESPESAS FINANCEIRAS',
  'OUTRAS RECEITAS/DESPESAS',
  'ATIVIDADES NÃO OPERACIONAIS',
  'IMPOSTOS',
];

// Helpers para navegação hierárquica
export function getModalidades(tipo?: TipoDRE): string[] {
  const modalidades = CATEGORIAS_DRE
    .filter(c => !tipo || c.tipo === tipo)
    .map(c => c.modalidade);
  return [...new Set(modalidades)];
}

export function getGrupos(modalidade: string): string[] {
  const grupos = CATEGORIAS_DRE
    .filter(c => c.modalidade === modalidade)
    .map(c => c.grupo);
  return [...new Set(grupos)];
}

export function getCategorias(grupo: string): string[] {
  const categorias = CATEGORIAS_DRE
    .filter(c => c.grupo === grupo)
    .map(c => c.categoria);
  return [...new Set(categorias)];
}

export function findCategoria(categoria: string): CategoriaDRE | undefined {
  return CATEGORIAS_DRE.find(c => c.categoria === categoria);
}

export function findByModalidade(modalidade: string): CategoriaDRE[] {
  return CATEGORIAS_DRE.filter(c => c.modalidade === modalidade);
}

export function getTipoByModalidade(modalidade: string): TipoDRE | undefined {
  const cat = CATEGORIAS_DRE.find(c => c.modalidade === modalidade);
  return cat?.tipo;
}
