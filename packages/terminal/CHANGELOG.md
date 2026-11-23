# Changelog — @inteiro/terminal

## 1.4.0

Minor retrocompatível: opções novas com padrões que preservam a saída 1.3 (`presentation: "legacy"`, `pt-BR`). O adaptador Pi (`openPiSettings`, `openPiWorkspace`, `piBindings`) muda os padrões onde indicado.

### Added
- `i18n.ts`: catálogos `en` e `pt-BR` completos (`MESSAGES`), `resolveMessages(locale, overrides)` e `normalizeLocale`. Override vazio, de tipo errado ou função que devolve texto vazio cai no catálogo; locale desconhecido cai em inglês. `locale`/`messages` em `SettingsSession`, `Operation`, `PanelController`, `WorkspaceModel`, `resolveBindings` e `piBindings`; componentes aceitam `messages` opcional.
- `keyLabel(key)`: rótulos legíveis (`↑`, `↓`, `Enter`, `Esc`, `Ctrl+S`, `PgUp`, `PgDn`, `Space`). `standardKeyHints` e `resolveBindingsLenient`.
- `PanelControllerOptions`: `presentation`, `discardOnSecondEscape`, `actions` (linhas de ação), `formatError`, `saveTimeoutMs`, `cancellableSave`, `cancelGraceMs`, `reconcile`, `onDraftChange`, `narrow`; métodos `setLocale`, `relabel`, `reconcileStorage`; propriedades `busy`, `activeOperation`, `closedWith`.
- `PanelAction`: `id`, `label`, `description`, `effect`, `timeoutMs`, `hint`, `confirm`, `disabled`, `requiresSaved`, `closeWith`, `run(draft, signal, report)` com mensagem final e `reconcile` para resultado externo desconhecido. Cada ação tem sua própria `Operation`.
- `Field`: `format`, `locked`, `loadChoices(signal)` e `loadTimeoutMs`. `SettingsSession`: `setLocale`, `relabelFields`, `choicesOf`, `setChoices`, `cancelSave`, `configure`, `setStatus`/`statusKind`, `outcomeUnknown`, `allowSaveRetry`, `hasLocale`, `locale`.
- `Operation.cancelRequested` (o último sucesso chegou depois de Esc ou do timeout) e `RunOptions.label` (rótulo inicial do progresso).
- `wrap(value, columns, mode)` com `mode: "word"`, e `PanelOptions.wrap`/`PanelOptions.draft`. O perfil `standard` quebra linhas nos espaços.
- `errors.ts`: `FormatError`, `ErrorContext`, `isCancellation`, `formatProductError`.
- `View.kinds` (papel semântico por linha) e `ListRows`, `fieldRow`, `displayValue`, `pad`.
- `text.ts`: `setCellWidthMeasure`, `getCellWidthMeasure`, `fallbackCellWidth` (tabela UAX #11 sem dependência).
- `WorkspaceModel`: `title`, `scope`, `help`, `hints`, `locale`, `messages`, `narrow`, `narrowChosen`, `hasLocale`, `setLocale`. `openPiWorkspace` aceita `PiWorkspaceOptions` (inclusive `narrow`).
- `openPiSettings`: `overlay` (largura/altura), `action`/`actionValue` no resultado. `PiTheme.bold` opcional.
- `scripts/vendor-terminal.mjs` (`npm run vendor:terminal`): cópia do fecho de `pi.ts` em `ts` ou `js`, `VENDOR.json`, `LICENSE`, `verify-vendor.mjs` e `--check`.

### Changed
- `text.ts` não importa mais `string-width`; a dependência saiu do pacote. A largura padrão (raiz, fora do Pi) vem de `fallbackCellWidth`. Os fixtures e transcripts gerados não mudaram, mas a medida difere da `string-width` 7.2.0 em centenas de code points. Os layouts da raiz (componentes, `prompts`, `linear`) mudam quando um rótulo os contém:
  - emoji em apresentação de texto (`©`, `®`, `™`, `‼`, `ℹ`, setas como `↔`) ocupam 1 coluna (eram 2);
  - caracteres de formato prefixados (U+0600–U+0605) e U+2028/U+2029 ocupam 0;
  - preenchedores Hangul (U+115F, U+3164, U+FFA0) e jamo medial/final isolado (U+1160–U+11FF) ocupam 0;
  - U+20E3 só forma keycap de 2 colunas após `[0-9#*]`.
  Um corpus fixo em `tests/terminal/terminal-pi.test.ts` registra esses valores. No Pi vale o `visibleWidth` do pi-tui, que também diverge do fallback (por exemplo, trigramas U+2630–U+2637).
- `pi.ts` injeta `visibleWidth` do pi-tui na medida e corta qualquer linha acima da largura pedida (o pi-tui 1.6 encerra a TUI nesse caso). Cor por papel de linha (`theme.fg`/`theme.bold`), sem depender do prefixo `Erro:`.
- `openPiSettings` passa a usar por padrão `presentation: "standard"`, `discardOnSecondEscape: true`, `cancellableSave: true`, `narrow: "resize"` e inglês (`locale: "en"`) quando nem a opção nem a sessão escolhem idioma. Passe as opções para manter o comportamento 1.3.
- `openPiWorkspace` passa a usar inglês quando nem a opção nem o modelo escolhem idioma, e `narrow: "resize"` (abaixo de 40×12 mostra a mensagem de redimensionar, sem citar rascunho) salvo quando `narrow` foi dado ao `WorkspaceModel` ou em `PiWorkspaceOptions`. Na 1.3.2 o workspace desenhava o conteúdo em qualquer largura.
- Esc durante uma ação ou um `loadChoices`: se o trabalho ignora o signal e ainda entrega um valor, o painel não usa esse valor. Uma ação `closeWith` não fecha nem devolve `action`/`actionValue`, e opções tardias não abrem o submenu. `Operation.run` continua devolvendo `succeeded` (contrato 1.3) e marca `cancelRequested`.
- Salvamento não confirmado sem `reconcile`: Ctrl+S e "Salvar e fechar" pedem confirmação explícita ([Voltar]/[Salvar de novo]) em vez de recusar para sempre.
- Esc num campo descarta também o erro de validação daquele campo. "Alterações salvas." some quando o rascunho muda de novo.
- O carregamento de opções mostra "Carregando opções de X" na linha de progresso.
- `piBindings` mostra rótulos legíveis e não impede a abertura do painel quando um remapeamento do host colide com um padrão (a tecla do host vence).
- `Operation`: trabalho local que rejeita depois do abort conta como cancelado; `code: "CANCELLED"` e `OperationCancelled` (também por `name`, entre cópias) confirmam cancelamento em efeito externo. `AbortError` em efeito externo continua `outcomeUnknown`.
- Campo de texto em edição: o cursor começa no fim do valor e a linha digitada fica visível mesmo com rótulo quebrado.
- `SEMANTIC_ROLES` mudou para `roles.ts` (ainda exportado pela raiz), fora do fecho do adaptador Pi.
- Modo de ajuda (`?`/F1): a descrição do campo focado aparece uma vez, no corpo; o rodapé não a repete.

### Migration
- Nenhuma ação obrigatória para quem usa a raiz. Quem dependia do layout 1.3 do adaptador Pi passa `presentation: "legacy"`, `discardOnSecondEscape: false`, `cancellableSave: false` e `locale: "pt-BR"` a `openPiSettings`. No workspace, passa `narrow: "linear"` e `locale: "pt-BR"` a `openPiWorkspace` (ou ao `WorkspaceModel`).
- Com `cancellableSave`, um `persist` que ignora o AbortSignal além de `cancelGraceMs` deixa o resultado desconhecido. Respeite o signal ou passe `reconcile` (leitura atual do armazenamento).
