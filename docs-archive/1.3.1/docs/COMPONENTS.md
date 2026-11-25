# Componentes

INTEIRO publica uma biblioteca React tipada, CSS compartilhado e contratos para agentes. A referência de componentes, props e templates está em [LIBRARY.md](LIBRARY.md); exemplos interativos e controles estão no Storybook (`npm run storybook`). A matriz de implementação do relatório está em [EXPANSION.md](EXPANSION.md).

Recipes em `@inteiro/agent-core`: button-primary, button-commit, button-danger, button-secondary, button-ghost, button-quiet, input, card, card-reflection, card-commit, badge, dashboard, editorial, dialog, table, navigation, app-shell, mobile-navigation, profile, stepper, feedback-error, feedback-success, empty-state, loading, focus.

Classes CSS em `@inteiro/design-system/css/components`:

- `.in-button.in-button--primary|--commit|--danger|--secondary|--ghost|--quiet`
- `.in-field` / `.in-input`
- `.in-card` + `data-kind="reflection|commit"`
- `.in-badge`
- vozes `.in-voice-*`

Estados globais: rest, hover, active, focus-visible, selected, loading, disabled, readonly, success, warning, invalid. Foco ≠ seleção.

Uso correto: um primary e, se houver fronteira com o mundo, um commit.  
Uso incorreto: quatro botões violet; Costura em todo card; pill como botão padrão; erro só com borda vermelha.

`AppShell`, `DashboardTemplate`, `MasterDetailTemplate` e os demais templates implementam composições da biblioteca. As recipes `profile` e `stepper` continuam orientando fluxos específicos de cada produto. O MCP `inteiro_get_component` descreve o que está implementado; `inteiro_get_component_recipe` orienta decisões de composição.

Auditoria de código e revisão visual são etapas diferentes. Passe as rotas a `inteiro_get_visual_review` para obter uma matriz concreta por shell, viewport, tema e estado. O checklist cobre hierarquia, alinhamento, escala, quebra natural de texto e clipping. `inteiro_audit` sinaliza riscos de `overflow-wrap:anywhere`, `white-space:nowrap` e `overflow:hidden`, mas esses sinais não provam uma falha renderizada: a captura e a revisão humana decidem. O MCP não captura nem interpreta pixels.
