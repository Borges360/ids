// Evaluator-owned task authoring. Do not copy this file or grading plans to a worker.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const role = (role, name) => ({ role, ...(name ? { name } : {}) });
const text = (text) => ({ text });
const label = (label) => ({ label });
const action = (op, locator, value) => ({
  op,
  locator,
  ...(value !== undefined ? { value } : {}),
});
const request = (id, count, body = null) => ({
  op: "expect-request",
  id,
  count,
  body,
});
const route = (id, path, method, ...responses) => ({
  id,
  path,
  method,
  responses,
});
const response = (json, status = 200, release) => ({
  status,
  json,
  ...(release ? { release } : {}),
});
const noOverflow = { op: "expect-no-overflow" };
const button = (name, variant = "primary", extra = "") =>
  `<button class="in-button in-button--${variant}" ${extra}>${name}</button>`;
const input = (id, name, type = "text") =>
  `<div class="in-field-group"><label for="${id}">${name}</label><input class="in-input" id="${id}" name="${id}" type="${type}"></div>`;
const status = '<p role="status" aria-live="polite"></p>';
const descriptions = [
  "Cadastre uma pessoa com nome e e-mail. Nome e e-mail são obrigatórios; um e-mail inválido impede envio e recebe foco. Envie JSON {name,email} para POST /api/users somente após validação. Confirme ‘Cadastro criado’ em uma região de status após HTTP 201. Não faça envios duplicados.",
  "Carregue GET /api/people?page=N. Mostre a lista ‘Pessoas’, os nomes retornados e ‘Página N de 3’. Próxima página e Página anterior preservam a ordem dos registros. Desabilite anterior na primeira e próxima na última página. Use as páginas do fixture, sem duplicar ou perder pessoas.",
  "Carregue GET /api/dashboard e mostre os valores total, active e overdue nos elementos data-testid kpi-total, kpi-active e kpi-overdue. Atualizar dados refaz a consulta e substitui todos os valores, sem acumulá-los. O layout deve caber em 375 e 1440 CSS px.",
  "Em mobile, Abrir navegação abre a navegação ‘Navegação principal’ e atualiza aria-expanded. Escape fecha, devolve foco ao acionador e atualiza aria-expanded=false. Em desktop a navegação está disponível sem abrir overlay. Navegue por Início e Pessoas por links acessíveis; não provoque overflow.",
  "Implemente CRUD via GET /api/items, POST /api/items {name}, PUT /api/items/1 {name} e DELETE /api/items/1. Adicionar item e Salvar alterações atualizam a lista. Ações de linha têm nomes ‘Editar <nome>’ e ‘Excluir <nome>’. Excluir abre diálogo ‘Excluir item’; Cancelar preserva o item e não envia DELETE. Excluir item confirma a operação. Sem itens, mostre ‘Nenhum item’.",
  "Carregue GET /api/items. Enquanto a resposta está pendente, anuncie ‘Carregando’. Em falha, exponha ‘Não foi possível carregar’ em alert e Tentar novamente. Uma resposta vazia mostra ‘Nenhum item’ e Atualizar. Depois de retry/atualização bem-sucedidos, mostre os itens recebidos, sem polling automático ou acumular estados antigos.",
  "Editar observação abre diálogo ‘Editar observação’. O campo Assunto recebe foco. Tab e Shift+Tab ficam no diálogo; Fechar é o último controle, antes de voltar ao primeiro. Escape fecha e restaura foco ao acionador. O conteúdo de fundo não pode receber foco enquanto o diálogo está aberto.",
  "Abrir detalhes abre drawer modal ‘Detalhes do item’ no mobile. Fechar detalhes recebe foco, Escape fecha e devolve foco ao acionador. O drawer cabe em 375 CSS px, mantém seu conteúdo legível e não permite interação com o fundo enquanto está aberto.",
  "Tema seleciona dark, light, contrast-dark ou contrast-light em data-in-theme no elemento html. Densidade seleciona calm ou focus em data-in-density. Preserve ambas as escolhas após recarregar a página. Use as variáveis semânticas INTEIRO, sem trocar dados ou ações da tela.",
  "Carregue GET /api/content e apresente title e body completos. O fixture é RTL e contém uma palavra longa. A leitura, ordem e propriedades lógicas seguem rtl, o texto não é removido ou truncado e a página cabe em 320 CSS px sem overflow horizontal.",
];
const cases = [
  {
    html: `<form>${input("name", "Nome")}${input("email", "E-mail", "email")}${button("Criar cadastro", "commit", "type=submit")}</form>${status}`,
    routes: [
      route(
        "create",
        "/api/users",
        "POST",
        response(
          { id: "1", name: "Rafa Silva", email: "rafa@example.test" },
          201,
        ),
      ),
    ],
    steps: [
      action("fill", label("Nome"), "Rafa Silva"),
      action("fill", label("E-mail"), "inválido"),
      action("click", role("button", "Criar cadastro")),
      request("create", 0),
      action("expect-focused", label("E-mail")),
      action("fill", label("E-mail"), "rafa@example.test"),
      action("click", role("button", "Criar cadastro")),
      request("create", 1, { name: "Rafa Silva", email: "rafa@example.test" }),
      action("expect-text", role("status"), "Cadastro criado"),
      noOverflow,
    ],
  },
  {
    html: `<ul aria-label="Pessoas"></ul><p role="status">Página 1 de 3</p>${button("Página anterior", "secondary")}${button("Próxima página")}`,
    routes: [
      route(
        "page1",
        "/api/people?page=1",
        "GET",
        response({
          items: [
            { id: 1, name: "Ana Lima" },
            { id: 2, name: "Beto Reis" },
          ],
          page: 1,
          totalPages: 3,
          total: 5,
        }),
        response({
          items: [
            { id: 1, name: "Ana Lima" },
            { id: 2, name: "Beto Reis" },
          ],
          page: 1,
          totalPages: 3,
          total: 5,
        }),
      ),
      route(
        "page2",
        "/api/people?page=2",
        "GET",
        response({
          items: [
            { id: 3, name: "Cris Luz" },
            { id: 4, name: "Dani Melo" },
          ],
          page: 2,
          totalPages: 3,
          total: 5,
        }),
        response({
          items: [
            { id: 3, name: "Cris Luz" },
            { id: 4, name: "Dani Melo" },
          ],
          page: 2,
          totalPages: 3,
          total: 5,
        }),
      ),
      route(
        "page3",
        "/api/people?page=3",
        "GET",
        response({
          items: [{ id: 5, name: "Eva Dias" }],
          page: 3,
          totalPages: 3,
          total: 5,
        }),
      ),
    ],
    steps: [
      action("expect-visible", text("Ana Lima")),
      action("expect-disabled", role("button", "Página anterior")),
      action("click", role("button", "Próxima página")),
      action("expect-visible", text("Cris Luz")),
      action("expect-hidden", text("Ana Lima")),
      action("expect-text", role("status"), "Página 2 de 3"),
      action("click", role("button", "Próxima página")),
      action("expect-visible", text("Eva Dias")),
      action("expect-disabled", role("button", "Próxima página")),
      action("click", role("button", "Página anterior")),
      action("expect-visible", text("Cris Luz")),
      request("page2", 2),
      noOverflow,
    ],
  },
  {
    html: `<section class="in-dashboard-grid" aria-label="Indicadores"><article class="in-stat-card"><h2>Total</h2><p data-testid="kpi-total">—</p></article><article class="in-stat-card"><h2>Ativos</h2><p data-testid="kpi-active">—</p></article><article class="in-stat-card"><h2>Em atraso</h2><p data-testid="kpi-overdue">—</p></article></section>${button("Atualizar dados")}`,
    routes: [
      route(
        "dashboard",
        "/api/dashboard",
        "GET",
        response({ total: 120, active: 90, overdue: 30 }),
        response({ total: 145, active: 110, overdue: 35 }),
      ),
    ],
    steps: [
      action("expect-text", { testId: "kpi-total" }, "120"),
      action("expect-text", { testId: "kpi-active" }, "90"),
      action("expect-text", { testId: "kpi-overdue" }, "30"),
      action("click", role("button", "Atualizar dados")),
      action("expect-text", { testId: "kpi-total" }, "145"),
      action("expect-text", { testId: "kpi-active" }, "110"),
      action("expect-text", { testId: "kpi-overdue" }, "35"),
      request("dashboard", 2),
      noOverflow,
    ],
  },
  {
    html: `${button("Abrir navegação", "primary", 'aria-expanded="false" aria-controls="navigation"')}<nav id="navigation" aria-label="Navegação principal" hidden><a href="#inicio">Início</a><a href="#pessoas">Pessoas</a></nav>`,
    routes: [],
    steps: [
      action("click", role("button", "Abrir navegação")),
      action("expect-visible", role("navigation", "Navegação principal")),
      {
        op: "expect-attribute",
        locator: role("button", "Abrir navegação"),
        name: "aria-expanded",
        value: "true",
      },
      action("press", role("link", "Início"), "Escape"),
      action("expect-hidden", role("navigation", "Navegação principal")),
      action("expect-focused", role("button", "Abrir navegação")),
      {
        op: "expect-attribute",
        locator: role("button", "Abrir navegação"),
        name: "aria-expanded",
        value: "false",
      },
      noOverflow,
    ],
    desktop: [
      action("expect-visible", role("navigation", "Navegação principal")),
      action("expect-visible", role("link", "Pessoas")),
      noOverflow,
    ],
  },
  {
    html: `<form>${input("name", "Nome do item")}${button("Adicionar item", "commit", "type=submit")}</form><ul aria-label="Itens"></ul>${status}<dialog aria-label="Excluir item"><h2>Excluir item</h2>${button("Cancelar", "secondary")}${button("Excluir item", "commit")}</dialog>`,
    routes: [
      route("items", "/api/items", "GET", response({ items: [] })),
      route(
        "create",
        "/api/items",
        "POST",
        response({ id: 1, name: "Caderno" }, 201),
      ),
      route(
        "update",
        "/api/items/1",
        "PUT",
        response({ id: 1, name: "Caderno revisado" }),
      ),
      route("delete", "/api/items/1", "DELETE", response({ deleted: true })),
    ],
    steps: [
      action("fill", label("Nome do item"), "Caderno"),
      action("click", role("button", "Adicionar item")),
      action("expect-visible", text("Caderno")),
      request("create", 1, { name: "Caderno" }),
      action("click", role("button", "Editar Caderno")),
      action("fill", label("Nome do item"), "Caderno revisado"),
      action("click", role("button", "Salvar alterações")),
      action("expect-visible", text("Caderno revisado")),
      request("update", 1, { name: "Caderno revisado" }),
      action("click", role("button", "Excluir Caderno revisado")),
      action("expect-visible", role("dialog", "Excluir item")),
      action("click", role("button", "Cancelar")),
      request("delete", 0),
      action("expect-visible", text("Caderno revisado")),
      action("click", role("button", "Excluir Caderno revisado")),
      action("click", role("button", "Excluir item")),
      request("delete", 1),
      action("expect-text", role("status"), "Nenhum item"),
      action("expect-hidden", role("dialog", "Excluir item")),
      noOverflow,
    ],
  },
  {
    html: `<section aria-label="Resultados"><ul aria-label="Itens"></ul>${status}<p role="alert"></p>${button("Tentar novamente")}${button("Atualizar", "secondary")}</section>`,
    routes: [
      route(
        "items",
        "/api/items",
        "GET",
        response({ message: "Synthetic unavailable" }, 503, "initial"),
        response({ items: [] }, 200, "empty"),
        response(
          { items: [{ id: 1, name: "Documento de teste" }] },
          200,
          "success",
        ),
      ),
    ],
    steps: [
      request("items", 1),
      action("expect-text", role("status"), "Carregando"),
      { op: "respond", id: "initial" },
      action("expect-text", role("alert"), "Não foi possível carregar"),
      action("click", role("button", "Tentar novamente")),
      request("items", 2),
      { op: "respond", id: "empty" },
      action("expect-text", role("status"), "Nenhum item"),
      action("click", role("button", "Atualizar")),
      request("items", 3),
      { op: "respond", id: "success" },
      action("expect-visible", text("Documento de teste")),
      noOverflow,
    ],
  },
  {
    html: `${button("Editar observação")}<dialog class="in-dialog" aria-label="Editar observação"><h2>Editar observação</h2>${input("subject", "Assunto")}${button("Salvar", "primary")}${button("Fechar", "secondary")}</dialog>`,
    routes: [],
    steps: [
      action("click", role("button", "Editar observação")),
      action("expect-visible", role("dialog", "Editar observação")),
      action("expect-focused", label("Assunto")),
      action("press", label("Assunto"), "Shift+Tab"),
      action("expect-focused", role("button", "Fechar")),
      action("press", role("button", "Fechar"), "Tab"),
      action("expect-focused", label("Assunto")),
      action("press", label("Assunto"), "Escape"),
      action("expect-hidden", role("dialog", "Editar observação")),
      action("expect-focused", role("button", "Editar observação")),
      noOverflow,
    ],
  },
  {
    html: `${button("Abrir detalhes")}<dialog class="in-drawer" aria-label="Detalhes do item"><h2>Detalhes do item</h2><p>Informações do documento selecionado.</p>${button("Fechar detalhes", "secondary")}</dialog>`,
    routes: [],
    steps: [
      action("click", role("button", "Abrir detalhes")),
      action("expect-visible", role("dialog", "Detalhes do item")),
      action("expect-focused", role("button", "Fechar detalhes")),
      noOverflow,
      action("press", role("button", "Fechar detalhes"), "Escape"),
      action("expect-hidden", role("dialog", "Detalhes do item")),
      action("expect-focused", role("button", "Abrir detalhes")),
    ],
  },
  {
    html: `<div class="in-field-group"><label for="theme">Tema</label><select class="in-select" id="theme"><option value="light">Claro</option><option value="dark">Escuro</option><option value="contrast-dark">Contraste escuro</option><option value="contrast-light">Contraste claro</option></select></div><div class="in-field-group"><label for="density">Densidade</label><select class="in-select" id="density"><option value="calm">Calma</option><option value="focus">Foco</option></select></div><section class="in-card"><h2>Documento de teste</h2><p>Revise os dados antes de concluir.</p></section>`,
    routes: [],
    steps: [
      action("select", label("Tema"), "dark"),
      { op: "expect-root-attribute", name: "data-in-theme", value: "dark" },
      action("select", label("Densidade"), "focus"),
      { op: "expect-root-attribute", name: "data-in-density", value: "focus" },
      { op: "reload" },
      { op: "expect-root-attribute", name: "data-in-theme", value: "dark" },
      { op: "expect-root-attribute", name: "data-in-density", value: "focus" },
      action("expect-visible", text("Documento de teste")),
      noOverflow,
    ],
  },
  {
    html: `<article class="in-card"><h2 data-testid="content-title">Documento</h2><p data-testid="content-body"></p></article>`,
    routes: [
      route(
        "content",
        "/api/content",
        "GET",
        response({
          direction: "rtl",
          title: "سجل المستندات",
          body: "مستند".repeat(80),
        }),
      ),
    ],
    steps: [
      action("expect-text", { testId: "content-title" }, "سجل المستندات"),
      action("expect-text", { testId: "content-body" }, "مستند".repeat(80)),
      { op: "expect-root-attribute", name: "dir", value: "rtl" },
      request("content", 1),
      noOverflow,
    ],
  },
];
cases[0].steps = [
  action("click", role("button", "Criar cadastro")),
  request("create", 0),
  action("expect-focused", label("Nome")),
  ...cases[0].steps.flatMap((step) =>
    step.op === "fill" && step.locator?.label === "Nome"
      ? [
          step,
          action("click", role("button", "Criar cadastro")),
          request("create", 0),
          action("expect-focused", label("E-mail")),
        ]
      : [step],
  ),
];
cases[1].steps = cases[1].steps.flatMap((step) => {
  const ordered = {
    "Ana Lima": ["Ana Lima", "Beto Reis"],
    "Cris Luz": ["Cris Luz", "Dani Melo"],
    "Eva Dias": ["Eva Dias"],
  }[step.locator?.text];
  return step.op === "expect-visible" && ordered
    ? [
        step,
        {
          op: "expect-ordered-text",
          locator: role("list", "Pessoas"),
          values: ordered,
        },
      ]
    : [step];
});
const dataset = JSON.parse(
  await readFile("benchmarks/tasks.public.json", "utf8"),
);
const write = async (path, value) => {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
};
for (const [index, definition] of cases.entries()) {
  const id = `task-${String(index + 1).padStart(2, "0")}`,
    worker = `benchmarks/workers/${id}/src`,
    fixturePath = `benchmarks/fixtures/${id}.json`;
  const fixture = {
    schemaVersion: "1.0",
    classification: "synthetic",
    clock: "2026-01-01T12:00:00.000Z",
    seed: index + 1,
    routes: definition.routes,
  };
  await write(fixturePath, fixture);
  const scenarios = [
    {
      id: "mobile-functional",
      viewport: { width: index === 9 ? 320 : 375, height: 812 },
      theme: "light",
      density: "calm",
      direction: index === 9 ? "rtl" : "ltr",
      steps: definition.steps,
    },
  ];
  if (definition.desktop || index === 2)
    scenarios.push({
      id: "desktop-functional",
      viewport: { width: 1440, height: 900 },
      theme: "dark",
      density: "focus",
      direction: "ltr",
      steps: definition.desktop ?? definition.steps,
    });
  const plan = {
    schemaVersion: "1.0",
    kind: "independent-task-criteria",
    caseId: id,
    entry: "/src/index.html",
    fixture: { path: fixturePath, sha256: digest(await readFile(fixturePath)) },
    scenarios,
  };
  const gradingPath = `benchmarks/evaluator/criteria/${id}.json`;
  await write(gradingPath, plan);
  const task = dataset.tasks[index];
  const title = [
    "Cadastro",
    "Pessoas",
    "Visão geral",
    "Área de trabalho",
    "Itens",
    "Documentos",
    "Observação",
    "Detalhes",
    "Preferências",
    "Documentos",
  ][index];
  await write(
    worker + "/index.html",
    `<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · INTEIRO</title><link rel="stylesheet" href="/__inteiro__/composition.css"></head><body class="in-composition"><main class="in-content-container"><header class="in-page-header"><h1>${title}</h1></header>${definition.html}</main><script type="module" src="./app.js"></script></body></html>\n`,
  );
  await write(
    worker + "/app.js",
    "// Implement the functional requirement from TASK.md using the INTEIRO contract.\n",
  );
  const instructions = `# ${task.requirement}\n\n${descriptions[index]}\n\nUse o contrato INTEIRO em /__inteiro__/composition.css e, se necessário, /__inteiro__/behavior.js. Preserve nomes acessíveis e os data-testid fornecidos. Suporte teclado, target 44px e as quatro variações de tema. Os dados são sintéticos; o avaliador intercepta somente as rotas de API declaradas no fixture.\n\nImplemente apenas os arquivos de src. Não altere política, testes ou baselines. O starter é intencionalmente incompleto e não é uma solução de referência.\n`;
  await write(`benchmarks/workers/${id}/TASK.md`, instructions);
  Object.assign(task, {
    initialImplementation: worker + "/index.html",
    initialFiles: [worker + "/index.html", worker + "/app.js"],
    instructions: `benchmarks/workers/${id}/TASK.md`,
    functionalRequirement: descriptions[index],
    contract: "benchmarks/contract/inteiro.config.json",
    fixtures: [fixturePath],
    grading: { path: gradingPath, sha256: digest(await readFile(gradingPath)) },
    acceptance: [
      "Independent functional criteria in the immutable grading snapshot",
      "Full INTEIRO static/browser/review gates remain required",
    ],
  });
  delete task.fixture;
}
await write("benchmarks/tasks.public.json", dataset);
const config = JSON.parse(await readFile("inteiro.config.json", "utf8"));
config.project = {
  ...config.project,
  id: "synthetic-benchmark-candidate",
  framework: "html",
};
config.static.include = ["src/**/*.{html,js,css}"];
config.browser.routesFile = "inteiro.routes.json";
config.browser.startCommand = "node .inteiro/serve.mjs";
config.browser.readyPath = "/src/index.html";
config.browser.routeRoots = [];
config.browser.fontAssets = config.browser.fontAssets.map((asset) => ({
  ...asset,
  path: asset.path.replace(
    "packages/composition/",
    "node_modules/@inteiro/composition/",
  ),
}));
await write("benchmarks/contract/inteiro.config.json", config);
console.log(
  "Authored ten independent public grading plans and domain-specific incomplete starters; other 30 tasks still require migration.",
);

await write(
  "benchmarks/contract/serve.mjs",
  "import {createBenchmarkServer} from '@inteiro/evaluation/grading';\nconst server = await createBenchmarkServer(process.cwd());\nserver.listen(4173, '127.0.0.1');\n",
);
