

# Plano: OCR para Documentos Financeiros + Projeção com Histórico Real

## Objetivo

Implementar duas melhorias no módulo Financeiro:

1. **OCR de Documentos**: Colar/arrastar uma imagem de boleto, nota fiscal ou DDA e a IA extrai automaticamente os campos (descrição, valor, vencimento)
2. **Projeção com Histórico**: Usar dados reais das semanas anteriores (da tabela `weekly_snapshots`) para projetar o fluxo de caixa de forma mais precisa

---

## Melhoria 1: OCR de Documentos Financeiros

### Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  📑 Contas a Pagar/Receber                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  📸 Cole ou arraste uma imagem de boleto/NF aqui          │ │
│  │  (DDA, Nota Fiscal, Boleto)                                │ │
│  │  ───────────────────────────────────────────────────────── │ │
│  │  [Ctrl+V ou drag-and-drop]                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [A Pagar ▼] [Descrição preenchida] R$[1.234,56] [15/02] [+]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Arquitetura

```text
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Edge Function     │────▶│   Lovable AI     │
│  (drop zone) │     │ extract-documento   │     │   (Gemini 2.5)   │
└──────────────┘     └─────────────────────┘     └──────────────────┘
      │                        │                          │
      │  base64 da imagem      │    Prompt estruturado    │
      │  + tipo documento      │    + tool calling        │
      │                        │                          │
      ▼                        ▼                          ▼
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Preenche    │◀────│   JSON Response     │◀────│  Extração:       │
│  campos form │     │ {descricao, valor,  │     │  - beneficiario  │
│              │     │  dataVencimento,    │     │  - valor         │
│              │     │  tipo}              │     │  - vencimento    │
└──────────────┘     └─────────────────────┘     └──────────────────┘
```

### Edge Function: `extract-documento`

```typescript
// supabase/functions/extract-documento/index.ts
// Recebe: { imageBase64: string, tipoDocumento?: 'boleto' | 'nf' | 'dda' }
// Retorna: { descricao, valor, dataVencimento, tipo, confianca }

const systemPrompt = `
Você é um especialista em extração de dados de documentos financeiros brasileiros.
Analise a imagem e extraia:
- Beneficiário/Sacado/Fornecedor (será a descrição)
- Valor total em reais (formato: "1234.56")
- Data de vencimento (formato: "YYYY-MM-DD")
- Se é uma conta a PAGAR ou a RECEBER

Documentos comuns:
- Boleto: procure linha digitável, beneficiário, valor, vencimento
- NF: procure fornecedor, valor total, data emissão + prazo
- DDA: procure sacado, valor, vencimento

Retorne usando a função extract_conta.
`;

// Tool calling para garantir estrutura
const tools = [{
  type: "function",
  function: {
    name: "extract_conta",
    parameters: {
      type: "object",
      properties: {
        descricao: { type: "string" },
        valor: { type: "string" },
        dataVencimento: { type: "string" },
        tipo: { type: "string", enum: ["pagar", "receber"] },
        confianca: { type: "number" }
      },
      required: ["descricao", "valor", "dataVencimento", "tipo"]
    }
  }
}];
```

### Frontend: Zona de Drop/Paste

Adicionar ao `ContasFluxoSection.tsx`:

```typescript
// Novo estado para loading e preview
const [isExtracting, setIsExtracting] = useState(false);
const [previewImage, setPreviewImage] = useState<string | null>(null);

// Handler para paste (Ctrl+V)
const handlePaste = async (e: React.ClipboardEvent) => {
  const items = e.clipboardData?.items;
  for (const item of Array.from(items || [])) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) await processImage(blob);
    }
  }
};

// Handler para drag-and-drop
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file?.type.startsWith('image/')) {
    await processImage(file);
  }
};

// Processar imagem via edge function
const processImage = async (file: File) => {
  setIsExtracting(true);
  const base64 = await fileToBase64(file);
  
  const { data, error } = await supabase.functions.invoke('extract-documento', {
    body: { imageBase64: base64 }
  });
  
  if (data && !error) {
    setDescricao(data.descricao);
    setValor(data.valor);
    setDataVencimento(data.dataVencimento);
    setTipo(data.tipo);
  }
  
  setIsExtracting(false);
};
```

---

## Melhoria 2: Projeção com Histórico Real

### Dados Disponíveis na Tabela `weekly_snapshots`

A tabela já armazena dados semanais que podem melhorar a projeção:

