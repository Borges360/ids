# @inteiro/pi-theme

Temas do INTEIRO para o [Pi Coding Agent](https://github.com/earendil-works/pi): `inteiro-dark`, `inteiro-light`, `inteiro-contrast-dark` e `inteiro-contrast-light`. Os arquivos em `themes/` são gerados dos tokens resolvidos do IDS por `npm run generate:pi-theme`. Não edite à mão.

## Instalar

Os temas são um pacote Pi. Instale a partir do checkout do IDS:

~~~sh
pi install ./packages/pi-theme
~~~

Depois, abra `/settings` e escolha **Theme**, ou grave no `settings.json` do Pi:

~~~json
{ "theme": "inteiro-light/inteiro-dark" }
~~~

O par `claro/escuro` segue a aparência do terminal. Para testar sem mudar a configuração: `pi --use-theme inteiro-dark`.

## Como os papéis do IDS chegam ao Pi

O schema de tema do Pi é estrito: aceita só os papéis do próprio host. Cada papel recebe o token semântico do IDS mais próximo.

| IDS | Papel no Pi |
| --- | --- |
| Escolha, `color.identity.primary` (violeta) | `accent`, `borderAccent`, `customMessageLabel`, `syntaxKeyword` |
| Efeito real, `color.identity.commit` (laranja) | `bashMode` (o editor executando comandos de verdade) e `thinkingMax` |
| Seleção, `color.selection.background` | `selectedBg` |
| Texto primário, secundário e terciário | `text`, `muted`, `dim` |
| Status | `success`, `warning`, `error`; links em `color.status.info` |
| Superfícies | `userMessageBg` (`raised`), `toolPendingBg` (`surface`), fundos sutis de status |
| A Costura | `mdQuoteBorder` em violeta |

Os painéis feitos com `@inteiro/terminal/pi` usam esses mesmos papéis: o item com foco tem `>` e o fundo `selectedBg`, a ação que grava usa `bashMode` em negrito, e as outras ações usam `accent`. Com outro tema do Pi, os painéis continuam corretos, mas nas cores desse tema.

## Contraste

`tests/terminal/pi-theme.test.ts` verifica, em cada tema, contraste WCAG de pelo menos 4,5:1 para texto, texto secundário e terciário, escolha, efeito e status sobre o fundo do IDS, e para a escolha sobre `selectedBg`.
