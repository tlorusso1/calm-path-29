

## Simplificar Faturamento por Canal: Prioridade Estoque + Override Manual

### Problema
- O banco não separa bem por canal (vários canais caem na mesma conta)
- As movimentações de estoque têm o canal correto (selecionado na importação)
- Precisa manter override manual para ajustes

### Mudanças em `FaturamentoCanaisCard.tsx`

1. **Inverter prioridade**: Movimentações (bruto) → Banco (líquido) → Manual
   - Estoque é a fonte primária porque tem o canal correto
   - Banco serve como fallback/complemento
   - Manual serve como override final (se preenchido, sobrescreve tudo)

2. **Simplificar grid**: Canal | Realizado | Override | Projeção
   - Coluna "Realizado" mostra o valor da fonte primária disponível com ícone da fonte (📦/🏦)
   - Coluna "Override" mantém o input manual (compacto, sempre visível)
   - Remover a separação confusa de duas colunas Líquido/Bruto

3. **Lógica de valor final**:
   ```
   se manual > 0 → usa manual (✏️)
   senão se movimentações > 0 → usa movimentações (📦)  
   senão se banco > 0 → usa banco (🏦)
   ```

4. **Legenda** no rodapé: "📦 = movimentações · 🏦 = banco · ✏️ = override manual"

### Arquivo alterado
| Arquivo | Mudança |
|---------|---------|
| `src/components/financeiro/FaturamentoCanaisCard.tsx` | Grid simplificada, prioridade invertida (estoque primeiro), override manual mantido |

