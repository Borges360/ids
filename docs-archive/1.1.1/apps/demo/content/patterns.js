import { code, doDont, page, reflection } from "./format.js";

export const patternPages = [
  page({
    id: "patterns/forms",
    title: "Formulários",
    lede: "Um primary para a escolha, mensagens completas, e commit só se o envio atravessa o limite.",
    keywords: ["formulario", "validacao", "erro", "campo"],
    status: "misto",
    source: "recipe input · recipe button-* · docs/VOICE_AND_TONE.md",
    sections: [
      {
        id: "composicao",
        title: "Composição",
        html: `
          <p>Campos usam <a href="#/components/input">Input</a>. Agrupe com <code>.in-stack</code>. O gap de lista segue a densidade; o gap interno do campo segue os tokens de input, que são menores. Não inverta essa relação.</p>
          <form class="in-stack form-sample" data-demo-form>
            <div class="in-field">
              <label class="in-field__label" for="proj-name">Nome do projeto</label>
              <input class="in-input" id="proj-name" name="name" required autocomplete="off" />
              <p class="in-field__message">Como o projeto aparece na lista.</p>
            </div>
            <div class="in-field">
              <label class="in-field__label" for="proj-email">E-mail de contato</label>
              <input class="in-input" id="proj-email" name="email" type="email" autocomplete="off" />
              <p class="in-field__message" data-email-msg>Usado só se a publicação falhar.</p>
            </div>
            <div class="in-row">
              <button class="in-button in-button--primary" type="submit">Salvar rascunho</button>
              <button class="in-button in-button--commit" type="button" data-publish>Publicar</button>
            </div>
            <p class="in-voice-machine" data-form-status role="status"></p>
          </form>
          <p>Salvar valida o nome e o e-mail de verdade e anuncia o resultado na região <code>role="status"</code>. Publicar não envia nada a um servidor: abre a confirmação de que a ação sai do rascunho, porque commit é fronteira. Não há endpoint nesta documentação.</p>
          ${doDont(
            "<p>Um erro por campo, ligado com <code>aria-describedby</code>, mais um resumo se houver vários.</p>",
            "<p>Toast genérico “corrija os campos” sem dizer quais. Ou borda vermelha sem frase.</p>"
          )}
        `
      },
      {
        id: "validacao",
        title: "Validação",
        html: `
          <ul>
            <li>Valide no envio. Não grite no primeiro caractere.</li>
            <li>Mantenha o valor digitado.</li>
            <li>Disabled não é o estado de um campo com erro.</li>
            <li>Readonly serve para hash, id e valor confirmado.</li>
            <li>Não há componente de grupo de checkbox. Se a decisão exigir, proponha antes de inventar o visual.</li>
          </ul>
        `
      }
    ]
  }),
  page({
    id: "patterns/data",
    title: "Navegação e dados",
    lede: "Navegação ativa é violeta, não laranja. Tabela é densa e sem raio. Filtro mostra o que ficou de fora.",
    keywords: ["navegacao", "tabela", "filtro", "dashboard", "pesquisa"],
    status: "especificado",
    source: "recipes navigation, table, dashboard",
    sections: [
      {
        id: "navegacao",
        title: "Navegação",
        html: `
          <p>A sidebar desta documentação é um exemplo da recipe <code>navigation</code>: item ativo com Costura identity, alvo de 44px, sticky na barra superior com a camada <code>z.sticky</code>. Não é um componente <code>.in-nav</code>.</p>
          <p>Em sistemas complexos, o grupo diz o território e o item diz a tarefa. Não duplique o mesmo destino no topo e na lateral. Laranja não marca “você está aqui”.</p>
        `
      },
      {
        id: "filtros",
        title: "Filtro",
        html: `
          <p>O campo abaixo filtra uma lista real de tokens de cor. É um exemplo local, não um componente Search.</p>
          <div class="filter-demo" data-filter>
            <div class="in-field">
              <label class="in-field__label" for="token-filter">Filtrar tokens</label>
              <input class="in-input" id="token-filter" type="search" data-filter-input placeholder="commit, danger, canvas" />
            </div>
            <p class="in-voice-machine" data-filter-count role="status"></p>
            <ul class="filter-list" data-filter-list>
              <li data-filter-item>color.background.canvas</li>
              <li data-filter-item>color.identity.primary</li>
              <li data-filter-item>color.identity.commit</li>
              <li data-filter-item>color.status.danger</li>
              <li data-filter-item>color.status.warning</li>
              <li data-filter-item>color.status.success</li>
              <li data-filter-item>color.focus.ring</li>
            </ul>
            <p class="empty" data-filter-empty hidden>Nenhum token com esse texto. Limpe o filtro ou tente “identity”.</p>
          </div>
        `
      },
      {
        id: "tabela",
        title: "Tabela densa",
        html: `
          <p>Exemplo local <code>.ex-table</code>. A recipe pede <code>radius.none</code>, linha <code>density.table-row</code> e IDs em machine. A seleção de linha usa checkbox nativo; o foco do teclado continua no controle, não pintado como se fosse a mesma coisa.</p>
          <div class="table-wrap">
            <table class="ex-table">
              <thead>
                <tr><th>Seleção</th><th>Ambiente</th><th>Revisão</th><th>Estado</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><input type="checkbox" aria-label="Selecionar production" /></td>
                  <td>production</td>
                  <td class="in-voice-machine">2f41c9a</td>
                  <td><span class="in-badge in-badge--success">stable</span></td>
                </tr>
                <tr>
                  <td><input type="checkbox" aria-label="Selecionar staging" /></td>
                  <td>staging</td>
                  <td class="in-voice-machine">9ab10ce</td>
                  <td><span class="in-badge in-badge--warning">atenção</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Em viewport estreita a tabela rola no eixo inline. O cabeçalho permanece associado às células pelo <code>table</code> nativo. Não transforme a tabela em cards sem uma proposta: a recipe ainda não descreve esse fallback.</p>
        `
      },
      {
        id: "dashboard",
        title: "Dashboard",
        html: `
          <p>O exemplo operável está em <a href="#/practice/identity/dashboard">identidade na prática</a>. A regra de combinação: métrica em machine, frase de leitura em rational, Costura só onde a interpretação muda, um primary para investigar e um commit se houver deploy.</p>
        `
      }
    ]
  }),
  page({
    id: "patterns/feedback",
    title: "Feedback, falha e revelação",
    lede: "Erro, vazio, espera e destruição têm texto. A interface não celebra e não esconde a consequência.",
    keywords: ["erro", "empty", "loading", "dialog", "disclosure", "destrutivo"],
    status: "especificado",
    source: "recipes feedback-*, empty-state, loading, dialog",
    sections: [
      {
        id: "erro",
        title: "Erro e recuperação",
        html: `
          <article class="in-card" data-kind="reflection">
            <p class="kicker">Falha</p>
            <p>Não foi possível salvar.<br />A conexão foi interrompida antes da confirmação.</p>
            <button class="in-button in-button--secondary" type="button" data-retry>Tentar novamente</button>
            <p class="in-voice-machine" data-retry-status role="status"></p>
          </article>
          <p>Tentar novamente é secondary: a pessoa já escolheu salvar. O botão registra a tentativa nesta página; não há rede para repetir. Recuperação diz o que foi refeito e o que continua pendente.</p>
        `
      },
      {
        id: "vazio",
        title: "Estado vazio",
        html: `
          <article class="in-card empty-sample">
            <h3 class="in-title in-voice-human">Nenhum ambiente ainda</h3>
            <p class="in-muted">O projeto existe. Falta o primeiro lugar onde ele roda.</p>
            <button class="in-button in-button--primary" type="button" data-create-env>Criar o primeiro ambiente</button>
            <p class="in-voice-machine" data-env-status role="status"></p>
          </article>
          ${doDont(
            "<p>Dizer o que falta e qual é a próxima ação.</p>",
            "<p>“Nada por aqui” com um ícone ilustrado e nenhum verbo.</p>"
          )}
        `
      },
      {
        id: "loading",
        title: "Espera",
        html: `
          <p>Skeleton de exemplo. Não é componente publicado. A recipe pede wash, não spinner em arco-íris. Com reduced motion a pulsação para, porque a animação desta página respeita o media query.</p>
          <div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
          <p class="in-muted">Para leitores de tela, espera real precisa de texto — “Carregando revisões” — e não só de blocos visuais.</p>
        `
      },
      {
        id: "destrutivo",
        title: "Ação destrutiva",
        html: `
          <p>Nomeie o objeto e a consequência. Cancelar é quiet ou secondary. Confirmar é danger e repete o verbo.</p>
          <button class="in-button in-button--danger" type="button" data-open-confirm="confirm-delete">Excluir projeto</button>
          <dialog class="confirm" id="confirm-delete">
            <form method="dialog" class="in-stack">
              <h2 class="in-title" id="confirm-delete-title">Excluir “projeto-x”?</h2>
              <p>Essa ação remove também os três ambientes vinculados. Não há lixeira nesta versão.</p>
              <div class="in-row">
                <button class="in-button in-button--quiet" type="submit" value="cancel">Cancelar</button>
                <button class="in-button in-button--danger" type="submit" value="confirm">Excluir projeto</button>
              </div>
            </form>
          </dialog>
          <p role="status" data-confirm-status></p>
          ${code("html", `<button class="in-button in-button--danger" type="button">Excluir projeto</button>`)}
          <p>O diálogo usa o elemento <code>dialog</code>. Escape e Cancelar fecham sem excluir. Confirmar só atualiza a mensagem desta página — não apaga arquivo algum. Foco volta ao botão que abriu.</p>
        `
      },
      {
        id: "disclosure",
        title: "Revelação progressiva",
        html: `
          <details class="disclosure">
            <summary>Por que a revisão 9ab10ce está em atenção</summary>
            <p>O p95 subiu para 40ms entre 14:20 e 14:43. Disponibilidade permaneceu. A frase longa fica fechada até alguém pedir a causa.</p>
          </details>
          <p><code>details</code>/<code>summary</code> já têm teclado e nome. Não troque por um div com clique se o único objetivo é esconder um parágrafo.</p>
          ${reflection("<p>Revelar não é esconder o risco. O estado “atenção” continua visível no badge; o disclosure só guarda o mecanismo.</p>")}
        `
      }
    ]
  })
];

