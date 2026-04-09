

## Fix: Mapear corretamente impostos do Simples Nacional no DRE

### Problema

O auto-classificador atribui `categoria = 'DARF'` para DARFs genéricos (linha 118), mas essa categoria **não existe** em `categorias-dre.ts`. O `findCategoria('DARF')` retorna `undefined` → o lançamento cai em "Outras Saídas" em vez de DEDUÇÕES. Por isso os impostos parecem baixos.

Além disso, com a explicação do usuário, agora sabemos que:
- **DAS** = imposto principal do Simples Nacional (unifica IRPJ, CSLL, PIS, COFINS, IPI, ICMS, ISS, CPP) → vai para **DEDUÇÕES > Simples Nacional (DAS)**
- **FGTS** = despesa de pessoal (já mapeado corretamente)
- **INSS retido** = despesa de pessoal (já mapeado corretamente)
- **DARF genérico** = no Simples Nacional, DARF normalmente é INSS/FGTS sobre folha. Deve ir para **DESPESAS DE PESSOAL** como fallback, não ficar perdido em "Outras Saídas"
- **DIFAL / ICMS-ST** = eventuais, devem ir para DEDUÇÕES

### Mudanças

**1. `src/data/categorias-dre.ts`**
- Adicionar `DIFAL` e `ICMS-ST` em DEDUÇÕES
- **Não** adicionar `DARF` como categoria — DARF é um tipo de guia, não um imposto. Reclassificar no auto-classificador.

**2. `src/components/financeiro/DRESection.tsx`**
- Linha 118: mudar `categoria = 'DARF'` → `categoria = 'INSS'` (no Simples Nacional, DARF genérico é quase sempre encargo sobre folha)
- Adicionar regras para DIFAL e ICMS-ST
- Adicionar `desc.includes('DAS')` sem exigir `TRIB/COD BARRAS/PAGAMENTO` — DAS sozinho no contexto de saída já é suficiente para classificar como Simples Nacional

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/data/categorias-dre.ts` | Adicionar DIFAL e ICMS-ST em DEDUÇÕES |
| `src/components/financeiro/DRESection.tsx` | DARF genérico → INSS (pessoal); DAS mais flexível; DIFAL/ICMS-ST |

