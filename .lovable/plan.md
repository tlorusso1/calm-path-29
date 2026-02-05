
# Plano: Sistema de Conciliação Bancária Completo + Cadastro de Fornecedores

## Problemas Identificados

### 1. Edge Function Só Importa 8 Lançamentos
**Causa raiz:** A IA (Gemini) retorna `MALFORMED_FUNCTION_CALL` quando o texto é muito grande. Após ~8 tool calls, ocorre um erro e a resposta é truncada.

**Solução:** Processar o extrato em chunks de 30 linhas por vez e agregar os resultados.

### 2. Sem Match com Contas Existentes
A conciliação atual apenas **adiciona** lançamentos. Não há:
- Verificação de valor (± R$ 0,01)
- Verificação de data (± 1 dia)
- Match automático com contas a pagar/receber

### 3. Parsing de Valores Incorreto
A função `parseCurrency` não lida bem com valores em formato americano (`1234.56`) vindos da IA:
```typescript
// Problema: "15622.01" vira 1562201 (remove o ponto)
const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
```

### 4. Sem Cadastro de Fornecedores
Não existe uma tabela/lista de fornecedores para:
- Classificar lançamentos automaticamente (DRE)
- Selecionar fornecedor ao editar conta
- Extrair beneficiário final de nomes compostos

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRATO COLADO                               │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function: extract-extrato (MELHORADA)                     │
│  1. Dividir texto em chunks de 30 linhas                        │
│  2. Processar cada chunk com a IA                               │
│  3. Validar/corrigir datas inválidas (ex: 30/02 → 28/02)        │
│  4. Agregar todos os lançamentos                                │
│  5. Tentar match com fornecedores conhecidos                    │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: ConciliacaoSection (NOVA LÓGICA)                     │
│  1. Receber lista de lançamentos extraídos                      │
│  2. Para cada lançamento:                                       │
│     → Buscar match: valor ± R$0,01 E data ± 1 dia               │
│     → Se match: marcar conta existente como paga                │
│     → Se não match: adicionar como novo lançamento              │
│  3. Permitir edição manual do match                             │
│  4. Mostrar resumo: X conciliados, Y novos, Z ignorados         │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Gestão de Fornecedores                                         │
│  1. Importar CSV do usuário como lista mestre                   │
│  2. Autocomplete ao digitar descrição                           │
│  3. Herdar classificação (Modalidade, Grupo, Categoria)         │
│  4. Extrair "Beneficiário Final" de nomes compostos             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Tipo Fornecedor + Atualização ContaFluxo

**Arquivo:** `src/types/focus-mode.ts`

```typescript
// NOVO: Fornecedor com classificação para DRE
export interface Fornecedor {
  id: string;
  nome: string;
  modalidade: string;       // Ex: "DESPESAS ADMINISTRATIVAS"
  grupo: string;            // Ex: "Serviços de Consultoria Operacional"
  categoria: string;        // Ex: "Assessoria Contábil"
  cnpj?: string;
  chavePix?: string;
  aliases?: string[];       // Nomes alternativos (para match)
}

// Atualizar ContaFluxo
export interface ContaFluxo {
  id: string;
  tipo: 'pagar' | 'receber';
  descricao: string;
  valor: string;
  dataVencimento: string;
  pago?: boolean;
  agendado?: boolean;
  // NOVOS CAMPOS
  fornecedorId?: string;    // Referência ao fornecedor
  categoria?: string;       // Categoria para DRE
  conciliado?: boolean;     // Flag: veio de conciliação
}
```

### 2. Edge Function: Processamento em Chunks

**Arquivo:** `supabase/functions/extract-extrato/index.ts`

```typescript
// Dividir texto em chunks
const MAX_LINHAS_POR_CHUNK = 30;
const linhas = texto.split('\n').filter(l => l.trim());

// Se muito grande, processar em partes
const chunks: string[] = [];
for (let i = 0; i < linhas.length; i += MAX_LINHAS_POR_CHUNK) {
  chunks.push(linhas.slice(i, i + MAX_LINHAS_POR_CHUNK).join('\n'));
}

const todosLancamentos: any[] = [];
for (const chunk of chunks) {
  const response = await processarChunk(chunk, mesAno);
  todosLancamentos.push(...response);
}

// Validar datas
function validarData(dataStr: string): string {
  try {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const diaValido = Math.min(dia, ultimoDia);
    return `${ano}-${String(mes).padStart(2,'0')}-${String(diaValido).padStart(2,'0')}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
```

### 3. Parser de Valores Flexível

**Arquivo:** `src/utils/fluxoCaixaCalculator.ts`

```typescript
// NOVO: Aceita formato brasileiro E americano
export function parseValorFlexivel(valor: string): number {
  if (!valor || valor === '') return 0;
  
  let str = String(valor).trim();
  str = str.replace(/[R$\s]/g, '');
  
  // Detectar formato pelo último separador
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Brasileiro: 1.234,56
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Americano: 1,234.56
    str = str.replace(/,/g, '');
  }
  // Senão: número puro
  
  return parseFloat(str) || 0;
}
```

### 4. ConciliacaoSection com Match Inteligente

**Arquivo:** `src/components/financeiro/ConciliacaoSection.tsx`

Nova lógica:

```typescript
interface ConciliacaoSectionProps {
  contasExistentes: ContaFluxo[];
  fornecedores: Fornecedor[];
  onConciliar: (result: {
    conciliados: { id: string }[];
    novos: Omit<ContaFluxo, 'id'>[];
    ignorados: number;
  }) => void;
  // ...
}

