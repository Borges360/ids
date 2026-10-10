# Contribuir

1. Identidade Owner decide se a mudança continua sendo INTEIRO.
2. Altere o catálogo em `packages/tokens/src/catalog`, nunca os arquivos gerados.
3. `npm run build && npm test`.
4. Changelog com categorias: Added, Changed, Fixed, Accessibility, Deprecated, Removed, Migration.
5. ADR curto para decisões estruturais (`docs/adrs/` se necessário).
6. Extensões novas devem marcar `status: "extension"` e aparecer em SOURCE_TRACEABILITY.

Perguntas de entrada no core: resolve recorrência? expressa ideia central? reduz arbitrariedade? melhora a11y? esclarece semântica? “Ficou bonito” não basta.
