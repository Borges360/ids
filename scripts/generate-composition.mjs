import { mkdir, writeFile, readFile } from "node:fs/promises";
import { allTokens } from "../packages/tokens/src/index.ts";
const samples = {
  "app-shell": [
    "Estrutura da aplicação shell",
    '<a class="in-skip-link" href="#content">Pular conteúdo</a><div class="in-app-shell"><aside><nav aria-label="Principal"><a href="#content">Início</a></nav></aside><main id="content"><h1>Aplicação</h1><p>Conteúdo de exemplo</p></main></div>',
  ],
  "page-header": [
    "Cabeçalho de página header",
    '<header class="in-page-header"><h1>Página</h1><p>Descrição</p></header>',
  ],
  "content-container": [
    "Container conteúdo responsivo",
    '<section class="in-content-container" aria-label="Conteúdo"><h2>Conteúdo</h2><p>Informação sintética</p></section>',
  ],
  sidebar: [
    "Barra lateral navegação",
    '<aside><nav aria-label="Seções"><a href="#content">Conteúdo</a></nav></aside>',
  ],
  topbar: [
    "Barra superior",
    '<header class="in-topbar"><a href="/">INTEIRO</a><nav aria-label="Atalhos"><a href="#content">Conteúdo</a></nav></header>',
  ],
  "mobile-navigation": [
    "Menu navegação mobile",
    '<details><summary>Navegação</summary><nav aria-label="Mobile"><a href="#content">Início</a></nav></details>',
  ],
  "data-table": [
    "Tabela paginada dados table",
    '<section data-in-table data-in-page-size="2"><div class="in-table-scroll" role="region" aria-label="Resultados" tabindex="0"><table class="in-data-table"><caption>Resultados sintéticos</caption><thead><tr><th scope="col" aria-sort="none"><button class="in-button in-button--ghost" type="button" data-in-sort="0">Ordenar por nome</button></th><th scope="col">Estado</th></tr></thead><tbody><tr><th scope="row">Zeta</th><td>Ativo</td></tr><tr><th scope="row">Alfa</th><td>Ativo</td></tr><tr><th scope="row">Beta</th><td>Arquivado</td></tr></tbody></table></div><nav aria-label="Paginação de resultados"><button class="in-button in-button--secondary" type="button" data-in-page="-1" disabled>Anterior</button><span role="status" data-in-page-status>1 / 2</span><button class="in-button in-button--secondary" type="button" data-in-page="1">Próxima</button></nav></section>',
  ],
  "data-list": [
    "Lista dados",
    "<ul><li>Primeiro registro</li><li>Segundo registro</li></ul>",
  ],
  "details-panel": [
    "Painel detalhes",
    '<section aria-label="Detalhes"><h2>Registro</h2><dl><dt>Estado</dt><dd>Ativo</dd></dl></section>',
  ],
  "stat-card": [
    "Indicador estatística KPI",
    '<section aria-label="Total"><h2>Total</h2><p><strong>128</strong> registros</p></section>',
  ],
  "dashboard-grid": [
    "Dashboard operacional grade",
    '<section class="in-dashboard-grid" aria-label="Indicadores"><article><h2>Total</h2><p>128 registros</p></article><article><h2>Ativos</h2><p>64 registros</p></article></section>',
  ],
  "filter-bar": [
    "Filtros busca",
    '<form role="search" class="in-filter-bar"><div class="in-field-group"><label class="in-field__label" for="search">Buscar</label><input class="in-input" id="search" type="search"></div><button class="in-button in-button--primary">Filtrar</button></form>',
  ],
  "form-layout": [
    "Formulário cadastro layout",
    '<form class="in-form-layout" data-in-validate><div class="in-field-group"><label class="in-field__label" for="name">Nome (obrigatório)</label><input class="in-input" id="name" required aria-describedby="help"><p class="in-field-help" id="help">Informe um nome fictício.</p></div><div class="in-form-actions"><button class="in-button in-button--primary">Salvar rascunho</button></div></form>',
  ],
  "field-group": [
    "Campo label ajuda validação",
    '<div class="in-field-group"><label class="in-field__label" for="field">Nome</label><input class="in-input" id="field" aria-describedby="help"><p class="in-field-help" id="help">Nome fictício.</p></div>',
  ],
  select: [
    "Seleção nativa",
    '<div class="in-field-group"><label class="in-field__label" for="select">Estado</label><select class="in-input" id="select"><option>Ativo</option><option>Arquivado</option></select></div>',
  ],
  checkbox: [
    "Caixa seleção",
    '<label class="in-choice"><input type="checkbox"> Incluir arquivados</label>',
  ],
  "radio-group": [
    "Opção exclusiva radio",
    '<fieldset class="in-choice-group"><legend>Densidade</legend><label class="in-choice"><input type="radio" name="density" checked> Calm</label><label class="in-choice"><input type="radio" name="density"> Focus</label></fieldset>',
  ],
  textarea: [
    "Texto longo multiline",
    '<div class="in-field-group"><label class="in-field__label" for="text">Descrição</label><textarea class="in-input" id="text" rows="4"></textarea></div>',
  ],
  "form-actions": [
    "Ações formulário",
    '<div class="in-form-actions"><button class="in-button in-button--primary" type="submit">Salvar rascunho</button><button class="in-button in-button--quiet" type="button">Cancelar</button></div>',
  ],
  stepper: [
    "Etapas fluxo progressão",
    '<nav aria-label="Etapas"><ol><li aria-current="step">Dados</li><li>Revisão</li><li>Confirmação</li></ol></nav>',
  ],
  dialog: [
    "Diálogo modal foco",
    '<button class="in-button in-button--secondary" data-in-open="dialog">Abrir diálogo</button><dialog id="dialog" aria-labelledby="dialog-title"><h2 id="dialog-title">Confirmação</h2><p>Revise os dados.</p><button class="in-button in-button--quiet" data-in-close autofocus>Fechar</button></dialog>',
  ],
  drawer: [
    "Painel modal lateral",
    '<button class="in-button in-button--secondary" data-in-open="drawer">Abrir painel</button><dialog class="in-drawer" id="drawer" aria-labelledby="drawer-title"><h2 id="drawer-title">Detalhes</h2><button class="in-button in-button--quiet" data-in-close autofocus>Fechar painel</button></dialog>',
  ],
  popover: [
    "Conteúdo flutuante não modal",
    '<button class="in-button in-button--secondary" popovertarget="popover">Mais informações</button><div id="popover" popover><h2>Informações</h2><p>Conteúdo complementar.</p></div>',
  ],
  "dropdown-menu": [
    "Menu ações disclosure",
    '<details><summary>Ações</summary><ul><li><button class="in-button in-button--ghost" type="button">Editar</button></li><li><button class="in-button in-button--ghost" type="button">Arquivar</button></li></ul></details>',
  ],
  tooltip: [
    "Dica ajuda acessível",
    '<span class="in-tooltip" data-in-tooltip><button class="in-button in-button--secondary" aria-describedby="tip">Ajuda</button><span role="tooltip" id="tip">Informações sobre esta ação.</span></span>',
  ],
  alert: [
    "Alerta feedback",
    '<div role="alert"><h2>Atenção</h2><p>Revise os campos indicados.</p></div>',
  ],
  toast: [
    "Notificação status",
    '<div role="status" aria-live="polite">Rascunho salvo.</div>',
  ],
  "inline-error": [
    "Erro campo mensagem",
    '<div class="in-field-group"><label class="in-field__label" for="invalid">Nome</label><input class="in-input" id="invalid" aria-invalid="true" aria-describedby="error"><p class="in-field-error" id="error">Informe um nome.</p></div>',
  ],
  success: [
    "Sucesso confirmação",
    '<div role="status"><h2>Concluído</h2><p>Alterações salvas.</p></div>',
  ],
  "empty-state": [
    "Estado vazio",
    '<section aria-label="Sem resultados"><h2>Nenhum registro</h2><p>Crie um registro para começar.</p><button class="in-button in-button--primary" type="button">Criar registro</button></section>',
  ],
  skeleton: [
    "Carregamento skeleton",
    '<div aria-busy="true" aria-label="Carregando"><div class="in-skeleton" aria-hidden="true"></div><span role="status">Carregando conteúdo…</span></div>',
  ],
  spinner: ["Carregamento espera", '<span role="status">Carregando…</span>'],
  progress: [
    "Progresso tarefa",
    '<label for="progress">Processamento</label><progress id="progress" value="40" max="100">40%</progress>',
  ],
  tabs: [
    "Abas teclado tabs",
    '<div class="in-tabs" role="tablist" aria-label="Detalhes"><button id="tab-one" role="tab" aria-selected="true" aria-controls="panel-one">Resumo</button><button id="tab-two" role="tab" tabindex="-1" aria-selected="false" aria-controls="panel-two">Histórico</button></div><section id="panel-one" role="tabpanel" aria-labelledby="tab-one">Resumo sintético</section><section id="panel-two" role="tabpanel" aria-labelledby="tab-two" hidden>Histórico sintético</section>',
  ],
  breadcrumb: [
    "Caminho navegação migalhas",
    '<nav aria-label="Localização"><ol><li><a href="/">Início</a></li><li aria-current="page">Página</li></ol></nav>',
  ],
  pagination: [
    "Paginação navegação",
    '<nav aria-label="Paginação"><a href="?page=1" aria-current="page" aria-label="Página 1">1</a> <a href="?page=2" aria-label="Página 2">2</a></nav>',
  ],
  "navigation-menu": [
    "Menu navegação principal",
    '<nav aria-label="Principal"><a href="#content" aria-current="page">Início</a> <a href="#settings">Configuração</a></nav>',
  ],
  editorial: [
    "Texto editorial identidade",
    "<article><header><h2>Identidade que conecta</h2></header><p>Uma linguagem clara para interfaces consistentes.</p></article>",
  ],
  profile: [
    "Perfil identidade pessoa",
    '<section aria-label="Perfil fictício"><h2>Pessoa Exemplo</h2><p>Equipe de demonstração</p></section>',
  ],
  costura: [
    "Costura marca identidade",
    '<div class="in-costura" aria-hidden="true"></div><p>Conexões entre conteúdo e ação.</p>',
  ],
  "action-commit": [
    "Publicação fronteira ação commit",
    '<form><p id="commit-reason">Publicar torna o conteúdo visível ao público.</p><button class="in-button in-button--commit" data-variant="commit" aria-describedby="commit-reason">Publicar conteúdo</button></form>',
  ],
};
const tokens = allTokens()
  .filter((t) =>
    ["color.background.canvas", "color.text.primary"].includes(t.id),
  )
  .map((t) => t.id);
