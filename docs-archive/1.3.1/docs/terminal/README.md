# INTEIRO Terminal

IDS **1.3.0** acrescenta a superfície Terminal com contrato **1.0.0**. A adoção é optativa e independente do renderer. Trata de componentes e interação de ferramentas e extensões; não cria um novo CLI para operar o design system.

Estado: implementação em qualificação. Consulte [a matriz de requisitos](requirements.md) e [a evidência](qualification.json). Código, testes de estado, ensaio em terminal e revisão com leitor de tela são provas diferentes. Pendência não conta como aprovação.

## Entrada

```ts
import { SettingsSession, PanelController, resolveBindings } from '@inteiro/terminal';
// O núcleo não carrega Pi, Inquirer, React, streams ou filesystem.
import { openPiSettings } from '@inteiro/terminal/pi'; // peer Pi opcional
import { runPrompts } from '@inteiro/terminal/prompts'; // peer Inquirer opcional
import { runLinear } from '@inteiro/terminal/linear'; // Node readline, append-only
```

Pacotes são consumidos pelo workspace ou pela distribuição local; não se presume publicação npm. Núcleo exige Node 22.14+. Inquirer de referência: 7.10.1 (Node ≥18). Adaptador Pi de referência: pi-tui 1.5.2 (Node ≥22.19), requisito isolado na integração opcional; o IDS não eleva sua engine global. O núcleo usa `string-width` 7.2.0 e `Intl.Segmenter` para a política de largura; variações de fonte/terminal devem ser qualificadas.

## Formatos e posse da tela

| Necessidade | Formato |
|---|---|
| Informação, ajuda, diagnóstico, logs, resultado | Saída linear, preservada no histórico |
| Escolha curta | Prompt no fluxo com resumo final |
| Vários valores relacionados | Painel com contexto, estado, conteúdo, feedback e ações |
| Exploração persistente de lista/detalhe, tabela e logs | Workspace deliberado; `WorkspaceModel` define foco, ações, ordenação e rolagem |
| Extensão dentro de host | APIs, tema, teclado e lifecycle do host |

Não abrir outra janela do sistema por padrão. Buffer alternativo é responsabilidade do renderer de workspace e requer entrada deliberada e restauração do buffer anterior em saídas controláveis. A referência Pi usa overlay temporário nativo: nunca cria buffer próprio, substitui editor/footer global ou escreve nos streams do host. O núcleo não implementa um renderer ANSI concorrente.

## Interação normativa

Menus agrupam tarefas do usuário e têm IDs estáveis. A linha distingue valor, rota, ação ou estado. Preferir no máximo dois níveis abaixo da raiz; estruturas maiores pedem reavaliação e busca, não bloqueio artificial. `Navigation` preserva foco, filtro e offset ao retornar; listas param nas pontas. Seletor começa no valor atual; menu começa no primeiro item seguro. Indisponibilidade tem motivo visível e não dispara ação.

O painel tem cinco regiões, nesta ordem: contexto e escopo; estado efetivo/alterações; conteúdo; ajuda e feedback persistentes; ações e hints. As projeções em `components.ts` retornam `View` (linhas, foco e texto integral); os modelos e adapters fornecem o comportamento. `fullText` é a alternativa integral para conteúdo que não cabe no viewport. Não usar a projeção, sozinha, como editor ou dispatcher.

Setas navegam sem selecionar. Enter em campo valida e altera somente rascunho. Espaço marca seleção múltipla. Tab/Shift+Tab alternam regiões. Esc abandona edição incompleta, volta de seção ou pede decisão no painel alterado. A decisão oferece continuar, salvar e fechar ou descartar, inicialmente em continuar. Esc na decisão retorna à edição. Ajuda usa F1 ou `?` apenas na navegação. `?` e caracteres colados em campo continuam texto.

`resolveBindings` resolve reservas e overrides; `keyAction` e `KeyHints` usam esse mesmo registro. Reservas do host vêm primeiro; decisão modal, campo e contexto vêm depois. Nenhuma ação essencial depende de Ctrl+S. Salvar é visível e alcançável por Tab/Enter. Ctrl+S só é habilitado se entregue pelo ambiente; em edição, valida o valor atual antes de persistir o conjunto. Ctrl+C standalone interrompe com cleanup e sem salvar implicitamente; em Pi pertence ao host. Ctrl+D/EOF, Ctrl+Z, Ctrl+P, Alt, q ou j/k não são atalhos globais obrigatórios. Teclado avançado e mouse usam detecção optativa; suporte desconhecido permanece no básico. Não capturar seleção de texto com mouse por padrão.

