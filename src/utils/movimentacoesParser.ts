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
 * Gera ID determinístico baseado no conteúdo (djb2 hash)
 * Garante que a mesma linha CSV sempre gera o mesmo ID → deduplicação segura
 */
function gerarIdMovimentacao(tipo: string, produto: string, quantidade: number, data: string, lote?: string): string {
  const str = `${tipo}|${produto.toLowerCase()}|${quantidade}|${data}|${lote || ''}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Converte para 32-bit integer
  }
  return Math.abs(hash).toString(36);
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
        // ou: DescriçãoProduto;Qtde.Saída;ValorSaída;DataHora
        const descIdx = headers.findIndex(h => h.includes('descricao') || h.includes('produto'));
        const qtdIdx = headers.findIndex(h => h.includes('qtde') && h.includes('saida'));
        const valorIdx = headers.findIndex(h => h.includes('valor') && h.includes('saida'));
        const loteIdx = headers.findIndex(h => h.includes('lote') && !h.includes('validade'));
        const validadeIdx = headers.findIndex(h => h.includes('validade'));
        // Detectar coluna de data/hora nas saídas (datahora, data, ou última coluna com timestamp)
        let dataHoraIdx = headers.findIndex(h => h.includes('datahora'));
        if (dataHoraIdx < 0) dataHoraIdx = headers.findIndex(h => h === 'data');
        // Fallback: última coluna que parece timestamp
        if (dataHoraIdx < 0) {
          for (let ci = cells.length - 1; ci >= 0; ci--) {
            if (cells[ci] && cells[ci].includes('/') && cells[ci].includes(':')) {
              dataHoraIdx = ci;
              break;
            }
          }
        }

        if (descIdx < 0 || qtdIdx < 0) continue;

        const nome = cleanProductName(cells[descIdx] || '');
        const quantidade = parseFloat((cells[qtdIdx] || '0').replace(',', '.')) || 0;
        const valorTotal = valorIdx >= 0 ? parseFloat((cells[valorIdx] || '0').replace(',', '.')) || 0 : 0;

        if (!nome || quantidade <= 0) continue;

        // Capturar timestamp completo (data + hora) para ID único por transação
        let timestampCompleto = hoje;
        let dataSomente = hoje;
        if (dataHoraIdx >= 0 && cells[dataHoraIdx]) {
          const tsCompleto = parseDateCSVComHora(cells[dataHoraIdx]);
          if (tsCompleto) {
            timestampCompleto = tsCompleto; // ex: "2026-02-18T09:40:56"
            dataSomente = tsCompleto.split('T')[0]; // ex: "2026-02-18"
          }
        }

        const lote = loteIdx >= 0 ? cells[loteIdx] : undefined;
        resultado.push({
          id: gerarIdMovimentacao('saida', nome, quantidade, timestampCompleto, lote),
          tipo: 'saida',
          produto: nome,
          quantidade,
          valorUnitarioVenda: quantidade > 0 ? valorTotal / quantidade : undefined,
          lote,
          dataValidade: validadeIdx >= 0 ? parseValidadeCSV(cells[validadeIdx]) : undefined,
          data: dataSomente,
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

        const loteEntrada = loteIdx >= 0 ? cells[loteIdx] : undefined;
        resultado.push({
          id: gerarIdMovimentacao('entrada', nome, quantidade, dataMovimentacao, loteEntrada),
          tipo: 'entrada',
          produto: nome,
          quantidade,
          lote: loteEntrada,
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
 * Parseia data no formato DD/MM/YYYY HH:MM ou DDMMYYYY → retorna só a data (YYYY-MM-DD)
 */
function parseDateCSV(text: string): string | null {
  if (!text) return null;
  
  // DD/MM/YYYY (com ou sem hora)
  const match1 = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}`;
  
  // DDMMYYYY
  const match2 = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;
  
  return null;
}

/**
 * Parseia data+hora no formato DD/MM/YYYY HH:MM:SS → retorna timestamp ISO completo
 * Usado para gerar IDs únicos por transação nas saídas
 */
function parseDateCSVComHora(text: string): string | null {
  if (!text) return null;

  // DD/MM/YYYY HH:MM:SS
  const matchComSegundos = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (matchComSegundos) {
    return `${matchComSegundos[3]}-${matchComSegundos[2]}-${matchComSegundos[1]}T${matchComSegundos[4]}`;
  }

  // DD/MM/YYYY HH:MM (sem segundos)
  const matchSemSegundos = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (matchSemSegundos) {
    return `${matchSemSegundos[3]}-${matchSemSegundos[2]}-${matchSemSegundos[1]}T${matchSemSegundos[4]}:00`;
  }

  // Só data: DD/MM/YYYY
  const matchSoData = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchSoData) {
    return `${matchSoData[3]}-${matchSoData[2]}-${matchSoData[1]}`;
  }

  return null;
}

function parseValidadeCSV(text: string): string | undefined {
  const parsed = parseDateCSV(text);
  return parsed || undefined;
}

/**
 * Normaliza nome de produto para matching (exportado para uso no SupplyChainMode)
 */
export function normalizarNomeProduto(nome: string): string {
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

  // Janela fixa: últimas 4 semanas (28 dias)
  const agora = Date.now();
  const janela28d = agora - 28 * 24 * 60 * 60 * 1000;
  const janela7d = agora - 7 * 24 * 60 * 60 * 1000;

  // Filtrar saídas dentro da janela de 28 dias
  let saidasJanela = saidas.filter(s => {
    const ts = new Date(s.data).getTime();
    return !isNaN(ts) && ts >= janela28d;
  });

  // Se não há dados nos últimos 28 dias, tentar últimos 7 dias mínimo
  if (saidasJanela.length === 0) {
    saidasJanela = saidas.filter(s => {
      const ts = new Date(s.data).getTime();
      return !isNaN(ts) && ts >= janela7d;
    });
  }

  // Se ainda não há dados, usar tudo (fallback)
  if (saidasJanela.length === 0) {
    saidasJanela = saidas;
  }

  // Agrupar por produto normalizado
  const porProduto = new Map<string, number>();
  
  for (const s of saidasJanela) {
    const key = normalizarNomeProduto(s.produto);
    porProduto.set(key, (porProduto.get(key) || 0) + s.quantidade);
  }

  // Calcular período real da janela usada
  const datas = saidasJanela
    .map(s => new Date(s.data).getTime())
    .filter(d => !isNaN(d));
  
  if (datas.length === 0) return new Map();

  const minData = Math.min(...datas);
  const maxData = Math.max(...datas, agora);
  // Mínimo 7 dias para evitar distorção com dados muito recentes
  const periodoDias = Math.max(7, (maxData - minData) / (24 * 60 * 60 * 1000));
  const periodoSemanas = periodoDias / 7;

  const resultado = new Map<string, number>();
  for (const [key, total] of porProduto) {
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
  n: number = 5,
  diasJanela: number = 30
): { produto: string; quantidade: number }[] {
  const corte = Date.now() - diasJanela * 24 * 60 * 60 * 1000;
  const saidas = movimentacoes.filter(m => {
    if (m.tipo !== 'saida') return false;
    const ts = new Date(m.data).getTime();
    return !isNaN(ts) && ts >= corte;
  });
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
