# Componentes

INTEIRO não declara uma biblioteca completa de React components como produto. Declara **contratos e recipes** implementáveis em CSS (e um provider React opcional).

Recipes em `@inteiro/agent-core`: button-primary, button-commit, button-danger, button-secondary, button-ghost, button-quiet, input, card, card-reflection, card-commit, badge, dashboard, editorial, dialog, table, navigation, feedback-error, feedback-success, empty-state, loading, focus.

Classes CSS em `@inteiro/design-system/css/components`:

- `.in-button.in-button--primary|--commit|--danger|--secondary|--ghost|--quiet`
- `.in-field` / `.in-input`
- `.in-card` + `data-kind="reflection|commit"`
- `.in-badge`
- vozes `.in-voice-*`

Estados globais: rest, hover, active, focus-visible, selected, loading, disabled, readonly, success, warning, invalid. Foco ≠ seleção.

Uso correto: um primary e, se houver fronteira com o mundo, um commit.  
Uso incorreto: quatro botões violet; Costura em todo card; pill como botão padrão; erro só com borda vermelha.
