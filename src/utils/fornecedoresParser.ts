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

  // Pular header
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    // Parse CSV básico (não lida com quotes escapadas, mas funciona para dados simples)
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

    // Extrair aliases
    const aliases: string[] = [];
    const beneficiario = extrairBeneficiarioFinal(nome);
    if (beneficiario) {
      aliases.push(beneficiario);
    }
    if (razaoSocial && razaoSocial !== nome) {
      aliases.push(razaoSocial);
    }

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

// Match de fornecedor por descrição
export function matchFornecedor(
  descricao: string, 
  fornecedores: Fornecedor[]
): Fornecedor | null {
  if (!descricao || fornecedores.length === 0) return null;

  const descNorm = descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Primeiro: tentar extrair beneficiário final
  const beneficiario = extrairBeneficiarioFinal(descricao);
  if (beneficiario) {
    const benefNorm = beneficiario.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const match = fornecedores.find(f => {
      const nomeNorm = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (nomeNorm.includes(benefNorm) || benefNorm.includes(nomeNorm)) return true;
      return f.aliases?.some(a => {
        const aliasNorm = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return aliasNorm.includes(benefNorm) || benefNorm.includes(aliasNorm);
      });
    });
    if (match) return match;
  }

  // Segundo: match direto
  for (const f of fornecedores) {
    const nomeNorm = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Match exato ou parcial
    if (descNorm.includes(nomeNorm) || nomeNorm.includes(descNorm)) {
      return f;
    }
    
    // Check aliases
    if (f.aliases) {
      for (const alias of f.aliases) {
        const aliasNorm = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (descNorm.includes(aliasNorm) || aliasNorm.includes(descNorm)) {
          return f;
        }
      }
    }
  }

  return null;
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
];
