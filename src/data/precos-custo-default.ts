// Preços de custo padrão para produtos NICE Foods
// Dados fornecidos pelo usuário em 2026-02-09

import { ItemEstoque, TipoEstoque } from '@/types/focus-mode';

export interface PrecoCustoPadrao {
  nomePattern: string; // Padrão para match (case insensitive)
  precoCusto: number;
}

// Tabela de preços de custo (ordenada por especificidade)
export const PRECOS_CUSTO_PADRAO: PrecoCustoPadrao[] = [
  // Food Service
  { nomePattern: 'Food Service.*Castanha.*20.*KG', precoCusto: 870.60 },
  { nomePattern: 'Food Service.*Castanha.*3.*KG', precoCusto: 141.38 },
  
  // NICE Milk
  { nomePattern: 'MILK\\+', precoCusto: 28.64 },
  { nomePattern: 'Milk.*Protein.*Avelã', precoCusto: 28.64 },
  { nomePattern: 'Milk.*Avela.*Cacau', precoCusto: 28.64 },
  { nomePattern: 'Milk.*Proteico', precoCusto: 28.64 },
  { nomePattern: 'Milk.*Castanha.*Caju.*450', precoCusto: 22.60 },
  { nomePattern: 'Milk.*Aveia.*Barista.*400', precoCusto: 17.40 },
  { nomePattern: 'Milk.*Aveia.*450', precoCusto: 16.38 },
  
  // ChocoNICE
  { nomePattern: 'ChocoNICE.*70.*Cacau', precoCusto: 21.75 },
  { nomePattern: 'ChocoNICE.*Branco', precoCusto: 18.37 },
  { nomePattern: 'ChocoNICE.*Ao.*leite', precoCusto: 17.70 },
  
  // Outros produtos
  { nomePattern: 'Levedura.*Nutricional.*100', precoCusto: 12.84 },
  { nomePattern: 'Levedura.*Nutricional', precoCusto: 12.84 },
  { nomePattern: 'Óleo.*Coco', precoCusto: 11.21 },
  { nomePattern: 'Oleo.*Coco', precoCusto: 11.21 },
  
  // Spices
  { nomePattern: 'Spices.*Quatro.*Queijos', precoCusto: 3.56 },
  { nomePattern: 'Spices.*4.*Queijos', precoCusto: 3.56 },
  { nomePattern: 'Spices.*Estrogonofe', precoCusto: 3.57 },
  { nomePattern: 'Spices.*Estrofonofe', precoCusto: 3.57 },
  { nomePattern: 'Spices.*Carbonara', precoCusto: 3.54 },
  { nomePattern: 'Spices.*Molho.*Branco', precoCusto: 3.47 },
  
  // Cheesy
  { nomePattern: 'Cheesy.*Parmesão', precoCusto: 3.06 },
  { nomePattern: 'Cheesy.*Parmesao', precoCusto: 3.06 },
];

/**
 * Encontra o preço de custo padrão para um item baseado no nome
 */
export function encontrarPrecoCustoPadrao(nome: string): number | undefined {
  const nomeNormalizado = nome.toLowerCase();
  
  for (const preco of PRECOS_CUSTO_PADRAO) {
    const pattern = new RegExp(preco.nomePattern, 'i');
    if (pattern.test(nome) || nomeNormalizado.includes(preco.nomePattern.toLowerCase())) {
      return preco.precoCusto;
    }
  }
  
  return undefined;
}

/**
 * Aplica preços de custo padrão a itens sem preço definido
 * Retorna os itens atualizados
 */
export function aplicarPrecosCustoPadrao(itens: ItemEstoque[]): ItemEstoque[] {
  return itens.map(item => {
    if (item.precoCusto && item.precoCusto > 0) {
      return item; // Já tem preço, não sobrescreve
    }
    
    const precoPadrao = encontrarPrecoCustoPadrao(item.nome);
    if (precoPadrao) {
      return { ...item, precoCusto: precoPadrao };
    }
    
    return item;
  });
}

/**
 * Calcula o valor total do estoque
 */
export function calcularValorEstoque(itens: ItemEstoque[]): {
  custoProdutos: number;
  valorVendavel: number;
  itensComPreco: number;
  totalItens: number;
} {
  let custo = 0;
  let itensComPreco = 0;
  
  for (const item of itens) {
    if (item.precoCusto && item.precoCusto > 0) {
      custo += item.quantidade * item.precoCusto;
      itensComPreco++;
    }
  }
  
  return {
    custoProdutos: custo,
    valorVendavel: custo * 3, // Margem 3x
    itensComPreco,
    totalItens: itens.length,
  };
}
