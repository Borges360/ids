import { code, doDont, page } from "./format.js";

export const componentPages = [
  page({
    id: "components/catalog",
    title: "Catálogo",
    lede: "O que existe como CSS, o que existe como recipe e o que o brief de documentação listou sem haver implementação. Versão do pacote: 1.1.0.",
    keywords: ["button", "input", "card", "badge", "dialog", "status", "ausente"],
    status: "misto",
    source: "docs/COMPONENTS.md · packages/design-system/src/components.css · recipes.ts",
    sections: [
      {
        id: "matriz",
        title: "Disponibilidade",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Status</th><th>Onde</th></tr></thead>
              <tbody>
                <tr><td><a href="#/components/button">Button</a></td><td>Implementado</td><td><code>.in-button--primary|commit|secondary|ghost|quiet|danger</code>, tamanhos sm/md/lg</td></tr>
                <tr><td><a href="#/components/input">Input</a></td><td>Implementado</td><td><code>.in-field</code>, <code>.in-input</code></td></tr>
                <tr><td><a href="#/components/card">Card</a></td><td>Implementado</td><td><code>.in-card</code> e <code>data-kind</code></td></tr>
                <tr><td><a href="#/components/badge">Badge</a></td><td>Implementado</td><td>neutral, identity, success, warning, danger, info</td></tr>
                <tr><td>Badge outline</td><td>Especificado</td><td>Documento e recipe. Sem classe CSS.</td></tr>
                <tr><td><a href="#/components/specified">Dialog, Table, Navigation, Dashboard, Editorial, Empty, Loading, Feedback</a></td><td>Especificado</td><td>Recipes em <code>@inteiro/agent-core</code></td></tr>
                <tr><td>Focus visível</td><td>Implementado</td><td><code>:focus-visible</code> global em <code>components.css</code></td></tr>
                <tr><td>Vozes, stack, row, cluster, title, body</td><td>Implementado</td><td>Utilitários CSS</td></tr>
                <tr><td>IconButton, Textarea, Select, Checkbox, Radio, Switch, Tabs, Alert, Toast, Tooltip, Popover, Drawer, Pagination, Breadcrumb, Skeleton, Progress, CodeBlock, Search</td><td>Ausente</td><td>Não há classe, recipe nem API. Criar exige proposta.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Estados globais especificados: rest, hover, active, focus-visible, selected, loading, disabled, readonly, success, warning, invalid. Foco não é seleção. Loading não tem classe de botão; a recipe descreve skeleton.</p>
          <p>A busca e o bloco de código desta documentação são peças do site, não componentes publicados do INTEIRO.</p>
        `
      }
    ]
  }),
  page({
    id: "components/button",
    title: "Button",
    lede: "Ação com um significado. Primary escolhe. Commit torna real. Danger rompe. Os outros não competem em saturação.",
    keywords: ["button", "primary", "commit", "danger", "ghost", "quiet", "tamanho"],
    status: "implementado",
    source: "components.css · recipe button-*",
    sections: [
      {
        id: "proposito",
        title: "Propósito e status",
        html: `
          <dl class="meta">
            <div><dt>Status</dt><dd>Implementado</dd></div>
            <div><dt>Versão do pacote</dt><dd class="in-voice-machine">1.1.0</dd></div>
            <div><dt>API</dt><dd>Classes CSS. Não há props React.</dd></div>
          </dl>
          <p><strong>Quando usar.</strong> Uma ação que o usuário dispara. Um primary por contexto. Commit só se o efeito sai do sistema.</p>
          <p><strong>Quando não usar.</strong> Navegação que é um link. Metadado — isso é badge. Quatro ações violet no mesmo grupo.</p>
        `
      },
      {
        id: "anatomia",
        title: "Anatomia, variantes e estados",
        html: `
          <p>Rótulo em voz rational, peso 600, raio md, borda hairline transparente (visível no secondary). Alvo md e lg com pelo menos 44px de bloco. sm tem 36px e não deve ser o único primary em toque.</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Variante</th><th>Significado</th><th>Tokens</th></tr></thead>
              <tbody>
                <tr><td>primary</td><td>Ação deliberada principal</td><td><code>color.action.primary.*</code></td></tr>
                <tr><td>commit</td><td>Publicar, deploy, aplicar</td><td><code>color.action.commit.*</code></td></tr>
                <tr><td>secondary</td><td>Ação concorrente</td><td>surface + <code>border.interactive</code></td></tr>
                <tr><td>ghost</td><td>Ação contextual</td><td>transparente, texto secondary</td></tr>
                <tr><td>quiet</td><td>Baixa prioridade</td><td>texto tertiary</td></tr>
                <tr><td>danger</td><td>Destrutiva</td><td><code>color.action.danger.*</code></td></tr>
              </tbody>
            </table>
          </div>
          <p>Tamanhos do catálogo: sm 36×12 / 13px, md 44×16 / 14px, lg 52×20 / 16px. Estados no CSS: hover (primary e commit), active com translate 1px, focus-visible, disabled. Não há classe loading, selected ou success no botão.</p>
          <div class="in-row">
            <button class="in-button in-button--primary in-button--sm" type="button">sm</button>
            <button class="in-button in-button--primary" type="button">md</button>
            <button class="in-button in-button--primary in-button--lg" type="button">lg</button>
            <button class="in-button in-button--secondary" type="button">Secondary</button>
            <button class="in-button in-button--ghost" type="button">Ghost</button>
            <button class="in-button in-button--quiet" type="button">Quiet</button>
            <button class="in-button in-button--danger" type="button">Excluir projeto</button>
            <button class="in-button in-button--primary" type="button" disabled>Disabled</button>
          </div>
        `
      },
      {
        id: "playground",
        title: "Playground",
        html: `
          <div class="playground" data-playground="button">
            <div class="playground__preview" data-preview>
              <button class="in-button in-button--primary" type="button" data-subject>Salvar rascunho</button>
            </div>
            <form class="playground__controls" data-controls>
              <div class="in-field">
                <label class="in-field__label" for="btn-variant">Variante</label>
                <select class="in-input" id="btn-variant" name="variant">
                  <option value="primary">primary</option>
                  <option value="commit">commit</option>
                  <option value="secondary">secondary</option>
                  <option value="ghost">ghost</option>
                  <option value="quiet">quiet</option>
                  <option value="danger">danger</option>
                </select>
              </div>
              <div class="in-field">
                <label class="in-field__label" for="btn-size">Tamanho</label>
                <select class="in-input" id="btn-size" name="size">
                  <option value="sm">sm · 36px</option>
                  <option value="md" selected>md · 44px</option>
                  <option value="lg">lg · 52px</option>
                </select>
              </div>
              <div class="in-field">
                <label class="in-field__label" for="btn-label">Rótulo</label>
                <input class="in-input" id="btn-label" name="label" value="Salvar rascunho" />
              </div>
              <label class="checkline"><input type="checkbox" name="disabled" /> disabled</label>
              <div class="in-field">
                <label class="in-field__label" for="btn-width">Largura do preview</label>
                <select class="in-input" id="btn-width" name="width">
                  <option value="100%">fluida</option>
                  <option value="320px">320px</option>
                </select>
              </div>
            </form>
          </div>
          <p>Hover, foco e active são os do CSS real. Disabled desativa o botão de verdade. Não há controle de loading porque essa classe não existe.</p>
        `
      },
      {
        id: "api",
        title: "API, código e teclado",
        html: `
          ${code("html", `<button class="in-button in-button--primary" type="button">Salvar rascunho</button>
<button class="in-button in-button--commit" type="button">Publicar</button>
<button class="in-button in-button--danger" type="button">Excluir projeto</button>
<button class="in-button in-button--secondary in-button--sm" type="button">Revisar</button>`)}
          <p>Classes: <code>.in-button</code> obrigatória. Modificadores de variante e de tamanho são independentes. Sem modificador de tamanho, a métrica é md. Sem variante, o botão não tem fundo semântico — sempre declare uma.</p>
          <p><strong>Teclado.</strong> <code>button</code> nativo recebe Tab e ativa com Enter e Espaço. Não recrie com <code>div</code>. Foco: outline 2px <code>color.focus.ring</code>, offset 2px. Disabled sai da sequência.</p>
          <p><strong>Responsivo.</strong> A fileira quebra com <code>.in-row</code>. Em 320px o rótulo permanece legível; não abrevie “Publicar” para um ícone sem nome.</p>
          <p><strong>Conteúdo.</strong> Verbo no infinitivo ou imperativo curto, objeto quando a ação é destrutiva. Commit descreve o que se torna real.</p>
          ${doDont(
            "<p>Salvar rascunho em primary e Publicar em commit.</p>",
            "<p>Cancelar, Continuar, Confirmar e Salvar, todos violet. Ou um commit laranja só para enfeitar o header.</p>"
          )}
        `
      },
      {
        id: "bordas",
        title: "Edge cases, tokens e notas",
        html: `
          <ul>
            <li>Dois commits no mesmo contexto competem. Escolha a fronteira real.</li>
            <li>sm abaixo de 44px precisa de espaçamento equivalente se for alvo de toque.</li>
            <li>Ghost e quiet não têm hover de fundo no CSS atual. A recipe pede hover com identity subtle para ghost — isso está especificado e ainda não está na classe. Não simule com glow.</li>
            <li><code>:active</code> desloca 1px. Com reduced motion o CSS global zera a transição; o deslocamento de active ainda ocorre porque é estado, não animação de duração. Se isso incomodar em reduced motion, é pendência de implementação, não um comportamento a copiar como requisito.</li>
          </ul>
          <p>Tokens: <code>button.size.*.height</code>, <code>padding-inline</code>, <code>font-size</code>, <code>radius.md</code>, <code>motion.fast</code>, <code>ease.standard</code>, <code>motion.snap</code>, cores <code>action.*</code>, <code>border.focus</code>, <code>color.focus.ring</code>.</p>
          <p>Implementação: <code>packages/design-system/src/components.css</code>. O botão herda a fonte do <code>.in-root</code>.</p>
        `
      }
    ]
  }),
  page({
    id: "components/input",
    title: "Input",
    lede: "Label acima, valor, mensagem abaixo. Erro é borda, ícone se houver, e frase completa — nunca só a borda.",
    keywords: ["input", "field", "invalid", "readonly", "disabled", "label"],
    status: "implementado",
    source: "components.css · recipe input",
    sections: [
      {
        id: "proposito",
        title: "Propósito",
        html: `
          <p>Status: implementado na versão 1.0.0 como campo de uma linha. Não há Textarea, Select, Checkbox, Radio nem Switch.</p>
          <p><strong>Quando usar.</strong> Um dado curto que a pessoa edita, lê ou confirma.</p>
          <p><strong>Quando não usar.</strong> Texto longo, escolha entre opções, ou um valor que é só metadado. Para busca desta documentação, o campo é um controle do site, não este componente com outra semântica.</p>
        `
      },
      {
        id: "anatomia",
        title: "Anatomia e estados",
        html: `
          <p>Label, gap 8px (<code>input.label.gap</code>), controle, gap 6px (<code>input.message.gap</code>), helper ou erro. Alturas de token: sm 36, md 44, lg 52. O CSS publicado fixa a altura md. Padding inline 12, block 10, raio md, borda 1px.</p>
          <ul>
            <li>rest — <code>border.interactive</code></li>
            <li>hover — <code>border.strong</code></li>
            <li>focus-visible — anel 2px e borda identity</li>
            <li>invalid — <code>aria-invalid="true"</code> e mensagem <code>.in-field__message--error</code></li>
            <li>disabled — superfície e texto de ação desabilitada</li>
            <li>readonly — superfície sunken; o valor continua selecionável</li>
          </ul>
          <p>O CSS não desenha um ícone de erro. A recipe pede ícone mais mensagem. Até haver ícone no sistema, a mensagem textual é obrigatória e não pode ser substituída por cor.</p>
        `
      },
      {
        id: "playground",
        title: "Playground",
        html: `
          <div class="playground" data-playground="input">
            <div class="playground__preview" data-preview>
              <div class="in-field" data-subject>
                <label class="in-field__label" for="play-email">E-mail</label>
                <input class="in-input" id="play-email" type="email" value="joao@" />
                <p class="in-field__message" id="play-email-msg">Como devemos responder.</p>
              </div>
            </div>
            <form class="playground__controls" data-controls>
              <div class="in-field">
                <label class="in-field__label" for="in-state">Estado</label>
                <select class="in-input" id="in-state" name="state">
                  <option value="rest">rest</option>
                  <option value="invalid">invalid</option>
                  <option value="disabled">disabled</option>
                  <option value="readonly">readonly</option>
                </select>
              </div>
              <div class="in-field">
                <label class="in-field__label" for="in-label">Label</label>
                <input class="in-input" id="in-label" name="label" value="E-mail" />
              </div>
              <div class="in-field">
                <label class="in-field__label" for="in-value">Valor</label>
                <input class="in-input" id="in-value" name="value" value="joao@" />
              </div>
              <div class="in-field">
                <label class="in-field__label" for="in-message">Mensagem</label>
                <input class="in-input" id="in-message" name="message" value="Como devemos responder." />
              </div>
              <div class="in-field">
                <label class="in-field__label" for="in-width">Largura do preview</label>
                <select class="in-input" id="in-width" name="width">
                  <option value="100%">fluida</option>
                  <option value="320px">320px</option>
                </select>
              </div>
            </form>
          </div>
        `
      },
      {
        id: "api",
        title: "API, acesso e conteúdo",
        html: `
          ${code("html", `<div class="in-field">
  <label class="in-field__label" for="email">E-mail</label>
  <input class="in-input" id="email" type="email" value="joao@" aria-invalid="true" aria-describedby="email-err" />
  <p class="in-field__message in-field__message--error" id="email-err">Informe um endereço completo, como nome@dominio.com</p>
</div>`)}
          <p>O <code>for</code> aponta para o <code>id</code>. Erro usa <code>aria-invalid</code> e <code>aria-describedby</code>. Readonly não usa disabled: a pessoa ainda seleciona o valor. Tipo nativo (<code>email</code>, <code>text</code>) permanece no elemento.</p>
          <p><strong>Teclado.</strong> Tab entra no campo. Não há atalho proprietário. Em invalid, a mensagem está no accessibility tree via describedby.</p>
          <p><strong>Responsivo.</strong> O campo ocupa a largura do formulário. Em 320px o label não vai para placeholder no lugar do nome visível.</p>
          ${doDont(
            "<p>Informe um endereço completo, como nome@dominio.com</p>",
            "<p>Borda vermelha e a palavra “inválido”, sem dizer o que falta.</p>"
          )}
          <p>Edge cases: placeholder não substitui label. Mensagem de erro não pode ser só cor. Disabled e readonly são estados diferentes. Não há tamanho sm/lg na classe, embora os tokens existam — usar só md até a classe nascer.</p>
          <p>Tokens: <code>input.height.md</code>, padding, radius, border width, focus width, label gap, message gap, <code>color.border.interactive</code>, <code>color.status.danger</code>, <code>color.background.sunken</code>.</p>
        `
      }
    ]
  }),
  page({
    id: "components/card",
    title: "Card",
    lede: "Agrupa. Não flutua. A Costura entra só quando o bloco muda a interpretação ou pede uma decisão.",
    keywords: ["card", "reflection", "commit", "seam", "costura"],
    status: "implementado",
    source: "components.css · recipes card*",
    sections: [
      {
        id: "proposito",
        title: "Propósito e variantes",
        html: `
          <p>Implementado em 1.0.0. Três formas: neutro, <code>data-kind="reflection"</code>, <code>data-kind="commit"</code>.</p>
          <p><strong>Neutro</strong> — agrupar sem interpretação especial. Surface, hairline, radius lg, padding de densidade. Elevação 0.</p>
          <p><strong>Reflexão</strong> — editorial ou fato que muda a leitura. Costura identity.</p>
          <p><strong>Commit</strong> — o bloco pede atravessar o limite. Costura commit, e a ação correspondente é um botão commit.</p>
          <div class="in-cluster">
            <article class="in-card"><h3 class="in-title">Neutro</h3><p class="in-muted">Sem Costura.</p></article>
            <article class="in-card" data-kind="reflection"><h3 class="in-title in-voice-human">Reflexão</h3><p>A anomalia não derrubou disponibilidade, mas muda o que vale investigar.</p></article>
            <article class="in-card" data-kind="commit"><h3 class="in-title">Decisão</h3><p class="in-muted">A mudança sai do rascunho.</p><button class="in-button in-button--commit" type="button">Publicar</button></article>
          </div>
        `
      },
      {
        id: "playground",
        title: "Playground",
        html: `
          <div class="playground" data-playground="card">
            <div class="playground__preview" data-preview>
              <article class="in-card" data-subject>
                <h3 class="in-title" data-card-title>Título</h3>
                <p data-card-body>Conteúdo do card.</p>
              </article>
            </div>
            <form class="playground__controls">
              <div class="in-field">
                <label class="in-field__label" for="card-kind">Tipo</label>
                <select class="in-input" id="card-kind" name="kind">
                  <option value="">neutro</option>
                  <option value="reflection">reflection</option>
                  <option value="commit">commit</option>
                </select>
              </div>
              <div class="in-field">
                <label class="in-field__label" for="card-title">Título</label>
                <input class="in-input" id="card-title" name="title" value="Título" />
              </div>
              <div class="in-field">
                <label class="in-field__label" for="card-body">Corpo</label>
                <input class="in-input" id="card-body" name="body" value="Conteúdo do card." />
              </div>
            </form>
          </div>
          ${code("html", `<article class="in-card" data-kind="reflection">
  <h2 class="in-title in-voice-human">Reflexão</h2>
  <p>A Costura comunica interpretação.</p>
</article>`)}
          <p>Não há props. <code>data-kind</code> ausente ou com outro valor deixa o card neutro. O card não é botão: se a superfície inteira clica, use um link ou botão com nome, não um <code>div</code> clicável.</p>
          <p><strong>Teclado.</strong> O card em si não é foco. Controles dentro dele seguem a ordem do DOM.</p>
          <p><strong>Responsivo.</strong> <code>.in-cluster</code> quebra a fileira. Padding vem de <code>--in-density-card-padding</code> e muda com calm/focus.</p>
          ${doDont(
            "<p>Costura na anomalia que muda a leitura do dashboard.</p>",
            "<p>Costura em todos os KPI. Glass e sombra elevation.4 num card de métrica.</p>"
          )}
          <p>Tokens: <code>color.background.surface</code>, <code>color.border.subtle</code>, <code>radius.lg</code>, <code>density.card-padding</code>, <code>border.seam</code>, <code>color.identity.primary</code>, <code>color.identity.commit</code>, <code>space.400</code>.</p>
        `
      }
    ]
  }),
  page({
    id: "components/badge",
    title: "Badge",
    lede: "Metadado descritivo. Não é botão, não é filtro, não recebe clique.",
    keywords: ["badge", "status", "pill", "outline"],
    status: "implementado",
    source: "components.css · recipe badge",
    sections: [
      {
        id: "variantes",
        title: "Variantes",
        html: `
          <p>Implementado em 1.0.0. Raio full é permitido aqui, e só aqui além de avatar. Variante outline está na recipe e não tem classe.</p>
          <div class="in-row">
            <span class="in-badge">neutral</span>
            <span class="in-badge in-badge--identity">identity</span>
            <span class="in-badge in-badge--success">success</span>
            <span class="in-badge in-badge--warning">warning</span>
            <span class="in-badge in-badge--danger">danger</span>
            <span class="in-badge in-badge--info">info</span>
          </div>
          <div class="playground" data-playground="badge">
            <div class="playground__preview" data-preview>
              <span class="in-badge" data-subject>neutral</span>
            </div>
            <form class="playground__controls">
              <div class="in-field">
                <label class="in-field__label" for="badge-variant">Variante</label>
                <select class="in-input" id="badge-variant" name="variant">
                  <option value="">neutral</option>
                  <option value="identity">identity</option>
                  <option value="success">success</option>
                  <option value="warning">warning</option>
                  <option value="danger">danger</option>
                  <option value="info">info</option>
                </select>
              </div>
              <div class="in-field">
                <label class="in-field__label" for="badge-label">Texto</label>
                <input class="in-input" id="badge-label" name="label" value="neutral" />
              </div>
            </form>
          </div>
          ${code("html", `<span class="in-badge in-badge--success">stable</span>`)}
          <p>Se o elemento responde a clique, não é badge: é botão, e precisa de nome e alvo de 44px. Status colorido também precisa de texto, porque cor sozinha não carrega o estado.</p>
          ${doDont(
            "<p><span class=\"in-badge\">PROD</span> ao lado do título, sem ação.</p>",
            "<p>Um badge “filtrar” com onclick e sem role de botão. Outline inventado com uma classe que não existe.</p>"
          )}
          <p>Tokens: <code>radius.full</code>, <code>type.caption.size</code>, <code>space.200</code>, <code>space.600</code>, cores <code>status.*-subtle</code> e <code>identity.subtle</code>.</p>
        `
      }
    ]
  }),
  page({
    id: "components/specified",
    title: "Recipes sem classe",
    lede: "Contratos que um agente ou uma implementação podem seguir. Ainda não são componentes CSS.",
    keywords: ["dialog", "table", "empty", "loading", "navigation", "dashboard", "editorial"],
    status: "especificado",
    source: "packages/agent-core/src/recipes.ts",
    sections: [
      {
        id: "lista",
        title: "O que a recipe cobre",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Recipe</th><th>Quando</th><th>Contrato mínimo</th></tr></thead>
              <tbody>
                <tr><td><code>dialog</code></td><td>Interromper para decidir</td><td>Scrim, elevation 3, foco preso, Escape fecha, cópia honesta</td></tr>
                <tr><td><code>table</code></td><td>Dados tabulares</td><td>radius.none, linha 52 calm / 40 focus, IDs em machine, selected ≠ focus</td></tr>
                <tr><td><code>navigation</code></td><td>Orientar</td><td>Sticky elevation 1, item ativo em identity, alvo 44px</td></tr>
                <tr><td><code>dashboard</code></td><td>Operação densa</td><td>focus, neutros dominantes, Costura só na interpretação</td></tr>
                <tr><td><code>editorial</code></td><td>Texto longo</td><td>calm, 70ch, vozes editorial</td></tr>
                <tr><td><code>feedback-error</code></td><td>Falha</td><td>O que houve, por quê se souber, o que fazer</td></tr>
                <tr><td><code>feedback-success</code></td><td>Resolução</td><td>Fato + contexto machine</td></tr>
                <tr><td><code>empty-state</code></td><td>Sem dados</td><td>O que falta e a próxima ação</td></tr>
                <tr><td><code>loading</code></td><td>Espera</td><td>Skeleton com wash, não spinner neon. Reduced motion estático</td></tr>
                <tr><td><code>focus</code></td><td>Todo controle</td><td>Implementado no CSS global, além da recipe</td></tr>
              </tbody>
            </table>
          </div>
          <p>Exemplos compostos, marcados como locais, estão em <a href="#/patterns/feedback">padrões</a> e em <a href="#/practice/identity">identidade na prática</a>. Eles não criam <code>.in-dialog</code> nem <code>.in-table</code>.</p>
          <p>Fora desta lista, o brief pedia IconButton, Textarea, Select, Checkbox, Radio, Switch, Tabs, Alert, Toast, Tooltip, Popover, Drawer, Pagination, Breadcrumb, Search, CodeBlock, Skeleton e Progress como cobertura de catálogo. Não há definição aprovada além do que a recipe de loading diz sobre skeleton. Status: <strong>ausente</strong>. Não documente uma API inventada.</p>
        `
      }
    ]
  })
];
