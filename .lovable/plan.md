

# Supply Chain & Estoque - Modulo Integrado

## Visao Geral

Transformar o modulo Supply de um checklist de tarefas em um sistema de gestao de estoque baseado em **demanda real** e **cobertura em dias**, com:

- Input flexivel (CSV ou colagem)
- Classificacao automatica de itens
- Calculo de cobertura por tipo
- Reguas de seguranca diferenciadas
- Alertas de vencimento
- Visao executiva para Pre-Reuniao Geral

---

## Arquitetura do Modulo

```text
+------------------------------------------+
|           SUPPLY CHAIN MODE              |
|------------------------------------------|
|  [Upload CSV]  ou  [Colar Lista]         |
|                                          |
|  +----------------------------------+    |
|  | DEMANDA SEMANAL: ___ pedidos/sem |    |
|  +----------------------------------+    |
|                                          |
|  +----------------------------------+    |
|  | ITENS DO ESTOQUE                 |    |
|  | Nome | Tipo | Qtd | Cob. | Status|    |
|  |------|------|-----|------|-------|    |
|  | Mel  | Prod | 450 | 28d  |  Y    |    |
|  | Pote | Emb  | 1200| 75d  |  G    |    |
|  +----------------------------------+    |
|                                          |
|  +----------------------------------+    |
|  | VISAO EXECUTIVA                  |    |
|  | Produtos: 22d avg      Y         |    |
|  | Embalagens: 68d min    G         |    |
|  | Vencimentos: OK        G         |    |
|  +----------------------------------+    |
+------------------------------------------+
        |
        v EXPORT
+------------------------------------------+
|  SupplyExports para Pre-Reuniao Geral    |
|  - statusEstoque: verde/amarelo/vermelho |
|  - coberturaProdutosDias: number         |
|  - coberturaEmbalagensDias: number       |
|  - riscoRuptura: boolean                 |
|  - riscoVencimento: boolean              |
+------------------------------------------+
```

---

## Tipos de Estoque e Reguas

| Tipo | Critico (R) | Atencao (Y) | OK (G) | Meta Ideal |
|------|-------------|-------------|--------|------------|
| **Produto Acabado** | <15 dias | 15-30 dias | >=30 dias | 30-45 dias |
| **Embalagem** | <30 dias | 30-60 dias | >=60 dias | 60-90 dias |
| **Insumo** | <20 dias | 20-40 dias | >=40 dias | 40-60 dias |
| **Materia-Prima** | <20 dias | 20-40 dias | >=40 dias | 40-60 dias |

---

## Estrutura de Dados

### Tipos (src/types/focus-mode.ts)

```typescript
export type TipoEstoque = 
  | 'produto_acabado' 
  | 'embalagem' 
  | 'insumo' 
  | 'materia_prima';

export interface ItemEstoque {
  id: string;
  nome: string;
  tipo: TipoEstoque;
  quantidade: number;
  unidade: string;
  demandaSemanal: number;  // Consumo por semana
  dataValidade?: string;   // ISO date
  coberturaDias?: number;  // Calculado
  status?: 'verde' | 'amarelo' | 'vermelho';
}

export interface SupplyChainStageV2 {
  // Input de Demanda
  demandaSemanalMedia: number;  // Pedidos/semana
  
  // Itens do Estoque
  itens: ItemEstoque[];
  
  // Resumo (calculado)
  resumo: {
    coberturaProdutos: number | null;
    coberturaEmbalagens: number | null;
    coberturaInsumos: number | null;
    statusGeral: 'verde' | 'amarelo' | 'vermelho';
    riscoRuptura: boolean;
    riscoVencimento: boolean;
    itensVencendo: string[];  // nomes dos itens
  };
  
  // Checklists legados (manter compatibilidade)
  ritmoAtual: SupplyChainRitmo;
  semanal: { ... };
  quinzenal: { ... };
  mensal: { ... };
}
```

### Exports para Pre-Reuniao Geral

```typescript
export interface SupplyExports {
  statusEstoque: 'verde' | 'amarelo' | 'vermelho';
  coberturaProdutosDias: number | null;
  coberturaEmbalagensDias: number | null;
  riscoRuptura: boolean;  // qualquer item critico
  riscoVencimento: boolean;  // qualquer item <30d
  scorePilar: number;  // 0-30 para Score Negocio
}
```

