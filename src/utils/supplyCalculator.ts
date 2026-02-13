import { 
  ItemEstoque, 
  TipoEstoque, 
  SupplyChainStage, 
  SupplyResumo,
  SupplyExports 
} from '@/types/focus-mode';
import { calcularCMVPorSaidas, calcularReceitaBruta } from '@/utils/movimentacoesParser';

// ============= Réguas de Segurança por Tipo =============

interface RegraCobertura {
  critico: number;    // Abaixo = vermelho
  atencao: number;    // Abaixo = amarelo, acima = verde
  ideal: number;      // Meta recomendada
}

export const REGRAS_COBERTURA: Record<TipoEstoque, RegraCobertura> = {
  produto_acabado: { critico: 15, atencao: 30, ideal: 45 },
  embalagem: { critico: 30, atencao: 60, ideal: 90 },
  insumo: { critico: 20, atencao: 40, ideal: 60 },
  materia_prima: { critico: 20, atencao: 40, ideal: 60 },
};

export const TIPO_LABELS: Record<TipoEstoque, string> = {
  produto_acabado: 'Produto Acabado',
  embalagem: 'Embalagem',
  insumo: 'Insumo',
  materia_prima: 'Matéria-Prima',
};

// ============= Cálculo de Cobertura =============

/**
 * Calcula a cobertura em dias para um item
 * Fórmula: Quantidade / (Demanda Semanal / 7)
 */
export function calcularCoberturaDias(
  quantidade: number,
  demandaSemanal: number
): number | null {
  if (demandaSemanal <= 0) return null;
  const demandaDiaria = demandaSemanal / 7;
  return Math.round(quantidade / demandaDiaria);
}

/**
 * Determina o status de um item baseado na sua cobertura e tipo
 */
export function getStatusPorCobertura(
  coberturaDias: number | null,
  tipo: TipoEstoque
): 'verde' | 'amarelo' | 'vermelho' {
  if (coberturaDias === null) return 'amarelo'; // Sem dados = atenção
  
  const regra = REGRAS_COBERTURA[tipo];
  
  if (coberturaDias < regra.critico) return 'vermelho';
  if (coberturaDias < regra.atencao) return 'amarelo';
  return 'verde';
}

/**
 * Calcula dias até vencimento
 */
export function calcularDiasAteVencimento(dataValidade: string | undefined): number | null {
  if (!dataValidade) return null;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataValidade);
  vencimento.setHours(0, 0, 0, 0);
  
  const diff = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Verifica risco de vencimento (<30 dias = vermelho, <60 = amarelo)
 */
export function getStatusVencimento(
  diasAteVencimento: number | null
): 'verde' | 'amarelo' | 'vermelho' | null {
  if (diasAteVencimento === null) return null;
  
  if (diasAteVencimento < 30) return 'vermelho';
  if (diasAteVencimento < 60) return 'amarelo';
  return 'verde';
}

// ============= Processamento de Itens =============

/**
 * Processa um item calculando cobertura e status
 */
export function processarItem(
  item: ItemEstoque,
  demandaGlobal: number
): ItemEstoque {
  // Usar demanda específica do item ou a global
  const demanda = item.demandaSemanal ?? demandaGlobal;
  const coberturaDias = calcularCoberturaDias(item.quantidade, demanda);
  const status = getStatusPorCobertura(coberturaDias, item.tipo);
  
  return {
    ...item,
    coberturaDias: coberturaDias ?? undefined,
    status,
  };
}

/**
 * Processa todos os itens e calcula o resumo
 */
export function processarSupply(data: SupplyChainStage): SupplyResumo {
  const itensProcessados = data.itens.map(item => 
    processarItem(item, data.demandaSemanalMedia)
  );
  
  // Agrupar por tipo
  const porTipo = {
    produto_acabado: itensProcessados.filter(i => i.tipo === 'produto_acabado'),
    embalagem: itensProcessados.filter(i => i.tipo === 'embalagem'),
    insumo: itensProcessados.filter(i => i.tipo === 'insumo' || i.tipo === 'materia_prima'),
  };
  
  // Calcular coberturas médias por tipo
  const calcMediaCobertura = (items: ItemEstoque[]): number | null => {
    const comCobertura = items.filter(i => i.coberturaDias !== undefined);
    if (comCobertura.length === 0) return null;
    const soma = comCobertura.reduce((acc, i) => acc + (i.coberturaDias ?? 0), 0);
    return Math.round(soma / comCobertura.length);
  };
  
  const coberturaProdutos = calcMediaCobertura(porTipo.produto_acabado);
  const coberturaEmbalagens = calcMediaCobertura(porTipo.embalagem);
  const coberturaInsumos = calcMediaCobertura(porTipo.insumo);
  
  // Identificar itens críticos e vencendo
  const itensCriticos = itensProcessados
    .filter(i => i.status === 'vermelho')
    .map(i => i.nome);
  
  const itensVencendo: string[] = [];
  itensProcessados.forEach(item => {
    const dias = calcularDiasAteVencimento(item.dataValidade);
    if (dias !== null && dias < 30) {
      itensVencendo.push(`${item.nome} (${dias}d)`);
    }
  });
  
  // Determinar status geral
  const riscoRuptura = itensCriticos.length > 0;
  const riscoVencimento = itensVencendo.length > 0;
  
  let statusGeral: 'verde' | 'amarelo' | 'vermelho' = 'verde';
  
  if (riscoRuptura) {
    statusGeral = 'vermelho';
  } else if (riscoVencimento) {
    statusGeral = 'amarelo';
  } else {
    // Checar coberturas
    const produtosOk = coberturaProdutos === null || coberturaProdutos >= 30;
    const embalagensOk = coberturaEmbalagens === null || coberturaEmbalagens >= 60;
    
    if (!produtosOk || !embalagensOk) {
      statusGeral = 'amarelo';
    }
  }
  
  return {
    coberturaProdutos,
    coberturaEmbalagens,
    coberturaInsumos,
    statusGeral,
    riscoRuptura,
    riscoVencimento,
    itensVencendo,
    itensCriticos,
  };
}

