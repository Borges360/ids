# Skills

Skills canônicas (entrada, sempre instaláveis):

- `inteiro` — aplicar o sistema
- `inteiro-interface` — criar UI
- `inteiro-audit` — auditar
- `inteiro-migrate` — migrar hardcoded
- `inteiro-choose-token` — escolher semântica
- `inteiro-identity` — marca e tipo
- `inteiro-a11y` — acessibilidade
- `inteiro-voice` — microcopy
- `inteiro-components` — recipes
- `inteiro-validate` — conformidade

Skills por token são geradas automaticamente:

```bash
npx inteiro skills generate --out packages/skills/generated
```

Não mantenha essas skills à mão. O índice `generated/index.json` lista todos os nomes kebab-case.

Carregamento progressivo: o harness vê as 10 skills de entrada; o agente consulta `inteiro tokens explain` ou MCP quando precisa de um token específico.
