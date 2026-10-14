# Changelog

## 1.1.0

### Added
- Guia MCP `inteiro_get_visual_review` com cobertura de rotas, viewports, temas, densidades e estados, checklist visual e critérios de evidência.
- Recipes `app-shell`, `mobile-navigation`, `profile` e `stepper` para padrões recorrentes de sistemas de aplicação.

### Changed
- MCP descreve `inteiro_audit` como análise estática e devolve erros de ferramenta como resultado MCP marcado com `isError`.
- Skills, recipes e documentação deixam explícito que análise de fonte e tokens não certifica hierarquia, alinhamento ou responsividade visual.
- Pacotes e dependências internas atualizados para `1.1.0`; os valores do catálogo de tokens permanecem em `1.0.0`.

### Accessibility
- Protocolo visual inclui cobertura em 320px, targets 44×44px, foco, ampliação, safe-area, redução de movimento e leitura de estados.

## 1.0.0

### Added
- Catálogo DTCG 2025.10 extraído do documento INTEIRO.
- SDK, CLI, MCP, skills geradas, adaptadores dos seis harnesses.
- Temas dark/light e extensão contrast-*.
- Densidade calm/focus.
- Demonstração visual e testes de contraste.

### Accessibility
- Pares de contrato WCAG 2.2 medidos automaticamente.
- `prefers-reduced-motion` no CSS gerado.
- Target 44px nos controles md.

### Migration
- Primeira versão. Ver MIGRATION.md para o legado BG/System.
