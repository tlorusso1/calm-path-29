

## Melhorias na Conciliação Bancária + Conta Origem + Limpar Histórico + CMV Real

### Problemas identificados
1. **Conciliação imprecisa**: fornecedores errados, duplicatas, classificações incorretas contaminam DRE e caixa
2. **Sem identificação de conta bancária de origem**: impossível separar movimentações por CNPJ (Nice Foods vs Nice Ecom)
3. **Sem botão de limpar histórico**: acúmulo de dados errados sem forma fácil de resetar
4. **CMV real incompleto**: o CMV Gerencial já inclui impostos, taxa cartão, fulfillment e materiais, mas os custos variáveis não aparecem claramente no DRE — o DRE mostra apenas o CMV Produto (MP + embalagem + industrialização) e as despesas variáveis ficam espalhadas em categorias separadas

---

### 1. Campo "Conta Origem" nos lançamentos

**`src/types/focus-mode.ts`**
- Adicionar `contaOrigem?: string` ao `ContaFluxo`
- Criar constante `CONTAS_BANCARIAS_OPCOES` com as opções:
  - `"ITAU - NICE FOODS"`
  - `"ITAU - NICE ECOM"`
  - `"MERCADO LIVRE - NICE ECOM"`
  - (customizável)

**`src/components/financeiro/ConciliacaoSection.tsx`**
- Adicionar seletor de conta bancária antes do textarea (ex: "De qual conta é este extrato?")
- Todos os lançamentos processados desse extrato recebem `contaOrigem` automaticamente
- Intercompany: removido da detecção automática por pares — será analisado depois cruzando extratos de contas diferentes

**`src/components/financeiro/ContasFluxoSection.tsx`**
- No formulário de adicionar conta manual, incluir select de conta origem
- No histórico, mostrar badge com conta origem
- Permitir filtrar por conta origem

---

### 2. Melhorias na detecção de duplicatas

**`src/components/financeiro/ConciliacaoSection.tsx`**
- Reforçar detecção de duplicata: mesmo valor + mesma descrição normalizada + data ± 2 dias = duplicata (hoje só checa valor + data)
- Ao encontrar duplicata, mostrar no painel com opção de "Forçar importação" caso não seja duplicata real
- Log de duplicatas mais visível com detalhes claros

---

### 3. Melhorias na classificação de fornecedores

**`src/components/financeiro/ConciliacaoSection.tsx`**
- No painel de revisão: ao classificar um lançamento, oferecer "Aplicar a todos similares" (mesmo padrão de descrição) para classificar em lote
- Mostrar sugestão de fornecedor baseada em mapeamentos existentes (fuzzy match) mesmo quando não há match exato
- Destacar visualmente lançamentos sem fornecedor no histórico pago

---

### 4. Botão "Limpar Histórico"

**`src/components/modes/FinanceiroMode.tsx`**
- Adicionar botão "🗑️ Limpar Histórico" na seção de configurações
- AlertDialog de confirmação com opções:
  - Limpar tudo (contas pagas + pendentes)
  - Limpar apenas contas pagas (histórico)
  - Limpar apenas um mês específico
- Reset do caixa não é automático — usuário decide

---

### 5. CMV Real no DRE — onde aparecem os custos variáveis

**Situação atual** (sem mudança de código necessária, apenas clarificação):
- **CMV Produto** (linha "CUSTOS DE PRODUTO VENDIDO" no DRE): MP + embalagem + industrialização → vem do Supply
- **Custos variáveis** já aparecem no DRE como linhas separadas:
  - Impostos → calculado automaticamente (16% do faturamento)
  - Taxa de cartão → "DESPESAS COMERCIAIS" quando conciliado
  - Frete/fulfillment → aparece na categoria correspondente quando lançado

**`src/components/financeiro/DRESection.tsx`**
- Adicionar subtotal "CMV Real (Gerencial)" que soma: CMV Produto + Impostos + Taxa Cartão + Fulfillment + Materiais — os mesmos valores que já aparecem no CMVGerencialCard
- Isso dá visibilidade ao CMV real dentro do DRE, não apenas no card separado

---

### Resumo de arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/types/focus-mode.ts` | `contaOrigem` + constante de contas |
| `src/components/financeiro/ConciliacaoSection.tsx` | Seletor conta origem, duplicatas reforçadas, classificação em lote |
| `src/components/financeiro/ContasFluxoSection.tsx` | Badge conta origem, filtro, select no form |
| `src/components/modes/FinanceiroMode.tsx` | Botão limpar histórico |
| `src/components/financeiro/DRESection.tsx` | Subtotal CMV Real (Gerencial) |

