import { Fornecedor } from '@/types/focus-mode';

// Extrai "Beneficiário Final" de nomes compostos
export function extrairBeneficiarioFinal(nome: string): string | null {
  const match = nome.match(/\(Benefici[aá]rio\s*Final[:\s]+([^)]+)\)/i);
  if (match) return match[1].trim();
  return null;
}

// Parse CSV de fornecedores
export function parseFornecedoresCSV(csvText: string): Fornecedor[] {
  const linhas = csvText.split('\n').filter(l => l.trim());
  if (linhas.length < 2) return [];

  const fornecedores: Fornecedor[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const cols = linha.split(',').map(c => c.trim());
    
    const nome = cols[0] || '';
    const modalidade = cols[1] || 'a classificar';
    const grupo = cols[2] || 'a classificar';
    const categoria = cols[3] || 'a classificar';
    const cnpj = cols[4] || undefined;
    const razaoSocial = cols[5] || undefined;
    const chavePix = cols[6] || undefined;

    if (!nome || nome === '-' || seen.has(nome.toLowerCase())) continue;
    seen.add(nome.toLowerCase());

    const aliases: string[] = [];
    const beneficiario = extrairBeneficiarioFinal(nome);
    if (beneficiario) aliases.push(beneficiario);
    if (razaoSocial && razaoSocial !== nome) aliases.push(razaoSocial);

    fornecedores.push({
      id: crypto.randomUUID(),
      nome,
      modalidade,
      grupo,
      categoria,
      cnpj,
      chavePix,
      aliases: aliases.length > 0 ? aliases : undefined,
    });
  }

  return fornecedores;
}

// Nomes genéricos que não devem ganhar de matches mais específicos
const NOMES_GENERICOS = new Set([
  'pagamento', 'pagamentos', 'transferencia', 'pix', 'ted', 'doc',
  'debito', 'credito', 'saldo', 'tarifa', 'compra',
]);

// Sufixos societários que atrapalham o match
const SUFIXOS_SOCIETARIOS = /\b(ltda|s\/?a|me|epp|eireli|s\.a\.|ltd|inc|sa)\b/gi;

// Extrai CNPJ de uma string
function extrairCNPJ(texto: string): string | null {
  const m = texto.match(/(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\\/\s]?\d{4}[\-\s]?\d{2})/);
  if (!m) return null;
  return m[1].replace(/[\.\s\-\/\\]/g, '');
}

// Normaliza texto removendo acentos, sufixos societários e espaços extras
function normalizarParaMatch(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(SUFIXOS_SOCIETARIOS, '')
    .replace(/[.\-\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Match de fornecedor por descrição
export function matchFornecedor(
  descricao: string, 
  fornecedores: Fornecedor[]
): Fornecedor | null {
  if (!descricao || fornecedores.length === 0) return null;

  const descNorm = normalizarParaMatch(descricao);
  
  // 1. Tentar match por CNPJ (mais preciso)
  const cnpjDesc = extrairCNPJ(descricao);
  if (cnpjDesc) {
    const matchCnpj = fornecedores.find(f => {
      if (!f.cnpj) return false;
      const cnpjForn = f.cnpj.replace(/[\.\s\-\/\\]/g, '');
      return cnpjForn === cnpjDesc;
    });
    if (matchCnpj) return matchCnpj;
  }

  // 2. Tentar extrair beneficiário final
  const beneficiario = extrairBeneficiarioFinal(descricao);
  if (beneficiario) {
    const benefNorm = normalizarParaMatch(beneficiario);
    const match = fornecedores.find(f => {
      const nomeNorm = normalizarParaMatch(f.nome);
      if (nomeNorm.includes(benefNorm) || benefNorm.includes(nomeNorm)) return true;
      return f.aliases?.some(a => {
        const aliasNorm = normalizarParaMatch(a);
        return aliasNorm.includes(benefNorm) || benefNorm.includes(aliasNorm);
      });
    });
    if (match) return match;
  }

  // 3. Coletar todos os matches por nome/alias e escolher o mais específico
  type MatchResult = { fornecedor: Fornecedor; matchLength: number };
  const matches: MatchResult[] = [];

  for (const f of fornecedores) {
    const nomeNorm = normalizarParaMatch(f.nome);
    
    // Match bidirecional (sem sufixos societários)
    if (nomeNorm.length >= 3 && (descNorm.includes(nomeNorm) || nomeNorm.includes(descNorm))) {
      matches.push({ fornecedor: f, matchLength: nomeNorm.length });
    }
    
    if (f.aliases) {
      for (const alias of f.aliases) {
        const aliasNorm = normalizarParaMatch(alias);
        if (aliasNorm.length >= 3 && (descNorm.includes(aliasNorm) || aliasNorm.includes(descNorm))) {
          matches.push({ fornecedor: f, matchLength: aliasNorm.length });
        }
      }
    }
  }

  if (matches.length === 0) return null;

  // Filtrar matches genéricos se há matches mais específicos
  const specificMatches = matches.filter(m => 
    !NOMES_GENERICOS.has(normalizarParaMatch(m.fornecedor.nome))
  );

  const pool = specificMatches.length > 0 ? specificMatches : matches;
  pool.sort((a, b) => b.matchLength - a.matchLength);
  return pool[0].fornecedor;
}

// Fornecedores padrão do CSV fornecido
export const FORNECEDORES_INICIAIS: Partial<Fornecedor>[] = [
  { nome: '3TM DISTRIBUIDORA', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Embalagens' },
  { nome: 'ADL CONTABILIDADE LTDA', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Contábil' },
  { nome: 'BHUB SERVICOS E TECNOLOGIA LTDA', modalidade: 'DESPESAS ADMINISTRATIVAS', grupo: 'Serviços de Consultoria Operacional', categoria: 'Assessoria Financeira' },
  { nome: 'JUND COCO LTDA', modalidade: 'CUSTOS DE PRODUTO VENDIDO', grupo: 'Estoque/Custos', categoria: 'Compra de Matéria Prima' },
  { nome: 'Meta', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Anuncios Online' },
  { nome: 'Google Ads', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Anuncios Online' },
  { nome: 'Bytedance Brasil Tecnologia LTDA', modalidade: 'DESPESAS COMERCIAIS', grupo: 'Despesas de Marketing', categoria: 'Anuncios Online' },
  { nome: 'NICE FOODS LTDA', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2B)' },
  { nome: 'NICE FOODS ECOMMERCE LTDA', modalidade: 'RECEITAS', grupo: 'Receitas Diretas', categoria: 'Clientes Nacionais (B2C)' },
];