## Estado e efeitos

`SettingsSession` mantém persistido, rascunho, editor e efetivo separados, com snapshots sem referências mutáveis. Override informa origem e impede edição local silenciosa. Validação de tipo, opções e regras do produto precede persistência; erro conserva rascunho e aponta o campo. Salvar mantém o painel aberto. Erro de armazenamento conserva rascunho. O callback `Persist` pertence ao produto e recebe sinal de cancelamento; use gravação atômica quando suportada. O piloto grava arquivo temporário no mesmo diretório, verifica abort antes do rename e remove temporário em finally.

Salvar configuração não aplica, publica, exclui ou executa. Ações com efeito externo apresentam objeto, destino e consequência; ações destrutivas têm rótulo concreto e foco inicial seguro. `ConfirmAction` e `ChangeSummary` compõem essa revisão, mas não autorizam nem executam callbacks por navegação. O produto continua dono de autorização e IO. Mudança local reversível não exige confirmação repetida.

`Operation` tem `idle`, `running`, `cancelling`, `succeeded`, `failed`, `cancelled` e `outcomeUnknown`; protege contra duplicidade e exige timeout finito. Cancelamento solicitado não significa rollback. Operação externa sem confirmação bloqueia nova tentativa até `reconcile`. Recursos têm dono; disposal aborta somente recursos próprios e invalida resultados atrasados. Progresso só calcula percentual com denominador conhecido. Ajuda e cancelamento continuam disponíveis. O piloto de diagnóstico usa o rascunho, informa etapas e não faz rede nem grava como efeito oculto.

Salvamento também é limitado por timeout (15 s por padrão, configurável em `save`), sinal de cancelamento e isolamento de resultados atrasados. Persistência sem confirmação bloqueia repetição até uma leitura atual do produto ser fornecida a `reconcilePersistence`; o rascunho permanece. Backends podem reportar `PersistenceOutcomeUnknown` quando não conseguem determinar se a gravação foi aplicada. `OperationCancelled` só confirma parada quando o produto a comprovou; uma operação que concluiu apesar do pedido de cancelamento continua sendo sucesso.

## Geometria, identidade e acessibilidade

Referências: 40×12, 80×24 e 120×36. Em 40 colunas, rótulo e valor empilham; em 80 podem dividir linha; em 120, lista/detalhe pode usar duas regiões. Abaixo de 40×12, oferecer modo linear mantendo sessão e rascunho. Resize reprojeta a mesma sessão. Conteúdo extenso quebra por grafemas; truncamento é resumo, com detalhe/linear integral. `safeText` remove controles externos (CSI, OSC de clipboard/título, DCS e C1); cor vem somente do renderer confiável. Política ASCII troca decoração, sem transliterar conteúdo do usuário. Densidade `focus` usa intervalos mínimos; `calm` acrescenta linhas quando há espaço.

Papéis existentes: texto/auxiliar, escolha (`color.identity.primary`), efeito (`color.identity.commit`), foco, seleção e status. Não há nova paleta. Pi traduz pelo tema do host; standalone respeita a cor do terminal e `NO_COLOR` não vazio. Preferência explícita precede detecção conservadora. Foco `>`, seleção `(x)`/`[x]`, erros e estados textuais dispensam cor. Recursive, Nerd Fonts, emoji e ligaturas não são requisitos. Preferência sem movimento usa mensagens estáveis, sem animação obrigatória.

Não transportar 44 px, DOM, ARIA web ou resultado axe para declarar conformidade Terminal. A orientação é WCAG2ICT; o fluxo linear append-only precisa de ensaio com leitor de tela identificado. RTL e macOS são suporte a qualificar; não receberam selo nesta entrega. Texto longo e i18n devem ser exercitados pelo consumidor. Leitor de tela e revisão qualitativa pendentes permanecem declarados em `qualification.json`.

## Automação e resultado

