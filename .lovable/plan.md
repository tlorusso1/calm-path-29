
# Dashboard Público de Estoques

Criar uma página pública (sem autenticação) que mostra o status atual dos estoques, compartilhável com o time via link.

## Arquitetura

A página será acessível em `/estoque/:userId` (ou um token). Como os dados de estoque estão na tabela `focus_mode_states` protegida por RLS, precisamos de uma edge function que busca os dados com service role e os expõe publicamente.

## Implementação

### 1. Edge Function: `supabase/functions/public-estoque/index.ts`
- Recebe `?user_id=<uuid>` como query param
- Usa service role key para ler `focus_mode_states` do usuário (semana atual)
- Extrai `modes.supplychain.supplyChainData` (itens + ultimaImportacaoMov)
- Retorna JSON com:
  - Lista de itens (nome, tipo, quantidade, unidade, demandaSemanal, coberturaDias, status, dataValidade, precoCusto)
  - Data da última atualização (`updated_at` do registro)
  - Data da última importação de movimentações (`ultimaImportacaoMov`)
- Não expõe dados financeiros nem outros módulos

### 2. Página pública: `src/pages/EstoqueDashboard.tsx`
- Rota: `/estoque/:userId`
- Não requer autenticação (fora do ProtectedRoute)
- Faz fetch na edge function com o userId da URL
- Exibe:
  - Header com logo Nice Foods + título "Status de Estoques"
  - Badge com "Última atualização: DD/MM/YYYY HH:mm"
  - Tabela com colunas: Produto, Tipo, Qtde, Saída/sem, Cobertura (dias), Status (badge colorido), Validade
  - Status visual: verde/amarelo/vermelho com badges coloridos
  - Itens ordenados por status (vermelho primeiro, depois amarelo, depois verde)
- Design limpo, responsivo, sem sidebar/header do app principal
- Auto-refresh a cada 5 minutos

### 3. Rota no App.tsx
- Adicionar rota `/estoque/:userId` FORA do ProtectedRoute
- Componente: `EstoqueDashboard`

### 4. Link de compartilhamento no SupplyChainMode
- Adicionar botão "Compartilhar com time" no header do módulo Supply Chain
- Ao clicar, copia o link `{origin}/estoque/{userId}` para o clipboard
- Toast confirmando que foi copiado

## Arquivos criados/modificados
- **Criar**: `supabase/functions/public-estoque/index.ts` - edge function
- **Criar**: `src/pages/EstoqueDashboard.tsx` - página pública
- **Modificar**: `src/App.tsx` - adicionar rota
- **Modificar**: `src/components/modes/SupplyChainMode.tsx` - botão de compartilhar

## Segurança
- A edge function expõe APENAS dados de estoque (itens), nada financeiro
- O userId na URL é um UUID, difícil de adivinhar
- Sem dados sensíveis expostos (apenas nomes de produtos, quantidades, validades)
