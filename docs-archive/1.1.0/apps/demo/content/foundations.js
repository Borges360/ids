import { code, doDont, page, reflection } from "./format.js";

const swatch = (token, variable, role) =>
  `<li class="swatch"><span class="swatch__chip" data-swatch="${variable}"></span><span class="swatch__meta"><span class="swatch__name">${token}</span><span class="swatch__role">${role}</span><code class="in-voice-machine swatch__value"></code></span><button type="button" class="copy" data-copy-text="${variable}">Copiar</button></li>`;

export const foundationPages = [
  page({
    id: "foundations/color",
    title: "Cor",
    lede: "Violeta escolhe. Laranja atravessa o limite. Neutros quentes sustentam. Nenhuma cor é decoração.",
    keywords: ["obsidian", "violet", "orange", "warm frost", "contraste", "primitivo", "semântico"],
    status: "implementado",
    source: "packages/tokens/src/catalog/primitives.ts · semantic.ts",
    sections: [
      {
        id: "papeis",
        title: "Papéis semânticos",
        html: `
          <p>Os hex abaixo são o tema <strong>dark</strong>, lidos das custom properties ativas. Troque o tema na barra superior: os chips acompanham. O valor de referência do documento mestre está na tabela seguinte.</p>
          <ul class="swatch-grid">
            ${swatch("color.background.canvas", "--in-color-background-canvas", "Obsidian. Interior, silêncio.")}
            ${swatch("color.background.surface", "--in-color-background-surface", "Agrupamento. Card padrão.")}
            ${swatch("color.background.raised", "--in-color-background-raised", "Camada acima da surface.")}
            ${swatch("color.text.primary", "--in-color-text-primary", "Warm Frost no dark. Texto principal.")}
            ${swatch("color.identity.primary", "--in-color-identity-primary", "Consciência. Seleção e ação deliberada.")}
            ${swatch("color.identity.commit", "--in-color-identity-commit", "Tornar real. Publicar, deploy, aplicar.")}
            ${swatch("color.status.success", "--in-color-status-success", "Resolução factual. Mint.")}
            ${swatch("color.status.warning", "--in-color-status-warning", "Atenção sem ruptura. Amber.")}
            ${swatch("color.status.danger", "--in-color-status-danger", "Ruptura. Erro, exclusão, falha.")}
            ${swatch("color.status.info", "--in-color-status-info", "Informação externa. Não é a marca.")}
            ${swatch("color.focus.ring", "--in-color-focus-ring", "Anel de foco. Distinto de seleção.")}
            ${swatch("color.border.subtle", "--in-color-border-subtle", "Hairline estrutural.")}
          </ul>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nome no documento</th><th>Hex de referência</th><th>Token</th><th>Regra</th></tr></thead>
              <tbody>
                <tr><td>Obsidian</td><td class="in-voice-machine">#0C0D12</td><td><code>color.background.canvas</code></td><td>Canvas dark. Nunca preto puro.</td></tr>
                <tr><td>Warm Frost</td><td class="in-voice-machine">#F4F1EA</td><td><code>color.text.primary</code></td><td>Texto principal no dark.</td></tr>
                <tr><td>Violet</td><td class="in-voice-machine">#A78BFA</td><td><code>color.identity.primary</code></td><td>Dark. No light, violet.600 <span class="in-voice-machine">#704EE0</span>.</td></tr>
                <tr><td>Orange</td><td class="in-voice-machine">#FF9A56</td><td><code>color.identity.commit</code></td><td>Dark. No light, orange.700 <span class="in-voice-machine">#B54A05</span>.</td></tr>
                <tr><td>Mint</td><td class="in-voice-machine">#4FD1B5</td><td><code>color.status.success</code></td><td>Sucesso real, não celebração.</td></tr>
                <tr><td>Amber</td><td class="in-voice-machine">#F2C66D</td><td><code>color.status.warning</code></td><td>Não confundir com commit.</td></tr>
                <tr><td>Rupture</td><td class="in-voice-machine">#FF6B7A</td><td><code>color.status.danger</code></td><td>Erro e destruição.</td></tr>
                <tr><td>Blue</td><td class="in-voice-machine">#72A7FF</td><td><code>color.status.info</code></td><td>Dado externo.</td></tr>
              </tbody>
            </table>
          </div>
          ${doDont(
            `<p>Selecionar projeto usa primary. Deploy usa commit. Excluir usa danger.</p>`,
            `<p>Laranja em todos os gráficos. Violeta como glow. <code>#000</code> ou <code>#fff</code> no lugar dos neutros quentes.</p>`
          )}
        `
      },
      {
        id: "camadas",
        title: "Primitivo, semântico, componente",
        html: `
          <p>Sete famílias primitivas — neutral, violet, orange, mint, red, amber, blue — cada uma com onze degraus de 050 a 950. O CSS expõe <code>--in-ref-color-violet-400</code>. Componente não consome esse nome.</p>
          ${code("css", `/* matéria — não usar no componente */
--in-ref-color-violet-400: #a78bfa;

/* significado — o que o componente lê */
--in-color-identity-primary: var(--in-ref-color-violet-400);

/* ação */
--in-color-action-primary-background: var(--in-color-identity-primary);`)}
          <p>Distribuição cromática de um dashboard, segundo a recipe: neutros cerca de 80%, identidade cerca de 14%, sinal cerca de 4%, status cerca de 2%. É orientação de composição, não um token numérico.</p>
          <p><code>color.accent</code> existe só como alias depreciado de <code>color.identity.commit</code>. Código novo não usa <code>--in-color-accent</code>.</p>
        `
      },
      {
        id: "medidor",
        title: "Medidor de contraste",
        html: `
          <p>O cálculo abaixo usa as cores computadas do tema ativo. O gate de release continua sendo <code>npm run test:contrast</code>, que mede pares de contrato nos temas dark e light. Esta ferramenta não declara conformidade da página.</p>
          <form class="contrast-tool" data-contrast-tool>
            <div class="in-field">
              <label class="in-field__label" for="contrast-fg">Texto ou traço</label>
              <select class="in-input" id="contrast-fg" name="fg">
                <option value="--in-color-text-primary">text.primary</option>
                <option value="--in-color-text-secondary">text.secondary</option>
                <option value="--in-color-text-tertiary">text.tertiary</option>
                <option value="--in-color-identity-primary">identity.primary</option>
                <option value="--in-color-identity-commit">identity.commit</option>
                <option value="--in-color-action-primary-foreground">action.primary.foreground</option>
                <option value="--in-color-status-danger">status.danger</option>
              </select>
            </div>
            <div class="in-field">
              <label class="in-field__label" for="contrast-bg">Fundo</label>
              <select class="in-input" id="contrast-bg" name="bg">
                <option value="--in-color-background-canvas">background.canvas</option>
                <option value="--in-color-background-surface">background.surface</option>
                <option value="--in-color-background-raised">background.raised</option>
                <option value="--in-color-action-primary-background">action.primary.background</option>
                <option value="--in-color-action-commit-background">action.commit.background</option>
              </select>
            </div>
            <p class="contrast-readout in-voice-machine" data-contrast-readout aria-live="polite"></p>
            <p class="contrast-sample" data-contrast-sample>Texto de amostra sobre o fundo escolhido.</p>
          </form>
          <p>No dark, o catálogo registra texto primário sobre canvas em 17.21:1 e primary sobre canvas em 7.13:1. Combinações de status sobre canvas podem ficar abaixo de 4.5:1 — por isso status leva ícone e texto, não só cor. O mínimo gráfico exigido é 3:1.</p>
        `
      }
    ]
  }),
  page({
    id: "foundations/type",
    title: "Tipografia",
    lede: "Uma família, quatro vozes. Recursive atravessa interface, editorial e código por MONO e CASL. Não há segunda família para “humanizar”.",
    keywords: ["recursive", "casl", "mono", "voz", "escala", "space grotesk"],
    status: "implementado",
    source: "packages/tokens/src/catalog/typography.ts",
    sections: [
      {
        id: "vozes",
        title: "Vozes",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Voz</th><th>MONO</th><th>CASL</th><th>Uso</th></tr></thead>
              <tbody>
                <tr><td>rational</td><td class="in-voice-machine">0</td><td class="in-voice-machine">0</td><td>Interface, navegação, controles</td></tr>
                <tr><td>human</td><td class="in-voice-machine">0</td><td class="in-voice-machine">0.35</td><td>Editorial, abertura, reflexão</td></tr>
                <tr><td>signal</td><td class="in-voice-machine">0</td><td class="in-voice-machine">0.10</td><td>Headlines e decisões</td></tr>
                <tr><td>machine</td><td class="in-voice-machine">1</td><td class="in-voice-machine">0</td><td>Código, IDs, métricas, timestamps</td></tr>
              </tbody>
            </table>
          </div>
          <div class="type-voices">
            <p class="in-voice-rational">rational — a navegação desta página</p>
            <p class="in-voice-human">human — a mesma pessoa, com mais interioridade</p>
            <p class="in-voice-signal">signal — uma decisão cabe numa frase</p>
            <p class="in-voice-machine">machine — 2f41c9a · 18 ms · 99.97%</p>
          </div>
          ${code("css", `.in-voice-human { font-variation-settings: "MONO" 0, "CASL" 0.35; }
.in-voice-machine {
  font-family: var(--in-font-family-machine);
  font-variation-settings: "MONO" 1, "CASL" 0;
}`)}
          <p>Editorial, quando a recipe pede, usa tokens de componente: título CASL 0.28, corpo CASL 0.06 em 70ch, reflexão CASL 0.40 com Costura. Classes <code>.in-voice-editorial-*</code> não estão no CSS publicado; o token <code>font.voice.editorial-*</code> está.</p>
          ${reflection("<p>Space Grotesk, IBM Plex Mono e Instrument Serif aparecem num brief posterior. Não há token, fallback nem decisão aprovada para eles. A família permanece Recursive.</p>")}
        `
      },
      {
        id: "escala",
        title: "Escala",
        html: `
          <p>Tamanho, line-height, peso e tracking saem do catálogo. O corpo padrão de UI é 16/25. Display não entra em dashboard denso.</p>
          <div class="type-scale">
            <p style="font-size:clamp(2rem,6vw,var(--in-type-display-lg-size));line-height:1.08;letter-spacing:-0.032em;font-weight:700">Display lg · 52/56 · 700</p>
            <p style="font-size:var(--in-type-heading-h1-size);line-height:var(--in-type-heading-h1-line-height);letter-spacing:var(--in-type-heading-h1-tracking);font-weight:var(--in-type-heading-h1-weight)">Heading h1 · 40/44 · 700</p>
            <p style="font-size:var(--in-type-heading-h2-size);line-height:var(--in-type-heading-h2-line-height);letter-spacing:var(--in-type-heading-h2-tracking);font-weight:var(--in-type-heading-h2-weight)">Heading h2 · 32/38 · 650</p>
            <p style="font-size:var(--in-type-heading-h3-size);line-height:var(--in-type-heading-h3-line-height);font-weight:var(--in-type-heading-h3-weight)">Heading h3 · 24/30 · 650</p>
            <p class="in-title">Title · 20/26 · 600</p>
            <p style="font-size:var(--in-type-body-lg-size);line-height:var(--in-type-body-lg-line-height)">Body lg · 18/29 · editorial</p>
            <p class="in-body">Body md · 16/25 · interface</p>
            <p style="font-size:var(--in-type-body-sm-size);line-height:var(--in-type-body-sm-line-height)">Body sm · 14/21</p>
            <p style="font-size:var(--in-type-label-size);line-height:var(--in-type-label-line-height);font-weight:var(--in-type-label-weight);letter-spacing:var(--in-type-label-tracking)">Label · 13/17 · 600</p>
            <p style="font-size:var(--in-type-caption-size);line-height:var(--in-type-caption-line-height);letter-spacing:var(--in-type-caption-tracking)">Caption · 12/16 · metadata</p>
            <p class="in-voice-machine" style="font-size:var(--in-type-code-size);line-height:var(--in-type-code-line-height)">code · 13/20 · 2f41c9a</p>
            <p class="kicker">Overline · 11/16 · tracking 0.08em</p>
          </div>
          <p>Pesos de família: 400 regular, 500 medium, 600 semibold, 700 bold, 800 strong. O eixo <code>wght</code> da Recursive vai de 300 a 1000; a escala de estilos ainda usa 450 e 650 nos papéis caption e heading — são valores do composto tipográfico, não um convite a inventar 350.</p>
        `
      },
      {
        id: "combinar",
        title: "Como combinar",
        html: `
          ${doDont(
            "<p>Título signal, corpo rational, hash em machine, uma frase de interpretação em human com Costura.</p>",
            "<p>Human em tabela densa. Machine no parágrafo editorial. Uma script font “expressiva” no lugar da variação CASL.</p>"
          )}
          <p>Suporte latino inclui português. Árabe, CJK e outros scripts usam fallback nativo configurável por locale — Recursive não é solução universal.</p>
        `
      }
    ]
  }),
  page({
    id: "foundations/space",
    title: "Espaço, grid e breakpoints",
    lede: "Micrograde de 4px, com passo óptico de 2px. Breakpoints descrevem capacidade espacial, não um aparelho.",
    keywords: ["space", "grid", "breakpoint", "gutter", "densidade", "320"],
    status: "implementado",
    source: "packages/tokens/src/catalog/layout.ts",
    sections: [
      {
        id: "escala",
        title: "Escala de espaço",
        html: `
          <p>O espaço dentro de um grupo nunca é maior que o espaço entre esse grupo e o próximo. Label a 8px do campo; o próximo campo a 24px.</p>
          <div class="space-list" aria-label="Comparação da escala de espaço">
            ${[
              ["000", "0"],
              ["050", "2"],
              ["100", "4"],
              ["150", "6"],
              ["200", "8"],
              ["300", "12"],
              ["400", "16"],
              ["500", "20"],
              ["600", "24"],
              ["800", "32"],
              ["1000", "40"],
              ["1200", "48"],
              ["1600", "64"],
              ["2000", "80"],
              ["2400", "96"],
              ["3200", "128"]
            ]
              .map(
                ([name, px]) =>
                  `<div class="space-row"><span class="in-voice-machine">space.${name}</span><span class="space-bar" style="inline-size:${px}px"></span><span class="in-voice-machine">${px}px</span></div>`
              )
              .join("")}
          </div>
          ${code("css", "padding-inline: var(--in-space-400);\ngap: var(--in-space-200);")}
        `
      },
      {
        id: "grid",
        title: "Grid e containers",
        html: `
          <p>Unidade 4px, ritmo 8px. Colunas: 4 compact, 8 medium, 12 wide. Gutters: 16, 24, 32. A demonstração abaixo muda o número de colunas com a largura da viewport.</p>
          <div class="grid-demo" aria-hidden="true">${"<span></span>".repeat(12)}</div>
          <p class="in-muted">Abaixo de 768px: 4 colunas, gutter 16. A partir de 768px: 8 colunas, gutter 24. A partir de 1280px: 12 colunas, gutter 32.</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Container</th><th>Token</th><th>Valor</th></tr></thead>
              <tbody>
                <tr><td>Estreito</td><td><code>layout.content.narrow</code></td><td class="in-voice-machine">640px</td></tr>
                <tr><td>Leitura</td><td><code>layout.content.reading</code></td><td class="in-voice-machine">70ch</td></tr>
                <tr><td>Padrão</td><td><code>layout.content.standard</code></td><td class="in-voice-machine">1120px</td></tr>
                <tr><td>Amplo</td><td><code>layout.content.wide</code></td><td class="in-voice-machine">1440px</td></tr>
                <tr><td>Dashboard</td><td><code>layout.content.dashboard</code></td><td class="in-voice-machine">1600px</td></tr>
              </tbody>
            </table>
          </div>
        `
      },
      {
        id: "breakpoints",
        title: "Breakpoints",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>min-width</th></tr></thead>
              <tbody>
                <tr><td><code>breakpoint.xs</code></td><td class="in-voice-machine">0</td></tr>
                <tr><td><code>breakpoint.sm</code></td><td class="in-voice-machine">480px</td></tr>
                <tr><td><code>breakpoint.md</code></td><td class="in-voice-machine">768px</td></tr>
                <tr><td><code>breakpoint.lg</code></td><td class="in-voice-machine">1024px</td></tr>
                <tr><td><code>breakpoint.xl</code></td><td class="in-voice-machine">1280px</td></tr>
                <tr><td><code>breakpoint.2xl</code></td><td class="in-voice-machine">1536px</td></tr>
              </tbody>
            </table>
          </div>
          ${code("css", "@media (min-width: 768px) {\n  /* capacidade média — não “tablet” */\n}")}
          <p>Reflow a 320 CSS px é gate de release, independente de <code>breakpoint.xs</code>. Zoom 200% e 400% também. Não nomeie layouts de mobile, tablet ou desktop.</p>
        `
      }
    ]
  }),
  page({
    id: "foundations/shape",
    title: "Borda, raio, elevação",
    lede: "O card padrão não flutua. A Costura é a única borda que significa alguma coisa além de estrutura.",
    keywords: ["radius", "seam", "elevation", "opacity", "z-index", "costura"],
    status: "implementado",
    source: "packages/tokens/src/catalog/motion.ts",
    sections: [
      {
        id: "radius",
        title: "Raio",
        html: `
          <div class="radius-row">
            ${[
              ["none", "0", "tabelas"],
              ["xs", "2px", "indicador"],
              ["sm", "6px", "tag"],
              ["md", "10px", "botão e input"],
              ["lg", "16px", "card"],
              ["xl", "24px", "dialog especial"],
              ["full", "999px", "badge e avatar"]
            ]
              .map(
                ([name, value, use]) =>
                  `<div class="radius-sample" style="border-radius:var(--in-radius-${name})"><span class="in-voice-machine">${name}</span><span>${value}</span><span class="in-muted">${use}</span></div>`
              )
              .join("")}
          </div>
          ${doDont(
            "<p>Botão com <code>radius.md</code>. Badge com <code>radius.full</code>.</p>",
            "<p>Botão em pílula. Tabela com <code>radius.full</code>.</p>"
          )}
        `
      },
      {
        id: "borda",
        title: "Bordas e Costura",
        html: `
          <p>Hairline 1px, emphasis 2px, focus 2px, seam 2px, estilo solid. Sem dashed “tech”.</p>
          ${code("css", `.in-seam {
  border-inline-start: var(--in-border-seam) solid var(--in-color-identity-primary);
  padding-inline-start: var(--in-space-400);
}`)}
          <p>A Costura não é obrigatoriamente a borda esquerda. <code>inline-start</code> troca de lado em RTL.</p>
        `
      },
      {
        id: "elevacao",
        title: "Elevação, opacidade e z-index",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>Uso</th></tr></thead>
              <tbody>
                <tr><td><code>elevation.0</code></td><td>Card padrão. Superfície + borda. Sem sombra.</td></tr>
                <tr><td><code>elevation.1</code></td><td>Sticky. <span class="in-voice-machine">0 1px 2px</span> a 18%.</td></tr>
                <tr><td><code>elevation.2</code></td><td>Dropdown. <span class="in-voice-machine">0 4px 12px</span> a 20%.</td></tr>
                <tr><td><code>elevation.3</code></td><td>Modal e command palette. <span class="in-voice-machine">0 12px 32px</span> a 24%.</td></tr>
                <tr><td><code>elevation.4</code></td><td>Só experiência imersiva. <span class="in-voice-machine">0 24px 64px</span> a 30%.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Opacidade: 0, 0.08, 0.16, 0.24, 0.40, 0.56, 0.72, 0.88, 1. Scrim dark usa 0.72. Texto ativo não usa alpha — usa <code>text.secondary</code> ou <code>text.tertiary</code>.</p>
          <p>Z-index: base 0, raised 10, sticky 20, dropdown 30, overlay 40, modal 50, toast 60, command 70, debug 100. Não existe 999999.</p>
          <div class="elevation-row">
            <div class="elevation-sample" style="box-shadow:var(--in-elevation-0)">0</div>
            <div class="elevation-sample" style="box-shadow:var(--in-elevation-1)">1</div>
            <div class="elevation-sample" style="box-shadow:var(--in-elevation-2)">2</div>
            <div class="elevation-sample" style="box-shadow:var(--in-elevation-3)">3</div>
          </div>
        `
      }
    ]
  }),
  page({
    id: "foundations/motion",
    title: "Movimento e ícones",
    lede: "Movimento explica causa. Não há bounce como linguagem. Ícones seguem uma grade e um traço — não há biblioteca publicada.",
    keywords: ["motion", "easing", "reduced-motion", "icone", "stroke"],
    status: "misto",
    source: "packages/tokens/src/catalog/motion.ts · components.css",
    sections: [
      {
        id: "duracao",
        title: "Duração e easing",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>Valor</th><th>Uso</th></tr></thead>
              <tbody>
                <tr><td><code>motion.none</code></td><td class="in-voice-machine">0ms</td><td>Sem movimento</td></tr>
                <tr><td><code>motion.snap</code></td><td class="in-voice-machine">90ms</td><td>Press e hover</td></tr>
                <tr><td><code>motion.fast</code></td><td class="in-voice-machine">140ms</td><td>Mudança pequena. Botão.</td></tr>
                <tr><td><code>motion.normal</code></td><td class="in-voice-machine">200ms</td><td>UI padrão</td></tr>
                <tr><td><code>motion.deliberate</code></td><td class="in-voice-machine">320ms</td><td>Expandir contexto</td></tr>
                <tr><td><code>motion.slow</code></td><td class="in-voice-machine">480ms</td><td>Transição grande</td></tr>
                <tr><td><code>motion.ambient</code></td><td class="in-voice-machine">700ms</td><td>Não usar em UI operacional</td></tr>
              </tbody>
            </table>
          </div>
          <p>Easings: standard <span class="in-voice-machine">0.2, 0, 0, 1</span>; enter <span class="in-voice-machine">0, 0, 0.2, 1</span>; exit <span class="in-voice-machine">0.4, 0, 1, 1</span>; emphasis <span class="in-voice-machine">0.2, 0.8, 0.2, 1</span>; linear. Entrada desacelera, saída é mais rápida, commit é deliberado.</p>
          <div class="motion-demo" data-motion>
            <div class="motion-track"><span class="motion-dot" data-dot></span></div>
            <div class="in-field">
              <label class="in-field__label" for="motion-duration">Duração</label>
              <select class="in-input" id="motion-duration" data-duration>
                <option value="var(--in-motion-snap)">snap</option>
                <option value="var(--in-motion-fast)" selected>fast</option>
                <option value="var(--in-motion-normal)">normal</option>
                <option value="var(--in-motion-deliberate)">deliberate</option>
                <option value="var(--in-motion-slow)">slow</option>
              </select>
            </div>
            <div class="in-field">
              <label class="in-field__label" for="motion-ease">Easing</label>
              <select class="in-input" id="motion-ease" data-ease>
                <option value="var(--in-ease-standard)">standard</option>
                <option value="var(--in-ease-enter)">enter</option>
                <option value="var(--in-ease-exit)">exit</option>
                <option value="var(--in-ease-emphasis)">emphasis</option>
                <option value="var(--in-ease-linear)">linear</option>
              </select>
            </div>
            <button class="in-button in-button--secondary" type="button" data-run>Reproduzir</button>
          </div>
          <p>Com <code>prefers-reduced-motion: reduce</code>, o CSS gerado encurta animações e transições para 0.01ms. O botão continua operável; o ponto não desliza.</p>
        `
      },
      {
        id: "icones",
        title: "Ícones",
        html: `
          <p><strong>Especificado, sem biblioteca.</strong> Não há pacote de ícones, sprite ou componente Icon. As regras do catálogo:</p>
          <ul>
            <li>Compact 16×16 ao lado de texto. Sozinho, só se o significado for inequívoco.</li>
            <li>Default 24×24 em toolbar e navegação.</li>
            <li>Stroke 1.75px. Ênfase 2px, rara, na ação corrente.</li>
            <li>Uma gramática: outline, caps round. Não misturar filled e duotone na mesma hierarquia.</li>
            <li>Decorativo: <code>aria-hidden="true"</code>. Semântico: nome acessível. Direcional espelha em RTL.</li>
            <li>Ícone não é o único portador de status.</li>
          </ul>
          <div class="icon-sample" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 9v4l2 2"/></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 9v4l2 2"/></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 9v4l2 2"/></svg>
          </div>
          <p class="in-muted">16 / 1.75 · 24 / 1.75 · 24 / 2. Exemplos locais desta página, não um set publicado.</p>
        `
      }
    ]
  }),
  page({
    id: "foundations/language",
    title: "Linguagem",
    lede: "Direto, preciso, reflexivo, técnico quando necessário, honesto sobre incerteza, convicto sobre decisões, humano.",
    keywords: ["microcopy", "voz", "tom", "erro", "vazio"],
    status: "implementado",
    source: "docs/VOICE_AND_TONE.md",
    sections: [
      {
        id: "tom",
        title: "Tom",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>É</th><th>Não é</th></tr></thead>
              <tbody>
                <tr><td>Direto</td><td>Seco</td></tr>
                <tr><td>Preciso</td><td>Pedante</td></tr>
                <tr><td>Reflexivo</td><td>Místico</td></tr>
                <tr><td>Técnico quando necessário</td><td>Cheio de jargão</td></tr>
                <tr><td>Honesto sobre incerteza</td><td>Indeciso</td></tr>
                <tr><td>Convicto sobre decisões</td><td>Arrogante</td></tr>
                <tr><td>Humano</td><td>Startup “quirky”</td></tr>
              </tbody>
            </table>
          </div>
          ${doDont(
            "<p>Excluir “projeto-x”? Essa ação remove também os três ambientes vinculados.</p><p>Deploy concluído<br><span class=\"in-voice-machine\">production · 2f41c9a · agora</span></p>",
            "<p>Are you sure?</p><p>Success!</p><p>Oops! Algo deu errado.</p>"
          )}
        `
      },
      {
        id: "conteudo",
        title: "Regras de conteúdo",
        html: `
          <ul>
            <li>Botão nomeia a ação. “Excluir projeto”, não “Ok”.</li>
            <li>Erro diz o que falhou, a causa se for conhecida, e o próximo passo.</li>
            <li>Sucesso é fato mais contexto machine: ambiente, hash, tempo.</li>
            <li>Estado vazio diz o que falta e a próxima ação, sem teatro.</li>
            <li>Não use emoji para compensar falta de personalidade.</li>
            <li>Não use hexadecimal como ornamento de frase.</li>
          </ul>
        `
      }
    ]
  }),
  page({
    id: "foundations/tokens",
    title: "Tokens",
    lede: "316 tokens na versão 1.0.0. Primitivo, semântico e componente. Intercâmbio DTCG 2025.10. Prefixo CSS --in-.",
    keywords: ["dtcg", "nomenclatura", "camadas", "316", "css variables"],
    status: "implementado",
    source: "docs/TOKENS.md · docs/ARCHITECTURE.md",
    sections: [
      {
        id: "numeros",
        title: "Números do catálogo",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Corte</th><th>Contagem</th></tr></thead>
              <tbody>
                <tr><td>Total</td><td class="in-voice-machine">316</td></tr>
                <tr><td>primitive / semantic / component</td><td class="in-voice-machine">134 / 154 / 28</td></tr>
                <tr><td>source / derived / extension</td><td class="in-voice-machine">254 / 62 / 0</td></tr>
                <tr><td>color</td><td class="in-voice-machine">123</td></tr>
                <tr><td>typography</td><td class="in-voice-machine">79</td></tr>
                <tr><td>space + layout + density</td><td class="in-voice-machine">16 + 19 + 6</td></tr>
                <tr><td>shape + elevation + opacity + z + motion + icon + component</td><td class="in-voice-machine">13 + 5 + 9 + 9 + 12 + 4 + 21</td></tr>
              </tbody>
            </table>
          </div>
          <p>Esses números vêm de <code>docs/TOKENS.md</code>, gerados com o catálogo. Se o build divergir, a fonte a editar é <code>packages/tokens/src/catalog</code>, e em seguida <code>npm run build</code>.</p>
        `
      },
      {
        id: "nomes",
        title: "Nomenclatura",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Superfície</th><th>Exemplo</th></tr></thead>
              <tbody>
                <tr><td>Documentação</td><td class="in-voice-machine">color.identity.primary</td></tr>
                <tr><td>JSON DTCG</td><td>Grupos aninhados. Ponto proibido no nome individual.</td></tr>
                <tr><td>CSS semântico</td><td class="in-voice-machine">--in-color-identity-primary</td></tr>
                <tr><td>CSS primitivo</td><td class="in-voice-machine">--in-ref-color-violet-400</td></tr>
                <tr><td>Componente</td><td class="in-voice-machine">--in-button-size-md-height</td></tr>
              </tbody>
            </table>
          </div>
          ${code("bash", `npx inteiro tokens search commit
npx inteiro tokens explain color.identity.primary`)}
          <p>Cada token também tem uma página gerada em <code>docs/tokens/generated/</code>. Alias <code>{color.identity.commit}</code> no JSON aponta para outro token; o componente não aponta para hex.</p>
          <p>Status do tipo no catálogo: <code>source</code>, <code>derived</code>, <code>extension</code>. Depreciação não é um desses três: <code>color.accent</code> está marcado na subcategoria e na descrição.</p>
        `
      },
      {
        id: "formato",
        title: "DTCG",
        html: `
          <p>O arquivo de intercâmbio é <code>packages/tokens/dist/json/tokens.json</code> após o build. O exportador em <code>packages/tokens/src/dtcg.ts</code> emite o formato 2025.10. Além de JSON: CSS, TypeScript, SCSS, Flutter, Swift e Tailwind.</p>
          ${code("bash", "npm run build -w @inteiro/tokens")}
        `
      }
    ]
  }),
  page({
    id: "foundations/themes",
    title: "Temas e densidade",
    lede: "Dark é a atmosfera primária. Light é tema de fonte. Contrast é extensão implementada. Densidade troca ritmo, não personalidade.",
    keywords: ["dark", "light", "contrast", "calm", "focus", "tema"],
    status: "misto",
    source: "docs/THEMING.md",
    sections: [
      {
        id: "temas",
        title: "Temas",
        html: `
          ${code("html", `<html data-in-theme="dark" data-in-density="focus">`)}
          <div class="table-wrap">
            <table>
              <thead><tr><th>Valor</th><th>Status</th><th>Papel</th></tr></thead>
              <tbody>
                <tr><td><code>dark</code></td><td>Implementado. Padrão.</td><td>Atmosfera primária.</td></tr>
                <tr><td><code>light</code></td><td>Implementado. Fonte.</td><td>Mesma semântica, matéria mais clara.</td></tr>
                <tr><td><code>contrast-dark</code></td><td>Implementado como extensão.</td><td><code>docs/THEMING.md</code> registra que o documento mestre cita high contrast sem tabela completa. O CSS aumenta contraste de texto e borda.</td></tr>
                <tr><td><code>contrast-light</code></td><td>Implementado como extensão.</td><td>Idem, sobre o tema claro.</td></tr>
              </tbody>
            </table>
          </div>
          <p>O seletor desta documentação aplica o atributo de verdade. Overrides de runtime atuam na semântica:</p>
          ${code("css", ".my-context { --in-color-identity-primary: #b59bff; }")}
          <p>Não sobrescreva <code>violet.400</code> para “ajustar a marca”.</p>
        `
      },
      {
        id: "densidade",
        title: "Densidade",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>calm</th><th>focus</th></tr></thead>
              <tbody>
                <tr><td><code>density.card-padding</code></td><td class="in-voice-machine">24px</td><td class="in-voice-machine">16px</td></tr>
                <tr><td><code>density.table-row</code></td><td class="in-voice-machine">52px</td><td class="in-voice-machine">40px</td></tr>
                <tr><td><code>density.input-default</code></td><td class="in-voice-machine">48px</td><td class="in-voice-machine">44px</td></tr>
                <tr><td><code>density.section-gap</code></td><td class="in-voice-machine">48px</td><td class="in-voice-machine">32px</td></tr>
                <tr><td><code>density.list-gap</code></td><td class="in-voice-machine">12px</td><td class="in-voice-machine">8px</td></tr>
              </tbody>
            </table>
          </div>
          <p>Calm não significa “grande”. Focus não significa “apertado”. O alvo primário permanece pelo menos 44px. Editorial usa calm; dashboard usa focus. O seletor de densidade desta página altera <code>data-in-density</code> no documento — o padding dos cards <code>.in-card</code> muda.</p>
        `
      }
    ]
  })
];
