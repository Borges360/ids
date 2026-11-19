# Changelog

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