CI, sem TTY, stdout redirecionado, `--no-input` e `--json` não abrem prompt nem esperam teclado. Linear interativo é um modo diferente de execução sem entrada. `detectCapabilities` recebe capacidades, sem ler processo no núcleo. `requireInput` produz erro acionável se faltarem argumentos. Protocolos existentes do CLI IDS permanecem intactos; a consulta `recipe terminal.* --json` e o MCP `inteiro_get_terminal_component` são aditivos.

Nos pilotos standalone, UI humana vai a stderr e resultado a stdout; JSON é um único documento sem banner, ANSI ou progresso no stream. Códigos do piloto: 0 sucesso, 1 falha, 2 entrada inválida e 130 interrupção. Esses códigos não substituem os 0/2/3/4/5/6/7/8 existentes no CLI IDS. Segredos são omitidos dos resumos e não podem ser transportados por canal linear com eco. O produto deve filtrar também seus próprios resultados e logs de operações.

Inquirer possui streams e limpeza do terminal que alterou; Pi possui seu renderer. Restaurar recursos próprios em finally nas saídas e erros tratáveis; não prometer cleanup após desligamento ou sinais não interceptáveis.

## Executar e integrar

```sh
npm run generate:terminal
npm run test:terminal
node examples/terminal/standalone.ts --config /caminho/preferencias.json
node examples/terminal/standalone.ts --config /caminho/preferencias.json --ui linear
node examples/terminal/standalone.ts --json --no-input
node examples/terminal/standalone.ts --json --no-input --limit 5
node examples/terminal/standalone.ts --config /caminho/preferencias.json --json --no-input --limit 5 --save
pi --extension ./examples/terminal/pi-extension.ts
# Dentro do Pi: /terminal-preferences
npx inteiro recipe terminal.SettingsList --json
```

Os dois pilotos reutilizam campos, validação, persistência e diagnóstico em `examples/terminal/shared.ts`. São referências técnicas do mesmo fluxo, não um produto externo inventado. `WorkspaceModel` demonstra lista/detalhe, tabela ordenável e logs limitados, com exportação textual. Consumidores integram ações de busca, ordenação, pausa e exportação sem expor decoração no arquivo.

No standalone, `--connection`, `--language` e `--limit` fornecem a alternativa por argumentos. Sem `--save`, mostram somente o rascunho; `--save` valida e grava explicitamente. Sem `--config`, a referência usa `.inteiro/terminal-preferences.json` no projeto, compartilhado com o piloto Pi. `--color auto|always|never`, `--ascii` e `--ui linear|prompts` permitem substituir a detecção. `/terminal-workspace` demonstra exploração de dados dentro do Pi.

## Decisões e migração

Inquirer foi selecionado para a referência standalone: fornece prompts e cleanup sem exigir React no núcleo. Clack continua candidato a wizard; Ink a workspace Node persistente; Textual a consumidor Python. Não foi criado renderer ANSI próprio. A semântica e os schemas JSON permitem implementar o contrato em outra linguagem.

O perfil novo adota descarte explícito e listas sem wrap. Nenhuma extensão instalada, padrão do harness ou `@inteiro/adapter-pi` (instalador de skills) é migrado automaticamente. Adotar exige importar o adapter de UI optativo, mapear reservas do host, mover IO para callbacks, validar o mesmo fluxo e registrar evidência. Mudança incompatível de tecla/persistência em API pública do consumidor exige análise major. Correção de overflow compatível é patch; novos componentes optativos são minor.

IDs web e Terminal não colidem (`terminal.*`). A resolução de contexto reconhece `surface: 'terminal'` ou tarefa explícita Terminal/TUI, devolve catálogo e verificações de terminal. O gate PR existente continua obrigatório; Browser Gate não substitui ensaios TUI. Baseline não pode ser autoaprovada. Build local, CI remoto e deploy são estados distintos, com commit e resultado registrados.

Fontes de decisões: [CLI Guidelines](https://clig.dev/), [Node 22 TTY](https://nodejs.org/docs/latest-v22.x/api/tty.html), [NO_COLOR](https://no-color.org/), [buffer alternativo Microsoft](https://learn.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences#alternate-screen-buffer), [Inquirer](https://github.com/SBoudrias/Inquirer.js), [Pi TUI](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md), [UAX #11](https://www.unicode.org/reports/tr11/), [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/). Discovery original: RFC-TERM-001 v0.1.0, 19/11/2026.