export const practicePages = [
  page({
    id: "practice/identity",
    title: "Identidade na prática",
    lede: "As leis aprovadas aplicadas a superfícies diferentes. Nenhuma destas telas é um produto separado: são exemplos locais com os tokens e as classes reais.",
    keywords: ["editorial", "dashboard", "formulario", "decisao", "documentacao"],
    status: "implementado",
    source: "deep-research-report.md · components.css",
    sections: [
      {
        id: "leis-na-tela",
        title: "Como as leis aparecem",
        html: `
          <ul>
            <li>Estrutura silenciosa — grelha, hairline, sem gradiente.</li>
            <li>Personalidade no ponto de decisão — um violet, um laranja, no máximo.</li>
            <li>Densidade sem desordem — números em machine, leitura em rational.</li>
            <li>Assimetria com significado — uma Costura, não um mosaico.</li>
            <li>Sem performance de inteligência — frases curtas e verificáveis.</li>
          </ul>
          <p>A leitura das cinco tensões do brief está em <a href="#/introduction/principles/tensoes-propostas">Princípios</a>, marcada como proposta.</p>
        `
      },
      {
        id: "editorial",
        title: "Página editorial",
        html: `
          <article class="surface surface--editorial">
            <p class="kicker">Ensaio</p>
            <h3 class="surface__title in-voice-human">Uma ideia pode conter duas coisas verdadeiras ao mesmo tempo.</h3>
            <p>A estrutura fica quieta para a frase poder ser longa. Medida de leitura, densidade calm, violeta só na Costura da ressalva.</p>
            <aside class="callout callout--reflection"><p class="in-voice-human">A ressalva não cancela a frase. Ela diz onde a frase deixa de valer.</p></aside>
          </article>
        `
      },
      {
        id: "dashboard",
        title: "Dashboard técnico",
        html: `
          <article class="surface">
            <header class="surface__bar"><h3 class="in-title">Overview</h3><span class="in-badge">PROD</span></header>
            <p>Sistema estável<br /><span class="in-muted">As últimas 24h não mostram degradação relevante.</span></p>
            <div class="metrics">
              <article class="in-card"><p class="in-muted">availability</p><p class="metric in-voice-machine">99.97%</p><span class="in-badge in-badge--success">stable</span></article>
              <article class="in-card"><p class="in-muted">p95 latency</p><p class="metric in-voice-machine">18 ms</p><p class="in-muted">−12%</p></article>
              <article class="in-card"><p class="in-muted">requests</p><p class="metric in-voice-machine">3.2k/s</p><p class="in-muted">+4%</p></article>
            </div>
            <article class="in-card" data-kind="reflection">Há uma anomalia pequena entre 14:20 e 14:43. Ela não afetou disponibilidade, mas merece investigação.</article>
            <div class="in-row"><button class="in-button in-button--primary" type="button">Investigar</button><button class="in-button in-button--commit" type="button">Deploy</button></div>
          </article>
        `
      },
      {
        id: "formulario",
        title: "Formulário complexo",
        html: `
          <p>O formulário operável está em <a href="#/patterns/forms">Formulários</a>. Num fluxo maior, separe identidade do projeto, ambiente e a ação que sai do sistema. Só a última usa commit. Campos readonly mostram hash em machine.</p>
          <div class="in-field">
            <label class="in-field__label" for="rev-hash">Revisão</label>
            <input class="in-input in-voice-machine" id="rev-hash" readonly value="2f41c9a" />
          </div>
        `
      },
      {
        id: "denso",
        title: "Dados densos",
        html: `
          <p>A tabela de <a href="#/patterns/data/tabela">dados</a> é a superfície densa. Focus reduz a linha para 40px sem trocar a fonte de corpo para um tamanho fora da escala. Seleção é checkbox; foco é o anel.</p>
        `
      },
      {
        id: "docs",
        title: "Documentação",
        html: `
          <p>Esta interface é o exemplo. Menu lateral com a seção ativa identificada pela Costura. Busca como ferramenta, não como hero. Laranja não pinta o item corrente. Serif não entra, porque a voz editorial é a mesma Recursive com CASL — e mesmo assim fica restrita a manifesto e reflexão.</p>
        `
      },
      {
        id: "narrativa",
        title: "Reflexão",
        html: `
          ${reflection("<p>Revisão não é fraqueza do sistema. É a prova de que duas leituras ainda cabem na mesma estrutura. A Costura marca essa frase e não o parágrafo anterior.</p>")}
        `
      },
      {
        id: "decisao",
        title: "Decisão e comparação",
        html: `
          <div class="pair">
            <article class="in-card">
              <h3 class="in-title">Manter em rascunho</h3>
              <p class="in-muted">A revisão fica no projeto. Ninguém de fora vê.</p>
              <button class="in-button in-button--primary" type="button">Salvar rascunho</button>
            </article>
            <article class="in-card" data-kind="commit">
              <h3 class="in-title">Tornar público</h3>
              <p class="in-muted">A revisão 2f41c9a passa a ser a de production.</p>
              <button class="in-button in-button--commit" type="button">Publicar</button>
            </article>
          </div>
          <p>As duas opções são verdadeiras. A Costura está só no lado que atravessa o limite. Não há gradiente entre elas.</p>
        `
      }
    ]
  })
];