// ============= Exports para outros módulos =============

/**
 * Calcula exports do Supply para Score Semanal e Pre-Reunião Geral
 */
export function calculateSupplyExports(data: SupplyChainStage): SupplyExports {
  const resumo = processarSupply(data);
  
  // Calcular score (0-30 pontos)
  let scorePilar = 15; // Default neutro
  
  if (resumo.riscoRuptura) {
    scorePilar = 0;
  } else if (resumo.coberturaProdutos !== null) {
    if (resumo.coberturaProdutos >= 30) {
      const embalagensOk = resumo.coberturaEmbalagens === null || resumo.coberturaEmbalagens >= 60;
      scorePilar = embalagensOk ? 30 : 22;
    } else if (resumo.coberturaProdutos >= 15) {
      scorePilar = 15;
    } else {
      scorePilar = 0;
    }
  }
  
  if (resumo.riscoVencimento) {
    scorePilar = Math.max(0, scorePilar - 5);
  }
  
  // Calcular CMV e receita bruta se houver movimentações
  let cmvMensal: number | undefined;
  let receitaBrutaSupply: number | undefined;
  if (data.movimentacoes && data.movimentacoes.length > 0) {
    cmvMensal = calcularCMVPorSaidas(data.movimentacoes);
    receitaBrutaSupply = calcularReceitaBruta(data.movimentacoes);
  }
  
  return {
    statusEstoque: resumo.statusGeral,
    coberturaProdutosDias: resumo.coberturaProdutos,
    coberturaEmbalagensDias: resumo.coberturaEmbalagens,
    riscoRuptura: resumo.riscoRuptura,
    riscoVencimento: resumo.riscoVencimento,
    scorePilar,
    cmvMensal,
    receitaBrutaSupply,
  };
}

// ============= Parser de Lista Colada =============

/**
 * Normaliza header para comparação (remove acentos, lowercase)
 */
function normalizeHeader(header: string): string {
  if (!header) return "";
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]/g, ""); // Remove special chars
}

/**
 * Detecta o delimitador usado (tab, múltiplos espaços, pipe)
 */
function splitByDelimiter(line: string): string[] {
  // Try tab first
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim());
  }
  // Try pipe
  if (line.includes('|')) {
    return line.split('|').map(c => c.trim());
  }
  // Try multiple spaces (2+ spaces = delimiter)
  const multiSpaceMatch = line.split(/\s{2,}/);
  if (multiSpaceMatch.length >= 2) {
    return multiSpaceMatch.map(c => c.trim());
  }
  // Last resort: single line
  return [line.trim()];
}

/**
 * Mapeia colunas conhecidas para seus índices
 */
interface ColumnMap {
  nome: number;
  quantidade: number;
}

function buildColumnMap(headers: string[]): ColumnMap | null {
  let nomeIdx = -1;
  let qtdIdx = -1;
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    
    // Quantidade - check first as it's more specific
    if (qtdIdx === -1 && (
      normalized.includes('disponivel') || 
      normalized.includes('quantidade') || 
      normalized.includes('estoque') || 
      normalized.includes('saldo') ||
      normalized === 'qtd'
    )) {
      qtdIdx = index;
    }
    // Nome/Descrição - check for specific description column
    else if (nomeIdx === -1 && (
      normalized.includes('descricao') || 
      (normalized.includes('produto') && !normalized.includes('cod'))
    )) {
      nomeIdx = index;
    }
  });
  
  // Must have both
  if (nomeIdx >= 0 && qtdIdx >= 0) {
    return { nome: nomeIdx, quantidade: qtdIdx };
  }
  
  return null;
}

/**
 * Limpa texto de aspas, prefixos [B] e caracteres especiais
 */
