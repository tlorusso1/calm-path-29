

# Melhoria: Lista de Itens Criticos e Campo de Validade

## Problema Atual

1. **Itens criticos aparecem como texto corrido**: "Produto A, Produto B, Produto C" - dificil de ler e agir
2. **Campo de validade nao esta acessivel**: Existe na estrutura de dados mas nao tem campo editavel inline
3. **Alertas de vencimento limitados**: Atualmente so mostra <30 e <60 dias

## Solucao Proposta

### 1. Lista Visual de Itens Criticos

Transformar a area de alertas (linhas 216-237) de texto corrido para lista estruturada:

```text
ANTES:
+------------------------------------------+
| Ruptura iminente: Produto A, Produto B   |
+------------------------------------------+

DEPOIS:
+------------------------------------------+
| Ruptura Iminente                         |
| - NICE MILK AVEIA 450G (8 dias)          |
| - CHOCONICE AO LEITE (12 dias)           |
+------------------------------------------+
| Vencendo em Breve                        |
| - LEVEDURA 100G (25 dias)                |
| - NICE CHEESY (58 dias)                  |
+------------------------------------------+
```

### 2. Campo de Validade Inline

Adicionar campo de data ao lado do campo de saida semanal:

```text
+----------------------------------------------------------+
| NICE MILK AVEIA 450G                      Produto        |
| 653 un  |  8 dias  |  [Editar] [X]                       |
|----------------------------------------------------------|
| Saida/sem: [80___] un   |   Validade: [2026-03-15]       |
+----------------------------------------------------------+
```

### 3. Reguas de Alerta de Vencimento

Tres niveis visuais baseados em dias ate vencimento:

| Dias Restantes | Cor | Icone |
|----------------|-----|-------|
| < 30 dias | Vermelho | Alerta |
| 30-59 dias | Amarelo | Relogio |
| 60-89 dias | Cinza/Info | Info |
| >= 90 dias | Sem alerta | - |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/modes/SupplyChainMode.tsx` | Transformar alertas em lista, adicionar campo de validade inline |
| `src/utils/supplyCalculator.ts` | Atualizar processarSupply para incluir cobertura nos itens criticos |

## Detalhes Tecnicos

### Mudanca 1: Alertas como Lista (linha 216-237)

Substituir `resumo.itensCriticos.join(', ')` por lista mapeada:

```tsx
{resumo.itensCriticos.length > 0 && (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <span className="font-medium text-destructive text-sm">
        Ruptura Iminente
      </span>
    </div>
    <ul className="ml-6 space-y-1">
      {itensProcessados
        .filter(i => i.status === 'vermelho')
        .map(item => (
          <li key={item.id} className="text-sm text-muted-foreground">
            {item.nome} 
            {item.coberturaDias !== undefined && 
              <span className="text-destructive font-medium">
                ({item.coberturaDias}d)
              </span>
            }
          </li>
        ))}
    </ul>
  </div>
)}
```

### Mudanca 2: Campo de Validade Inline (apos linha 404)

Adicionar input de data no bloco do item:

```tsx
<div className="flex items-center gap-2">
  <Label className="text-xs text-muted-foreground whitespace-nowrap">
    Validade:
  </Label>
  <Input
    type="date"
    value={item.dataValidade ?? ''}
    onChange={(e) => onUpdateItem(item.id, { 
      dataValidade: e.target.value || undefined 
    })}
    className="h-7 w-32 text-xs"
  />
  {diasVenc !== null && (
    <Badge 
      variant="outline"
      className={cn(
        "text-[10px]",
        diasVenc < 30 ? "border-destructive text-destructive" :
        diasVenc < 60 ? "border-yellow-500 text-yellow-600" :
        diasVenc < 90 ? "border-muted-foreground text-muted-foreground" :
        "border-green-500 text-green-600"
      )}
    >
      {diasVenc}d
    </Badge>
  )}
</div>
```

### Mudanca 3: Atualizar Alertas de Vencimento

No `supplyCalculator.ts`, atualizar para incluir itens com <90 dias (com indicacao do nivel):

```tsx
const itensVencendo: string[] = [];
itensProcessados.forEach(item => {
  const dias = calcularDiasAteVencimento(item.dataValidade);
  if (dias !== null && dias < 90) {
    itensVencendo.push({ 
      nome: item.nome, 
      dias, 
      nivel: dias < 30 ? 'critico' : dias < 60 ? 'alerta' : 'aviso' 
    });
  }
});
```

## Resultado Esperado

- Itens criticos aparecem como lista clara e acionavel
- Campo de validade editavel diretamente na lista
- Alertas visuais em 3 niveis (30d, 60d, 90d)
- Melhor visibilidade para tomada de decisao

