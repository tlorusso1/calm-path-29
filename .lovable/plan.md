

## Problema Identificado: extract-extrato não está no config.toml

### Causa do Erro

O erro "Failed to send a request to the Edge Function" ocorre porque a função `extract-extrato` **não está configurada** no arquivo `supabase/config.toml`. 

Atualmente o config.toml tem:
```toml
[functions.extract-documento]
verify_jwt = false

[functions.create-user]
verify_jwt = false
```

Falta:
```toml
[functions.extract-extrato]
verify_jwt = false

[functions.generate-sugestoes]
verify_jwt = false
```

---

### Solução

1. **Adicionar configuração de TODAS as edge functions no config.toml**
2. **Redeployar a função extract-extrato**

---

### Mudança no config.toml

```toml
project_id = "ibxzyodvtmagnetpyyfz"

[functions.extract-documento]
verify_jwt = false

[functions.extract-extrato]
verify_jwt = false

[functions.generate-sugestoes]
verify_jwt = false

[functions.create-user]
verify_jwt = false
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/config.toml` | Adicionar `[functions.extract-extrato]` e `[functions.generate-sugestoes]` com `verify_jwt = false` |

---

### Após a Correção

1. Aplicar a mudança no config.toml
2. Deploy automático das funções
3. Testar importação de extrato bancário

