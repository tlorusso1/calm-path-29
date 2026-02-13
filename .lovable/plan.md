

# Ajustes Supply (Demanda 4 semanas) + CMV Produto vs CMV Gerencial + Alerta Caixa

## Resumo

Tres blocos de mudancas:
1. Supply: media de saida semanal baseada nos ultimos 28 dias (nao periodo total)
2. Financeiro: separar CMV Produto (contabil) de CMV Gerencial (unit economics com impostos, taxa cartao, fulfillment)
3. Verificar logica do alerta de caixa insuficiente

## Sobre o alerta de caixa insuficiente

O alerta esta correto. Ele soma o saldo Itau (CC + CDB de ambas as contas) e compara com as contas a pagar nao pagas nos proximos 5 dias. Se o total a pagar excede o saldo, mostra "FALTA". Na imagem: saldo R$ 226,46 vs R$ 10.547,16 a pagar = falta R$ 10.320,70. Se voce tem caixa em outros lugares (Asaas, Pagar.me, Mercado Pago), o alerta ja sugere puxar deles, mas nao soma automaticamente porque sao recebiveis, nao saldo livre. **Se quiser que o alerta considere tambem saldo de gateways, posso ajustar em outro momento.**

---

## 1. Supply - Media de Saida Semanal (ultimas 4 semanas)

**Arquivo: `src/utils/movimentacoesParser.ts`**

Alterar `calcularDemandaSemanalPorItem` para:
- Usar janela fixa de 28 dias (ultimas 4 semanas) em vez do periodo total desde a primeira saida
- Se nao houver 28 dias de dados, usar o periodo disponivel (minimo 7 dias)
- Isso evita distorcao quando se importa um historico longo

Campo de demanda semanal no item continua editavel (override manual), mas o valor calculado automaticamente agora reflete apenas as ultimas 4 semanas.

## 2. Financeiro - Dois niveis de CMV

### CMV Produto (ja existe, ajustar label)

O CMV Produto atual (quantidade saida x custo unitario) ja esta correto. Apenas renomear/clarificar no DRE:
- Linha "CUSTOS DE PRODUTO VENDIDO" passa a mostrar sublabel "CMV Produto (custo MP + embalagem + industrializacao)"
- Badge SUPPLY continua

### CMV Gerencial (novo bloco)

**Novo arquivo: `src/components/financeiro/CMVGerencialCard.tsx`**

Card separado abaixo do DRE na secao de Analise, com:

Inputs configuráveis (com defaults):
- Aliquota impostos: puxar do campo `impostoPercentual` do Financeiro (default 16%)
- Taxa cartao: default 6% (editavel)
- Fulfillment por pedido: default R$ 5,00 (editavel)
- Caixa + materiais por pedido: default R$ 5,00 (editavel)

Calculos automaticos (baseados nos dados do mes):
- **Receita Bruta**: vem do Supply (soma ValorSaida das movimentacoes) ou do DRE (receitas conciliadas)
- **CMV Produto**: quantidade x custo unitario (do Supply)
- **Impostos**: Receita x aliquota
- **Taxa Cartao**: Receita x 6%
- **Fulfillment**: (Receita / ticket medio) x R$ 5,00
- **Caixa/Materiais**: (Receita / ticket medio) x R$ 5,00
- **CMV Gerencial Total**: soma de todos acima
- **Margem Gerencial**: (Receita - CMV Gerencial) / Receita

Ticket medio: puxar de `reuniaoAds.ticketMedio` se disponivel, ou calcular como Receita / numero de saidas unicas (agrupadas por pedido/lote)

Exibicao em tabela simples:
```
Receita Bruta           R$ XX.XXX
(-) CMV Produto         R$ X.XXX    (XX%)
(-) Impostos            R$ X.XXX    (16%)
(-) Taxa Cartao         R$ X.XXX    (6%)
(-) Fulfillment         R$ X.XXX
(-) Caixa/Materiais     R$ X.XXX
= Margem Gerencial      R$ X.XXX    (XX%)
```

### Integracao no DRE

No DRE existente, apos a linha de RESULTADO OPERACIONAL, adicionar uma linha resumo:
- "Margem Gerencial (unit economics): XX%" com link para expandir o card completo

**Arquivo: `src/components/financeiro/DRESection.tsx`**

Adicionar prop `cmvGerencialData` e exibir resumo apos resultado operacional.

**Arquivo: `src/components/modes/FinanceiroMode.tsx`**

- Adicionar o CMVGerencialCard na secao de Analise (bloco MEIO)
- Passar dados necessarios (receita, CMV produto, ticket medio, aliquota impostos)

## 3. Consistencia de dados

- A demanda semanal no Supply vem exclusivamente das saidas reais (ultimas 4 semanas)
- O campo manual permanece como override (se preenchido, prevalece sobre o calculado)
- O CMV Produto usa a mesma base de saidas + tabela de custos
- O CMV Gerencial adiciona camadas de custo por cima do CMV Produto

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/utils/movimentacoesParser.ts` | Alterar calculo de demanda para janela de 28 dias |
| `src/components/financeiro/CMVGerencialCard.tsx` | **NOVO** - Card com unit economics e margem gerencial |
| `src/components/financeiro/DRESection.tsx` | Adicionar sublabel no CMV Produto + resumo margem gerencial |
| `src/components/modes/FinanceiroMode.tsx` | Integrar CMVGerencialCard na secao de Analise |
| `src/types/focus-mode.ts` | Adicionar campos de config do CMV Gerencial ao FinanceiroStage |

## Dados preservados

Nenhum dado existente sera apagado. Todas as movimentacoes, itens de estoque, contas, fornecedores e configuracoes permanecem intactos. As mudancas sao aditivas.

