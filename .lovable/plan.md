# Auto-Geração de Contas a Pagar Fixas + Correção de Bugs

## ✅ IMPLEMENTADO

### Parte 1: Correção do Bug de Filtros na Conciliação
- [x] Corrigido `useMemo` que deletava IDs prematuramente em `ConciliacaoSection.tsx`
- [x] Trocado por `useEffect` com cleanup apenas no unmount

### Parte 2: Campo Faturamento Mês Anterior
- [x] Adicionado campo `faturamentoMesAnterior` em `FinanceiroStage` (types)
- [x] UI com input e cálculo de impostos (16% → 4 parcelas)

### Parte 3: Auto-Geração de Contas Fixas
- [x] Criado `src/utils/gerarContasFixas.ts` com lógica completa:
  - Pessoas → 5º dia útil
  - Software/Ads → dia 23 (cartão)
  - Empréstimos → dias específicos de cada um
  - Armazenagem → dia 25
  - Serviços/Marketing → dias configurados (Gioia 15, Verter 20, Vegui 15, Matheus 25)
  - Impostos → dia 20, 4 parcelas (2 DAS + 2 DARF INSS)
- [x] Verificação de duplicatas antes de gerar
- [x] Verificação de carência de empréstimos

### Parte 4: Remoção de Custos Defasados
- [x] Seção removida da UI do `FinanceiroMode.tsx`
- [x] Dados mantidos para retrocompatibilidade
- [x] Substituído por `GerarContasFixasButton` com preview + botão de ação

---

## Fluxo Atual

1. Usuário abre Financeiro
2. Vai em "Parâmetros do Sistema" → "Gerar Contas Fixas do Mês"
3. Preenche o faturamento do mês anterior (base para impostos)
4. Vê preview de quantas contas serão geradas
5. Clica no botão para gerar
6. Contas aparecem em "Contas a Pagar"
7. Usuário ajusta valores conforme necessário
8. Conciliação bancária faz match automático
