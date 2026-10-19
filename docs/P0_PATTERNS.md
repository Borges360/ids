# Composition Kit P0

O contrato original está em [INTEIRO_ESPECIFICACAO_P0.md](INTEIRO_ESPECIFICACAO_P0.md). O catálogo recuperável está em `packages/composition/catalog.index.json`; o catálogo HTML em `apps/catalog/index.html`; as stories em `stories/Patterns.stories.ts`. O kit não exige React no consumidor.

Cada JSON de `packages/composition/patterns` declara IDs, tokens reais, slots, variantes, estados, exemplos e testes. `compose show <id>` não fabrica componentes. `compose propose <id>` cria um draft pendente de revisão. Variantes, estados ou slots não publicados são recusados.

## Uso e semântica

Importe `@inteiro/composition/css` e use o HTML do exemplo correspondente. Configure `data-in-theme="dark|light"` e `data-in-density="calm|focus"` na raiz. Para comportamento progressivo, importe `enhance` de `@inteiro/composition/behavior` e execute `const cleanup = enhance(container)`. Chame `cleanup()` ao desmontar o container. As regras de apresentação e comportamento são compartilhadas por HTML, React, Vue e Svelte; as fixtures por framework estão em `examples`.

Use um único `main` e um título principal por página. O `app-shell` já contém esses elementos; os demais padrões são inseridos dentro do landmark da página. O cabeçalho de página já contém `h1`. Não aninhe shells.

Formulários usam controles nativos com `label`, ajuda e mensagens associadas. `disabled`, `invalid` e `readonly` têm exemplos executáveis. O estado inválido apresenta mensagem textual; não depende apenas de cor. O navegador valida campos obrigatórios e foca a primeira falha. Uma ação `commit` representa publicação ou outra fronteira de negócio, explicada por `aria-describedby`.

Os exemplos usam `in-input`, `in-choice`, `in-button` e `in-tabs` da biblioteca. Ação principal, ação contextual e publicação têm variantes distintas. A área acionável tem pelo menos 44 × 44 CSS px nas duas densidades; checkbox e rádio podem usar o label associado como área de clique. O estado inválido preserva os IDs de ajuda e acrescenta a mensagem de erro em `aria-describedby`. Controles que não suportam `readonly`, como select, checkbox e rádio, ficam desabilitados no exemplo correspondente.

Tabelas usam caption, cabeçalhos com scope e um wrapper focável com scroll horizontal local. O documento não deve ter overflow. O aplicativo continua responsável por conectar ordenação e paginação aos seus dados; a apresentação não inventa lógica de negócio.

## Teclado e foco

| Padrão | Operação |
|---|---|
| dialog, drawer | Enter/Space no gatilho abre modal nativo; Tab fica no diálogo; Escape fecha; cada diálogo restaura seu próprio gatilho, inclusive quando aninhado |
| popover | Gatilho nativo `popovertarget`; Escape e light dismiss são do navegador; o exemplo `open` mantém o modo auto e um gatilho focável; não confundir com modal |
| dropdown-menu, mobile-navigation | Disclosure nativo `details/summary`; Enter/Space expande; Tab alcança as ações; com `enhance`, Escape fecha o disclosure mais interno e foca seu summary |
| tooltip | Foco/hover apresenta ajuda; Escape a dispensa antes do overlay que a contém; sair e voltar ao gatilho permite mostrá-la novamente |
| tabs | Setas mudam seleção e foco; Home/End vão às extremidades; RTL inverte direção; painéis se associam aos tabs |
| checkbox, radio-group, select | Teclado e semântica nativos, sem reimplementar os controles |
| data-table | Tab chega ao wrapper para scroll local; células e cabeçalhos preservam leitura semântica |
| navigation-menu, breadcrumb, pagination | Links com nomes acessíveis, indicação de página atual e alvos com altura de botão |
| alert, toast, inline-error, progress | Regiões/status acessíveis e conteúdo textual, sem exigir foco para anúncio |

Em overlays aninhados, uma tecla Escape fecha apenas a camada interna. Um popover ou diálogo dentro de um disclosure mantém o fechamento nativo antes do disclosure; um disclosure dentro desses overlays consome a primeira tecla e mantém o pai aberto. A restauração de foco por diálogo não compartilha um único gatilho global. Os testes incluem os dois sentidos desse aninhamento e diálogos dentro de diálogos.

## Estados, temas e robustez

`renderPattern(id, state)` de `@inteiro/composition/render` produz HTML determinístico para os estados declarados. O manifesto `story-matrix.json` associa cada estado a uma story. Os exemplos `examples/<id>-<state>.html` funcionam sem servidor de Storybook.

O teste `tests/browser/composition.spec.ts` aplica a matriz pareada em PR e amplia larguras com `INTEIRO_FULL_MATRIX=1`. Ele verifica overflow, semântica e o subconjunto automatizável de WCAG 2.2 AA usando axe; captura imagens sem promovê-las a golden. Há testes de teclado para tabs e modal. A revisão manual continua necessária para critérios qualitativos e critérios de acessibilidade não automatizados.

A matriz também mede os alvos de interação em cada estado. O gate de navegador emite `VIS-TARGET-001` quando botões, campos, summaries, tabs ou links de navegação visíveis têm área acionável menor que 44 × 44 CSS px. Links em texto corrido ficam fora dessa política de controles. A medição não comprova ausência de oclusão nem substitui a avaliação das exceções e dos demais critérios WCAG.

Padrões de dados vazios e erros têm ações explícitas. Conteúdo longo pode quebrar dentro dos containers, sem esconder overflow do documento. As regras usam propriedades lógicas para RTL, grid com mínimo limitado à largura disponível e redução de movimento conforme preferência do usuário.

O teste de reflow acrescenta texto traduzido e palavras extensas aos títulos, parágrafos, células, legendas, labels, botões, summaries e links de navegação, preservando os controles nativos dentro dos labels. Ele combina RTL com zoom de 200%. Os controles podem crescer na vertical para manter o texto legível. O tooltip usa `in-tooltip-wrap` no contêiner marcado com `data-in-tooltip` e `in-tooltip` somente no balão; suas regras específicas não mudam o tooltip React nem exibem conteúdo com `hidden`.

## Limites dos exemplos

Os exemplos são referências sintéticas de apresentação e estados. Serviços, dados, autorização, ordenação, paginação remota e efeitos de negócio pertencem à aplicação. `tooltip` deve conter apenas ajuda complementar; informação indispensável deve aparecer no conteúdo principal. Não use o catálogo como evidência de aprovação estética ou baseline assinada.