// Lógica de match
function encontrarMatch(
  lancamento: { valor: string; dataVencimento: string },
  contas: ContaFluxo[]
): ContaFluxo | null {
  const valorLanc = parseValorFlexivel(lancamento.valor);
  const dataLanc = parseISO(lancamento.dataVencimento);
  
  return contas.find(conta => {
    if (conta.pago) return false;
    
    const valorConta = parseValorFlexivel(conta.valor);
    const dataConta = parseISO(conta.dataVencimento);
    
    // Tolerância: ± R$0,01 e ± 1 dia
    const valorMatch = Math.abs(valorLanc - valorConta) <= 0.01;
    const diffDias = Math.abs(differenceInDays(dataLanc, dataConta));
    const dataMatch = diffDias <= 1;
    
    return valorMatch && dataMatch;
  });
}
```

### 5. Armazenamento de Fornecedores

**Opção A: LocalStorage/State (simples)**
Armazenar a lista de fornecedores no `financeiroData`:

```typescript
financeiroData: {
  // ...
  fornecedores?: Fornecedor[];
}
```

**Opção B: Tabela no Banco (recomendado para escala)**
Criar tabela `fornecedores` no Cloud.

Para esta implementação, usaremos **Opção A** (LocalStorage via state) + importação do CSV.

### 6. Componente de Seleção de Fornecedor

**Novo arquivo:** `src/components/financeiro/FornecedorSelect.tsx`

Um combobox com:
- Busca por nome (fuzzy match)
- Mostra categoria do fornecedor
- Botão "Criar novo" se não encontrar
- Extrai "Beneficiário Final" de nomes compostos

---

## Interface de Resultado da Conciliação

```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 Conciliação Bancária                                        │
├─────────────────────────────────────────────────────────────────┤
│  [Textarea com extrato]                                         │
│                                                                 │
│  [Processar Extrato]                                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ✅ Resultado:                                                  │
│  • 12 conciliados com contas existentes (marcados como pagos)   │
│  • 45 novos lançamentos adicionados ao histórico                │
│  • 8 ignorados (transf. entre contas próprias, rendimentos)     │
│                                                                 │
│  ⚠️ 3 lançamentos precisam de revisão:                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 26/01 BOLETO PAGO RNX FIDC MUL  R$ -770,00               │   │
│  │ Fornecedor: [▼ Selecionar]  [+ Criar novo]               │   │
│  │ → Sugestão: JUND COCO LTDA (extraído de beneficiário)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/focus-mode.ts` | Adicionar `Fornecedor` e campos extras em `ContaFluxo` |
| `supabase/functions/extract-extrato/index.ts` | Chunks + validação de data |
| `src/utils/fluxoCaixaCalculator.ts` | `parseValorFlexivel()` para formatos BR/US |
| `src/components/financeiro/ConciliacaoSection.tsx` | Match inteligente + UI de revisão |
| `src/components/financeiro/FornecedorSelect.tsx` | **NOVO** - Combobox de fornecedor |
| `src/components/financeiro/ImportarFornecedores.tsx` | **NOVO** - Importar CSV |
| `src/components/modes/FinanceiroMode.tsx` | Integrar fornecedores e nova conciliação |

---

## Fluxo de Importação do CSV de Fornecedores

1. Usuário faz upload do CSV ou cola dados
2. Sistema parseia colunas: `Fornecedor,Modalidade,Grupo,Categoria`
3. Cria lista de fornecedores no state
4. Para nomes com "Beneficiário Final", extrai o nome real:
   - Input: `"RNX FIDC MULTISSETORIAL LP (Beneficiário Final: JUND COCO LTDA)"`
   - Extrai: `"JUND COCO LTDA"` como alias

---

## Correção do Fluxo de Caixa

O cálculo atual usa `parseCurrency` que falha com valores americanos. Substituir por:

```typescript
// Em calcularFluxoPreciso
.reduce((acc, c) => {
  const valor = parseValorFlexivel(c.valor); // Em vez de parseCurrency
  return acc + (c.tipo === 'receber' ? valor : -valor);
}, 0);
```

---

## Histórico (Contas Pagas)

Adicionar seção colapsável em `ContasFluxoSection` para mostrar lançamentos já pagos dos últimos 30 dias:

```text
▶ Histórico (42 lançamentos)
  [lista colapsável de contas pagas recentes]
```

---

## Resumo das Funcionalidades

1. **Conciliação Inteligente**: Match automático valor ± R$0,01, data ± 1 dia
2. **Processamento em Chunks**: Divide extrato grande para não truncar
3. **Validação de Datas**: Corrige datas inválidas (30/02 → 28/02)
4. **Cadastro de Fornecedores**: Importar CSV, autocomplete, categorização
5. **Extração de Beneficiário**: Identifica "Beneficiário Final" em nomes compostos
6. **Parsing Flexível**: Aceita valores em formato BR e US
7. **Histórico Visível**: Seção colapsável com contas já pagas
8. **Edição Manual**: Alterar match se conciliação automática errar
