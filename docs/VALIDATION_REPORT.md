# Relatório de validação

## Release 1.1.1 — 2026-10-13

MCP: `inteiro_get_visual_review` aceita `routes[]` e retorna a cobertura rota/shell em 320, 390, 768, 1280 e 1440 CSS px conforme aplicável, além de temas e estados. O plano não captura nem julga pixels renderizados. `inteiro_audit` sinaliza riscos contextuais em `overflow-wrap:anywhere`, `white-space:nowrap` e `overflow:hidden`; a revisão humana decide se há defeito na interface. Testes de regressão cobrem o plano, a validação de rotas e os avisos.

Jenkins `ids-dev`, build **#6**, concluiu com sucesso a partir de `release/1.1.1` (`54dda372`). O estágio de checkout, testes e imagem passou; o deploy no namespace dev concluiu e o health check retornou HTTP 200. O cabeçalho e os metadados da página em `http://ids.lab/` mostram `1.1.1`. Os valores do catálogo de tokens permanecem em `1.0.0`; não houve publicação no npm público.

## Release 1.1.0 — 2026-10-13

Ambiente: Windows, Node v24.14.0, npm 11.9.0.

`npm run ci` passou: typecheck, validação de 316 tokens (0 erros, 0 avisos, 0 falhas de contraste), 35 testes, 3 testes de contraste, build de todos os workspaces e checagem de empacotamento.

Smoke test do MCP stdio: inicialização anuncia `1.1.0`; `tools/list` expõe 10 ferramentas; `inteiro_get_visual_review` retorna a matriz de cinco viewports e exige revisão humana; `inteiro://guides/visual-review` responde como `application/json`; ferramenta desconhecida retorna `isError: true`.

Tarballs locais verificados: `inteiro-tokens-1.1.0.tgz`, `inteiro-agent-core-1.1.0.tgz`, `inteiro-cli-1.1.0.tgz` e `inteiro-design-system-1.1.0.tgz`. Os quatro instalaram juntos em um projeto temporário sem consultar o registro público.

Deploy: Jenkins `ids-dev` build **#5** concluiu com sucesso a partir de `develop` (`489974a`), incluindo testes, imagem e publicação no namespace dev. A conferência em `http://ids.lab/` confirmou o cabeçalho e os metadados `1.1.0`, além da descrição atualizada das ferramentas MCP.

Limites: não foi criada uma suíte automática de regressão de screenshots nem declarada aprovação visual de uma aplicação. O protocolo MCP define evidência e revisão humana para esse trabalho. `npm audit` apontou três avisos no runner de testes (Vitest/tinypool): dois críticos e um moderado; não fazem parte das dependências de runtime e a correção indicada exige Vitest 5, uma atualização major separada.

Data: 2026-10-10. Ambiente: Windows, Node v24.14.0, npm 11.9.0.

## Testes automatizados

```
npx vitest run
Test Files  6 passed (6)
Tests       28 passed (28)
```

Arquivos:

- `tests/catalog.test.ts` — 7 testes (integridade, DTCG, aliases, primitivos)
- `tests/contrast/contrast.test.ts` — 3 testes (AA, botões, fails)
- `tests/exports.test.ts` — 4 testes (CSS/JSON/TS)
- `tests/skills.test.ts` — 3 testes (1:1 token↔skill, frontmatter, skills de nível)
- `tests/cli/cli.test.ts` — 7 testes (help, list/explain, validate, export, init idempotente, agents dry-run, install/uninstall cursor)
- `tests/agent-core.test.ts` — 4 testes (explain, suggest, microcopy, recipes)

Falhos: **0**.

## Typecheck e catálogo

```
npx tsc --noEmit -p tsconfig.json   → exit 0
npm run validate                    → 0 errors, 0 warnings, 0 contrastFails
```

316 tokens. 254 source, 62 derived. Temas contrast-* são extensão de **valores** (não criam ids novos).

## Contraste medido (WCAG 2.2, relativo sRGB)

| Par | Dark | Light | Mín. | Status |
|---|---:|---:|---:|---|
| text.primary / canvas | 17.21 | 16.81 | 4.5 | AA |
| text.secondary / canvas | 9.61 | 6.48 | 4.5 | AA |
| identity.primary / canvas | 7.13 | 5.01 | 4.5 | AA |
| button.primary | 6.72 | 5.45 | 4.5 | AA |
| button.commit | 8.94 | 5.32 | 4.5 | AA |