---

## Formula de Cobertura

```text
Cobertura (dias) = Quantidade em Estoque / (Demanda Semanal / 7)
```

Exemplo:
- Estoque: 450 unidades
- Demanda: 200 pedidos/semana (considerando 1un/pedido)
- Cobertura = 450 / (200/7) = 450 / 28.5 = **15.7 dias**

---

## Interface do Modulo

### Bloco 1: Input de Demanda

```text
+----------------------------------------+
| DEMANDA REAL (BASE DO SUPPLY)          |
|----------------------------------------|
| Pedidos/semana (media):  [____200____] |
| Periodo: ultimas 4 semanas             |
+----------------------------------------+
```

### Bloco 2: Gestao de Estoque

```text
+----------------------------------------+
| ITENS DO ESTOQUE                       |
|----------------------------------------|
| [+ Adicionar Item]  [Colar Lista]      |
|                                        |
| Nome           Tipo     Qtd    Cob.    |
| ----------------------------------------|
| Y Mel 500g     Produto  450    15d     |
| G Pote vidro   Embalag  1200   68d     |
| R Tampa metal  Embalag  180    12d     |
| Y Acucar org.  Insumo   80kg   25d     |
+----------------------------------------+
```

### Bloco 3: Alertas de Vencimento

```text
+----------------------------------------+
| VENCIMENTOS PROXIMOS                   |
|----------------------------------------|
| R Mel lote 2024-12  vence em 22 dias   |
| Y Granola lote 01   vence em 45 dias   |
+----------------------------------------+
```

### Bloco 4: Visao Executiva (Resumo)

```text
+----------------------------------------+
| SUPPLY - VISAO EXECUTIVA               |
|----------------------------------------|
| Produtos Acabados                      |
|   Cobertura media: 22 dias        Y    |
|   Top sellers protegidos: 2/3     Y    |
|                                        |
| Embalagens                             |
|   Cobertura minima: 68 dias       G    |
|                                        |
| Producao                               |
|   Proximo lote em: 21 dias        Y    |
|                                        |
| Vencimentos                            |
|   Sem risco critico               G    |
+----------------------------------------+
```

---

## Integracao com Score Semanal

### Pontuacao Supply (0-30 pontos)

| Situacao | Pontos |
|----------|--------|
| Produto <15 dias (critico) | 0 |
| Produto 15-30 dias | 15 |
| Produto >=30 dias + Embalagens OK | 30 |
| Risco de vencimento | -5 |

### Bloqueios Automaticos

- **Estoque <30 dias**: Ads nao escala (Multiplicador = 0.8)
- **Estoque <15 dias**: Ads reduz (Multiplicador = 0.5)
- **Estoque vermelho**: Prioridade forcada = "Repor Estoque"

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/types/focus-mode.ts` | Adicionar tipos `TipoEstoque`, `ItemEstoque`, `SupplyChainStageV2`, `SupplyExports` |
| `src/components/modes/SupplyChainMode.tsx` | Reescrever UI com input de itens, calculo de cobertura, visao executiva |
| `src/utils/modeStatusCalculator.ts` | Adicionar `calculateSupplyExports()` com reguas de seguranca por tipo |
| `src/hooks/useFocusModes.ts` | Adicionar handlers para CRUD de itens de estoque, calcular exports |
| `src/components/modes/PreReuniaoGeralMode.tsx` | Substituir inputs manuais de estoque por dados calculados do Supply |
| `src/components/ModeContent.tsx` | Passar novos handlers para SupplyChainMode |

---

## Fluxo de Uso Semanal

1. **Segunda**: Usuario abre Supply Chain
2. Atualiza demanda semanal (ou mantem anterior)
3. Adiciona/edita itens de estoque (CSV ou manual)
4. Sistema calcula cobertura e status automaticamente
5. **Pre-Reuniao Geral**: Ve resumo executivo
6. Sistema bloqueia/libera decisoes baseado no estoque
7. **Weekly Snapshot**: Salva metricas de Supply

---

## Beneficios

- Responde "quanto tempo aguenta" sem achismo
- Identifica gargalos (produto vs embalagem vs insumo)
- Alerta vencimentos antes de virar prejuizo
- Bloqueia crescimento quando estoque nao suporta
- Integra com Score Semanal de forma automatica

