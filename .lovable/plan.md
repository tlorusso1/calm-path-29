
# Reestruturacao do Modo Financeiro

## Resumo das Mudancas

Reorganizar o modo Financeiro para ser mais claro e pratico, com campos separados para cada empresa, soma automatica e campos de texto para decisoes.

---

## Nova Estrutura do Modo Financeiro

```text
+------------------------------------------+
|  1. CAIXA HOJE                           |
|                                          |
|     NICE FOODS         R$ [________]     |
|     NICE FOODS ECOM    R$ [________]     |
|     --------------------------------     |
|     TOTAL              R$ XX.XXX,XX      |
|                                          |
+------------------------------------------+
|  2. O QUE VENCE ATE DOMINGO              |
|                                          |
|     [x] Verifiquei DDA                   |
|     [x] Verifiquei E-mail                |
|     [x] Verifiquei WhatsApp              |
|     [x] Coloquei na planilha             |
|                                          |
|     + [Adicionar item de vencimento]     |
|                                          |
|     [x] Confirmei o que foi/nao agendado |
|                                          |
+------------------------------------------+
|  3. CLASSIFICACAO A/B/C                  |
|     (aparece apenas se tiver itens)      |
+------------------------------------------+
|  4. DECISOES DA SEMANA                   |
|                                          |
|     Pagar:                               |
|     [________________________]           |
|                                          |
|     Segurar:                             |
|     [________________________]           |
|                                          |
|     Renegociar:                          |
|     [________________________]           |
|                                          |
+------------------------------------------+
```

---

## Alteracoes nos Arquivos

### 1. `src/types/focus-mode.ts`

Atualizar a interface `FinanceiroStage`:

```typescript
export interface FinanceiroStage {
  // Caixa separado por empresa
  caixaNiceFoods: string;
  caixaEcommerce: string;
  
  // Verificacoes simplificadas
  vencimentos: {
    dda: boolean;
    email: boolean;
    whatsapp: boolean;
    planilha: boolean;  // "coloquei na planilha"
  };
  
  // Itens de vencimento
  itensVencimento: ChecklistItem[];
  
  // Agendamento (junto com vencimentos)
  agendamentoConfirmado: boolean;
  
  // Decisoes como texto livre
  decisaoPagar: string;
  decisaoSegurar: string;
  decisaoRenegociar: string;
}
```

**Mudancas principais:**
- Remover `caixaAtual` (era campo unico)
- Adicionar `caixaNiceFoods` e `caixaEcommerce`
- Remover `cobrancas` de vencimentos (simplificar)
- Substituir `decisaoFinal` por tres campos de texto

---

### 2. `src/hooks/useFocusModes.ts`

Atualizar `DEFAULT_FINANCEIRO_DATA`:

```typescript
export const DEFAULT_FINANCEIRO_DATA: FinanceiroStage = {
  caixaNiceFoods: '',
  caixaEcommerce: '',
  vencimentos: {
    dda: false,
    email: false,
    whatsapp: false,
    planilha: false,
  },
  itensVencimento: [],
  agendamentoConfirmado: false,
  decisaoPagar: '',
  decisaoSegurar: '',
  decisaoRenegociar: '',
};
```

---

### 3. `src/components/modes/FinanceiroMode.tsx`

Reestruturar o componente com as novas secoes:

#### Secao 1: Caixa Hoje
- Campo para NICE FOODS (input numerico com R$)
- Campo para NICE FOODS ECOMMERCE (input numerico com R$)
- Linha de TOTAL que soma automaticamente os dois valores
- Funcao `parseCurrency` para limpar o valor e somar

#### Secao 2: O que vence ate domingo (unificada)
- Checkbox: Verifiquei DDA
- Checkbox: Verifiquei E-mail
- Checkbox: Verifiquei WhatsApp
- Checkbox: Coloquei na planilha
- Lista de itens de vencimento (add/remove)
- Checkbox: Confirmei o que foi e o que nao foi agendado

#### Secao 3: Classificacao A/B/C
- Aparece apenas se tiver itens
- Mesma logica atual

#### Secao 4: Decisoes da Semana
- Campo de texto: "O que vou pagar:"
- Campo de texto: "O que vou segurar:"
- Campo de texto: "O que vou renegociar:"

---

## Detalhes Tecnicos

### Funcao de Soma Automatica

```typescript
const parseCurrency = (value: string): number => {
  // Remove R$, pontos e espacos, troca virgula por ponto
  const cleaned = value
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const total = parseCurrency(data.caixaNiceFoods) + 
              parseCurrency(data.caixaEcommerce);
```

### Campos de Decisao

Usar `Textarea` para permitir multiplas linhas:

```typescript
<Textarea
  placeholder="Ex: Fornecedor X, conta de luz..."
  value={data.decisaoPagar}
  onChange={(e) => onUpdateFinanceiroData({ 
    decisaoPagar: e.target.value 
  })}
/>
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/focus-mode.ts` | Atualizar interface FinanceiroStage e DEFAULT_FINANCEIRO_DATA |
| `src/hooks/useFocusModes.ts` | Atualizar merge de dados para novos campos |
| `src/components/modes/FinanceiroMode.tsx` | Reestruturar layout completo |

---

## Resultado Final

O modo Financeiro tera um fluxo mais claro:

1. **Caixa hoje** - Preencher valores por empresa, ver total
2. **Vencimentos** - Marcar verificacoes + listar itens + confirmar agendamento (tudo junto)
3. **Classificar** - A/B/C nos itens listados
4. **Decidir** - Campos de texto para cada tipo de decisao