O documento citava 6.89:1 no botão violet dark; o valor medido é **6.72:1** (ainda AA). Diferença registrada, sem alterar o hex da fonte.

Status colors sobre canvas usam mínimo gráfico 3:1 e exigem ícone+texto. Ver `packages/tokens/dist/json/contrast.json`.

## Empacotamento

```
npm pack --dry-run -w @inteiro/tokens
npm pack --dry-run -w @inteiro/cli
npm pack --dry-run -w @inteiro/design-system
```

Tarballs reais em `artifacts/`:

- `artifacts/inteiro-tokens-1.0.0.tgz`
- `artifacts/inteiro-cli-1.0.0.tgz`
- `artifacts/inteiro-design-system-1.0.0.tgz`

Instalação local do tarball de tokens (projeto temporário):

```
npm install artifacts/inteiro-tokens-1.0.0.tgz
node --input-type=module -e "import { catalogStats } from '@inteiro/tokens/runtime'"
→ runtime 316
import '@inteiro/tokens/json' → 316 chaves em dark
```

Nota: Node 24 **não** faz type-stripping dentro de `node_modules`. O entry de consumo do tarball é `@inteiro/tokens/runtime` (JS) e os subpaths `./css` e `./json`. No monorepo, `@inteiro/tokens` aponta para o TypeScript fonte.

## CLI executada

- `inteiro doctor --json` — catálogo válido; AGENTS.md ausente na raiz do DS (esperado)
- `inteiro tokens list --layer primitive --json` — 134 primitivos
- `inteiro agents list --json` — 6 harnesses
- `inteiro skills list --json` — 10 canônicas, 316 geradas
- `inteiro skills generate` — 326 SKILL.md
- testes de `init`, `agents install cursor`, `uninstall` em diretórios temporários

## Demonstração

`npm run demo` → `http://127.0.0.1:4173/`

Verificado no browser: página carrega, botões primary/commit, formulário com erro textual, dashboard, Costura no card de reflexão. Tema light aplicado (`--in-color-background-canvas: #f7f5f1`, fundo `rgb(247, 245, 241)`). Toggle de densidade `calm`/`focus` presente.

## Harnesses

| Harness | Implementação | Verificação |
|---|---|---|
| Codex | plugin.json Agent Plugins 1.0.0, `.codex-plugin`, skills, MCP | parcialmente testada (arquivos + install simulado) |
| Claude Code | `.claude-plugin/plugin.json`, skills, `.mcp.json` | parcialmente testada |
| Devin | skills + playbook/knowledge markdown | não verificada no app Devin |
| Cursor | rules `.mdc`, skills, `.cursor-plugin`, MCP | parcialmente testada (install/uninstall em tmp) |
| Pi | `.pi/skills`, `.agents/skills` | parcialmente testada |
| Hermes | HERMES.md, Agent Plugin, MCP | não verificada no binário Hermes |

Nenhum harness foi declarado “testado” no produto nativo (Codex CLI, `claude plugin validate`, Devin web, Cursor marketplace, Pi runtime, Hermes). Os adaptadores seguem a documentação oficial consultada em 2026-10-10.

## Skills e docs gerados

- 326 skills em `packages/skills/generated` (10 canônicas + 316 tokens)
- 316 páginas em `docs/tokens/generated`

## Limitações conhecidas

1. Pacotes não publicados no npm/marketplaces (autorização não concedida).
2. CLI tarball depende de workspaces `@inteiro/tokens` e `@inteiro/agent-core`; uso recomendado: monorepo ou `node packages/cli/src/cli.ts`.
3. Playbooks Devin e plugin Python Hermes exigem passo manual na UI/home do harness.
4. Recursive na demo vem do Google Fonts (rede). Self-host OFL não está empacotado.
5. `@inteiro/react` é source-only; Emotion é peer opcional.
6. Não há adaptador Android Compose; Flutter e Swift cobrem a plataforma não-web.
7. `color.accent` existe apenas como exemplo `$deprecated`.
8. ZIP do monorepo em `artifacts/inteiro-monorepo-1.0.0.zip` não inclui `node_modules`.
