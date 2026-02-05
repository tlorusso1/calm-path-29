import { Fornecedor } from '@/types/focus-mode';
import { parseFornecedoresCSV, matchFornecedor, extrairBeneficiarioFinal } from './fornecedoresParser';
import fornecedoresCSV from '@/data/fornecedores.csv?raw';

// Cache para evitar reprocessamento
let cachedFornecedores: Fornecedor[] | null = null;

/**
 * Carrega e processa a lista de fornecedores do CSV
 * Filtra duplicados, "a classificar" e entradas inválidas
 */
export function loadFornecedores(): Fornecedor[] {
  if (cachedFornecedores) return cachedFornecedores;

  const linhas = fornecedoresCSV.split('\n').filter(l => l.trim());
  if (linhas.length < 2) return [];

  const fornecedores: Fornecedor[] = [];
  const seen = new Map<string, number>(); // nome normalizado -> index

  // Pular header
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    
    // Parse CSV com suporte a aspas
    const cols = parseCSVLine(linha);
    
    const nome = (cols[0] || '').trim();
    const modalidade = (cols[1] || '').trim();
    const grupo = (cols[2] || '').trim();
    const categoria = (cols[3] || '').trim();
    const cnpj = (cols[4] || '').trim() || undefined;
    const razaoSocial = (cols[5] || '').trim() || undefined;
    const chavePix = (cols[6] || '').trim() || undefined;

    // Filtrar entradas inválidas
    if (!nome || nome === '-') continue;
    if (modalidade === 'a classificar' && grupo === 'a classificar') continue;
    if (modalidade === 'transacional' || modalidade === 'Transacional') continue;
    
    // Normalizar nome para check de duplicados
    const nomeNorm = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Evitar duplicados exatos
    if (seen.has(nomeNorm)) {
      // Se já existe, verificar se novo tem mais info
      const existingIdx = seen.get(nomeNorm)!;
      const existing = fornecedores[existingIdx];
      if ((!existing.categoria || existing.categoria === 'a classificar') && categoria && categoria !== 'a classificar') {
        // Atualizar com info melhor
        fornecedores[existingIdx] = {
          ...existing,
          modalidade: modalidade || existing.modalidade,
          grupo: grupo || existing.grupo,
          categoria: categoria || existing.categoria,
        };
      }
      continue;
    }

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
      modalidade: modalidade || 'a classificar',
      grupo: grupo || 'a classificar',
      categoria: categoria || 'a classificar',
      cnpj,
      chavePix,
      aliases: aliases.length > 0 ? aliases : undefined,
    });
    
    seen.set(nomeNorm, fornecedores.length - 1);
  }

  cachedFornecedores = fornecedores;
  return fornecedores;
}

/**
 * Parse de linha CSV com suporte a aspas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // última coluna
  return result;
}

/**
 * Busca fornecedor por nome (fuzzy match)
 * Retorna lista ordenada por relevância
 */
export function buscarFornecedores(
  termo: string, 
  fornecedores: Fornecedor[],
  limite: number = 20
): Fornecedor[] {
  if (!termo || termo.length < 2) return fornecedores.slice(0, limite);
  
  const termoNorm = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Separar por tipo de match
  const exatos: Fornecedor[] = [];
  const comecaCom: Fornecedor[] = [];
  const contem: Fornecedor[] = [];
  
  for (const f of fornecedores) {
    const nomeNorm = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (nomeNorm === termoNorm) {
      exatos.push(f);
    } else if (nomeNorm.startsWith(termoNorm)) {
      comecaCom.push(f);
    } else if (nomeNorm.includes(termoNorm)) {
      contem.push(f);
    } else if (f.aliases?.some(a => {
      const aliasNorm = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return aliasNorm.includes(termoNorm);
    })) {
      contem.push(f);
    }
  }
  
  return [...exatos, ...comecaCom, ...contem].slice(0, limite);
}

// Re-export do matchFornecedor para uso externo
export { matchFornecedor };
