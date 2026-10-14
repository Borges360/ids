# Quick-start — pacote e plugin de harness

Contrato para um agente instalar o INTEIRO numa aplicação e gravar o plugin do harness. Leia este arquivo inteiro antes de editar. A CLI que executa os passos é a deste monorepo (`packages/cli/src/cli.ts`). Não invente um plugin universal e não publique no npm nem em marketplace.

Escrever arquivos na aplicação pode ocorrer a qualquer momento. `npm publish`, envio a marketplace (Cursor, Claude, Codex, Hermes) e alteração de `packages/cli` só quando a mensagem atual pedir isso com verbo explícito.

## Dados que faltam bloqueiam o trabalho

Pare e peça ao operador se algum destes não estiver na mensagem nem no repositório da aplicação:

| Dado | Uso |
| --- | --- |
| Caminho absoluto da aplicação | `--cwd` de `init` e de `agents install` |
| Harness: `codex`, `claude`, `devin`, `cursor`, `pi`, `hermes` ou `all` | Qual adaptador gravar |
| A aplicação já tem `package.json` | `npm install` dos tarballs |

Node da aplicação e do monorepo: `>= 22.14`. Este repositório usa type stripping. Rode a CLI com `node --experimental-strip-types`.

## Invariantes

- O pacote **não está no npm**. `npm install @inteiro/design-system` sem tarball ou caminho `file:` falha. Não publique para contornar isso.
- A CLI que instala o harness roda **neste monorepo**, com `--cwd` apontando para a aplicação. `repoRoot()` sobe três níveis a partir de `packages/cli/src`. O MCP gerado aponta para `packages/mcp/src/server.ts` desse checkout. CLI instalada em `node_modules` de outro projeto calcula o caminho errado.
- Sempre `--yes --json` na escrita. Sem `--yes`, arquivo que já existe e difere é ignorado (`skipped`).
- Antes de `--yes`, rode `--dry-run`. Se `plugin.json`, `AGENTS.md`, `HERMES.md` ou `mcp.json` já existirem e não forem do INTEIRO, pare e pergunte. Não sobrescreva plugin de outro produto.
- `init` anexa o bloco `<!-- inteiro:start -->` em `AGENTS.md` e não apaga o resto. Se o marcador já existe, não duplica.
- Skills de entrada são 10. Skills por token (`npx inteiro skills generate`) ficam fora do contexto. O agente consulta `inteiro tokens explain` ou o MCP.
- `agents uninstall` só remove `.inteiro/<harness>.installed.json`. Não apaga skills.
- Devin: Playbook e Knowledge da organização vivem na web app. O adaptador só grava markdown no repositório. Não declare o playbook publicado.
- Hermes: o plugin Python de `~/.hermes/plugins/` não é instalado. Não copie nada para o home do usuário.
- Marketplace não entra neste fluxo.

## Forma da entrega

Duas peças, nesta ordem:

1. Pacotes locais na aplicação (`@inteiro/tokens`, `@inteiro/agent-core`, `@inteiro/cli`, `@inteiro/design-system`) e o CSS importado.
2. Arquivos do harness no `--cwd`, gerados por `agents install`.

## Arquivos e comandos, nesta ordem

Substitua `<app>` pelo caminho absoluto da aplicação e `<harness>` pelo id pedido. A raiz dos comandos do monorepo é este repositório (a pasta que contém `packages/cli`).

### 1. Build do monorepo

O `dist` do tokens entra no tarball. Sem este build o CSS `@inteiro/tokens/css` não existe.

```bash
npm install
npm run build
```

### 2. Tarballs

Na raiz do monorepo. Os `.tgz` não vão para o Git (`*.tgz` e `artifacts/` estão no `.gitignore`).

```bash
mkdir -p artifacts
npm pack -w @inteiro/tokens --pack-destination artifacts
npm pack -w @inteiro/agent-core --pack-destination artifacts
npm pack -w @inteiro/cli --pack-destination artifacts
npm pack -w @inteiro/design-system --pack-destination artifacts
```