const entries = [];
await mkdir("packages/composition/patterns", { recursive: true });
await mkdir("packages/composition/examples", { recursive: true });
for (const [id, [description, markup]] of Object.entries(samples)) {
  const states = ["default"];
  if (
    [
      "data-table",
      "data-list",
      "details-panel",
      "stat-card",
      "dashboard-grid",
    ].includes(id)
  )
    states.push("loading", "empty", "error");
  if (
    [
      "form-layout",
      "field-group",
      "select",
      "checkbox",
      "radio-group",
      "textarea",
    ].includes(id)
  )
    states.push("disabled", "invalid", "readonly");
  if (["dialog", "drawer", "popover", "dropdown-menu"].includes(id))
    states.push("open", "closed");
  const p = {
    schemaVersion: "1.0",
    id,
    version: "1.0.0",
    kind: "pattern",
    description,
    slots:
      id === "app-shell"
        ? ["navigation", "header", "main", "footer"]
        : id === "data-table"
          ? ["title", "toolbar", "head", "body", "footer"]
          : id === "form-layout"
            ? ["fields", "help", "errors", "actions"]
            : ["content"],
    variants: ["default"],
    states,
    requiredTokens: [
      ...new Set([
        ...tokens,
        "touch.target.min",
        "color.focus.ring",
        ...(markup.includes('class="in-input"')
          ? [
              "input.height.md",
              "color.border.interactive",
              "color.background.surface",
            ]
          : []),
        ...(markup.includes("in-button--primary")
          ? [
              "color.action.primary.background",
              "color.action.primary.foreground",
            ]
          : []),
        ...(markup.includes("in-button--commit")
          ? ["color.action.commit.background", "color.action.commit.foreground"]
          : []),
      ]),
    ],
    allowedDependencies: ["@inteiro/tokens", "@inteiro/design-system"],
    accessibility: {
      semantics: [
        ...new Set(
          Array.from(markup.matchAll(/<([a-z][a-z0-9-]*)\b/g), (m) => m[1]),
        ),
      ],
      keyboardSpec: "docs/P0_PATTERNS.md",
    },
    responsive: {
      mobileStrategy: id === "data-table" ? "scroll-container" : "reflow",
    },
    examples: [
      `examples/${id}.html`,
      ...states.map((state) => `examples/${id}-${state}.html`),
    ],
    tests: ["tests/browser/composition.spec.ts"],
    aliases: description.toLowerCase().split(" "),
    markup,
  };
  entries.push(p);
  await writeFile(
    `packages/composition/patterns/${id}.json`,
    JSON.stringify(p, null, 2) + "\n",
  );
  await writeFile(
    `packages/composition/examples/${id}.html`,
    `<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${description}</title><link rel="stylesheet" href="../dist/composition.css"><body class="in-composition">${id === "app-shell" ? markup : '<main id="content">' + (markup.includes("<h1>") ? "" : "<h1>" + description + "</h1>") + markup + "</main>"}<script type="module">import {enhance} from '../src/behavior.js'; enhance();</script></body></html>`,
  );
}
await writeFile(
  "packages/composition/catalog.index.json",
  JSON.stringify(entries, null, 2) + "\n",
);
console.log(`${entries.length} portable patterns generated`);
