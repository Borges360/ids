# Tema do Pi: especificação

Gerado por `npm run generate:pi-theme` a partir de `scripts/generate-pi-theme.mjs`. Não edite à mão.

Os temas `inteiro-dark`, `inteiro-light`, `inteiro-contrast-dark` e `inteiro-contrast-light` cobrem todos os papéis de cor do Pi 1.6. O schema de tema do Pi é estrito e só aceita os papéis do host, então cada papel recebe o token semântico do IDS que cumpre a mesma função.

O tema Dracula para Pi serviu de referência de **componentes**: quais papéis existem e o que cada um precisa diferenciar (mensagens, ferramentas, markdown, diff, sintaxe, níveis de raciocínio, modo bash e exportação HTML). Não serviu de referência visual: as cores e as regras são as do IDS.

## Regras

1. **Neutros dominam.** Texto, títulos, variáveis, saídas e estrutura usam os tokens de texto e de borda (cerca de 80% da tela).
2. **Violeta escolhe.** `accent`, links, palavras-chave, rótulos de identidade, a borda da citação (a Costura) e o fundo de seleção.
3. **Laranja só para efeito real.** `bashMode` (executar comandos de verdade e, nos painéis, o botão que grava) e o topo da escada de raciocínio. Nunca em sintaxe nem como decoração.
4. **Status mantém o papel.** Mint, âmbar e vermelho só para sucesso, aviso e erro; as caixas de ferramenta usam a versão sutil.
5. **Sintaxe usa a paleta categórica, na ordem e sem a 02.** Categorias de código são dados categóricos (`color.dataviz.categorical.*`), não status.
6. **Superfícies se afastam do canvas.** Caixas de mensagem e de ferramenta usam `raised`/`surface` no escuro e `sunken` no claro.
7. **Foco não depende só de cor.** Item com foco = `>` + `selectedBg`.
8. **Contraste.** Todo papel de texto tem pelo menos 4,5:1 sobre o canvas do IDS e sobre a própria caixa; o violeta tem 4,5:1 sobre `selectedBg`; `border` tem 3:1 com o canvas. `tests/terminal/pi-theme.test.ts` verifica.

## Prévias

Geradas junto com os temas, com o mesmo texto em cada um:

- `inteiro-dark`: [preview/inteiro-dark.svg](../../packages/pi-theme/preview/inteiro-dark.svg)
- `inteiro-light`: [preview/inteiro-light.svg](../../packages/pi-theme/preview/inteiro-light.svg)
- `inteiro-contrast-dark`: [preview/inteiro-contrast-dark.svg](../../packages/pi-theme/preview/inteiro-contrast-dark.svg)
- `inteiro-contrast-light`: [preview/inteiro-contrast-light.svg](../../packages/pi-theme/preview/inteiro-contrast-light.svg)

## Papéis

### Interação

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `accent` | logo, item selecionado, cursor, botões de escolha nos painéis | `color.identity.primary` | Violeta = escolher (`color.identity.primary`). |

### Bordas

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `border` | bordas normais (editor, caixas) | `color.border.interactive` | Borda de componente interativo: 3:1 com o canvas. |
| `borderAccent` | borda em destaque | `color.identity.primary` | Destaque é foco ou escolha, então violeta. |
| `borderMuted` | divisórias discretas | `color.border.subtle` | Estrutura silenciosa: `color.border.subtle`. |

### Status

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `success` | estado de sucesso | `color.status.success` | Status mantém o papel: mint. |
| `error` | estado de erro | `color.status.danger` | Status mantém o papel: vermelho. |
| `warning` | estado de aviso | `color.status.warning` | Status mantém o papel: âmbar, nunca laranja. |

### Texto

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `muted` | texto secundário, dicas | `color.text.secondary` | Hierarquia por token de texto, nunca por opacidade. |
| `dim` | texto mais apagado que `muted` | `color.text.tertiary` | Texto terciário, ainda legível (4,5:1). |
| `text` | texto padrão | `color.text.primary` | Texto primário. |

### Mensagens

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `thinkingText` | texto do bloco de raciocínio | `color.text.secondary` | Raciocínio é apoio, não resposta: secundário. |
| `userMessageBg` | caixa da mensagem do usuário | `color.background.raised` (escuro) · `color.background.sunken` (claro) | Superfície que se afasta do canvas: `raised` no escuro, `sunken` no claro. |
| `userMessageText` | texto da mensagem do usuário | `color.text.primary` | Texto primário. |
| `customMessageBg` | caixa de mensagem injetada por extensão | `color.identity.subtle` | Mensagem do sistema ou de extensão: fundo de identidade sutil. |
| `customMessageText` | texto da mensagem injetada | `color.text.secondary` | Secundário: contexto, não conversa. |
| `customMessageLabel` | rótulo do tipo de mensagem | `color.identity.primary` | Rótulo de identidade: violeta. |

### Seleção e tela cheia

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `scrollbarTrack` | trilho da barra de rolagem | `color.border.subtle` | Estrutura silenciosa. |
| `scrollbarThumb` | cursor da barra de rolagem | `color.text.tertiary` | Visível sem competir com o conteúdo. |
| `selectedBg` | fundo do item selecionado em listas e painéis | `color.selection.background` | Foco = `>` + fundo de seleção, não só cor. |
| `searchMatchBg` | fundo da ocorrência na busca do histórico | `color.status.warning-subtle` | Ocorrência pede atenção, não é escolha: fundo âmbar sutil. |
| `searchMatchText` | texto da ocorrência | `color.text.primary` | Texto primário sobre o fundo sutil. |