Nomes: `inteiro-tokens-1.1.0.tgz`, `inteiro-agent-core-1.1.0.tgz`, `inteiro-cli-1.1.0.tgz`, `inteiro-design-system-1.1.0.tgz`.

### 3. Instalar na aplicação

No diretório da aplicação, os quatro tarballs no mesmo `npm install`. A dependência cruzada é `1.1.0`. Um tarball sozinho faz o npm procurar o registro e falhar.

```bash
npm install \
  <monorepo>/artifacts/inteiro-tokens-1.1.0.tgz \
  <monorepo>/artifacts/inteiro-agent-core-1.1.0.tgz \
  <monorepo>/artifacts/inteiro-cli-1.1.0.tgz \
  <monorepo>/artifacts/inteiro-design-system-1.1.0.tgz
```

Se o npm ainda resolver `@inteiro/*` pelo registro, pare. Não publique. Não troque a versão no `package.json` dos pacotes.

CSS da aplicação (o `init` grava o import de tokens em `inteiro.css`; o de componentes entra no ponto de entrada que a aplicação já usa):

```css
@import "@inteiro/tokens/css";
@import "@inteiro/design-system/css/components";
```

```html
<html data-in-theme="dark" data-in-density="focus">
  <button class="in-button in-button--primary">Salvar rascunho</button>
  <button class="in-button in-button--commit">Publicar</button>
</html>
```

Um primary (violeta) por contexto. Commit (laranja) só para publicar, deploy ou aplicar. Texto via `color.text.*`.

### 4. `init` da aplicação

Na raiz do monorepo:

```bash
node --experimental-strip-types packages/cli/src/cli.ts init --dry-run --json --cwd <app>
node --experimental-strip-types packages/cli/src/cli.ts init --yes --json --cwd <app>
```

Grava:

- `<app>/inteiro.css` com `@import "@inteiro/tokens/css";`
- `<app>/AGENTS.md` com o bloco entre `<!-- inteiro:start -->` e `<!-- inteiro:end -->`

`init` detecta `next`, `react`, `vue`, `svelte` ou `html` pelas dependências. Não cria componente de framework.

### 5. Plugin do harness

Na raiz do monorepo. `--cwd` é a aplicação, não este repositório.

```bash
node --experimental-strip-types packages/cli/src/cli.ts agents install <harness> --dry-run --json --cwd <app>
node --experimental-strip-types packages/cli/src/cli.ts agents install <harness> --yes --json --cwd <app>
```

`<harness>` = `all` grava os seis. Cada chamada copia as 10 skills de entrada (`SKILL.md` com frontmatter `name`, `description`, `license: MIT`). Nomes: `inteiro`, `inteiro-interface`, `inteiro-audit`, `inteiro-migrate`, `inteiro-choose-token`, `inteiro-identity`, `inteiro-a11y`, `inteiro-voice`, `inteiro-components`, `inteiro-validate`.

O marcador `.inteiro/<harness>.installed.json` registra `mechanism`, `verified` e `sources`. Não apague.

| Harness | Arquivos no `<app>` |
| --- | --- |
| `codex` | `.agents/skills/<skill>/SKILL.md`, `plugin.json` (schema agent-plugins 1.0.0, `name: inteiro`), `.codex-plugin/plugin.json` (`skills` → `./.agents/skills/`, `mcpServers` → `mcp.json`), `mcp.json` |
| `claude` | `.claude/skills/<skill>/SKILL.md`, `.claude-plugin/plugin.json` (`displayName: INTEIRO`), `.mcp.json` |
| `devin` | `.agents/skills/<skill>/SKILL.md`, `.devin/playbooks/inteiro.md`, `.devin/knowledge/inteiro.md` |
| `cursor` | `.cursor/skills/<skill>/SKILL.md`, `.agents/skills/<skill>/SKILL.md`, `.cursor/rules/inteiro.mdc` (`globs` de css/scss/html/tsx/jsx/vue/svelte, `alwaysApply: false`), `.cursor-plugin/plugin.json`, `plugin.json`, `.cursor/mcp.json` |
| `pi` | `.pi/skills/<skill>/SKILL.md`, `.agents/skills/<skill>/SKILL.md` |
| `hermes` | `.agents/skills/<skill>/SKILL.md`, `HERMES.md`, `.hermes-plugin/plugin.json` |

