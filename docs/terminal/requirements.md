# Rastreabilidade RFC-TERM-001

As seis frentes são implementadas em contrato/documentação, núcleo, componentes, integrações, padrões de dados e infraestrutura de qualificação. A frente 6 só encerra depois dos ensaios reais e revisões pendentes. Não interpretar a presença de um schema ou teste como prova de qualificação de plataforma.

| Critério | Implementação | Verificação |
|---|---|---|
| TERM-01 | SettingsSession, PanelController; abertura sem IO | teste de apresentação síncrona + pilotos |
| TERM-02 | Navigation, begin/abandonEdit e dispatch | foco/filtro/offset restaurados, callbacks não chamados |
| TERM-03 | confirmEdit, validate, save; Persist do consumidor | rascunho isolado, editor atual salvo, painel aberto |
| TERM-04 | save com erro, back/decide e decisão segura | falha mantém dados, descartar/save-close explícitos |
| TERM-05 | Projeções de foco, seleção, erros e status | snapshots sem cor e ensaio PTY com NO_COLOR |
| TERM-06 | resolveBindings/keyAction/KeyHints e piBindings | remap, reservas, paste e salvar por ação visível |
| TERM-07 | Operation, cancel, timeout, reconcile e dispose | duplicidade, desconhecido, timeout e resultado atrasado |
| TERM-08 | TerminalPanel, SettingsList, ResultList e WorkspaceModel | 40×12/80×24/120×36 + resize em PTY |
| TERM-09 | safeText, Intl.Segmenter, medida injetável (`visibleWidth` no Pi, tabela UAX #11 sem dependência), wrap/truncate | acentos, combinantes, CJK, emoji, OSC/CSI/DCS/C1 |
| TERM-10 | detectCapabilities, requireInput e piloto standalone | CI/sem TTY/sem entrada/JSON; import isolado |
| TERM-11 | dispose/sinais; host controla processo, Inquirer controla raw | teste Pi Input real + Ctrl+C/raw em ConPTY; host real separado |
| TERM-12 | runLinear, HelpView, decisões numeradas | transcript teclado/EOF; leitor de tela real ainda exige revisão |

Outras exigências: 23 componentes públicos cobrem as 18 famílias da proposta; quatro schemas (`terminal-component`, `terminal-action`, `terminal-capabilities`, `terminal-evidence`); catálogo agente/MCP/recipe com namespace; contexto Terminal; sem novas cores; versão 1.3.0 e migração optativa; preservação dos protocolos existentes; nenhum checkpoint ignora pendências de acessibilidade, revisão ou deploy.

Comandos e resultados executados estão em `qualification.json` e `artifacts/terminal/`. Artefatos de execução não são baselines aprovadas. Matriz Windows Terminal GUI, Linux/WSL, SSH/tmux quando pertinente, claro/escuro, leitor de tela e RTL têm estados próprios. Plataformas não ensaiadas não recebem status passed por inferência.
