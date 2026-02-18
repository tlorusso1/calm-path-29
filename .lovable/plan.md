
## Adicionar Código de Barras / PIX, Número de NF e Chave DANFE nas Contas

### O que será feito

Cada conta no fluxo de caixa vai ganhar três novos campos opcionais:
- `codigoBarrasPix`: código de barras ou PIX copia-e-cola
- `numeroNF`: número da Nota Fiscal
- `chaveDanfe`: chave de acesso da DANFE (44 dígitos)

O layout na listagem será:
1. **Botão de cópia rápida** (ícone de copiar) visível diretamente no item, ao lado do valor — aparece apenas quando o campo `codigoBarrasPix` estiver preenchido
2. **Botão "Ver detalhes"** discreto (ícone de info ou lista) que abre um popover/tooltip expandido mostrando NF, chave DANFE e o código de barras/PIX completo com botão de copiar

---

### Arquivos a modificar

#### 1. `src/types/focus-mode.ts`
Adicionar os três novos campos opcionais na interface `ContaFluxo`:
```typescript
codigoBarrasPix?: string;   // Código de barras ou PIX copia-e-cola
numeroNF?: string;          // Número da Nota Fiscal
chaveDanfe?: string;        // Chave de acesso DANFE (44 dígitos)
```
Nenhuma migração de banco necessária — os campos ficam no `contasFluxo[]` dentro do JSON salvo localmente/Supabase.

#### 2. `src/components/financeiro/ContaItem.tsx`
**No modo de visualização (não-edição):**
- Importar `Copy`, `Info`, `FileText` do lucide-react e `Popover`, `PopoverTrigger`, `PopoverContent` do UI
- Ao lado dos botões de ação (próximo ao valor), adicionar:
  - **Botão copiar** (ícone `Copy`, tamanho `h-6 w-6`): aparece apenas se `conta.codigoBarrasPix` estiver preenchido. Um clique copia para clipboard e mostra toast "Copiado!". Sempre visível (não só no hover) para facilitar acesso rápido.
  - **Botão detalhes** (ícone `FileText`, tamanho `h-6 w-6`): aparece apenas se qualquer dos três campos estiver preenchido. Abre um `Popover` com:
    - NF: `conta.numeroNF` (ou "—")
    - Chave DANFE: `conta.chaveDanfe` (ou "—")
    - Código / PIX: campo de texto truncado + botão copiar inline

**No modo de edição:**
- Adicionar uma linha extra expandível "Dados do documento" com três inputs pequenos:
  - Código de barras / PIX copia-e-cola (textarea pequena, 1 linha)
  - N° NF
  - Chave DANFE
- Salvar esses campos junto com os demais no `handleSave`

#### 3. `src/components/financeiro/ContasFluxoSection.tsx`
Não precisa de alteração estrutural — o `ContaItem` já recebe `conta` completa e `onUpdate`. Os novos campos fluem automaticamente.

---

### Comportamento visual resumido

```text
[ 14/02 ] [ USIBRAS LTDA - NF 1234       ] [🔴 SAÍDA] [⚙️ OP]   R$ 16.352,00  [📋][📄][✓][📅][✏️][🗑]
                                                                                  ↑   ↑
                                                              Copiar PIX/Barras   |   Ver detalhes (NF, DANFE)
                                                              (só aparece se      |   (popover discreto)
                                                               campo preenchido)
```

- O botão de cópia fica **sempre visível** quando o campo existe (não some no hover)
- O popover de detalhes é leve, sem destaque, com texto pequeno
- Campos vazios no popover mostram "—" em muted, sem poluir a UI

---

### Detalhes técnicos

- Sem migration de banco: os dados são armazenados dentro do array `contasFluxo` no JSON do modo financeiro
- `navigator.clipboard.writeText()` para copiar + `toast.success('Copiado!')` via Sonner
- Popover do Radix já está instalado (`@radix-ui/react-popover`) — sem nova dependência
