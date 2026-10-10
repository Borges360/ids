# Publicação

**Não publicar no npm nem em marketplaces sem autorização explícita.** Esta entrega gera tarballs locais.

```bash
npm pack -w @inteiro/tokens
npm pack -w @inteiro/cli
npm pack -w @inteiro/design-system
```

Trusted Publishing (OIDC) está esboçado em `.github/workflows/ci.yml` só para verificação. O workflow de release do documento (npm stage + promoção humana) não dispara publish.

Adaptadores: arquivos de repositório. Plugins de marketplace (Cursor, Claude, Codex directory, Hermes tap) exigem publicação humana posterior.

Engines: Node `>=22.14`. npm CLI 11+ para trusted publishing futuro.
