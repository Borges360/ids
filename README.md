# INTEIRO

Identity Design System pessoal, completo e production-ready.

> Inteiro não é não ter partes em conflito. É conseguir fazê-las pertencer ao mesmo sistema.

**Não eliminar a tensão. Dar forma a ela.**

Este repositório transforma o documento de especificação em infraestrutura instalável: tokens DTCG, SDK, CLI, skills para agentes, adaptadores de harness, MCP, demonstração visual e testes.

## Instalação rápida

O pacote **não está publicado no npm**. Use o monorepo local ou um tarball gerado.

```bash
npm install
npm run build
npm test
```

Em um projeto consumidor (a partir do tarball):

```bash
npm install ./artifacts/inteiro-design-system-1.0.0.tgz
npx inteiro init --yes
npx inteiro tokens explain color.identity.primary
```

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

## Identidade em uma linha

| Sinal | Significado |
|---|---|
| Violeta | Estou escolhendo |
| Laranja | Estou tornando real |
| Recursive | A mesma voz, do racional ao humano |
| Costura | Duas verdades no mesmo sistema |
| Calm / Focus | Respirar / operar |

## Pacotes

| Pacote | Função |
|---|---|
| `@inteiro/tokens` | Catálogo DTCG 2025.10, CSS, JSON, TS, Flutter, Swift, Tailwind |
| `@inteiro/design-system` | SDK + CSS de componentes + bin `inteiro` |
| `@inteiro/cli` | CLI completa |
| `@inteiro/agent-core` | API para agentes |
| `@inteiro/mcp` | Servidor MCP stdio |
| `@inteiro/react` | Provider React (Emotion opcional) |
| `@inteiro/skills` | Geração de SKILL.md |
| `@inteiro/adapter-*` | Codex, Claude, Devin, Cursor, Pi, Hermes |
| `@inteiro/integrations` | Tailwind, Vue, Svelte |

## Documentação

Tudo em português brasileiro, com identificadores de API em inglês.

- [Quick-start para agentes](docs/QUICKSTART.md)
- [Documentação visual](apps/demo/index.html) — `npm run demo`
- [Começar](docs/GETTING_STARTED.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Tokens](docs/TOKENS.md)
- [CLI](docs/CLI.md)
- [Agentes](docs/AGENTS.md)
- [Skills](docs/SKILLS.md)
- [Marca](docs/BRAND.md)
- [Voz](docs/VOICE_AND_TONE.md)
- [Acessibilidade](docs/ACCESSIBILITY.md)
- [Componentes](docs/COMPONENTS.md)
- [Temas](docs/THEMING.md)
- [Integrações](docs/INTEGRATIONS.md)
- [Publicação](docs/PUBLISHING.md)
- [Validação](docs/VALIDATION_REPORT.md)
- [Rastreabilidade](docs/SOURCE_TRACEABILITY.md)

## Demonstração

```bash
npm run demo
```

Abre `http://127.0.0.1:4173/` — light/dark, calm/focus, botões, formulário, dashboard, Costura, tipografia e estados.

## Gitflow

- `main` — linha estável. Recebe somente `release` e `hotfix`.
- `develop` — integração. A esteira `ids-dev` usa esta branch.
- `feature/*` sai de `develop` e volta para `develop`.
- `release/*` sai de `develop` e entra em `main` e em `develop`.
- `hotfix/*` sai de `main` e entra em `main` e em `develop`.

## Princípio de token

Não criar um token porque existe uma propriedade CSS. Criar um token porque existe uma decisão que merece ser lembrada.