| Campo | Uso na Projeção |
|-------|-----------------|
| `resultado_mes` | Resultado histórico real |
| `gasto_ads` | Gastos históricos de Ads |
| `sessoes_semana` | Correlação com demanda |
| `caixa_livre_real` | Posição de caixa real |

### Lógica de Projeção Melhorada

```typescript
// src/utils/fluxoCaixaCalculator.ts

interface FluxoCaixaInput {
  data: FinanceiroStage;
  historicoSemanas?: WeeklySnapshot[];  // NOVO: histórico opcional
}

function calcularFluxoProjecao(
  data: FinanceiroStage, 
  historico: WeeklySnapshot[] = []
): FluxoCaixaDataPoint[] {
  
  // 1. Tentar calcular médias do histórico (últimas 4 semanas)
  const ultimas4 = historico.slice(0, 4).filter(s => s.resultado_mes != null);
  
  let entradasMensais: number;
  let saidasMensais: number;
  
  if (ultimas4.length >= 2) {
    // MODO HISTÓRICO: usa média real das últimas semanas
    const mediaResultado = ultimas4.reduce((acc, s) => 
      acc + (s.resultado_mes || 0), 0) / ultimas4.length;
    
    const mediaGastoAds = ultimas4.reduce((acc, s) => 
      acc + (s.gasto_ads || 0), 0) / ultimas4.length;
    
    // Resultado = Entradas - Saídas, então:
    // Se histórico mostra resultado positivo, tendência é boa
    entradasMensais = /* calculado com base no histórico */;
    saidasMensais = /* calculado com base no histórico */;
    
  } else {
    // MODO ESTIMADO: usa inputs manuais (comportamento atual)
    const faturamentoEsperado = parseCurrency(data.faturamentoEsperado30d || '');
    entradasMensais = faturamentoEsperado * MARGEM_OPERACIONAL;
    
    saidasMensais = 
      parseCurrency(data.custoFixoMensal || '') +
      parseCurrency(data.marketingEstrutural || '') +
      parseCurrency(data.adsBase || '');
  }
  
  // 2. Calcular resultado semanal
  const resultadoSemanal = (entradasMensais - saidasMensais) / 4;
  
  // 3. Construir projeção com indicador de fonte
  return buildProjection(caixa, resultadoSemanal, caixaMinimo);
}
```

### Exibição do Modo de Projeção

```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 Fluxo de Caixa (30d)           [Baseado em histórico ✓]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Gráfico com barras...                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ⓘ Projeção baseada nas últimas 4 semanas de resultados reais  │
│     Tendência: Resultado médio R$ +X.XXX/semana                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/extract-documento/index.ts` | Edge function para OCR via Lovable AI |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/config.toml` | Registrar nova edge function |
| `src/components/financeiro/ContasFluxoSection.tsx` | Adicionar zona de drop/paste para imagens |
| `src/utils/fluxoCaixaCalculator.ts` | Aceitar histórico e usar para projeção |
| `src/components/financeiro/FluxoCaixaChart.tsx` | Exibir indicador de fonte (histórico vs estimado) |
| `src/components/modes/FinanceiroMode.tsx` | Passar histórico para o calculador |

---

## Fluxo de Uso Final

### OCR de Documentos

1. Usuário abre seção "Contas a Pagar/Receber"
2. Cola imagem de boleto (Ctrl+V) ou arrasta arquivo
3. Sistema mostra loading "Extraindo dados..."
4. Campos preenchem automaticamente
5. Usuário confirma/ajusta e clica em "+"
6. Conta adicionada ao fluxo

### Projeção com Histórico

1. Sistema carrega `weekly_snapshots` das últimas 4 semanas
2. Se tem histórico suficiente:
   - Usa média de resultados reais para projetar
   - Badge indica "Baseado em histórico"
3. Se não tem histórico:
   - Usa inputs manuais (comportamento atual)
   - Badge indica "Projeção estimada"

---

## Consideracoes Tecnicas

1. **Lovable AI**: Usando `google/gemini-2.5-flash` com suporte a imagens para OCR
2. **Tool Calling**: Garante estrutura JSON consistente na resposta
3. **Fallback**: Se OCR falhar, usuário ainda pode preencher manualmente
4. **Histórico**: Hook `useWeeklyHistory` já existe e pode ser reutilizado
5. **Limite de Imagem**: Aceitar imagens até 5MB (suficiente para screenshots/fotos)

