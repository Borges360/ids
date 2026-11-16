// Evaluator-owned authoring and self-test implementations. Never expose to a worker.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const R = (role, name) => ({ role, ...(name ? { name } : {}) }),
  L = (label) => ({ label }),
  T = (testId) => ({ testId });
const S = (op, locator, value) => ({
  op: op === "expect-text" ? "expect-exact-text" : op,
  locator,
  ...(value !== undefined ? { value } : {}),
});
const Q = (id, count, body = null) => ({
  op: "expect-request",
  id,
  count,
  body,
});
const B = (name, variant = "primary", extra = "") =>
  `<button type="button" class="in-button in-button--${variant}" ${extra}>${name}</button>`;
const I = (id, label, type = "text") =>
  `<div class="in-field-group"><label for="${id}">${label}</label><input id="${id}" class="in-input" type="${type}"></div>`;
const status = '<p role="status" aria-live="polite"></p>';
const route = (id, path, method, json, extra = {}) => ({
  id,
  path,
  method,
  responses: [{ status: 200, json, ...extra }],
});
const flow = (steps) => [...steps, { op: "expect-no-overflow" }];
const defs = [
  {
    id: "task-11",
    description:
      "Refatore o cadastro legado preservando Nome e E-mail, validação nativa e envio único de JSON {name,email} para POST /api/legacy-profile. Nome é obrigatório. E-mail inválido impede envio e recebe foco. Após sucesso anuncie Perfil salvo sem perder os valores informados.",
    html: `<form>${I("name", "Nome")}${I("email", "E-mail", "email")}<button class="in-button in-button--commit">Salvar perfil</button></form>${status}`,
    routes: [route("save", "/api/legacy-profile", "POST", { ok: true })],
    steps: flow([
      S("fill", L("Nome"), "Jo Lima"),
      S("fill", L("E-mail"), "inválido"),
      S("click", R("button", "Salvar perfil")),
      Q("save", 0),
      S("expect-focused", L("E-mail")),
      S("fill", L("E-mail"), "jo@example.test"),
      S("click", R("button", "Salvar perfil")),
      Q("save", 1, { name: "Jo Lima", email: "jo@example.test" }),
      S("expect-text", R("status"), "Perfil salvo"),
      S("expect-value", L("Nome"), "Jo Lima"),
    ]),
    reference: `const form=document.querySelector('form');const name=document.querySelector('#name'),email=document.querySelector('#email');name.required=email.required=true;form.onsubmit=async e=>{e.preventDefault();await api('/api/legacy-profile','POST',{name:name.value,email:email.value});announce('Perfil salvo');};`,
    mutation: `document.querySelector('form').onsubmit=e=>{e.preventDefault();announce('Perfil salvo');};`,
  },
  {
    id: "task-12",
    description:
      "Corrija o painel legado para usar o token --in-color-text-primary no texto e --in-color-background-surface no fundo de data-testid painel. Preserve Atualizar e a leitura de GET /api/token-summary. O valor total recebido aparece em status. A correção precisa acompanhar light e dark, sem cores literais.",
    html: `<section data-testid="painel" style="color:#101010;background-color:#fafafa"><h2>Resumo</h2>${status}${B("Atualizar")}</section>`,
    routes: [route("summary", "/api/token-summary", "GET", { total: 37 })],
    steps: flow([
      {
        op: "expect-token-style",
        locator: T("painel"),
        name: "color",
        value: "--in-color-text-primary",
      },
      {
        op: "expect-token-style",
        locator: T("painel"),
        name: "background-color",
        value: "--in-color-background-surface",
      },
      S("click", R("button", "Atualizar")),
      Q("summary", 1),
      S("expect-text", R("status"), "Total 37"),
    ]),
    reference: `const panel=document.querySelector('[data-testid=painel]');panel.style.color='var(--in-color-text-primary)';panel.style.backgroundColor='var(--in-color-background-surface)';button('Atualizar').onclick=async()=>announce('Total '+(await api('/api/token-summary')).total);`,
    mutation: `document.querySelector('[data-testid=painel]').style.color='#101010';`,
  },
  {
    id: "task-13",
    description:
      "Implemente abas Visão geral e Histórico por teclado. A primeira começa selecionada. ArrowRight/ArrowLeft alternam foco e seleção com wrap; Home vai à primeira e End à última. Somente a aba ativa tem tabindex=0 e aria-selected=true. Exiba o tabpanel correspondente e esconda o outro.",
    html: `<div role="tablist" aria-label="Seções"><button role="tab" aria-selected="true" tabindex="0" id="overview" aria-controls="panel-overview">Visão geral</button><button role="tab" aria-selected="false" tabindex="-1" id="history" aria-controls="panel-history">Histórico</button></div><section role="tabpanel" aria-labelledby="overview" id="panel-overview">Resumo atual</section><section role="tabpanel" aria-labelledby="history" id="panel-history" hidden>Eventos anteriores</section>`,
    routes: [],
    steps: flow([
      S("press", R("tab", "Visão geral"), "ArrowRight"),
      S("expect-focused", R("tab", "Histórico")),
      {
        op: "expect-attribute",
        locator: R("tab", "Histórico"),
        name: "aria-selected",
        value: "true",
      },
      S("expect-visible", R("tabpanel", "Histórico")),
      S("expect-hidden", R("tabpanel", "Visão geral")),
      S("press", R("tab", "Histórico"), "Home"),
      S("expect-focused", R("tab", "Visão geral")),
      S("press", R("tab", "Visão geral"), "End"),
      S("expect-focused", R("tab", "Histórico")),
      S("press", R("tab", "Histórico"), "ArrowRight"),
      S("expect-focused", R("tab", "Visão geral")),
    ]),
    reference: `const tabs=[...document.querySelectorAll('[role=tab]')];function select(i){tabs.forEach((t,n)=>{t.tabIndex=n===i?0:-1;t.setAttribute('aria-selected',String(n===i));document.getElementById(t.getAttribute('aria-controls')).hidden=n!==i;});tabs[i].focus();}tabs.forEach((tab,i)=>{tab.onclick=()=>select(i);tab.onkeydown=e=>{const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next!==undefined){e.preventDefault();select(next);}}});`,
    mutation: `document.querySelectorAll('[role=tab]').forEach(t=>t.onkeydown=null);`,
  },
  {
    id: "task-14",
    description:
      "Carregue GET /api/records e filtre localmente pelo campo Buscar, ignorando caixa. Mostre nomes na lista Registros e contagem em status. Filtrar por mar retorna Mara e Marcos, uma busca sem resultado anuncia Nenhum resultado, Limpar remove o filtro e restaura a lista original sem nova requisição.",
    html: `${I("search", "Buscar", "search")}${B("Filtrar")}${B("Limpar", "secondary")}<ul aria-label="Registros"></ul>${status}`,
    routes: [
      route("records", "/api/records", "GET", {
        items: ["Mara", "Marcos", "Bia"],
      }),
    ],
    steps: flow([
      S("expect-text", R("status"), "3 registros"),
      S("fill", L("Buscar"), "MAR"),
      S("click", R("button", "Filtrar")),
      {
        op: "expect-ordered-text",
        locator: R("list", "Registros"),
        values: ["Mara", "Marcos"],
      },
      S("expect-text", R("status"), "2 registros"),
      S("fill", L("Buscar"), "zzz"),
      S("click", R("button", "Filtrar")),
      S("expect-text", R("status"), "Nenhum resultado"),
      S("click", R("button", "Limpar")),
      S("expect-value", L("Buscar"), ""),
      {
        op: "expect-ordered-text",
        locator: R("list", "Registros"),
        values: ["Mara", "Marcos", "Bia"],
      },
      Q("records", 1),
    ]),
    reference: `let records=[];const input=document.querySelector('#search'),list=document.querySelector('ul');function render(){const rows=records.filter(x=>x.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()));list.replaceChildren(...rows.map(x=>{const li=document.createElement('li');li.textContent=x;return li;}));announce(rows.length?rows.length+' registros':'Nenhum resultado');}button('Filtrar').onclick=render;button('Limpar').onclick=()=>{input.value='';render();};api('/api/records').then(data=>{records=data.items;render();});`,
    mutation: `button('Limpar').onclick=()=>{};`,
  },
  {
    id: "task-15",
    description:
      "Valide o campo Código antes de enviar. Valor vazio ou com menos de seis caracteres mostra Informe seis caracteres em alert, aria-invalid=true e aria-describedby=code-error, e recebe foco. Não envie entradas inválidas. Um código válido envia POST /api/code {code}, limpa erro/aria-invalid e anuncia Código salvo.",
    html: `<form>${I("code", "Código")}<p role="alert" id="code-error" hidden></p><button class="in-button in-button--commit">Salvar código</button></form>${status}`,
    routes: [route("save", "/api/code", "POST", { ok: true })],
    steps: flow([
      S("fill", L("Código"), "abc"),
      S("click", R("button", "Salvar código")),
      S("expect-text", R("alert"), "Informe seis caracteres"),
      {
        op: "expect-attribute",
        locator: L("Código"),
        name: "aria-invalid",
        value: "true",
      },
      {
        op: "expect-attribute",
        locator: L("Código"),
        name: "aria-describedby",
        value: "code-error",
      },
      S("expect-focused", L("Código")),
      Q("save", 0),
      S("fill", L("Código"), "ABC123"),
      S("click", R("button", "Salvar código")),
      Q("save", 1, { code: "ABC123" }),
      S("expect-hidden", R("alert")),
      {
        op: "expect-attribute",
        locator: L("Código"),
        name: "aria-invalid",
        value: "false",
      },
      S("expect-text", R("status"), "Código salvo"),
    ]),
    reference: `const input=document.querySelector('#code'),error=document.querySelector('[role=alert]');document.querySelector('form').onsubmit=async e=>{e.preventDefault();const invalid=input.value.trim().length<6;input.setAttribute('aria-invalid',String(invalid));input.setAttribute('aria-describedby','code-error');error.hidden=!invalid;error.textContent=invalid?'Informe seis caracteres':'';if(invalid){input.focus();return;}await api('/api/code','POST',{code:input.value});announce('Código salvo');};`,
    mutation: `document.querySelector('form').onsubmit=e=>{e.preventDefault();announce('Código salvo');};`,
  },
  {
    id: "task-16",
    description:
      "Selecione um arquivo de texto em Arquivo e envie com Enviar arquivo. Envie POST /api/upload em JSON {name,content} usando nome e conteúdo do arquivo real escolhido. Enquanto a resposta estiver pendente, mostre progressbar Progresso do envio com aria-valuenow=0 e botão desabilitado. Após sucesso, atualize para 100, habilite o botão e anuncie Envio concluído. Sem arquivo não envie.",
    html: `${I("file", "Arquivo", "file")}${B("Enviar arquivo", "commit")}<progress aria-label="Progresso do envio" max="100" value="0"></progress>${status}`,
    routes: [
      route(
        "upload",
        "/api/upload",
        "POST",
        { ok: true },
        { release: "uploaded" },
      ),
    ],
    steps: flow([
      S("click", R("button", "Enviar arquivo")),
      Q("upload", 0),
      {
        op: "upload",
        locator: L("Arquivo"),
        file: {
          name: "relatorio.txt",
          mimeType: "text/plain",
          content: "dados sintéticos",
        },
      },
      S("click", R("button", "Enviar arquivo")),
      Q("upload", 1, { name: "relatorio.txt", content: "dados sintéticos" }),
      S("expect-disabled", R("button", "Enviar arquivo")),
      {
        op: "expect-attribute",
        locator: R("progressbar", "Progresso do envio"),
        name: "aria-valuenow",
        value: "0",
      },
      { op: "respond", id: "uploaded" },
      S("expect-text", R("status"), "Envio concluído"),
      S("expect-enabled", R("button", "Enviar arquivo")),
      {
        op: "expect-attribute",
        locator: R("progressbar", "Progresso do envio"),
        name: "aria-valuenow",
        value: "100",
      },
    ]),
    reference: `const input=document.querySelector('#file'),progress=document.querySelector('progress'),send=button('Enviar arquivo');send.onclick=async()=>{const file=input.files[0];if(!file)return;send.disabled=true;progress.value=0;progress.setAttribute('aria-valuenow','0');await api('/api/upload','POST',{name:file.name,content:await file.text()});progress.value=100;progress.setAttribute('aria-valuenow','100');send.disabled=false;announce('Envio concluído');};`,
    mutation: `button('Enviar arquivo').onclick=()=>announce('Envio concluído');`,
  },
  {
    id: "task-17",
    description:
      "Carregue GET /api/profile. Exiba nome e e-mail retornados e use iniciais do nome no elemento data-testid avatar quando avatarUrl estiver ausente. Não solicite imagem inexistente. Recarregar perfil consulta novamente, atualiza nome/e-mail e recalcula iniciais, sem preservar dados anteriores.",
    html: `<section aria-label="Perfil"><span data-testid="avatar"></span><h2 data-testid="profile-name"></h2><p data-testid="profile-email"></p>${B("Recarregar perfil")}</section>`,
    routes: [
      {
        id: "profile",
        path: "/api/profile",
        method: "GET",
        responses: [
          {
            status: 200,
            json: {
              name: "Lia Moura",
              email: "lia@example.test",
              avatarUrl: null,
            },
          },
          {
            status: 200,
            json: {
              name: "Rui Sá",
              email: "rui@example.test",
              avatarUrl: null,
            },
          },
        ],
      },
    ],
    steps: flow([
      S("expect-text", T("profile-name"), "Lia Moura"),
      S("expect-text", T("profile-email"), "lia@example.test"),
      S("expect-text", T("avatar"), "LM"),
      S("click", R("button", "Recarregar perfil")),
      S("expect-text", T("profile-name"), "Rui Sá"),
      S("expect-text", T("profile-email"), "rui@example.test"),
      S("expect-text", T("avatar"), "RS"),
      Q("profile", 2),
    ]),
    reference: `async function load(){const data=await api('/api/profile');document.querySelector('[data-testid=profile-name]').textContent=data.name;document.querySelector('[data-testid=profile-email]').textContent=data.email;document.querySelector('[data-testid=avatar]').textContent=data.name.split(' ').filter(Boolean).map(x=>x[0]).join('');}button('Recarregar perfil').onclick=load;load();`,
    mutation: `button('Recarregar perfil').onclick=()=>{};`,
  },
  {
    id: "task-18",
    description:
      "Implemente duas etapas de pedido. Na primeira, Nome é obrigatório e Continuar impede avanço vazio, focando Nome. A segunda mostra revisão do nome e botões Voltar/Confirmar pedido. Voltar preserva o nome; mudar o nome atualiza a revisão. Somente Confirmar pedido envia POST /api/order {name} e anuncia Pedido confirmado.",
    html: `<section id="details">${I("name", "Nome")}${B("Continuar")}</section><section id="review" hidden><h2>Revisão</h2><p data-testid="review-name"></p>${B("Voltar", "secondary")}${B("Confirmar pedido", "commit")}</section>${status}`,
    routes: [route("order", "/api/order", "POST", { id: "order-1" })],
    steps: flow([
      S("click", R("button", "Continuar")),
      S("expect-focused", L("Nome")),
      Q("order", 0),
      S("fill", L("Nome"), "Lia"),
      S("click", R("button", "Continuar")),
      S("expect-text", T("review-name"), "Lia"),
      Q("order", 0),
      S("click", R("button", "Voltar")),
      S("expect-value", L("Nome"), "Lia"),
      S("fill", L("Nome"), "Lia Moura"),
      S("click", R("button", "Continuar")),
      S("expect-text", T("review-name"), "Lia Moura"),
      S("click", R("button", "Confirmar pedido")),
      Q("order", 1, { name: "Lia Moura" }),
      S("expect-text", R("status"), "Pedido confirmado"),
    ]),
    reference: `const input=document.querySelector('#name'),details=document.querySelector('#details'),review=document.querySelector('#review');button('Continuar').onclick=()=>{if(!input.value.trim()){input.focus();return;}document.querySelector('[data-testid=review-name]').textContent=input.value;details.hidden=true;review.hidden=false;};button('Voltar').onclick=()=>{details.hidden=false;review.hidden=true;input.focus();};button('Confirmar pedido').onclick=async()=>{await api('/api/order','POST',{name:input.value});announce('Pedido confirmado');};`,
    mutation: `button('Voltar').onclick=()=>{document.querySelector('#details').hidden=false;document.querySelector('#review').hidden=true;document.querySelector('#name').value='';};`,
  },
  {
    id: "task-19",
    description:
      "Ajuda sobre prazo abre um popover não modal identificado como region de ajuda pelo data-testid help-panel. Atualize aria-expanded/aria-controls no acionador. O popover contém Prazo em dias úteis e link Política de prazos. Escape no link fecha e devolve foco ao acionador. Reabrir e clicar novamente no acionador também fecha.",
    html: `${B("Ajuda sobre prazo", "secondary", 'aria-expanded="false" aria-controls="help-panel"')}<section id="help-panel" data-testid="help-panel" hidden><h2>Prazo em dias úteis</h2><a href="#policy">Política de prazos</a></section>`,
    routes: [],
    steps: flow([
      S("click", R("button", "Ajuda sobre prazo")),
      S("expect-visible", T("help-panel")),
      {
        op: "expect-attribute",
        locator: R("button", "Ajuda sobre prazo"),
        name: "aria-expanded",
        value: "true",
      },
      S("expect-visible", R("heading", "Prazo em dias úteis")),
      S("press", R("link", "Política de prazos"), "Escape"),
      S("expect-hidden", T("help-panel")),
      S("expect-focused", R("button", "Ajuda sobre prazo")),
      S("click", R("button", "Ajuda sobre prazo")),
      S("click", R("button", "Ajuda sobre prazo")),
      S("expect-hidden", T("help-panel")),
    ]),
    reference: `const trigger=button('Ajuda sobre prazo'),panel=document.querySelector('#help-panel');function show(open){panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(!open)trigger.focus();}trigger.onclick=()=>show(panel.hidden);panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();show(false);}};`,
    mutation: `document.querySelector('#help-panel').onkeydown=null;`,
  },
  {
    id: "task-20",
    description:
      'Ações abre menu Ações do registro e foca Editar. ArrowDown/ArrowUp circulam entre Editar e Arquivar; Home/End vão aos extremos. Escape fecha e devolve foco. Enter em Arquivar executa POST /api/archive {id:"item-1"} uma vez, fecha o menu e anuncia Registro arquivado. Atualize aria-expanded no acionador.',
    html: `${B("Ações", "secondary", 'aria-haspopup="menu" aria-expanded="false" aria-controls="actions"')}<div role="menu" aria-label="Ações do registro" id="actions" hidden><button role="menuitem" tabindex="-1">Editar</button><button role="menuitem" tabindex="-1">Arquivar</button></div>${status}`,
    routes: [route("archive", "/api/archive", "POST", { ok: true })],
    steps: flow([
      S("click", R("button", "Ações")),
      S("expect-focused", R("menuitem", "Editar")),
      S("press", R("menuitem", "Editar"), "ArrowDown"),
      S("expect-focused", R("menuitem", "Arquivar")),
      S("press", R("menuitem", "Arquivar"), "Escape"),
      S("expect-hidden", R("menu", "Ações do registro")),
      S("expect-focused", R("button", "Ações")),
      Q("archive", 0),
      S("click", R("button", "Ações")),
      S("press", R("menuitem", "Editar"), "End"),
      S("press", R("menuitem", "Arquivar"), "Enter"),
      Q("archive", 1, { id: "item-1" }),
      S("expect-hidden", R("menu", "Ações do registro")),
      S("expect-text", R("status"), "Registro arquivado"),
    ]),
    reference: `const trigger=button('Ações'),menu=document.querySelector('[role=menu]'),items=[...menu.querySelectorAll('[role=menuitem]')];function close(){menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}trigger.onclick=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');items[0].focus();};items.forEach((item,i)=>item.onkeydown=e=>{const next={ArrowDown:(i+1)%items.length,ArrowUp:(i+items.length-1)%items.length,Home:0,End:items.length-1}[e.key];if(next!==undefined){e.preventDefault();items[next].focus();}if(e.key==='Escape'){e.preventDefault();close();}});items[0].onclick=close;items[1].onclick=async()=>{await api('/api/archive','POST',{id:'item-1'});close();announce('Registro arquivado');};`,
    mutation: `document.querySelectorAll('[role=menuitem]').forEach(item=>item.onkeydown=null);`,
  },
];
const write = async (path, value) => {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
};
const dataset = JSON.parse(
  await readFile("benchmarks/tasks.public.json", "utf8"),
);
for (const [index, def] of defs.entries()) {
  const task = dataset.tasks.find((task) => task.id === def.id),
    worker = `benchmarks/workers/${def.id}`,
    fixturePath = `benchmarks/fixtures/${def.id}.json`,
    gradingPath = `benchmarks/evaluator/criteria/${def.id}.json`;
  await write(fixturePath, {
    schemaVersion: "1.0",
    classification: "synthetic",
    clock: "2026-01-01T12:00:00.000Z",
    seed: 100 + index,
    routes: def.routes,
  });
  const scenarios = [
    {
      id: "mobile-functional",
      viewport: { width: 375, height: 812 },
      theme: "light",
      density: "calm",
      direction: "ltr",
      steps: def.steps,
    },
    {
      id: "desktop-functional",
      viewport: { width: 1440, height: 900 },
      theme: "dark",
      density: "focus",
      direction: "ltr",
      steps: def.steps,
    },
  ];
  await write(gradingPath, {
    schemaVersion: "1.0",
    kind: "independent-task-criteria",
    caseId: def.id,
    entry: "/src/index.html",
    fixture: { path: fixturePath, sha256: hash(await readFile(fixturePath)) },
    scenarios,
  });
  await write(
    worker + "/src/index.html",
    `<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.requirement} · INTEIRO</title><link rel="stylesheet" href="/__inteiro__/composition.css"></head><body class="in-composition"><main class="in-content-container"><header class="in-page-header"><h1>${task.requirement}</h1></header>${def.html}</main><script type="module" src="./app.js"></script></body></html>\n`,
  );
  await write(
    worker + "/src/app.js",
    "// Implement the requirement from TASK.md; this starter is intentionally incomplete.\n",
  );
  await write(
    worker + "/TASK.md",
    `# ${task.requirement}\n\n${def.description}\n\nUse o contrato INTEIRO em /__inteiro__/composition.css. Preserve os nomes acessíveis e data-testid publicados. Suporte teclado, target 44px, reduced motion, RTL e as quatro variações de tema. Implemente somente os arquivos de src, sem alterar controles, testes ou baselines. Os dados de fixtures são sintéticos.\n`,
  );
  const common = `const button=name=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===name);const announce=text=>document.querySelector('[role=status]').textContent=text;async function api(path,method='GET',body){const r=await fetch(path,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('synthetic response failure');return r.json();}\n`;
  await write(
    `benchmarks/evaluator/references/${def.id}.js`,
    common + def.reference + "\n",
  );
  await write(
    `benchmarks/evaluator/mutations/${def.id}.js`,
    def.mutation + "\n",
  );
  Object.assign(task, {
    initialImplementation: worker + "/src/index.html",
    initialFiles: [worker + "/src/index.html", worker + "/src/app.js"],
    instructions: worker + "/TASK.md",
    functionalRequirement: def.description,
    contract: "benchmarks/contract/inteiro.config.json",
    fixtures: [fixturePath],
    grading: { path: gradingPath, sha256: hash(await readFile(gradingPath)) },
    acceptance: [
      "Independent functional criteria in the immutable grading snapshot",
      "Full INTEIRO static/browser/review gates remain required",
    ],
  });
  delete task.fixture;
}
await write("benchmarks/tasks.public.json", dataset);
console.log(
  "Authored ten medium public tasks, independent functional plans and evaluator-only positive/negative controls.",
);