### Ferramentas

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `toolPendingBg` | caixa de ferramenta em execução | `color.background.surface` (escuro) · `color.background.sunken` (claro) | Superfície neutra; o estado vem do texto e da cor final. |
| `toolSuccessBg` | caixa de ferramenta concluída | `color.status.success-subtle` | Fundo sutil de status, nunca o status pleno. |
| `toolErrorBg` | caixa de ferramenta com erro | `color.status.danger-subtle` | Fundo sutil de status, nunca o status pleno. |
| `toolTitle` | título da caixa de ferramenta | `color.text.primary` | Texto primário. |
| `toolOutput` | saída da ferramenta | `color.text.secondary` | Saída é evidência: secundário. |

### Markdown

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `mdHeading` | títulos | `color.text.primary` | Estrutura silenciosa: texto primário; o Pi já aplica negrito. |
| `mdLink` | texto do link | `color.identity.primary` | Como o IDS web (`a { color: identity.primary }`): seguir um link é escolher. |
| `mdLinkUrl` | URL do link | `color.text.tertiary` | Endereço é detalhe: terciário. |
| `mdCode` | código inline | `color.dataviz.categorical.03` | Voz `machine` sem fonte própria no terminal: o azul categórico separa código de prosa. |
| `mdCodeBlock` | bloco de código sem linguagem | `color.text.primary` | Como `.in-code-block`: texto primário; a borda separa o bloco. |
| `mdCodeBlockBorder` | cercas do bloco de código | `color.border.interactive` | Borda de estrutura. |
| `mdQuote` | texto de citação | `color.text.secondary` | Reflexão editorial: secundário. |
| `mdQuoteBorder` | borda da citação | `color.identity.primary` | A Costura: borda de identidade na reflexão. |
| `mdHr` | linha horizontal | `color.border.interactive` | Estrutura. |
| `mdListBullet` | marcadores de lista | `color.text.tertiary` | Marcador é estrutura, não ênfase. |

### Diff

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `toolDiffAdded` | linhas adicionadas | `color.status.success` | Status: mint. |
| `toolDiffRemoved` | linhas removidas | `color.status.danger` | Status: vermelho. |
| `toolDiffContext` | linhas de contexto | `color.text.tertiary` | Contexto é estrutura. |

### Sintaxe

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `syntaxComment` | comentários | `color.text.tertiary` | Comentário é anotação: terciário. |
| `syntaxKeyword` | palavras-chave | `color.dataviz.categorical.01` | Categórica 01 (violeta): controle de fluxo é decisão. |
| `syntaxFunction` | nomes de função | `color.dataviz.categorical.03` | Categórica 03 (azul). |
| `syntaxVariable` | variáveis | `color.text.primary` | A maior parte do código fica neutra (~80% neutros). |
| `syntaxString` | strings | `color.dataviz.categorical.04` | Categórica 04 (mint). |
| `syntaxNumber` | números | `color.dataviz.categorical.06` | Categórica 06 (âmbar). A 02 (laranja) fica fora: laranja é efeito real. |
| `syntaxType` | tipos | `color.dataviz.categorical.07` | Categórica 07 (rosa). |
| `syntaxOperator` | operadores | `color.text.secondary` | Estrutura: secundário. |
| `syntaxPunctuation` | pontuação | `color.text.tertiary` | Estrutura: terciário. |

### Modos do editor

| Papel do Pi | Componente | Token do IDS | Regra |
| --- | --- | --- | --- |
| `thinkingOff` | borda do editor sem raciocínio | `color.border.interactive` | Escada de custo: neutro. |
| `thinkingMinimal` | raciocínio mínimo | `color.text.tertiary` | Escada de custo. |
| `thinkingLow` | raciocínio baixo | `color.status.info` | Escada de custo: informação. |
| `thinkingMedium` | raciocínio médio | `color.identity.primary` | Escada de custo: escolha deliberada. |
| `thinkingHigh` | raciocínio alto | `color.dataviz.categorical.07` | Escada de custo. |
| `thinkingXhigh` | raciocínio muito alto | `color.identity.commit-hover` | Aproxima-se do limite: laranja claro. |
| `thinkingMax` | raciocínio máximo | `color.identity.commit` | Atravessa o limite de custo: laranja. |
| `bashMode` | editor em modo bash; nos painéis, o botão que grava | `color.identity.commit` | Executar de verdade é efeito real: laranja (`color.identity.commit`). |

### Exportação HTML

| Campo | Uso | Token do IDS |
| --- | --- | --- |
| `export.pageBg` | página do HTML exportado | `color.background.canvas` |
| `export.cardBg` | cartões do HTML exportado | `color.background.surface` |
| `export.infoBg` | caixas de informação do HTML exportado | `color.identity.subtle` |

## Instalação

As extensões que usam `@inteiro/terminal/pi` chamam `registerInteiroPiThemes(pi)` ao carregar: os temas vão para `<agent-dir>/themes/` e aparecem em `/settings` já na primeira sessão, sem colisão entre extensões. A extensão nunca escolhe o tema e nunca sobrescreve um tema editado; `PI_DESIGN_THEMES=off` desliga. Sem extensão: `pi install ./packages/pi-theme`.

## Limite

O Pi não tem papel para o fundo do terminal, então o tema não o define. Os contrastes usam o canvas do IDS (`vars.canvas`). Num terminal com outro fundo, configure o fundo do terminal com esse valor para obter o resultado verificado.