MCP, quando o harness tem servidor: `stdio`, comando `node`, argumento absoluto `<monorepo>/packages/mcp/src/server.ts`. Codex usa a chave `mcp.json` com `$schema` de agent-plugins. Claude usa `.mcp.json`. Cursor usa `.cursor/mcp.json`. Não troque o comando por um binário que não existe.

O MCP oferece `inteiro_get_visual_review` para consultar a matriz recomendada de rotas, viewports, temas e estados. `inteiro_audit` analisa texto-fonte e não aprova a aparência renderizada; a revisão visual exige capturas e avaliação humana.

`codex` e `cursor` no mesmo `<app>` compartilham `plugin.json` na raiz. Instalar o segundo com `--yes` regrava esse arquivo. Se os dois forem necessários, instale os dois e confira que `name` continua `inteiro`.

Devin: copie `.devin/playbooks/inteiro.md` e `.devin/knowledge/inteiro.md` para a web app se o operador pedir. Sem esse pedido, os arquivos no repositório encerram a tarefa.

### 6. Conferir

Na raiz do monorepo:

```bash
node --experimental-strip-types packages/cli/src/cli.ts agents doctor --json --cwd <app>
node --experimental-strip-types packages/cli/src/cli.ts doctor --json --cwd <app>
node --experimental-strip-types packages/cli/src/cli.ts tokens explain color.identity.primary --json
```

`agents doctor` lista os `installTargets` que existem no `<app>`. `doctor` exige `AGENTS.md` e `.agents/skills`. Claude sozinho não cria `.agents/skills`; o `doctor` marca esse item como ausente. Isso não é falha do plugin Claude.

Na aplicação, o binário instalado responde se os quatro tarballs entraram:

```bash
npx inteiro tokens explain color.identity.primary
```

Código de saída: `0` ok, `2` uso, `3` não encontrado, `4` inválido, `5` IO.

## O que não fazer

- Não criar skill por token dentro da aplicação.
- Não editar `packages/adapter-*` para “completar” a instalação. Esses diretórios são a fonte no monorepo. A instalação na aplicação é a saída de `agents install`.
- Não apontar o MCP para um servidor HTTP. O servidor deste repositório é stdio.
- Não adicionar `hostNetwork`, segredo ou token de API neste fluxo. O MCP não usa credencial.

## Checklist do agente

- [ ] Li este arquivo, `docs/AGENTS.md` e `docs/GETTING_STARTED.md`.
- [ ] Node `>= 22.14`. Build do monorepo rodou antes do `npm pack`.
- [ ] A aplicação instalou os quatro tarballs no mesmo `npm install`. Nada foi para o npm público.
- [ ] `inteiro.css` importa `@inteiro/tokens/css`. O CSS de componentes está no ponto de entrada da aplicação.
- [ ] `init` e `agents install` rodaram da raiz deste monorepo, com `--cwd <app>`, `--dry-run` e depois `--yes --json`.
- [ ] Os arquivos da tabela do harness existem. `.inteiro/<harness>.installed.json` existe.
- [ ] O argumento do MCP é o `server.ts` deste checkout.
- [ ] Arquivo pré-existente que não era INTEIRO não foi sobrescrito sem confirmação.
- [ ] `agents doctor` mostra o harness pedido. `tokens explain color.identity.primary` sai com código 0.
- [ ] Não publiquei marketplace nem copiei plugin para o home do usuário.
