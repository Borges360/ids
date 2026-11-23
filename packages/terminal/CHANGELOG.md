# Changelog — @inteiro/terminal

## 1.4.0

Minor retrocompatível: opções novas com padrões que preservam a saída 1.3 (`presentation: "legacy"`, `pt-BR`). O adaptador Pi (`openPiSettings`, `openPiWorkspace`, `piBindings`) muda os padrões onde indicado.

### Added
- `i18n.ts`: catálogos `en` e `pt-BR` completos (`MESSAGES`), `resolveMessages(locale, overrides)` e `normalizeLocale`. Override vazio, de tipo errado ou função que devolve texto vazio cai no catálogo; locale desconhecido cai em inglês. `locale`/`messages` em `SettingsSession`, `Operation`, `PanelController`, `WorkspaceModel`, `resolveBindings` e `piBindings`; componentes aceitam `messages` opcional.
- `keyLabel(key)`: rótulos legíveis (`↑`, `↓`, `Enter`, `Esc`, `Ctrl+S`, `PgUp`, `PgDn`, `Space`). `standardKeyHints` e `resolveBindingsLenient`.
- `PanelControllerOptions`: `presentation`, `discardOnSecondEscape`, `actions` (linhas de ação), `formatError`, `saveTimeoutMs`, `cancellableSave`, `cancelGraceMs`, `reconcile`, `onDraftChange`, `narrow`; métodos `setLocale`, `relabel`, `reconcileStorage`; propriedades `busy`, `activeOperation`, `closedWith`.
- `PanelAction`: `id`, `label`, `description`, `effect`, `timeoutMs`, `hint`, `confirm`, `disabled`, `requiresSaved`, `closeWith`, `run(draft, signal, report)` com mensagem final e `reconcile` para resultado externo desconhecido. Cada ação tem sua própria `Operation`.
- `Field`: `format`, `locked`, `loadChoices(signal)` e `loadTimeoutMs`. `SettingsSession`: `setLocale`, `relabelFields`, `choicesOf`, `setChoices`, `cancelSave`, `configure`, `setStatus`/`statusKind`, `outcomeUnknown`, `locale`.
- `errors.ts`: `FormatError`, `ErrorContext`, `isCancellation`, `formatProductError`.
- `View.kinds` (papel semântico por linha) e `ListRows`, `fieldRow`, `displayValue`, `pad`.
- `text.ts`: `setCellWidthMeasure`, `getCellWidthMeasure`, `fallbackCellWidth` (tabela UAX #11 sem dependência).
- `WorkspaceModel`: `title`, `scope`, `help`, `hints`, `locale`, `messages`, `narrow`, `setLocale`. `openPiWorkspace` aceita `PiWorkspaceOptions`.
- `openPiSettings`: `overlay` (largura/altura), `action`/`actionValue` no resultado. `PiTheme.bold` opcional.
- `scripts/vendor-terminal.mjs` (`npm run vendor:terminal`): cópia do fecho de `pi.ts` em `ts` ou `js`, `VENDOR.json`, `LICENSE`, `verify-vendor.mjs` e `--check`.

### Changed
- `text.ts` não importa mais `string-width`; a dependência saiu do pacote. A largura padrão vem de `fallbackCellWidth` (mesmos resultados nos casos cobertos: acentos, combinantes, CJK, ZWJ, bandeiras, keycaps).
- `pi.ts` injeta `visibleWidth` do pi-tui na medida e corta qualquer linha acima da largura pedida (o pi-tui 1.6 encerra a TUI nesse caso). Cor por papel de linha (`theme.fg`/`theme.bold`), sem depender do prefixo `Erro:`.
- `openPiSettings` passa a usar por padrão `presentation: "standard"`, `discardOnSecondEscape: true`, `cancellableSave: true` e `narrow: "resize"`. Passe as opções para manter o comportamento 1.3.
- `piBindings` mostra rótulos legíveis e não impede a abertura do painel quando um remapeamento do host colide com um padrão (a tecla do host vence).
- `Operation`: trabalho local que rejeita depois do abort conta como cancelado; `code: "CANCELLED"` e `OperationCancelled` (também por `name`, entre cópias) confirmam cancelamento em efeito externo. `AbortError` em efeito externo continua `outcomeUnknown`.
- Campo de texto em edição: o cursor começa no fim do valor e a linha digitada fica visível mesmo com rótulo quebrado.
- `SEMANTIC_ROLES` mudou para `roles.ts` (ainda exportado pela raiz), fora do fecho do adaptador Pi.

### Migration
- Nenhuma ação obrigatória para quem usa a raiz. Quem dependia do layout 1.3 do adaptador Pi passa `presentation: "legacy"`, `discardOnSecondEscape: false` e `cancellableSave: false` a `openPiSettings`.
