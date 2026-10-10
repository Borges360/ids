import { code, commitNote, doDont, page, reflection } from "./format.js";

export const introductionPages = [
  page({
    id: "introduction/overview",
    title: "O que é o INTEIRO",
    lede: "Sistema de identidade pessoal para dar forma à tensão — não para apagá-la. Referência de linguagem, tokens e recipes de implementação.",
    keywords: ["inteiro", "identidade", "costura", "manifesto", "ecossistema", "limites"],
    status: "implementado",
    source: "deep-research-report.md · docs/BRAND.md",
    sections: [
      {
        id: "definicao",
        title: "Definição",
        html: `
          <blockquote class="manifesto in-voice-signal">Não eliminar a tensão. Dar forma a ela.</blockquote>
          <p>INTEIRO não é uma personalidade artificialmente perfeita, nem uma marca que precisa parecer profunda. É a infraestrutura visual de alguém que pensa de modo estruturado, questiona premissas e reconhece conflito sem dissolver a estrutura.</p>
          <p>O repositório transforma o documento mestre em artefatos instaláveis: tokens DTCG 2025.10, CSS, CLI, API para agentes, MCP e recipes. A versão atual do catálogo é <span class="in-voice-machine">1.0.0</span>. O pacote não está publicado no npm público.</p>
          ${reflection("<p>Inteiro não é não ter partes em conflito. É conseguir fazê-las pertencer ao mesmo sistema.</p>")}
        `
      },
      {
        id: "por-que",
        title: "Por que existe",
        html: `
          <p>Sem um contrato, violeta vira “cor de tecnologia” e laranja vira accent genérico. O sistema existe para que cada sinal tenha um papel estreito:</p>
          <ul>
            <li><strong>Violeta</strong> — estou escolhendo.</li>
            <li><strong>Laranja</strong> — estou tornando real.</li>
            <li><strong>Recursive</strong> — a mesma voz, do racional ao humano.</li>
            <li><strong>Costura</strong> — duas verdades no mesmo sistema.</li>
            <li><strong>Calm / focus</strong> — respirar ou operar, sem trocar de pessoa.</li>
          </ul>
          <p>A estrutura pesa mais que a expressão. A interface deve ficar mais interessante com o tempo, não mais impressionante em cinco segundos.</p>
        `
      },
      {
        id: "para-quem",
        title: "Para quem",
        html: `
          <p>Para quem implementa interfaces desta identidade: desenvolvedores, designers e agentes de IA que precisam decidir sem descaracterizar o sistema.</p>
          <p>Não é um kit de marketing, um dashboard administrativo nem uma biblioteca React completa. O produto declarável hoje é um contrato: tokens, CSS e recipes em <span class="in-voice-machine">@inteiro/agent-core</span>.</p>
          ${commitNote("<p>Use INTEIRO quando a interface precisa distinguir escolha, compromisso com o mundo e interpretação. Não use quando o produto pede outra personalidade, outro idioma visual ou uma suíte de componentes que este repositório ainda não implementa.</p>")}
        `
      },
      {
        id: "limites",
        title: "Limites",
        html: `
          <ul>
            <li>Não há pacote npm público. A instalação é local ou por tarball.</li>
            <li>Não há componentes React de Button, Input ou Dialog. Existe <span class="in-voice-machine">InteiroProvider</span>.</li>
            <li>Classes CSS publicadas: botão, campo, card, badge, vozes e agrupamentos.</li>
            <li>Dialog, tabela, navegação, empty state e loading são recipes — especificação com passos, sem classe <span class="in-voice-machine">.in-*</span> própria.</li>
            <li>IconButton, Textarea, Select, Checkbox, Radio, Switch, Tabs, Toast, Tooltip, Popover, Drawer, Pagination e similares não existem no catálogo. Não devem ser inventados como se já fizessem parte do sistema.</li>
          </ul>
          <p>O mapa completo está no <a href="#/components/catalog">catálogo</a>.</p>
        `
      },
      {
        id: "ecossistema",
        title: "Ecossistema",
        html: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Pacote</th><th>Função</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td><code>@inteiro/tokens</code></td><td>Catálogo DTCG, CSS, JSON, TS, SCSS, Flutter, Swift, Tailwind</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/design-system</code></td><td>CSS de recipes e reexportação do núcleo</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/cli</code></td><td><code>inteiro init</code>, <code>doctor</code>, <code>tokens</code>, <code>agents</code></td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/agent-core</code></td><td>explain, search, recipes, guidelines, audit</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/mcp</code></td><td>Servidor MCP stdio</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/react</code></td><td>Provider e tema por CSS variables</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/skills</code></td><td>Geração de SKILL.md</td><td>Implementado</td></tr>
                <tr><td><code>@inteiro/adapter-*</code></td><td>Codex, Claude, Devin, Cursor, Pi, Hermes</td><td>Adaptadores; harness nativo não validado nesta sessão</td></tr>
              </tbody>
            </table>
          </div>
          <p>Fonte de identidade: <span class="in-voice-machine">deep-research-report.md</span>. Fonte de tokens: <span class="in-voice-machine">packages/tokens/src/catalog</span>. Arquivos em <span class="in-voice-machine">dist/</span> e <span class="in-voice-machine">docs/tokens/generated/</span> são gerados.</p>
        `
      }
    ]
  }),
  page({
    id: "introduction/principles",
    title: "Princípios",
    lede: "Cinco leis aprovadas no documento mestre. Cada uma com consequência, exemplo e contraexemplo. As tensões do brief de documentação estão registradas como leitura proposta, não como substituição.",
    keywords: ["princípios", "leis", "tensão", "costura", "densidade", "assimetría"],
    status: "misto",
    source: "deep-research-report.md · docs/BRAND.md",
    sections: [
      {
        id: "leis",
        title: "As cinco leis",
        html: `
          <p>O princípio central aprovado: INTEIRO não resolve tensão eliminando um dos lados. Cria estrutura suficiente para que os dois existam.</p>
          <article class="principle">
            <h3 id="estrutura-silenciosa">A estrutura deve ser silenciosa</h3>
            <p><strong>Definição.</strong> Grid, alinhamento, tokens e hierarquia são rigorosos e não chamam atenção para si.</p>
            <p><strong>Consequência.</strong> Espaçamento sai da escala. Sombra não substitui superfície e borda.</p>
            ${doDont(
              "<p>Card com surface, hairline e <code>radius.lg</code>. O olho vai para o conteúdo.</p>",
              "<p>Card com glow, glass e gradiente para “parecer sistema de design”.</p>"
            )}
          </article>
          <article class="principle">
            <h3 id="pontos-de-decisao">A personalidade aparece em pontos de decisão</h3>
            <p><strong>Definição.</strong> Violeta e laranja marcam escolha e compromisso. O resto permanece neutro.</p>
            <p><strong>Consequência.</strong> Um primary por contexto. Commit só quando a ação sai para o mundo.</p>
            ${doDont(
              "<p><button class=\"in-button in-button--primary\" type=\"button\">Salvar rascunho</button> <button class=\"in-button in-button--commit\" type=\"button\">Publicar</button></p>",
              "<p>Quatro botões violet, ou um gráfico inteiro laranja “porque é a marca”.</p>"
            )}
          </article>
          <article class="principle">
            <h3 id="densidade">Densidade é permitida; desordem não</h3>
            <p><strong>Definição.</strong> Um dashboard pode carregar muita informação. A prioridade perceptiva é que organiza.</p>
            <p><strong>Consequência.</strong> <code>data-in-density="focus"</code> aproxima. Não reduz o corpo a 10px nem esconde dados para “limpar”.</p>
            ${doDont(
              "<p>Métricas em voz machine, interpretação em voz rational, Costura só na anomalia.</p>",
              "<p>Esconder a anomalia num tooltip decorativo para o overview parecer calmo.</p>"
            )}
          </article>
          <article class="principle">
            <h3 id="assimetria">Assimetria só quando comunica tensão</h3>
            <p><strong>Definição.</strong> O layout-base é estável. A Costura — <code>border-inline-start</code> de 2px — é o corte.</p>
            <p><strong>Consequência.</strong> Costura em quatro situações: reflexão editorial, informação que muda interpretação, conflito entre alternativas, transição de contexto.</p>
            ${doDont(
              "<p>A Costura sobrevive a RTL porque usa propriedade lógica, não <code>border-left</code>.</p>",
              "<p>Costura em todo card do dashboard.</p>"
            )}
          </article>
          <article class="principle">
            <h3 id="nao-performar">O sistema nunca performa inteligência</h3>
            <p><strong>Definição.</strong> Sem frase rebuscada para parecer profundo, sem terminal falso, sem hexadecimal como decoração, sem jargão onde uma palavra serve.</p>
            <p><strong>Consequência.</strong> Microcopy diz o que aconteceu, por quê se souber, e o que fazer.</p>
            ${doDont(
              "<p>Não foi possível salvar. A conexão foi interrompida antes da confirmação.</p>",
              "<p>Oops! Algo deu errado.</p>"
            )}
          </article>
        `
      },
      {
        id: "tensoes-propostas",
        title: "Tensões do brief — leitura proposta",
        html: `
          <p>Um brief de documentação listou cinco tensões (Autenticidade × Pertencimento, Convicção × Abertura, Controle × Vulnerabilidade, Excelência × Sustentabilidade, Justiça × Pragmatismo) e pediu que orientassem a composição. Elas não substituem as leis do documento mestre. A leitura abaixo é <strong>proposta</strong> e depende de aprovação do Identity Owner.</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Tensão proposta</th><th>Tradução já suportada pelas leis</th></tr></thead>
              <tbody>
                <tr><td>Autenticidade × Pertencimento</td><td>Costura: corte próprio dentro de uma grelha compartilhada.</td></tr>
                <tr><td>Convicção × Abertura</td><td>Violeta decide; a Costura de reflexão guarda a ressalva.</td></tr>
                <tr><td>Controle × Vulnerabilidade</td><td>Voz machine para o fato; voz human para a interpretação.</td></tr>
                <tr><td>Excelência × Sustentabilidade</td><td>Escala fechada de tokens. Sem um efeito novo por tela.</td></tr>
                <tr><td>Justiça × Pragmatismo</td><td>Princípio com recipe aplicável, não só manifesto.</td></tr>
              </tbody>
            </table>
          </div>
          ${reflection("<p>Enquanto essa leitura não for aprovada, exemplos desta documentação demonstram as cinco leis — não uma paleta ou tipografia alternativas.</p>")}
        `
      }
    ]
  })
];