function cleanProductName(text: string): string {
  return text
    .replace(/^["']+|["']+$/g, '') // Remove quotes
    .replace(/^\[B\]\s*/i, '') // Remove [B] prefix
    .trim();
}

/**
 * Extrai número de uma string de quantidade
 */
function parseQuantity(text: string): number {
  // Remove tudo exceto dígitos, vírgula e ponto
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Verifica se uma linha parece ser um cabeçalho
 */
function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  const headerKeywords = ['descricao', 'produto', 'disponivel', 'quantidade', 'codigo', 'cod', 'item', 'gtin', 'sku', 'estoque'];
  
  // Se mais de 1 célula contém keywords de header, é header
  let headerMatches = 0;
  for (const cell of normalized) {
    if (headerKeywords.some(kw => cell.includes(kw))) {
      headerMatches++;
    }
  }
  return headerMatches >= 2;
}

/**
 * Tenta parsear uma lista colada em itens de estoque
 * Suporta múltiplos formatos:
 * - Tab-separated (planilhas)
 * - Multiple-spaces separated
 * - Pipe-separated: "Nome | Tipo | Quantidade | Unidade"
 * - Simple: "Nome - 450un"
 */
export function parsearListaEstoque(texto: string): Partial<ItemEstoque>[] {
  const linhas = texto.split('\n').filter(l => l.trim());
  if (linhas.length === 0) return [];
  
  const itens: Partial<ItemEstoque>[] = [];
  
  // Split all lines by delimiter
  const parsedLines = linhas.map(splitByDelimiter);
  
  // Find header row and build column map
  let headerRowIndex = -1;
  let columnMap: ColumnMap | null = null;
  
  for (let i = 0; i < Math.min(5, parsedLines.length); i++) {
    const row = parsedLines[i];
    if (row.length < 2) continue;
    
    if (isHeaderRow(row)) {
      columnMap = buildColumnMap(row);
      if (columnMap) {
        headerRowIndex = i;
        break;
      }
    }
  }
  
  // If we found a header with column mapping, use structured parsing
  if (columnMap && headerRowIndex >= 0) {
    for (let i = headerRowIndex + 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      
      // Skip if row doesn't have enough columns
      if (row.length <= Math.max(columnMap.nome, columnMap.quantidade)) continue;
      
      // Skip header-like rows
      if (isHeaderRow(row)) continue;
      
      const nomeRaw = row[columnMap.nome] || '';
      const quantidadeRaw = row[columnMap.quantidade] || '0';
      
      const nome = cleanProductName(nomeRaw);
      const quantidade = parseQuantity(quantidadeRaw);
      
      // Skip invalid rows
      if (!nome || nome.length < 2) continue;
      
      const tipo = detectarTipoPorNome(nome);
      
      itens.push({ nome, tipo, quantidade, unidade: 'un' });
    }
    
    return itens;
  }
  
  // Fallback: try legacy parsing for each line
  for (const linha of linhas) {
    // Skip likely header rows
    const normalized = normalizeHeader(linha);
    if (normalized.includes('descricao') || normalized.includes('coditem') || normalized.includes('disponivel')) {
      continue;
    }
    
    // Try pipe format: "Nome | Tipo | Quantidade | Unidade"
    if (linha.includes('|')) {
      const partes = linha.split('|').map(p => p.trim());
      if (partes.length >= 3) {
        const nome = cleanProductName(partes[0]);
        const tipo = detectarTipo(partes[1]);
        const quantidade = parseQuantity(partes[2]);
        const unidade = partes[3] || 'un';
        
        if (nome && quantidade > 0) {
          itens.push({ nome, tipo, quantidade, unidade });
        }
        continue;
      }
    }
    
    // Try simple format: "Nome - 450un" or "Nome: 450"
    const matchSimples = linha.match(/^(.+?)[\s:\-]+(\d+[\d.,]*)\s*(un|kg|g|l|ml|pç|cx|pt)?$/i);
    if (matchSimples) {
      const nome = cleanProductName(matchSimples[1]);
      const quantidade = parseFloat(matchSimples[2].replace(',', '.')) || 0;
      const unidade = matchSimples[3] || 'un';
      const tipo = detectarTipoPorNome(nome);
      
      if (nome && quantidade > 0) {
        itens.push({ nome, tipo, quantidade, unidade });
      }
    }
  }
  
  return itens;
}

function detectarTipo(texto: string): TipoEstoque {
  const t = texto.toLowerCase();
  if (t.includes('prod') || t.includes('acab')) return 'produto_acabado';
  if (t.includes('embal') || t.includes('pote') || t.includes('tampa') || t.includes('caixa')) return 'embalagem';
  if (t.includes('insum')) return 'insumo';
  if (t.includes('mater') || t.includes('prima')) return 'materia_prima';
  return 'produto_acabado';
}

function detectarTipoPorNome(nome: string): TipoEstoque {
  const n = nome.toLowerCase();
  if (n.includes('pote') || n.includes('tampa') || n.includes('caixa') || n.includes('embal') || n.includes('sachet') || n.includes('copo') || n.includes('mug')) {
    return 'embalagem';
  }
  if (n.includes('açúcar') || n.includes('acucar') || n.includes('óleo') || n.includes('oleo') || n.includes('farinha') || n.includes('levedura')) {
    return 'insumo';
  }
  return 'produto_acabado';
}
