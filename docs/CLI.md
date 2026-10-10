# CLI

Binário: `inteiro` (`@inteiro/cli` e `@inteiro/design-system`).

```bash
npx inteiro --help
npx inteiro tokens list --layer semantic --json
npx inteiro tokens export --format css --out ./inteiro.css
npx inteiro init --dry-run
npx inteiro agents install claude --yes
```

## Comandos

Ver `npx inteiro --help` para a lista completa. Códigos: 0 ok, 2 uso, 3 não encontrado, 4 inválido, 5 IO.

`--dry-run` não escreve. `--yes` permite overwrite. Sem `--yes`, `init` não destrói arquivos diferentes.

Não interativo / CI: sempre passe `--yes --json`.
