import { MovimentacaoEstoque } from '@/types/focus-mode';
import { encontrarPrecoCustoPadrao } from '@/data/precos-custo-default';

/**
 * Limpa nome de produto: remove [B], aspas extras, espaços
 */
function cleanProductName(text: string): string {
  return text
    .replace(/^["']+|["']+$/g, '')
    .replace(/^\[B\]\s*/i, '')
    .replace(/^NICE®?\s*/i, '')
    .trim();
}

/**
 * Gera ID único simples
 */
function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parseia CSV de movimentações (entradas ou saídas)
 * Detecta automaticamente o formato pelo header
 */
export function parsearMovimentacoes(texto: string): MovimentacaoEstoque[] {
  const linhas = texto.split('\n').filter(l => l.trim());
  if (linhas.length < 2) return [];

  // Detectar delimitador (;)
  const delimitador = linhas[0].includes(';') ? ';' : '\t';
  
  const headers = linhas[0].split(delimitador).map(h => 
    h.trim().replace(/^["']+|["']+$/g, '').toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  // Detectar formato: saídas vs entradas
  const isSaida = headers.some(h => h.includes('saida') || h.includes('valorsaida'));
  const isEntrada = headers.some(h => h.includes('entrada') || h.includes('tipoentrada'));

  if (!isSaida && !isEntrada) return [];

  const resultado: MovimentacaoEstoque[] = [];
  const hoje = new Date().toISOString().split('T')[0];

  for (let i = 1; i < linhas.length; i++) {
    const cells = linhas[i].split(delimitador).map(c => c.trim().replace(/^["']+|["']+$/g, ''));
    if (cells.length < 3) continue;

    try {
      if (isSaida) {
        // Formato saídas: Cód.Item;DescriçãoProduto;Qtde.Saída;ValorSaída;NumeroLote;DatadeValidade
        const descIdx = headers.findIndex(h => h.includes('descricao') || h.includes('produto'));
        const qtdIdx = headers.findIndex(h => h.includes('qtde') && h.includes('saida'));
        const valorIdx = headers.findIndex(h => h.includes('valor') && h.includes('saida'));
        const loteIdx = headers.findIndex(h => h.includes('lote'));
        const validadeIdx = headers.findIndex(h => h.includes('validade'));

        if (descIdx < 0 || qtdIdx < 0) continue;

        const nome = cleanProductName(cells[descIdx] || '');
        const quantidade = parseFloat((cells[qtdIdx] || '0').replace(',', '.')) || 0;
        const valorTotal = valorIdx >= 0 ? parseFloat((cells[valorIdx] || '0').replace(',', '.')) || 0 : 0;

        if (!nome || quantidade <= 0) continue;

        resultado.push({
          id: genId(),
          tipo: 'saida',
          produto: nome,
          quantidade,
          valorUnitarioVenda: quantidade > 0 ? valorTotal / quantidade : undefined,
          lote: loteIdx >= 0 ? cells[loteIdx] : undefined,
          dataValidade: validadeIdx >= 0 ? parseValidadeCSV(cells[validadeIdx]) : undefined,
          data: hoje,
        });
      } else {
        // Formato entradas: Identificador;TipoEntrada;Produto;Qtde.Entrada;Lote;DatadeValidade;StatusEntrada;DataHora
        const prodIdx = headers.findIndex(h => h.includes('produto'));
        const qtdIdx = headers.findIndex(h => h.includes('qtde') && h.includes('entrada'));
        const loteIdx = headers.findIndex(h => h.includes('lote'));
        const validadeIdx = headers.findIndex(h => h.includes('validade'));
        const dataIdx = headers.findIndex(h => h.includes('datahora') || h.includes('data'));
        const statusIdx = headers.findIndex(h => h.includes('status'));

        if (prodIdx < 0 || qtdIdx < 0) continue;

        // Skip non-confirmed entries
        if (statusIdx >= 0 && cells[statusIdx] && !cells[statusIdx].toLowerCase().includes('confirm')) continue;

        const nome = cleanProductName(cells[prodIdx] || '');
        const quantidade = parseFloat((cells[qtdIdx] || '0').replace(',', '.')) || 0;

        if (!nome || quantidade <= 0) continue;

        let dataMovimentacao = hoje;
        if (dataIdx >= 0 && cells[dataIdx]) {
          const parsed = parseDateCSV(cells[dataIdx]);
          if (parsed) dataMovimentacao = parsed;
        }

        resultado.push({
          id: genId(),
          tipo: 'entrada',
          produto: nome,
          quantidade,
          lote: loteIdx >= 0 ? cells[loteIdx] : undefined,
          dataValidade: validadeIdx >= 0 ? parseValidadeCSV(cells[validadeIdx]) : undefined,
          data: dataMovimentacao,
        });
      }
    } catch {
      continue;
    }
  }

  return resultado;
}

/**
 * Parseia data no formato DD/MM/YYYY HH:MM ou DDMMYYYY
 */
function parseDateCSV(text: string): string | null {
  if (!text) return null;
  
  // DD/MM/YYYY HH:MM
  const match1 = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}`;
  
  // DDMMYYYY
  const match2 = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;
  
  return null;
}

function parseValidadeCSV(text: string): string | undefined {
  const parsed = parseDateCSV(text);
  return parsed || undefined;
}

/**
 * Normaliza nome de produto para matching
 */
function normalizarNomeProduto(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula demanda semanal por item a partir das saídas
 */
export function calcularDemandaSemanalPorItem(
  movimentacoes: MovimentacaoEstoque[]
): Map<string, number> {
  const saidas = movimentacoes.filter(m => m.tipo === 'saida');
  if (saidas.length === 0) return new Map();

  // Agrupar por produto normalizado
  const porProduto = new Map<string, { total: number; nomeOriginal: string }>();
  
  for (const s of saidas) {
    const key = normalizarNomeProduto(s.produto);
    const existing = porProduto.get(key) || { total: 0, nomeOriginal: s.produto };
    existing.total += s.quantidade;
    porProduto.set(key, existing);
  }

  // Calcular período
  const datas = saidas
    .map(s => new Date(s.data).getTime())
    .filter(d => !isNaN(d));
  
  if (datas.length === 0) return new Map();

  const minData = Math.min(...datas);
  const maxData = Math.max(...datas, Date.now());
  const periodoSemanas = Math.max(1, (maxData - minData) / (7 * 24 * 60 * 60 * 1000));

  const resultado = new Map<string, number>();
  for (const [key, { total, nomeOriginal }] of porProduto) {
    resultado.set(key, Math.round((total / periodoSemanas) * 10) / 10);
  }

  return resultado;
}

/**
 * Calcula CMV correto: quantidade saída × preço de custo unitário
 * NÃO usa ValorSaída do CSV (que é preço de venda)
 */
export function calcularCMVPorSaidas(movimentacoes: MovimentacaoEstoque[]): number {
  const saidas = movimentacoes.filter(m => m.tipo === 'saida');
  let cmv = 0;

  for (const saida of saidas) {
    const precoCusto = encontrarPrecoCustoPadrao(saida.produto);
    if (precoCusto && precoCusto > 0) {
      cmv += saida.quantidade * precoCusto;
    }
  }

  return Math.round(cmv * 100) / 100;
}

/**
 * Calcula receita bruta (soma dos ValorSaída do CSV - preço de venda)
 */
export function calcularReceitaBruta(movimentacoes: MovimentacaoEstoque[]): number {
  const saidas = movimentacoes.filter(m => m.tipo === 'saida');
  let receita = 0;

  for (const saida of saidas) {
    if (saida.valorUnitarioVenda && saida.valorUnitarioVenda > 0) {
      receita += saida.quantidade * saida.valorUnitarioVenda;
    }
  }

  return Math.round(receita * 100) / 100;
}

/**
 * Retorna top N produtos por volume de saída
 */
export function topProdutosPorSaida(
  movimentacoes: MovimentacaoEstoque[],
  n: number = 5
): { produto: string; quantidade: number }[] {
  const saidas = movimentacoes.filter(m => m.tipo === 'saida');
  const porProduto = new Map<string, number>();

  for (const s of saidas) {
    const key = s.produto;
    porProduto.set(key, (porProduto.get(key) || 0) + s.quantidade);
  }

  return Array.from(porProduto.entries())
    .map(([produto, quantidade]) => ({ produto, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, n);
}
