import { 
  ItemEstoque, 
  TipoEstoque, 
  SupplyChainStage, 
  SupplyResumo,
  SupplyExports,
  SupplyForecast,
  ForecastItem,
  FichaTecnica,
} from '@/types/focus-mode';
import { calcularCMVPorSaidas, calcularReceitaBruta, calcularDemandaSemanalPorItem, normalizarNomeProduto } from '@/utils/movimentacoesParser';
import { encontrarPrecoCustoPadrao } from '@/data/precos-custo-default';

// ============= Réguas de Segurança por Tipo =============

interface RegraCobertura {
  critico: number;    // Abaixo = vermelho
  atencao: number;    // Abaixo = amarelo, acima = verde
  ideal: number;      // Meta recomendada
}

export const REGRAS_COBERTURA: Record<TipoEstoque, RegraCobertura> = {
  produto_acabado: { critico: 15, atencao: 30, ideal: 45 },
  acessorio: { critico: 15, atencao: 30, ideal: 45 },
  brinde: { critico: 15, atencao: 30, ideal: 45 },
  material_pdv: { critico: 15, atencao: 30, ideal: 45 },
  embalagem: { critico: 30, atencao: 60, ideal: 90 },
  materia_prima: { critico: 20, atencao: 40, ideal: 60 },
};

