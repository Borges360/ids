import { code, page, reflection } from "./format.js";

export const qualityPages = [
  page({
    id: "a11y/guide",
    title: "Acessibilidade",
    lede: "WCAG 2.2 AA é o requisito declarado no documento mestre e em docs/ACCESSIBILITY.md. Esta página não certifica o site. Ela registra o contrato e o que foi exercitado.",
    keywords: ["wcag", "foco", "teclado", "contraste", "reduced motion", "leitor de tela"],
    status: "misto",
    source: "docs/ACCESSIBILITY.md · tests/contrast",
    sections: [
      {
        id: "requisito",
        title: "Requisito",
        html: `
          <ul>
            <li>Texto normal ≥ 4.5:1. Texto grande ≥ 3:1. Componente e gráfico ≥ 3:1.</li>
            <li>Foco visível, 2px com offset 2px, distinto de selected.</li>
            <li>Teclado completo nos controles que existem.</li>
            <li>Cor não é o único canal de status.</li>
            <li><code>prefers-reduced-motion</code>.</li>
            <li>Reflow 320px, zoom 200% e 400%, text-spacing.</li>
            <li>Disabled não é readonly. Erro tem mensagem.</li>
            <li>Propriedades lógicas para LTR e RTL.</li>
            <li>Nome, papel e estado. ARIA não conserta um div no lugar de um botão.</li>
            <li>Alvo primário 44×44, acima do mínimo AA de 24×24.</li>
          </ul>
        `
      },
      {
        id: "teclado",
        title: "Teclado e foco",
        html: `
          <p>Ordem de foco é a ordem do DOM. O atalho de busca é <kbd>Ctrl</kbd> + <kbd>K</kbd> (ou <kbd>⌘</kbd> + <kbd>K</kbd>). Escape fecha busca, menu móvel e o diálogo de exclusão. O link “Saltar para o conteúdo” é o primeiro foco.</p>
          <p>Na documentação, a página troca o foco para o título ao navegar pelo menu, para o leitor de tela não permanecer na sidebar. Dentro de um diálogo, o foco fica preso pelo elemento <code>dialog</code> e volta ao controle que o abriu.</p>
          <p>Não remova <code>outline</code>. O anel usa <code>color.focus.ring</code>.</p>
        `
      },
      {
        id: "semantica",
        title: "Semântica, nomes e formulários",
        html: `
          <p>Botão é <code>button</code>. Busca é <code>search</code>. Navegação tem <code>aria-label</code>. Seção atual usa <code>aria-current="page"</code>. Campo de formulário tem label visível. Erro aponta <code>aria-describedby</code>. Badge não recebe role de botão.</p>
          <p>Leitor de tela: o título da página muda com a seção. Regiões <code>role="status"</code> anunciam salvar, filtrar, tentar de novo e o resultado do diálogo. Ícones decorativos desta página levam <code>aria-hidden</code>.</p>
        `
      },
      {
        id: "movimento",
        title: "Movimento, zoom e toque",
        html: `
          <p>O CSS de tokens zera duração de animação e transição quando <code>prefers-reduced-motion: reduce</code>. O playground de movimento continua tendo botão; o deslocamento não é uma animação longa.</p>
          <p>Texto usa unidades que refluem. Tabelas rolam em vez de cortar. Alvos de navegação e botões md/lg têm no mínimo 44px. sm de botão é exceção documentada.</p>
          <p>Zoom e text-spacing estão no gate do documento. Esta sessão não executou uma auditoria manual de zoom 400% em todos os temas — ver <a href="#/resources/guide/validacao">validação</a>.</p>
        `
      },
      {
        id: "testes",
        title: "Como testar",
        html: `
          ${code("bash", `npx inteiro tokens validate
npm run test:contrast`)}
          <p>O teste de contraste mede pares de contrato. Não é um scanner de página. Não há, neste repositório, suíte Playwright nem axe sobre a documentação no momento em que esta página foi escrita. Um teste de catálogo em Vitest confere links internos e a presença do menu. Isso não equivale a conformidade WCAG.</p>
          <p>Manual mínimo antes de chamar uma tela de pronta: Tab por todos os controles, Escape nos diálogos, nome no leitor de tela, 320px sem perda de função, tema light e dark, reduced motion.</p>
        `
      }
    ]
  }),
  page({
    id: "engineering/guide",
    title: "Engenharia",
    lede: "Dependência em uma direção: identidade, primitivo, semântico, componente, plataformas. O que está no código está separado do que a arquitetura ainda não fez.",
    keywords: ["arquitetura", "css", "typescript", "ssr", "semver", "build"],
    status: "implementado",
    source: "docs/ARCHITECTURE.md · docs/PUBLISHING.md",
    sections: [
      {
        id: "arquitetura",
        title: "Arquitetura",
        html: `
          ${code("text", `decisões de identidade
        ↓
  primitives
        ↓
  semantic  ← temas
        ↓
  component ← densidade
        ↓
  CSS / TS / Flutter / skills / agentes`)}
          <p>Componente não aponta para hex nem para primitivo de cor. O monorepo é independente de framework. Adaptadores só traduzem o núcleo para cada harness.</p>
          <p>Pacotes: tokens, design-system, cli, agent-core, mcp, react, skills, adapter-codex, adapter-claude, adapter-devin, adapter-cursor, adapter-pi, adapter-hermes, integrations.</p>
        `
      },
      {
        id: "contratos",
        title: "CSS, TypeScript e temas",
        html: `
          <p>Custom properties usam o prefixo <code>--in-</code>. O arquivo <code>inteiro.css</code> reúne os temas. Classes de recipe vivem em <code>packages/design-system/src/components.css</code> e não são geradas pelo catálogo — essa é uma fronteira real: mudar um token de botão no catálogo atualiza a variável, e a classe já consome a variável.</p>
          <p>TypeScript público de tokens sai em <code>packages/tokens/dist/ts/tokens.generated.ts</code>. O provider React está em <code>packages/react/src/InteiroProvider.ts</code>. Não há contrato de props para Button.</p>
          <p>Tema é atributo no ancestral mais CSS variables. Não há runtime de tema em JavaScript além do provider, que escreve <code>data-in-theme</code> e <code>data-in-density</code>.</p>
        `
      },
      {
        id: "runtime",
        title: "SSR, performance e testes",
        html: `
          <p>CSS não depende de hidratação. O provider React renderiza um <code>div.in-root</code> no servidor se o app for SSR; não há teste de hidratação neste repositório. A documentação é HTML estático com módulos JS, servida por <code>npm run demo</code>.</p>
          <p>Performance do núcleo: sem framework na camada de tokens. A demo carrega Recursive pela rede. Ícones da página de fundamentos são SVG inline, três no total.</p>
          <p>Testes existentes: Vitest, incluindo contraste. Não há regressão visual automatizada. Build: <code>npm run build</code>. Checagem de pacote: <code>npm run pack:check</code>. Lint/typecheck: <code>npm run lint</code>.</p>
          <p>Compatibilidade declarada: Node ≥ 22.14. CSS em qualquer stack que aceite custom properties e atributos <code>data-*</code>.</p>
        `
      },
      {
        id: "doc-site",
        title: "Como esta documentação é feita",
        html: `
          <p>Conteúdo em <code>apps/demo/content/*.js</code>. Casca em <code>index.html</code>, apresentação em <code>docs.css</code>, comportamento em <code>app.js</code>. Não há MDX nem Storybook. Acrescentar uma página é criar um objeto no módulo certo e um item em <code>content/index.js</code>. O teste <code>tests/docs-site.test.ts</code> falha se o menu e as páginas divergirem ou se um caminho interno não existir.</p>
        `
      }
    ]
  }),
  page({
    id: "governance/guide",
    title: "Governança",
    lede: "Identidade Owner decide se a mudança continua sendo INTEIRO. “Ficou bonito” não entra no núcleo.",
    keywords: ["adr", "semver", "depreciacao", "contribuicao", "changelog"],
    status: "implementado",
    source: "docs/CONTRIBUTING.md · docs/MIGRATION.md · CHANGELOG.md",
    sections: [
      {
        id: "criterios",
        title: "Criar ou alterar",
        html: `
          <p>Perguntas de entrada no core, em <code>docs/CONTRIBUTING.md</code>: resolve recorrência? Expressa a ideia central? Reduz arbitrariedade? Melhora acessibilidade? Esclarece semântica?</p>
          <p>Componente novo só nasce se a resposta for sim e se não couber numa recipe já existente. Alteração de componente preserva o significado: primary continua sendo escolha. Trocar primary de violeta para laranja é MAJOR, mesmo que o TypeScript compile.</p>
        `
      },
      {
        id: "processo",
        title: "Proposta, revisão e ADR",
        html: `
          <ol>
            <li>Identity Owner decide se a mudança continua sendo INTEIRO.</li>
            <li>Altere o catálogo em <code>packages/tokens/src/catalog</code>, nunca os arquivos gerados.</li>
            <li><code>npm run build && npm test</code>.</li>
            <li>Changelog com Added, Changed, Fixed, Accessibility, Deprecated, Removed, Migration.</li>
            <li>ADR curto para decisão estrutural, em <code>docs/adrs/</code> quando necessário. Já existe o ADR “Orange is commit, not generic accent” no documento mestre.</li>
          </ol>
          <p>Extensão nova marca <code>status: "extension"</code> e aparece em <code>docs/SOURCE_TRACEABILITY.md</code>. Não há, no repositório, um quadro de ownership com nomes de pessoas além do papel Identity Owner.</p>
          <p>Design review e code review não têm ferramenta obrigatória descrita. O critério de qualidade é o das perguntas acima mais o gate de contraste.</p>
        `
      },
      {
        id: "versao",
        title: "Versão, depreciação e migração",
        html: `
          <p>SemVer mais contrato visual. Versão atual <span class="in-voice-machine">1.0.0</span>. Changelog na raiz.</p>
          <p><code>color.accent</code> está depreciado. O substituto é <code>color.identity.commit</code>. Não use <code>--in-color-accent</code> em código novo.</p>
          ${code("bash", "npx inteiro migrate .")}
          <p>A migração de um sistema genérico (Inter, roxo <span class="in-voice-machine">#8B5CF6</span>, laranja <span class="in-voice-machine">#FF9138</span>) para INTEIRO é mudança de linguagem, não search-and-replace. Ver <code>docs/MIGRATION.md</code>.</p>
        `
      },
      {
        id: "contribuir",
        title: "Contribuir",
        html: `
          <p>Documentação nova entra em <code>apps/demo/content</code> e no menu. Markdown em <code>docs/</code> continua sendo a trilha para quem lê no repositório. Os dois não podem contradizer o catálogo. Se contradisserem, o catálogo e o documento mestre ganham, e a página deve dizer o conflito.</p>
        `
      }
    ]
  }),
  page({
    id: "resources/guide",
    title: "Recursos",
    lede: "Onde está o código, o que os nomes querem dizer, o que ficou pendente e o que esta sessão conseguiu verificar.",
    keywords: ["faq", "glossario", "changelog", "conflito", "validacao", "pendencia"],
    status: "misto",
    source: "README.md · docs/",
    sections: [
      {
        id: "arquivos",
        title: "Arquivos",
        html: `
          <ul>
            <li>Tokens DTCG gerados: <code>packages/tokens/dist/json/tokens.json</code></li>
            <li>CSS: <code>packages/tokens/dist/css/inteiro.css</code> e <code>packages/design-system/src/components.css</code></li>
            <li>Contraste medido: <code>packages/tokens/dist/json/contrast.json</code></li>
            <li>Documento mestre: <code>deep-research-report.md</code></li>
            <li>Markdown: <code>docs/GETTING_STARTED.md</code>, <code>ARCHITECTURE.md</code>, <code>TOKENS.md</code>, <code>COMPONENTS.md</code>, <code>BRAND.md</code>, <code>VOICE_AND_TONE.md</code>, <code>ACCESSIBILITY.md</code>, <code>THEMING.md</code>, <code>CONTRIBUTING.md</code>, <code>MIGRATION.md</code></li>
            <li>Páginas de token: <code>docs/tokens/generated/</code></li>
            <li>Changelog: <code>CHANGELOG.md</code></li>
            <li>Não há arquivo de Figma, template de slide nem app de exemplo além de <code>examples/nextjs</code> e <code>apps/demo</code>.</li>
          </ul>
          <p>Para abrir esta documentação: <code>npm run demo</code> e acesse <span class="in-voice-machine">/apps/demo/index.html</span>.</p>
        `
      },
      {
        id: "glossario",
        title: "Glossário",
        html: `
          <dl class="gloss">
            <dt>Costura</dt><dd><code>border-inline-start</code> de 2px. Assinatura. Não é decoração.</dd>
            <dt>Primary</dt><dd>Ação de escolha. Violeta semântico.</dd>
            <dt>Commit</dt><dd>Ação que torna algo real fora do rascunho. Laranja semântico.</dd>
            <dt>Obsidian</dt><dd>Canvas dark <span class="in-voice-machine">#0C0D12</span>.</dd>
            <dt>Warm Frost</dt><dd>Texto principal no dark <span class="in-voice-machine">#F4F1EA</span>.</dd>
            <dt>Voz</dt><dd>Estado de Recursive via MONO e CASL: rational, human, signal, machine.</dd>
            <dt>Calm / focus</dt><dd>Densidades. Respiração editorial ou operação densa.</dd>
            <dt>Recipe</dt><dd>Contrato em agent-core. Pode não ter classe CSS.</dd>
            <dt>DTCG</dt><dd>Formato de intercâmbio dos tokens, versão 2025.10 neste catálogo.</dd>
          </dl>
        `
      },
      {
        id: "faq",
        title: "FAQ",
        html: `
          <h3 id="faq-npm">O pacote está no npm?</h3>
          <p>Não. Instale pelo monorepo ou por tarball. Ver <a href="#/start/setup">instalação</a>.</p>
          <h3 id="faq-react">Existe &lt;Button&gt; em React?</h3>
          <p>Não. Use as classes CSS. O pacote React só oferece provider.</p>
          <h3 id="faq-laranja">Posso usar laranja como accent?</h3>
          <p>Não. Laranja é commit. <code>color.accent</code> está depreciado.</p>
          <h3 id="faq-fonte">Posso trocar Recursive por outra família?</h3>
          <p>Não, sem uma decisão de identidade. O brief que cita Space Grotesk, IBM Plex Mono e Instrument Serif não foi adotado.</p>
          <h3 id="faq-componente">Por que não há Tabs?</h3>
          <p>Porque ninguém especificou nem implementou. O catálogo diz ausente em vez de desenhar uma API fictícia.</p>
        `
      },
      {
        id: "changelog",
        title: "Changelog 1.0.0",
        html: `
          <ul>
            <li>Added — catálogo DTCG, SDK, CLI, MCP, skills, adaptadores, temas, densidades, demo, testes de contraste.</li>
            <li>Accessibility — pares de contrato, reduced motion no CSS gerado, alvo 44px no md.</li>
            <li>Migration — primeira versão. Ver <code>docs/MIGRATION.md</code>.</li>
          </ul>
          <p>Não há entradas posteriores a 1.0.0 no <code>CHANGELOG.md</code> da raiz.</p>
        `
      },
      {
        id: "conflitos",
        title: "Conflitos e pendências",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Assunto</th><th>Brief ou expectativa</th><th>Resolução nesta documentação</th></tr></thead>
              <tbody>
                <tr><td>Paleta Interior, Estrutura, Identidade <span class="in-voice-machine">#8B5CF6</span>, Fricção <span class="in-voice-machine">#FF9138</span>, Abertura, Distância</td><td>Usar como identidade</td><td><strong>Não adotado.</strong> <code>MIGRATION.md</code> trata esses hex de roxo e laranja como o sistema genérico de origem. Aprovado: Obsidian, Warm Frost, violet.400 / violet.600, orange.400 / orange.700.</td></tr>
                <tr><td>Space Grotesk, IBM Plex Mono, Instrument Serif</td><td>Três famílias</td><td><strong>Proposto, não aprovado.</strong> Permanece Recursive e as quatro vozes.</td></tr>
                <tr><td>Cinco tensões do brief</td><td>Substituir a filosofia</td><td><strong>Proposta de leitura</strong> mapeada às cinco leis. As leis do documento mestre continuam normativas. Ver <a href="#/introduction/principles">Princípios</a>.</td></tr>
                <tr><td>Catálogo amplo de componentes React</td><td>Documentar API, playground de props</td><td><strong>Não inventado.</strong> Playgrounds existem só para Button, Input, Card e Badge, que têm classe.</td></tr>
                <tr><td>contrast-dark / contrast-light</td><td>Tema oficial completo</td><td><strong>Implementado como extensão.</strong> O documento de temas admite que a tabela de high contrast não estava fechada na fonte.</td></tr>
                <tr><td>Hover de ghost</td><td>Recipe pede identity subtle</td><td><strong>Lacuna.</strong> A classe não tem esse hover.</td></tr>
                <tr><td>Badge outline, tamanhos sm/lg de input</td><td>Tokens ou recipe</td><td><strong>Especificado sem classe</strong> correspondente.</td></tr>
                <tr><td>Storybook, MDX, Playwright, axe, teste visual</td><td>Stack de documentação madura</td><td><strong>Não adicionados.</strong> O repositório testa com Vitest. Incluir Playwright seria ferramenta nova, não uma correção do que já existe.</td></tr>
                <tr><td>Figma e templates</td><td>Recursos de design</td><td><strong>Ausentes</strong> no repositório.</td></tr>
              </tbody>
            </table>
          </div>
          ${reflection("<p>Pendência que precisa de aprovação: adotar ou recusar explicitamente as cinco tensões do brief e qualquer família tipográfica além de Recursive. Até lá, a documentação não as implementa como norma.</p>")}
        `
      },
      {
        id: "validacao",
        title: "Validação",
        html: `
          <p>O relatório da sessão que construiu este site fica em <code>docs/DOCUMENTATION_SITE.md</code>, atualizado quando os testes rodam. Comandos:</p>
          ${code("bash", `npm run demo
npm test
npm run test:contrast`)}
          <p>O que esta interface implementa de fato: menu hierárquico, breadcrumbs, busca com Ctrl/Cmd+K, índice da seção com scrollspy, tema e densidade reais, cópia de código e de token, playgrounds dos quatro componentes com classe, medidor de contraste, filtro, diálogo de confirmação, formulário que valida, estados de vazio e de erro, reduced motion herdado do CSS de tokens, e layout que empilha no mobile.</p>
          <p>O que não foi declarado: conformidade WCAG da página, auditoria axe, regressão visual, publicação npm.</p>
        `
      }
    ]
  })
];
