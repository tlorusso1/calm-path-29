
## Problema Identificado
A regex de detecção de intercompany na linha 167 é muito restritiva:
```
/SISPAG NICE FOODS ECOMME/i
```

Ela procura por uma sequência exata, mas variações como:
- `SISPAG NICE FOODS ECOMMERCE`
- `SISPAG NICE FOODS LTDA`
- `SISPAG NICE FOODS`
- Espaçamentos diferentes

... não são detectadas corretamente.

## Solução
Atualizar a regex para ser mais flexível, permitindo variações enquanto mantém a detecção segura.

**Novo padrão:**
```typescript
// Detectar intercompany - SISPAG com NICE FOODS em qualquer ordem/variação
if (/SISPAG.*NICE.*FOODS/i.test(desc)) {
  tipo = "intercompany";
}
```

Ou ainda mais robusto, detectando também outras transferências intergrupais:
```typescript
// Detectar intercompany
if (/TED.*NICE|PIX.*NICE|SISPAG.*NICE.*FOODS|TRANSFERENCIA.*NICE/i.test(desc)) {
  tipo = "intercompany";
}
```

## Mudança Técnica

### Arquivo: `supabase/functions/extract-extrato/index.ts` (linha 166-169)

**Antes:**
```typescript
// Detectar intercompany
if (/SISPAG NICE FOODS ECOMME/i.test(desc)) {
  tipo = "intercompany";
}
```

**Depois:**
```typescript
// Detectar intercompany
if (/SISPAG.*NICE.*FOODS/i.test(desc)) {
  tipo = "intercompany";
}
```

## Resultado Esperado
Todas as variações de SISPAG com NICE FOODS serão classificadas como intercompany automaticamente.