export const TIPO_LABELS: Record<TipoEstoque, string> = {
  produto_acabado: 'Produto Acabado',
  acessorio: 'Acessório',
  brinde: 'Brinde',
  material_pdv: 'Material PDV',
  embalagem: 'Embalagem',
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
export const TIPOS_PRODUTO_FINAL: TipoEstoque[] = ['produto_acabado', 'acessorio', 'brinde', 'material_pdv'];
export const TIPOS_INSUMO: TipoEstoque[] = ['embalagem', 'materia_prima'];

export function getStatusPorCobertura(
  coberturaDias: number | null,
  tipo: TipoEstoque
): 'verde' | 'amarelo' | 'vermelho' {
  // Insumos/embalagens sem dados de demanda = verde (não gerar alerta)
  if (coberturaDias === null) {
    return TIPOS_INSUMO.includes(tipo) ? 'verde' : 'amarelo';
  }
  
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

// ============= Demanda Derivada via BOM =============

/**
 * Calcula a demanda semanal derivada de insumos/embalagens
 * com base na ficha técnica (BOM) e na demanda dos produtos acabados.
 * 
 * Para cada insumo: demandaSemanal = Σ (demandaSemanal do PA × qtd do insumo por un do PA)
 */
export function calcularDemandaDerivadaBOM(
  itens: ItemEstoque[],
  fichas: FichaTecnica[],
  demandaGlobal: number
): Map<string, number> {
  const demandaDerivada = new Map<string, number>();
  
  if (!fichas || fichas.length === 0) return demandaDerivada;
  
  for (const ficha of fichas) {
    // Encontrar o PA correspondente
    const keyPA = normalizarNomeProduto(ficha.produtoAcabadoNome);
    const pa = itens.find(i => normalizarNomeProduto(i.nome) === keyPA);
    const demandaPA = pa?.demandaSemanal ?? demandaGlobal;
    
    if (demandaPA <= 0) continue;
    
    for (const ing of ficha.ingredientes) {
      const keyInsumo = normalizarNomeProduto(ing.insumoNome);
      const atual = demandaDerivada.get(keyInsumo) ?? 0;
      demandaDerivada.set(keyInsumo, atual + (demandaPA * ing.quantidade));
    }
  }
  
  return demandaDerivada;
}

// ============= Processamento de Itens =============

/**
 * Processa um item calculando cobertura e status
 */
export function processarItem(
  item: ItemEstoque,
  demandaGlobal: number,
  demandaDerivadaBOM?: number
): ItemEstoque {
  // Para insumos/embalagens, preferir demanda derivada do BOM
  const isInsumo = TIPOS_INSUMO.includes(item.tipo);
  let demanda: number;
  
  if (isInsumo && demandaDerivadaBOM !== undefined && demandaDerivadaBOM > 0) {
    demanda = demandaDerivadaBOM;
  } else {
    demanda = item.demandaSemanal ?? demandaGlobal;
  }
  
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
  const demandaBOM = calcularDemandaDerivadaBOM(data.itens, data.fichasTecnicas ?? [], data.demandaSemanalMedia);
  
  const itensProcessados = data.itens.map(item => {
    const keyInsumo = normalizarNomeProduto(item.nome);
    const demandaDerivada = demandaBOM.get(keyInsumo);
    return processarItem(item, data.demandaSemanalMedia, demandaDerivada);
  });
  
  // Agrupar por tipo
  const porTipo = {
    produto_acabado: itensProcessados.filter(i => i.tipo === 'produto_acabado' || i.tipo === 'acessorio' || i.tipo === 'brinde' || i.tipo === 'material_pdv'),
    embalagem: itensProcessados.filter(i => i.tipo === 'embalagem'),
    insumo: itensProcessados.filter(i => i.tipo === 'materia_prima'),
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
  
  // Calcular forecast
  let forecast: SupplyForecast | undefined;
  if (data.movimentacoes && data.movimentacoes.length > 0) {
    const demandaMap = calcularDemandaSemanalPorItem(data.movimentacoes);
    const forecastItens: ForecastItem[] = [];
    let investimentoTotal = 0;

    for (const item of data.itens) {
      const key = normalizarNomeProduto(item.nome);
      const saidaSemanal = demandaMap.get(key) ?? item.demandaSemanal ?? 0;
      if (saidaSemanal <= 0) continue;

      const demandaDiaria = saidaSemanal / 7;
      const coberturaDias = Math.round(item.quantidade / demandaDiaria);
      const regra = REGRAS_COBERTURA[item.tipo];
      const metaDias = regra.ideal;
      const qtdIdeal = Math.ceil(demandaDiaria * metaDias);
      const precisaProduzir = Math.max(0, qtdIdeal - item.quantidade);

      const custoUnit = item.custoProducao || item.precoCusto;
      const investimento = custoUnit && precisaProduzir > 0 ? precisaProduzir * custoUnit : undefined;
      if (investimento) investimentoTotal += investimento;

      if (precisaProduzir > 0) {
        forecastItens.push({
          nome: item.nome,
          tipo: item.tipo,
          saidaSemanal,
          estoqueAtual: item.quantidade,
          coberturaDias,
          precisaProduzir,
          custoProducaoUnit: custoUnit,
          investimentoNecessario: investimento,
        });
      }
    }

    // Projeção 30 dias baseada na média semanal dos últimos 90 dias — SOMENTE produtos acabados
    const TIPOS_VENDA: TipoEstoque[] = ['produto_acabado', 'acessorio', 'brinde'];
    const nomesPA = new Set(
      data.itens.filter(i => TIPOS_VENDA.includes(i.tipo)).map(i => normalizarNomeProduto(i.nome))
    );
    const corte90d = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const saidasPA = (data.movimentacoes ?? []).filter(m => {
      if (m.tipo !== 'saida') return false;
      const key = normalizarNomeProduto(m.produto);
      if (!nomesPA.has(key)) return false;
      const ts = new Date(m.data.includes('T') ? m.data : m.data + 'T00:00:00').getTime();
      return !isNaN(ts) && ts >= corte90d;
    });

    // Calcular janela real em semanas
    const datasMs = saidasPA.map(m => new Date(m.data.includes('T') ? m.data : m.data + 'T00:00:00').getTime()).filter(t => !isNaN(t));
    const semanas90d = datasMs.length > 0
      ? Math.max(1, (Date.now() - Math.min(...datasMs)) / (7 * 24 * 60 * 60 * 1000))
      : 1;

    let receitaTotal90d = 0;
    let cmvTotal90d = 0;
    for (const saida of saidasPA) {
      if (saida.valorUnitarioVenda && saida.valorUnitarioVenda > 0) {
        receitaTotal90d += saida.quantidade * saida.valorUnitarioVenda;
      }
      const pc = encontrarPrecoCustoPadrao(saida.produto);
      if (pc && pc > 0) {
        cmvTotal90d += saida.quantidade * pc;
      }
    }

    const receitaSemanal = receitaTotal90d / semanas90d;
    const cmvSemanal = cmvTotal90d / semanas90d;

    forecast = {
      receitaProjetada30d: receitaSemanal * (30 / 7),
      cmvProjetado30d: cmvSemanal * (30 / 7),
      margemProjetada: receitaSemanal > 0 ? ((receitaSemanal - cmvSemanal) / receitaSemanal) * 100 : 0,
      investimentoProducao: investimentoTotal,
      itens: forecastItens.sort((a, b) => (b.investimentoNecessario ?? 0) - (a.investimentoNecessario ?? 0)),
    };
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
    forecast,
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
  // Try semicolon (common in Brazilian CSVs)
  if (line.includes(';')) {
    const parts = line.split(';').map(c => c.trim());
    if (parts.length >= 2) return parts;
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
  tipo?: number;
  custoUn?: number;
}

function buildColumnMap(headers: string[]): ColumnMap | null {
  let nomeIdx = -1;
  let qtdIdx = -1;
  let tipoIdx = -1;
  let custoIdx = -1;
  
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
    // Custo unitário / Valor un
    else if (custoIdx === -1 && (
      normalized.includes('valorun') ||
      normalized.includes('precoun') ||
      normalized.includes('custounit') ||
      normalized.includes('custounitario') ||
      normalized.includes('vlrun') ||
      (normalized.includes('valor') && normalized.includes('un'))
    )) {
      custoIdx = index;
    }
    // Tipo
    else if (tipoIdx === -1 && normalized === 'tipo') {
      tipoIdx = index;
    }
    // Nome/Descrição/Item
    else if (nomeIdx === -1 && (
      normalized.includes('descricao') || 
      normalized === 'item' ||
      normalized === 'nome' ||
      (normalized.includes('produto') && !normalized.includes('cod'))
    )) {
      nomeIdx = index;
    }
  });
  
  // Must have both nome and quantidade
  if (nomeIdx >= 0 && qtdIdx >= 0) {
    const map: ColumnMap = { nome: nomeIdx, quantidade: qtdIdx };
    if (tipoIdx >= 0) map.tipo = tipoIdx;
    if (custoIdx >= 0) map.custoUn = custoIdx;
    return map;
  }
  
  return null;
}

/**
 * Limpa texto de aspas, prefixos [B] e caracteres especiais
 */
function cleanProductName(text: string): string {
  return text
    .replace(/^["']+|["']+$/g, '') // Remove quotes
    .replace(/^\[(B|EMB|MP|Food Service)\]\s*/i, '') // Remove common prefixes
    .replace(/^\[.*?\]\s*-?\s*/i, '') // Remove any remaining [X] prefix
    .replace(/^\s*-\s*/, '') // Remove leading dash
    .trim();
}

/**
 * Extrai número de uma string de quantidade
 */
function parseQuantity(text: string): number {
  // Remove tudo exceto dígitos, vírgula, ponto e sinal
  const cleaned = text.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;

  let normalized = cleaned;

  // Se tem vírgula e ponto, inferir qual é separador decimal pelo último símbolo
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // pt-BR: 28.525,00
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // en-US: 28,525.00
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // decimal com vírgula: 0,66
      normalized = `${parts[0].replace(/\./g, '')}.${parts[1]}`;
    } else {
      // separador de milhar
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // múltiplos pontos = milhar
      normalized = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3) {
      // provável milhar: 6.825
      normalized = parts.join('');
    }
  }

  return parseFloat(normalized) || 0;
}

function tryParseLinhaTabelaCompacta(linha: string): Partial<ItemEstoque> | null {
  const tipoMatch = linha.match(/\b(produto\s*final|mat[eé]ria\s*prima|embalag(?:em|ens)|acess[oó]rios?|brinde|material\s*pdv)\b/i);
  if (!tipoMatch || tipoMatch.index === undefined) return null;

  const nomeRaw = linha.slice(0, tipoMatch.index).trim();
  const resto = linha.slice(tipoMatch.index + tipoMatch[0].length).trim();

  if (!nomeRaw || !resto) return null;

  const numeros = resto.match(/-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?/g) ?? [];
  if (numeros.length === 0) return null;

  const nome = cleanProductName(nomeRaw);
  if (!nome || nome.length < 2) return null;

  const quantidade = parseQuantity(numeros[0]);
  const precoCusto = numeros.length > 1 ? parseQuantity(numeros[1]) : undefined;
  const tipo = detectarTipo(tipoMatch[0]);

  const item: Partial<ItemEstoque> = { nome, tipo, quantidade, unidade: 'un' };
  if (precoCusto !== undefined && precoCusto > 0) item.precoCusto = precoCusto;
  return item;
}

/**
 * Verifica se uma linha parece ser um cabeçalho
 */
function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  const headerKeywords = ['descricao', 'produto', 'disponivel', 'quantidade', 'codigo', 'cod', 'item', 'gtin', 'sku', 'estoque', 'tipo', 'valorun', 'total'];
  
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
      
      // Detect tipo from column or name
      let tipo: TipoEstoque;
      if (columnMap.tipo !== undefined && row[columnMap.tipo]) {
        tipo = detectarTipo(row[columnMap.tipo]);
      } else {
        tipo = detectarTipoPorNome(nome);
      }
      
      // Extract unit cost if available
      let precoCusto: number | undefined;
      if (columnMap.custoUn !== undefined && row[columnMap.custoUn]) {
        const custoVal = parseQuantity(row[columnMap.custoUn]);
        if (custoVal > 0) precoCusto = custoVal;
      }
      
      const item: Partial<ItemEstoque> = { nome, tipo, quantidade, unidade: 'un' };
      if (precoCusto !== undefined) item.precoCusto = precoCusto;
      
      itens.push(item);
    }
    
    return itens;
  }
  
  // Fallback: try legacy parsing for each line
  for (const linha of linhas) {
    // Skip likely header rows
    const normalized = normalizeHeader(linha);
    if (normalized.includes('descricao') || normalized.includes('coditem') || normalized.includes('disponivel') || normalized.includes('saldoemestoque') || normalized.includes('mesanterior') || normalized.includes('pordeposito')) {
      continue;
    }
    
    // Skip summary/total lines (e.g. "Produto final\tR$ 75,849.25")
    if (/^(produto final|mat[eé]ria prima|embalagem|acess[oó]rios?|cross do|wbm|jundcoco|super vegan|hiper massas?)\b/i.test(linha.trim())) {
      continue;
    }

    // Try compact table row: "Nome Matéria Prima 0,66 R$ 35,44 R$ 23,39"
    const itemCompacto = tryParseLinhaTabelaCompacta(linha);
    if (itemCompacto) {
      itens.push(itemCompacto);
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
  if (t.includes('brinde') || t.includes('ebook') || t.includes('e-book')) return 'brinde';
  if (t.includes('acess')) return 'acessorio';
  if (t.includes('material') && t.includes('pdv')) return 'material_pdv';
  if (t.includes('prod') || t.includes('acab')) return 'produto_acabado';
  if (t.includes('embal') || t.includes('pote') || t.includes('tampa') || t.includes('caixa')) return 'embalagem';
  if (t.includes('insum')) return 'materia_prima';
  if (t.includes('mater') || t.includes('prima')) return 'materia_prima';
  return 'produto_acabado';
}

function detectarTipoPorNome(nome: string): TipoEstoque {
  const n = nome.toLowerCase();
  if (n.includes('ebook') || n.includes('e-book') || n.includes('e book')) return 'brinde';
  if (n.includes('pote') || n.includes('tampa') || n.includes('caixa') || n.includes('embal') || n.includes('sachet') || n.includes('copo') || n.includes('mug')) {
    return 'embalagem';
  }
  if (n.includes('açúcar') || n.includes('acucar') || n.includes('óleo') || n.includes('oleo') || n.includes('farinha') || n.includes('levedura')) {
    return 'materia_prima';
  }
  return 'produto_acabado';
}
