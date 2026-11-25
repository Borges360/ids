# Changelog

## Unreleased

### Added
- `@inteiro/pi-theme`: temas `inteiro-dark`, `inteiro-light`, `inteiro-contrast-dark` e `inteiro-contrast-light` para o Pi, gerados dos tokens por `npm run generate:pi-theme`. Violeta em `accent`, laranja só em `bashMode` e `thinkingMax`, `color.selection.background` em `selectedBg`. O teste confere o arquivo gerado, os papéis do Pi 1.6 e contraste de 4,5:1.
- Temas do Pi revistos papel por papel, com o tema Dracula para Pi como referência de componentes (não de visual):
  - links em violeta, como no IDS web;
  - sintaxe com a paleta categórica (`dataviz.categorical` 01, 03, 04, 06 e 07), sem a 02, porque laranja é efeito real;
  - código inline em azul categórico e bloco de código em texto primário;
  - caixas de mensagem e de ferramenta afastadas do canvas (`raised`/`surface` no escuro, `sunken` no claro);
  - escada de raciocínio do neutro ao laranja.

  A tabela de papéis em `scripts/generate-pi-theme.mjs` gera também a especificação (`docs/terminal/pi-theme.md`) e uma prévia SVG por tema (`packages/pi-theme/preview/`). Os testes cobrem 4,5:1 para todo texto sobre o canvas e sobre a própria caixa, 3:1 para `border`, e as regras de violeta, laranja e sintaxe.
- Instalação automática dos temas: `registerInteiroPiThemes(pi)` (em `@inteiro/terminal/pi`) grava os temas em `<agent-dir>/themes/` e os lista no `resources_discover` da sessão. Várias extensões não geram colisão; temas editados pelo usuário não são sobrescritos; `PI_DESIGN_THEMES=off` desliga. O fecho copiado por `vendor:terminal` passa a aceitar módulos `node:`.
- Página **Terminal → Tema do Pi** na documentação web (pt-BR e inglês), gerada da mesma tabela de papéis. Traz as prévias dos 4 temas, as regras, todos os papéis por componente com token e regra, a instalação e a escolha do tema, e o fundo do terminal.
- Página Terminal: quadro "Perfil Pi" com a saída real de `openPiSettings`.

### Fixed
- Adaptador Pi do `@inteiro/terminal`: o item com foco ganha o fundo `selectedBg` na largura toda, além de `>` e `accent`, como manda a regra de foco. A barra de ações pinta cada botão pelo papel: salvar e tarefas com efeito externo em `bashMode` e negrito, as demais em `accent`, e o botão com foco com `selectedBg`. Antes a barra saía sem cor e o foco dependia só da cor do texto.
- Perfil `standard`: a linha `[Buscar itens]` deixa de aparecer vazia no topo da lista; agora só aparece com filtro ativo, como texto secundário. A saída `legacy` não muda.

## 2.0.0-rc.1

Release candidate: todos os pacotes numa única versão (`2.0.0-rc.1`). O visual mais suave da 2.0.0 ainda é proposta e não está nesta versão.

### Added
- Documentação versionada: cópias congeladas das versões 1.1.0, 1.1.1, 1.3.1 e 1.3.2 em `docs-archive/<versão>/`, servidas em `/v/<versão>/`, lista em `/versions.json` e seletor de versão no menu da página. `scripts/archive-docs-version.mjs <ref> <versão>` gera a cópia a partir de um `release/x.y.z`; as páginas arquivadas mostram uma faixa de aviso. Novas seções "Versões da documentação" e changelog atualizado até 1.3.2.
- `@inteiro/terminal` (antes 1.4.0, agora na versão única `2.0.0-rc.1`; detalhes em `packages/terminal/CHANGELOG.md`): mensagens `en`/`pt-BR` com override parcial, apresentação `standard`, Esc duplo para descartar, linhas de ação com operação cancelável, `formatError`, salvamento cancelável e reconciliação, escolhas sob demanda, prévia do rascunho, workspace parametrizável e `npm run vendor:terminal` para copiar o adaptador Pi em extensões com `VENDOR.json` e verificador autônomo.
- Servidor MCP por HTTP (`packages/mcp/src/http.ts`, streamable-http sem sessão): `POST /mcp` com JSON-RPC e `GET /health` com a versão. Roda na mesma imagem do site, em `/app/inteiro-mcp`, de modo que a versão do MCP é sempre a do container. O modo `stdio` do pacote continua igual.
- `scripts/build-mcp-runtime.mjs` empacota o servidor numa pasta autossuficiente, e `npm run test:mcp-runtime` roda esse pacote isolado do monorepo (entra no `npm run ci`).

### Fixed
- `@inteiro/cli` declara `@inteiro/visual`, que importa em `gates.ts`. Sem a declaração, quem instalava os tarballs sem `@inteiro/visual` via `inteiro doctor` falhar com `ERR_MODULE_NOT_FOUND`. O teste `tests/package-dependencies.test.ts` passa a recusar import de `@inteiro/*` não declarado em qualquer pacote.

