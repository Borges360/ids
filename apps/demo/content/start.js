import { code, page } from "./format.js";

export const startPages = [
  page({
    id: "start/setup",
    title: "Instalação e consumo",
    lede: "O monorepo exige Node.js 22.14 ou superior. Nada aqui assume um pacote publicado no registro npm.",
    keywords: ["npm", "install", "cli", "init", "css", "react", "provider"],
    status: "implementado",
    source: "docs/GETTING_STARTED.md · README.md",
    sections: [
      {
        id: "pre-requisitos",
        title: "Pré-requisitos",
        html: `
          <ul>
            <li>Node.js ≥ 22.14. Este repositório declara essa engine em <code>package.json</code>.</li>
            <li>npm com workspaces.</li>
            <li>Para a demo visual, um navegador. A fonte Recursive é carregada do Google Fonts; o restante dos tokens funciona offline depois do build.</li>
          </ul>
        `
      },
      {
        id: "monorepo",
        title: "Instalar o monorepo",
        html: `
          ${code("bash", `cd IDS
npm install
npm run build
npm test`)}
          <p><code>npm run build</code> gera CSS, JSON DTCG, TypeScript, SCSS, Flutter, Swift e Tailwind a partir do catálogo. Não edite <code>packages/tokens/dist</code>.</p>
        `
      },
      {
        id: "consumir",
        title: "Consumir tokens e CSS",
        html: `
          <p>A partir de outro projeto, aponte para o workspace ou para um tarball gerado localmente. Não existe, hoje, <code>npm install @inteiro/tokens</code> no registro público.</p>
          ${code("bash", `npm install ../IDS/packages/tokens
# ou
npm install ../IDS/artifacts/inteiro-tokens-1.0.0.tgz`)}
          ${code("ts", `import { tokens } from "@inteiro/tokens";`)}
          ${code("css", `@import "@inteiro/tokens/css";
@import "@inteiro/design-system/css/components";`)}
          ${code("html", `<html data-in-theme="dark" data-in-density="focus">
  <button class="in-button in-button--primary" type="button">Salvar rascunho</button>
  <button class="in-button in-button--commit" type="button">Publicar</button>
</html>`)}
        `
      },
      {
        id: "cli",
        title: "CLI",
        html: `
          ${code("bash", `npx inteiro init --yes
npx inteiro doctor
npx inteiro tokens search commit
npx inteiro tokens explain color.identity.commit
npx inteiro agents install cursor --yes`)}
          <p><code>init</code> detecta React, Next, Vue, Svelte ou HTML, grava CSS e anexa um bloco INTEIRO em <code>AGENTS.md</code> sem apagar o conteúdo existente. Skills por token são geradas com <code>npx inteiro skills generate</code> e consultadas sob demanda.</p>
        `
      },
      {
        id: "react",
        title: "React",
        html: `
          <p>O pacote <code>@inteiro/react</code> exporta provider, hook e um mapa parcial de CSS variables. Não exporta componentes de interface.</p>
          ${code("tsx", `import { InteiroProvider, useInteiro } from "@inteiro/react";

export function App() {
  return (
    <InteiroProvider appearance="dark" density="focus">
      <Screen />
    </InteiroProvider>
  );
}`)}
          <p><code>appearance</code> aceita <code>dark</code>, <code>light</code>, <code>contrast-dark</code>, <code>contrast-light</code> ou <code>auto</code>. O padrão do provider é <code>auto</code> e densidade <code>focus</code>. <code>useInteiro()</code> lança erro fora do provider. Overrides entram como custom properties no elemento raiz, nunca como hex solto de primitivo se a intenção é semântica.</p>
        `
      },
      {
        id: "exemplo-minimo",
        title: "Exemplo mínimo",
        html: `
          <p>Esta página já é o exemplo: tema dark, densidade focus, um primary e, quando há fronteira com o mundo, um commit. O passo a passo está em <a href="#/start/setup/primeira">primeira interface</a>, abaixo, e o playground em <a href="#/components/button">Button</a>.</p>
          <div class="in-row">
            <button class="in-button in-button--primary" type="button">Salvar rascunho</button>
            <button class="in-button in-button--commit" type="button">Publicar</button>
          </div>
        `
      },
      {
        id: "primeira",
        title: "Primeira interface",
        html: `
          <ol>
            <li>Defina <code>data-in-theme="dark"</code> e <code>data-in-density="focus"</code>. Use <code>calm</code> se a página for editorial.</li>
            <li>Um botão primary por contexto.</li>
            <li>Commit apenas para publicar, fazer deploy ou aplicar uma mudança externa.</li>
            <li>Costura só se a informação muda a interpretação.</li>
            <li>Texto via <code>color.text.*</code>. Opacidade não cria hierarquia de texto ativo.</li>
          </ol>
        `
      },
      {
        id: "integrar",
        title: "Integrar numa aplicação existente",
        html: `
          <p>Importe o CSS depois do reset do produto e antes das regras locais. Mapeie cores antigas para tokens semânticos — não faça busca e troca de hex. <code>docs/MIGRATION.md</code> trata <code>#8B5CF6</code> e <code>#FF9138</code> como o sistema genérico de origem, não como a paleta aprovada.</p>
          ${code("bash", "npx inteiro migrate .")}
        `
      }
    ]
  }),
  page({
    id: "start/trouble",
    title: "Troubleshooting",
    keywords: ["erro", "fonte", "tema", "contraste", "node"],
    lede: "Falhas comuns ao ligar o monorepo, o CSS e os temas. Cada item diz o que verificar e o que não inventar como solução.",
    status: "implementado",
    source: "docs/GETTING_STARTED.md · docs/THEMING.md",
    sections: [
      {
        id: "node",
        title: "Node abaixo de 22.14",
        html: `<p>O build de tokens usa type stripping do Node. Versões anteriores falham ao executar <code>packages/tokens/src/build.ts</code>. Atualize o runtime em vez de transpilar o catálogo à mão.</p>`
      },
      {
        id: "css-ausente",
        title: "Variáveis CSS indefinidas",
        html: `<p>As classes <code>.in-button</code> leem custom properties. Sem <code>@import "@inteiro/tokens/css"</code> — ou sem o arquivo <code>packages/tokens/dist/css/inteiro.css</code> gerado — o componente fica sem cor e sem métrica. Rode <code>npm run build</code> no monorepo.</p>`
      },
      {
        id: "tema",
        title: "Tema não troca",
        html: `<p>O atributo correto é <code>data-in-theme</code> em um ancestral, em geral <code>html</code>. Valores: <code>dark</code>, <code>light</code>, <code>contrast-dark</code>, <code>contrast-light</code>. Sem atributo, <code>prefers-color-scheme: light</code> só ajusta <code>color-scheme</code> quando o documento descreve esse fallback; dark continua sendo a atmosfera primária.</p>`
      },
      {
        id: "fonte",
        title: "Recursive não carrega",
        html: `<p>A demo aponta para o Google Fonts. Offline, o stack cai em <code>ui-sans-serif</code> / Segoe UI e a variação <code>MONO</code>/<code>CASL</code> deixa de existir. Isso não autoriza substituir a família por Inter, Space Grotesk ou Instrument Serif.</p>`
      },
      {
        id: "contraste",
        title: "Contraste reprovado",
        html: `<p>Rode <code>npm run test:contrast</code> e <code>npx inteiro tokens validate</code>. Status nunca é só cor: o par gráfico mínimo é 3:1 e o texto normal é 4.5:1. Não “corrija” escurecendo para preto <code>#000</code> ou clareando para branco <code>#fff</code>.</p>`
      },
      {
        id: "componente-ausente",
        title: "Não acho o componente",
        html: `<p>Se a classe não está em <code>packages/design-system/src/components.css</code> e não há recipe em <code>packages/agent-core/src/recipes.ts</code>, o componente não faz parte do sistema. Confira o <a href="#/components/catalog">catálogo</a> antes de criar um.</p>`
      }
    ]
  })
];
