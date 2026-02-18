
# Correções: Anti-duplicação, Top Saídas 30d e Atualização de Demanda

## Problemas identificados

### 1. Duplicação de saídas (principal)
Em `SupplyChainMode.tsx` linha 675-676:
```ts
const movExistentes = data.movimentacoes || [];
const todasMovimentacoes = [...movExistentes, ...novas];
```
Cada clique em "Importar Movimentações" simplesmente **concatena** as novas por cima das antigas. Se o usuário colar o mesmo CSV duas vezes, as 518 saídas viram 1036. Não existe nenhuma verificação de duplicata.

**Solução**: criar uma chave de deduplicação por `produto + data + quantidade`. Antes de concatenar, filtrar as "novas" que já existem nas existentes. Como as saídas do CSV não têm data (usam `hoje`), a chave será `produto + quantidade`. Para entradas, usar `produto + data + quantidade + lote`.

Alternativa mais simples e robusta: ao importar, **substituir** as movimentações do mesmo tipo e período (não acumular cegamente), ou usar hash de conteúdo como ID. Optaremos pelo hash: gerar um `id` determinístico baseado em `tipo + produto + quantidade + data` para que linhas idênticas do CSV sempre gerem o mesmo ID, e então usar `Set` para deduplicar.

### 2. Top saídas mostra todo o histórico, não os últimos 30 dias
`topProdutosPorSaida()` em `movimentacoesParser.ts` não tem filtro de data — usa todas as movimentações acumuladas.

**Solução**: adicionar parâmetro opcional `diasJanela` (default 30) na função e filtrar as saídas pela data.

### 3. Demanda não está atualizando corretamente no campo "Saída/sem"
A normalização na linha 684 do `SupplyChainMode.tsx` é inline:
```ts
const key = item.nome.toLowerCase().normalize("NFD").replace(...)
```
E a função `normalizarNomeProduto` em `movimentacoesParser.ts` faz:
```ts
.replace(/[®™]/g, '').replace(/\s+/g, ' ')
```
O CSV tem nomes como `"NICE® MILK - CASTANHA DE CAJU - 450G"` (depois do `cleanProductName` que remove `[B]` mas mantém `NICE®`), enquanto os itens no estoque podem estar cadastrados como `NICE Milk Castanha Caju 450G`. A normalização inline no `SupplyChainMode` não remove `®™` — causa mismatch e o `onUpdateItem` nunca é chamado.

**Solução**: extrair a função `normalizarNomeProduto` para um local compartilhado (ou exportá-la do `movimentacoesParser`) e usá-la em ambos os lugares de forma idêntica.

---

## Mudanças técnicas

### Arquivo 1: `src/utils/movimentacoesParser.ts`

**a) IDs determinísticos para deduplicação**

Trocar `genId()` (aleatório) por `gerarIdMovimentacao()` que cria um hash simples baseado no conteúdo:
```ts
function gerarIdMovimentacao(tipo: string, produto: string, quantidade: number, data: string, lote?: string): string {
  const str = `${tipo}|${produto.toLowerCase()}|${quantidade}|${data}|${lote || ''}`;
  // hash simples: djb2
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}
```
Isso garante que a mesma linha CSV sempre gera o mesmo ID — a deduplicação então usa um `Set<string>` de IDs existentes.

**b) Exportar `normalizarNomeProduto`**

Tornar a função pública (`export function normalizarNomeProduto`) para ser reutilizada no componente.

**c) `topProdutosPorSaida` com filtro de janela**

```ts
export function topProdutosPorSaida(
  movimentacoes: MovimentacaoEstoque[],
  n: number = 5,
  diasJanela: number = 30  // NOVO parâmetro
): { produto: string; quantidade: number }[]
```
Filtrar as saídas: só incluir as com `data >= (hoje - diasJanela dias)`.

### Arquivo 2: `src/components/modes/SupplyChainMode.tsx`

**a) Deduplicação na importação**

Na lógica do botão "Importar Movimentações":
```ts
const movExistentes = data.movimentacoes || [];
const idsExistentes = new Set(movExistentes.map(m => m.id));

// Filtrar apenas as novas que NÃO existem ainda
const novasDeduplicadas = novas.filter(m => !idsExistentes.has(m.id));
const todasMovimentacoes = [...movExistentes, ...novasDeduplicadas];

const duplicatasIgnoradas = novas.length - novasDeduplicadas.length;
```

Toast atualizado para informar:
```
"X saídas importadas, Y entradas. Demanda atualizada para Z produtos."
+ se duplicatasIgnoradas > 0: "(N duplicatas ignoradas)"
```

**b) Normalização correta para match de demanda**

Substituir a normalização inline (linha 684) por chamada à função exportada:
```ts
import { ..., normalizarNomeProduto } from '@/utils/movimentacoesParser';

// Dentro do loop:
const key = normalizarNomeProduto(item.nome);
const demanda = demandaMap.get(key);
```

**c) `topProdutosPorSaida` chamado com `diasJanela: 30`**

```ts
const top5 = topProdutosPorSaida(data.movimentacoes!, 5, 30);
```

E atualizar o label para deixar claro: `"Top Produtos (últimos 30d)"`.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/movimentacoesParser.ts` | IDs determinísticos, exportar `normalizarNomeProduto`, filtro de 30d no `topProdutosPorSaida` |
| `src/components/modes/SupplyChainMode.tsx` | Deduplicação por ID no Set, normalização correta, label "últimos 30d" |

## Dados preservados

Nenhum dado existente será removido. As movimentações já salvas mantêm seus IDs aleatórios — após a fix, novas importações do mesmo CSV serão ignoradas pois os IDs determinísticos não colidirão com os aleatórios antigos. Para "limpar" o histórico duplicado, o usuário pode clicar no botão "Limpar Movimentações" (que já existe) e reimportar uma vez.