### Changed
- `@inteiro/terminal` deixa de depender de `string-width`: a largura vem de uma tabela UAX #11 própria ou da medida injetada pelo renderer (`visibleWidth` no adaptador Pi). `openPiSettings` passa a usar o perfil Pi por padrão; a saída da raiz em `pt-BR` não muda.
- O tratamento das mensagens do MCP foi movido para `packages/mcp/src/rpc.ts`, compartilhado por `stdio` e HTTP, sem mudança de comportamento.

## 1.3.2

### Changed
- Documentação do Terminal reorganizada: o grupo sai do topo do menu e passa a vir depois de Patterns, com cinco páginas (Visão geral, Fundamentos, Componentes, Padrões e Qualificação), em português e inglês.
- Os 23 componentes mostram a saída real das projeções de `@inteiro/terminal` em quadros de terminal, pintados com os papéis de cor do IDS e acompanhando o tema da documentação. As páginas são geradas por `scripts/terminal-docs.mjs`.
- Release train dos pacotes em 1.3.2; catálogo semântico e valores de tokens preservados.

### Added
- Fundamentos visuais do Terminal: papéis de cor ligados aos tokens, a mesma saída com e sem cor, marcadores, texto em células e comportamento por largura.
- Padrões do Terminal: configurar e salvar, confirmar uma ação destrutiva, acompanhar uma tarefa longa, explorar lista e detalhe, e estados vazio e de erro.

### Migration
- O endereço `#/components/terminal` passa a redirecionar para `#/terminal/components`.

## 1.3.1

### Fixed
- A imagem da demo volta a compilar no Jenkins (`ids-dev`): `node-pty`, que exige Python e g++ para compilar, deixa de ser dependência.

### Removed
- Testes de fumaça `smoke:terminal` e `smoke:terminal:pi` (e a dependência de desenvolvimento `node-pty`). O ensaio POSIX (`smoke:terminal:posix`) e `test:terminal` permanecem; a evidência anterior em `artifacts/terminal/` é histórica.

### Changed
- Release train dos pacotes em 1.3.1; catálogo semântico e valores de tokens preservados.

## 1.3.0 — implementação em qualificação

### Added
- INTEIRO Terminal 1.0.0: 23 componentes em 18 famílias, contratos de teclado/foco, cinco regiões de painel e alternativas em células/linear.
- `@inteiro/terminal`: núcleo sem IO/renderer, rascunho/persistência/override separados, validação, descarte explícito, operações canceláveis com timeout e resultado desconhecido.
- Entradas optativas `/pi`, `/prompts` e `/linear`, dois pilotos com tarefa compartilhada, workspace de lista/detalhe, tabela ordenável e logs limitados/exportáveis.
- Schemas Terminal de componente, ação, capacidades e evidências; catálogo consultável por agentes, MCP `inteiro_get_terminal_component` e `recipe terminal.*`.
- Contexto reconhece superfície Terminal; testes de estado, teclado, Unicode/sanitização, automação e ensaio PTY 40/80/120 colunas. Qualificação real e pendências em `docs/terminal/qualification.json`.

### Changed
- Release train dos pacotes em 1.3.0; catálogo semântico e valores de tokens preservados. Metadados de documentos gerados acompanham os pacotes.
- Distribuição offline inclui Terminal para preservar o carregamento do agent-core. Nenhum consumidor Pi ou padrão do harness é migrado implicitamente.

### Qualification
- Sem aprovação automática de baseline. Disponibilidade do código não implica revisão com leitor de tela, aprovação visual, CI remoto ou deploy concluído.

## 1.1.1

### Added
- MCP `inteiro_get_visual_review` aceita um inventário de rotas e gera uma matriz concreta de viewports, temas e estados sem multiplicar todas as dimensões.
- O plano MCP entrega totais de cobertura e deixa explícito que não captura nem interpreta a interface renderizada.
- `inteiro_audit` sinaliza riscos de `overflow-wrap:anywhere`, `white-space:nowrap` e `overflow:hidden` para revisão em capturas.
- Protocolo visual agora inclui registro reproduzível de defeitos, ação corretiva, validação, reversão e decisão de saída.

### Changed
- Critérios de revisão reforçam quebras naturais de texto, consistência de escala e alinhamento, clipping, navegação estreita e controles em 320px.
- Pacotes e dependências internas atualizados para `1.1.1`; valores do catálogo de tokens seguem em `1.0.0`.

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
# 1.2.0 — 2026-10-18

## Added
- Biblioteca React com formulários, navegação, overlays, feedback, dados e templates; contrato consultável no MCP.
- Fonte JSON única; 22 tokens de extensão; exportação Figma/Tokens Studio e plugin local de variáveis.
- Storybook, axe, testes de teclado/navegador, orçamento de bundle, CI e Jenkinsfile.
- Guias de biblioteca, governança, implantação e rastreabilidade das recomendações.

## Fixed
- Tema automático passa a aplicar todos os valores light, inclusive em providers aninhados.
- Pacote React incluído em typecheck e distribuído como ESM com declarações.

## Migration
- Catálogo de tokens 1.1.0: editar `source/catalog.json`; exports anteriores preservados. Pacotes IDS 1.2.0.
- React exige build antes de consumir pelo workspace ou tarball. Consulte `docs/LIBRARY.md`.
