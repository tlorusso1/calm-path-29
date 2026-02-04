

# Plano: Suporte a Múltiplas Contas na Extração OCR

## Problema Identificado

O Gemini está extraindo corretamente todas as 8 linhas da imagem via múltiplas `tool_calls`, mas:
1. A **edge function** só retorna a primeira (`tool_calls[0]`)
2. O **frontend** espera um único objeto e preenche o form

## Solução

Modificar o fluxo para processar **todas** as contas extraídas de uma vez.

---

## Mudanças Necessárias

### 1. Edge Function: Retornar Array de Contas

**Arquivo:** `supabase/functions/extract-documento/index.ts`

```typescript
// ANTES (linha 158-167):
const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
const extractedData = JSON.parse(toolCall.function.arguments);
return new Response(JSON.stringify(extractedData), ...);

// DEPOIS:
const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
const extractedContas = toolCalls
  .filter(tc => tc.function.name === "extract_conta")
  .map(tc => JSON.parse(tc.function.arguments));

if (extractedContas.length === 0) {
  return new Response(
    JSON.stringify({ error: "Não foi possível extrair dados" }),
    { status: 422, ... }
  );
}

// Retorna array (mesmo se for uma única conta)
return new Response(
  JSON.stringify({ contas: extractedContas }),
  { ... }
);
```

---

### 2. Frontend: Processar Array e Adicionar Múltiplas Contas

**Arquivo:** `src/components/financeiro/ContasFluxoSection.tsx`

**Props:** Adicionar `onAddMultipleContas` para adicionar várias de uma vez:

```typescript
interface ContasFluxoSectionProps {
  // ... existentes ...
  onAddMultipleContas?: (contas: Omit<ContaFluxo, 'id'>[]) => void;  // NOVO
}
```

**processImage:** Ajustar para lidar com array:

```typescript
const processImage = async (file: File) => {
  setIsExtracting(true);
  try {
    const base64 = await fileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('extract-documento', {
      body: { imageBase64: base64 }
    });
    
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao processar documento.');
      return;
    }
    
    // NOVO: Processar array de contas
    const contas = data.contas || [];
    
    if (contas.length === 0) {
      toast.error('Nenhum lançamento encontrado na imagem.');
      return;
    }
    
    if (contas.length === 1) {
      // Uma conta: preenche o form para revisão
      const c = contas[0];
      if (c.descricao) setDescricao(c.descricao);
      if (c.valor) setValor(c.valor);
      if (c.dataVencimento) setDataVencimento(c.dataVencimento);
      if (c.tipo) setTipo(c.tipo);
      toast.success('Dados extraídos! Confira e clique em + para adicionar.');
    } else {
      // Múltiplas contas: adiciona todas diretamente
      if (onAddMultipleContas) {
        const contasParaAdicionar = contas.map(c => ({
          tipo: c.tipo || 'pagar',
          descricao: c.descricao || '',
          valor: c.valor || '',
          dataVencimento: c.dataVencimento || '',
          pago: false,
        }));
        onAddMultipleContas(contasParaAdicionar);
        toast.success(`${contas.length} lançamentos extraídos e adicionados!`);
      }
    }
  } catch (err) {
    console.error('Error processing image:', err);
    toast.error('Erro ao processar imagem.');
  } finally {
    setIsExtracting(false);
  }
};
```

---

### 3. FinanceiroMode: Adicionar Handler para Múltiplas Contas

**Arquivo:** `src/components/modes/FinanceiroMode.tsx`

Adicionar função `handleAddMultipleContas`:

```typescript
const handleAddMultipleContas = (novasContas: Omit<ContaFluxo, 'id'>[]) => {
  const contasComId = novasContas.map(c => ({
    ...c,
    id: crypto.randomUUID(),
  }));
  
  updateStageData('financeiro', {
    contasFluxo: [...(financeiroData.contasFluxo || []), ...contasComId],
  });
};

// Passar para o componente:
<ContasFluxoSection
  contas={financeiroData.contasFluxo || []}
  onAddConta={handleAddConta}
  onAddMultipleContas={handleAddMultipleContas}  // NOVO
  onRemoveConta={handleRemoveConta}
  onTogglePago={handleTogglePago}
  isOpen={contasSectionOpen}
  onToggle={() => setContasSectionOpen(!contasSectionOpen)}
/>
```

---

## Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────┐
│  Usuário cola imagem com 8 lançamentos                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function retorna: { contas: [...8 itens...] }             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend detecta contas.length > 1                             │
│  → Adiciona todas de uma vez                                    │
│  → Toast: "8 lançamentos extraídos e adicionados!"              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Lista mostra todos os 8 lançamentos                            │
│  Usuário pode excluir os que não quiser                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/extract-documento/index.ts` | Retornar array `{ contas: [...] }` com todas as tool_calls |
| `src/components/financeiro/ContasFluxoSection.tsx` | Aceitar prop `onAddMultipleContas`, processar array de contas |
| `src/components/modes/FinanceiroMode.tsx` | Adicionar handler `handleAddMultipleContas` e passar como prop |

---

## Comportamento Final

- **1 lançamento na imagem**: Preenche o form para revisão (comportamento atual)
- **Múltiplos lançamentos**: Adiciona todos automaticamente com toast de confirmação
- **Usuário pode excluir** qualquer lançamento que não queira manter

