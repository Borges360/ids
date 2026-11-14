// Evaluator-owned authoring; never copy this script or references to candidates.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const H = (bytes) => createHash("sha256").update(bytes).digest("hex");
const R = (role, name) => ({ role, ...(name ? { name } : {}) }),
  L = (label) => ({ label }),
  T = (testId) => ({ testId });
const S = (op, locator, value) => ({
    op: op === "expect-text" ? "expect-exact-text" : op,
    locator,
    ...(value !== undefined ? { value } : {}),
  }),
  Q = (id, count, body = null) => ({ op: "expect-request", id, count, body });
const B = (label, variant = "primary", extra = "") =>
  `<button type="button" class="in-button in-button--${variant}" ${extra}>${label}</button>`;
const I = (id, label, type = "text") =>
  `<div class="in-field-group"><label for="${id}">${label}</label><input class="in-input" id="${id}" type="${type}"></div>`;
const status = '<p role="status" aria-live="polite"></p>';
const route = (id, path, method, json, extras = {}) => ({
  id,
  path,
  method,
  responses: [{ status: 200, json, ...extras }],
});
const complete = (steps) => [...steps, { op: "expect-no-overflow" }];
function cases(hidden) {
  const prefix = hidden ? "تقرير تشغيلي مترجم — " : "Registro ",
    name =
      prefix +
      (hidden ? "nome extenso para revisão humana ".repeat(5) : "especial"),
    title = hidden
      ? "Documentação internacional com revisão detalhada"
      : "Documento revisado";
  const rows = Array.from({ length: hidden ? 120 : 60 }, (_, i) => ({
    id: String(i + 1),
    name: prefix + String(i + 1).padStart(3, "0"),
    amount: i + 1,
  }));
  const body = (
    hidden
      ? "تفاصيل دولية طويلة مع بيانات اصطناعية. "
      : "Conteúdo sintético para leitura e revisão. "
  ).repeat(hidden ? 240 : 100);
  return [
    {
      description:
        "Carregue GET /api/metrics. Mostre todos os registros na lista Relatórios, total no elemento total e quantidade no elemento quantidade. Buscar filtra localmente o nome exato informado, sem nova consulta. Limpar restaura todos os registros e os totais originais. Preserve os nomes completos e evite overflow.",
      html: `${I("query", "Buscar")}${B("Filtrar")}${B("Limpar", "secondary")}<p data-testid="total"></p><p data-testid="quantidade"></p><ul aria-label="Relatórios"></ul>`,
      routes: [route("metrics", "/api/metrics", "GET", { items: rows })],
      steps: complete([
        S("expect-text", T("quantidade"), String(rows.length)),
        S(
          "expect-text",
          T("total"),
          String(rows.reduce((n, r) => n + r.amount, 0)),
        ),
        { op: "expect-count", locator: R("listitem"), count: rows.length },
        S("fill", L("Buscar"), rows[8].name),
        S("click", R("button", "Filtrar")),
        {
          op: "expect-ordered-text",
          locator: R("list", "Relatórios"),
          values: [rows[8].name],
        },
        S("expect-text", T("total"), "9"),
        S("click", R("button", "Limpar")),
        { op: "expect-count", locator: R("listitem"), count: rows.length },
        Q("metrics", 1),
      ]),
      reference: `let rows=[];const input=document.querySelector('#query');function render(){const values=rows.filter(x=>x.name.includes(input.value));document.querySelector('ul').replaceChildren(...values.map(x=>{const li=document.createElement('li');li.textContent=x.name;return li;}));el('total').textContent=values.reduce((n,x)=>n+x.amount,0);el('quantidade').textContent=values.length;}button('Filtrar').onclick=render;button('Limpar').onclick=()=>{input.value='';render();};api('/api/metrics').then(data=>{rows=data.items;render();});`,
      mutation: `button('Limpar').onclick=()=>{};`,
    },
    {
      description:
        "Implemente cadastro em três etapas: Nome obrigatório; Endereço obrigatório; revisão final. Continuar valida e foca o campo vazio. Voltar preserva os valores e permite editar Nome antes da revisão. A revisão deve refletir os valores atuais. Somente Confirmar cadastro envia POST /api/enrollment {name,address} uma vez e anuncia Cadastro confirmado.",
      html: `<section id="step-name">${I("name", "Nome")}${B("Continuar")}</section><section id="step-address" hidden>${I("address", "Endereço")}${B("Voltar", "secondary")}${B("Revisar")}</section><section id="step-review" hidden><h2>Revisão final</h2><p data-testid="review-name"></p><p data-testid="review-address"></p>${B("Editar nome", "secondary")}${B("Confirmar cadastro", "commit")}</section>${status}`,
      routes: [route("enroll", "/api/enrollment", "POST", { ok: true })],
      steps: complete([
        S("click", R("button", "Continuar")),
        S("expect-focused", L("Nome")),
        S("fill", L("Nome"), name),
        S("click", R("button", "Continuar")),
        S("click", R("button", "Revisar")),
        S("expect-focused", L("Endereço")),
        S("fill", L("Endereço"), "Rua Sintética 24"),
        S("click", R("button", "Voltar")),
        S("expect-value", L("Nome"), name),
        S("fill", L("Nome"), name + " atualizado"),
        S("click", R("button", "Continuar")),
        S("expect-value", L("Endereço"), "Rua Sintética 24"),
        S("click", R("button", "Revisar")),
        S("expect-text", T("review-name"), name + " atualizado"),
        S("expect-text", T("review-address"), "Rua Sintética 24"),
        Q("enroll", 0),
        S("click", R("button", "Confirmar cadastro")),
        Q("enroll", 1, {
          name: name + " atualizado",
          address: "Rua Sintética 24",
        }),
        S("expect-text", R("status"), "Cadastro confirmado"),
      ]),
      reference: `const name=document.querySelector('#name'),address=document.querySelector('#address');function show(id){['step-name','step-address','step-review'].forEach(x=>document.getElementById(x).hidden=x!==id);}button('Continuar').onclick=()=>{if(!name.value.trim()){name.focus();return;}show('step-address');};button('Voltar').onclick=()=>show('step-name');button('Editar nome').onclick=()=>show('step-name');button('Revisar').onclick=()=>{if(!address.value.trim()){address.focus();return;}el('review-name').textContent=name.value;el('review-address').textContent=address.value;show('step-review');};button('Confirmar cadastro').onclick=async()=>{await api('/api/enrollment','POST',{name:name.value,address:address.value});announce('Cadastro confirmado');};`,
      mutation: `button('Voltar').onclick=()=>{document.getElementById('step-name').hidden=false;document.getElementById('step-address').hidden=true;document.querySelector('#name').value='';};`,
    },
    {
      description:
        "Carregue GET /api/selection e ordene a lista Registros por nome. Ordenar inverte ascendente/descendente sem perder seleção. Cada registro contém checkbox com nome Selecionar seguido do nome completo. Selecionar um registro atualiza contagem Selecionados N. Limpar seleção zera a seleção e desmarca os checkboxes. Não refaça a consulta para ordenar.",
      html: `${B("Ordenar")}${B("Limpar seleção", "secondary")}<ul aria-label="Registros"></ul>${status}`,
      routes: [
        route("selection", "/api/selection", "GET", {
          items: [
            { id: "b", name: prefix + "Beta" },
            { id: "a", name: prefix + "Alfa" },
            { id: "c", name: prefix + "Gama" },
          ],
        }),
      ],
      steps: complete([
        {
          op: "expect-ordered-text",
          locator: R("list", "Registros"),
          values: [prefix + "Alfa", prefix + "Beta", prefix + "Gama"],
        },
        S("check", R("checkbox", "Selecionar " + prefix + "Beta")),
        S("expect-text", R("status"), "Selecionados 1"),
        S("click", R("button", "Ordenar")),
        {
          op: "expect-ordered-text",
          locator: R("list", "Registros"),
          values: [prefix + "Gama", prefix + "Beta", prefix + "Alfa"],
        },
        {
          op: "expect-attribute",
          locator: R("checkbox", "Selecionar " + prefix + "Beta"),
          name: "aria-checked",
          value: "true",
        },
        S("click", R("button", "Limpar seleção")),
        S("expect-text", R("status"), "Selecionados 0"),
        {
          op: "expect-attribute",
          locator: R("checkbox", "Selecionar " + prefix + "Beta"),
          name: "aria-checked",
          value: "false",
        },
        Q("selection", 1),
      ]),
      reference: `let rows=[],descending=false;const selected=new Set();function render(){const values=[...rows].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);if(descending)values.reverse();document.querySelector('ul').replaceChildren(...values.map(row=>{const li=document.createElement('li'),input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label','Selecionar '+row.name);input.checked=selected.has(row.id);input.setAttribute('aria-checked',String(input.checked));input.onchange=()=>{if(input.checked)selected.add(row.id);else selected.delete(row.id);render();};const label=document.createElement('label');label.className='in-choice';label.append(row.name,input);li.append(label);return li;}));announce('Selecionados '+selected.size);}button('Ordenar').onclick=()=>{descending=!descending;render();};button('Limpar seleção').onclick=()=>{selected.clear();render();};api('/api/selection').then(data=>{rows=data.items;render();});`,
      mutation: `button('Ordenar').onclick=()=>{document.querySelector('ul').replaceChildren(...[...document.querySelector('ul').children].reverse());document.querySelectorAll('input').forEach(x=>{x.checked=false;x.setAttribute('aria-checked','false');});};`,
    },
    {
      description:
        "Migre a identidade legada do painel data-testid identity para Recursive via --in-font-family-sans, texto --in-color-text-primary e fundo --in-color-background-surface. Preserve o fluxo Buscar perfil: GET /api/identity e exibição integral do nome no status. O resultado acompanha tema claro e escuro sem cores ou fontes literais.",
      html: `<section data-testid="identity" style="font-family:Arial;color:#202020;background:#ffffff"><h2>Perfil</h2>${B("Buscar perfil")}${status}</section>`,
      routes: [route("identity", "/api/identity", "GET", { name })],
      steps: complete([
        {
          op: "expect-token-style",
          locator: T("identity"),
          name: "font-family",
          value: "--in-font-family-sans",
        },
        {
          op: "expect-token-style",
          locator: T("identity"),
          name: "color",
          value: "--in-color-text-primary",
        },
        {
          op: "expect-token-style",
          locator: T("identity"),
          name: "background-color",
          value: "--in-color-background-surface",
        },
        S("click", R("button", "Buscar perfil")),
        S("expect-text", R("status"), name),
        Q("identity", 1),
      ]),
      reference: `const panel=el('identity');panel.style.fontFamily='var(--in-font-family-sans)';panel.style.color='var(--in-color-text-primary)';panel.style.background='var(--in-color-background-surface)';button('Buscar perfil').onclick=async()=>announce((await api('/api/identity')).name);`,
      mutation: `el('identity').style.fontFamily='Arial';`,
    },
    {
      description:
        "Corrija overflow no artigo data-testid content. Carregue GET /api/long-content e preserve title, body e identificador longo sem truncar, esconder ou remover conteúdo. Copiar identificador coloca o identificador integral no campo Identificador copiado. A página precisa caber no viewport, incluindo palavras sem espaços e conteúdo RTL.",
      html: `<article data-testid="content" style="inline-size:2000px"><h2 data-testid="content-title"></h2><p data-testid="content-body"></p><p data-testid="identifier"></p>${B("Copiar identificador")}${I("copied", "Identificador copiado")}</article>`,
      routes: [
        route("content", "/api/long-content", "GET", {
          title: name,
          body,
          identifier:
            "ID-" + (hidden ? "معرف" : "x").repeat(hidden ? 600 : 350),
        }),
      ],
      steps: complete([
        S("expect-text", T("content-title"), name),
        S("expect-text", T("content-body"), body),
        S("click", R("button", "Copiar identificador")),
        S(
          "expect-value",
          L("Identificador copiado"),
          "ID-" + (hidden ? "معرف" : "x").repeat(hidden ? 600 : 350),
        ),
      ]),
      reference: `el('content').style.inlineSize='100%';el('content').style.maxInlineSize='100%';el('content').style.overflowWrap='anywhere';api('/api/long-content').then(data=>{el('content-title').textContent=data.title;el('content-body').textContent=data.body;el('identifier').textContent=data.identifier;button('Copiar identificador').onclick=()=>document.querySelector('#copied').value=data.identifier;});`,
      mutation: `el('content').style.inlineSize='2000px';el('content').style.maxInlineSize='none';`,
    },
    {
      description:
        "Ler documento abre diálogo modal Documento completo, carrega GET /api/document e mostra o texto integral em data-testid document-body. Fechar documento recebe foco. O conteúdo longo rola dentro do diálogo e o botão Aceitar documento ao final deve ser alcançável. Aceitar fecha, devolve foco e anuncia Documento aceito. Escape também fecha e restaura foco; o fundo fica indisponível.",
      html: `${B("Ler documento")}<dialog aria-label="Documento completo"><h2>Documento completo</h2>${B("Fechar documento", "secondary")}<div data-testid="document-body"></div>${B("Aceitar documento", "commit")}</dialog>${status}`,
      routes: [
        {
          id: "document",
          path: "/api/document",
          method: "GET",
          responses: [
            { status: 200, json: { body } },
            { status: 200, json: { body } },
          ],
        },
      ],
      steps: complete([
        S("click", R("button", "Ler documento")),
        S("expect-focused", R("button", "Fechar documento")),
        S("expect-text", T("document-body"), body),
        S("click", R("button", "Aceitar documento")),
        S("expect-hidden", R("dialog", "Documento completo")),
        S("expect-focused", R("button", "Ler documento")),
        S("expect-text", R("status"), "Documento aceito"),
        S("click", R("button", "Ler documento")),
        S("press", R("button", "Fechar documento"), "Escape"),
        S("expect-hidden", R("dialog", "Documento completo")),
        S("expect-focused", R("button", "Ler documento")),
      ]),
      reference: `const dialog=document.querySelector('dialog'),trigger=button('Ler documento');dialog.style.maxBlockSize='calc(100dvh - var(--in-space-large))';dialog.style.maxInlineSize='calc(100% - var(--in-space-large))';dialog.style.overflow='auto';function close(){dialog.close();trigger.focus();}trigger.onclick=async()=>{dialog.showModal();button('Fechar documento').focus();el('document-body').textContent=(await api('/api/document')).body;};button('Fechar documento').onclick=close;button('Aceitar documento').onclick=()=>{close();announce('Documento aceito');};dialog.oncancel=e=>{e.preventDefault();close();};`,
      mutation: `button('Aceitar documento').onclick=()=>announce('Documento aceito');`,
    },
    {
      description:
        "Faça o formulário funcionar em zoom nativo do navegador de 100% e 200%, com reflow sem overflow e sem remover campos. Nome e E-mail continuam acessíveis; Enviar dados envia POST /api/zoom-form {name,email} e anuncia Dados enviados. Não use CSS zoom, transform ou redução de fonte para simular o zoom do navegador.",
      html: `<form style="inline-size:1000px" data-testid="zoom-form">${I("name", "Nome")}${I("email", "E-mail", "email")}<button class="in-button in-button--commit">Enviar dados</button></form>${status}`,
      routes: [route("zoom", "/api/zoom-form", "POST", { ok: true })],
      zoom: true,
      steps: complete([
        S("fill", L("Nome"), name),
        S("fill", L("E-mail"), "zoom@example.test"),
        S("click", R("button", "Enviar dados")),
        Q("zoom", 1, { name, email: "zoom@example.test" }),
        S("expect-text", R("status"), "Dados enviados"),
      ]),
      reference: `el('zoom-form').style.inlineSize='100%';el('zoom-form').style.maxInlineSize='100%';document.querySelector('form').onsubmit=async e=>{e.preventDefault();await api('/api/zoom-form','POST',{name:document.querySelector('#name').value,email:document.querySelector('#email').value});announce('Dados enviados');};`,
      mutation: `el('zoom-form').style.inlineSize='1000px';el('zoom-form').style.maxInlineSize='none';`,
    },
    {
      description:
        "Integre rotas reais /src/index.html?view=people e /src/index.html?view=projects por links Pessoas e Projetos. Cada rota mostra o heading correspondente e seus dados de GET /api/route-people ou /api/route-projects. O campo Nota persistente preserva o texto entre navegação e retorno pelo histórico. Não mostre dados da rota anterior.",
      html: `<nav aria-label="Áreas"><a href="/src/index.html?view=people">Pessoas</a><a href="/src/index.html?view=projects">Projetos</a></nav>${I("note", "Nota persistente")}<h2 data-testid="route-title"></h2><ul aria-label="Dados da rota"></ul>`,
      routes: [
        {
          id: "people",
          path: "/api/route-people",
          method: "GET",
          responses: [
            { status: 200, json: { items: [name] } },
            { status: 200, json: { items: [name] } },
          ],
        },
        route("projects", "/api/route-projects", "GET", { items: [title] }),
      ],
      steps: complete([
        S("click", R("link", "Pessoas")),
        { op: "expect-path", value: "/src/index.html?view=people" },
        S("expect-text", T("route-title"), "Pessoas"),
        S("fill", L("Nota persistente"), "Nota entre rotas"),
        S("click", R("link", "Projetos")),
        { op: "expect-path", value: "/src/index.html?view=projects" },
        S("expect-value", L("Nota persistente"), "Nota entre rotas"),
        {
          op: "expect-ordered-text",
          locator: R("list", "Dados da rota"),
          values: [title],
        },
        { op: "back" },
        S("expect-text", T("route-title"), "Pessoas"),
        S("expect-value", L("Nota persistente"), "Nota entre rotas"),
        {
          op: "expect-ordered-text",
          locator: R("list", "Dados da rota"),
          values: [name],
        },
        Q("projects", 1),
      ]),
      reference: `const note=document.querySelector('#note');note.value=localStorage.getItem('route-note')??'';note.oninput=()=>localStorage.setItem('route-note',note.value);const routeName=new URLSearchParams(location.search).get('view');if(routeName){el('route-title').textContent=routeName==='people'?'Pessoas':'Projetos';api('/api/route-'+routeName).then(data=>{document.querySelector('ul').replaceChildren(...data.items.map(name=>{const li=document.createElement('li');li.textContent=name;return li;}));});}`,
      mutation: `document.querySelector('#note').oninput=null;`,
    },
    {
      description:
        "Recupere uma falha real de conexão em GET /api/recovery. A falha mostra Não foi possível conectar em alert e Tentar novamente. Retry carrega a lista Documentos com os nomes recebidos, esconde erro, anuncia Conexão restaurada e não duplica dados ou consulta em loop.",
      html: `<div role="alert" hidden>Não foi possível conectar</div>${B("Tentar novamente")}<ul aria-label="Documentos"></ul>${status}`,
      routes: [
        {
          id: "recovery",
          path: "/api/recovery",
          method: "GET",
          responses: [
            { status: 503, json: null, abort: "connectionreset" },
            { status: 200, json: { items: [name, title] } },
          ],
        },
      ],
      steps: complete([
        S("expect-visible", R("alert")),
        Q("recovery", 1),
        S("click", R("button", "Tentar novamente")),
        S("expect-hidden", R("alert")),
        {
          op: "expect-ordered-text",
          locator: R("list", "Documentos"),
          values: [name, title],
        },
        S("expect-text", R("status"), "Conexão restaurada"),
        Q("recovery", 2),
      ]),
      reference: `const error=document.querySelector('[role=alert]');async function load(){try{const data=await api('/api/recovery');document.querySelector('ul').replaceChildren(...data.items.map(name=>{const li=document.createElement('li');li.textContent=name;return li;}));error.hidden=true;announce('Conexão restaurada');}catch{error.hidden=false;}}button('Tentar novamente').onclick=load;load();`,
      mutation: `button('Tentar novamente').onclick=()=>{};`,
    },
    {
      description:
        "Carregue GET /api/draft, preserve revision e permita editar Título. Visualizar mostra a prévia em data-testid preview-title e não publica. Publicar conteúdo, com data-variant=commit, abre diálogo Publicar versão. Cancelar fecha sem POST. Confirmar publicação envia POST /api/publish {title,revision}; enquanto aguarda desabilita confirmação; depois fecha e anuncia Publicação concluída. Não publique duas vezes.",
      html: `${I("title", "Título")}${B("Visualizar")}${B("Publicar conteúdo", "commit", 'data-variant="commit"')}<p data-testid="preview-title"></p><dialog aria-label="Publicar versão"><h2>Publicar versão</h2>${B("Cancelar", "secondary")}${B("Confirmar publicação", "commit")}</dialog>${status}`,
      routes: [
        route("draft", "/api/draft", "GET", { title: name, revision: 7 }),
        route(
          "publish",
          "/api/publish",
          "POST",
          { ok: true },
          { release: "published" },
        ),
      ],
      steps: complete([
        S("expect-value", L("Título"), name),
        S("fill", L("Título"), title),
        S("click", R("button", "Visualizar")),
        S("expect-text", T("preview-title"), title),
        Q("publish", 0),
        {
          op: "expect-attribute",
          locator: R("button", "Publicar conteúdo"),
          name: "data-variant",
          value: "commit",
        },
        S("click", R("button", "Publicar conteúdo")),
        S("click", R("button", "Cancelar")),
        Q("publish", 0),
        S("click", R("button", "Publicar conteúdo")),
        S("click", R("button", "Confirmar publicação")),
        Q("publish", 1, { title, revision: 7 }),
        S("expect-disabled", R("button", "Confirmar publicação")),
        { op: "respond", id: "published" },
        S("expect-text", R("status"), "Publicação concluída"),
        S("expect-hidden", R("dialog", "Publicar versão")),
      ]),
      reference: `const input=document.querySelector('#title'),dialog=document.querySelector('dialog');let revision;api('/api/draft').then(data=>{input.value=data.title;revision=data.revision;});button('Visualizar').onclick=()=>el('preview-title').textContent=input.value;button('Publicar conteúdo').onclick=()=>dialog.showModal();button('Cancelar').onclick=()=>dialog.close();button('Confirmar publicação').onclick=async()=>{const confirm=button('Confirmar publicação');if(confirm.disabled)return;confirm.disabled=true;await api('/api/publish','POST',{title:input.value,revision});dialog.close();announce('Publicação concluída');};`,
      mutation: `button('Confirmar publicação').onclick=()=>{document.querySelector('dialog').close();announce('Publicação concluída');};`,
    },
  ];
}
const write = async (path, value) => {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
};
for (const hidden of [false, true]) {
  const path = hidden
      ? "benchmarks/tasks.heldout.json"
      : "benchmarks/tasks.public.json",
    dataset = JSON.parse(await readFile(path, "utf8"));
  for (const [index, def] of cases(hidden).entries()) {
    const id = hidden ? "heldout-" + (index + 1) : "task-" + (index + 21),
      task = dataset.tasks.find((t) => t.id === id),
      worker = `benchmarks/workers/${id}`,
      fixturePath = `benchmarks/fixtures/${id}.json`,
      gradingPath = `benchmarks/evaluator/criteria/${id}.json`;
    await write(fixturePath, {
      schemaVersion: "1.0",
      classification: "synthetic",
      clock: "2026-02-01T12:00:00.000Z",
      seed: 300 + index + (hidden ? 100 : 0),
      routes: def.routes,
    });
    const scenarios = (def.zoom ? [1, 2] : [1, 1]).map((zoomFactor, n) => ({
      id: n ? "desktop-functional" : "mobile-functional",
      viewport: {
        width: def.zoom ? (hidden ? 768 : 1440) : n ? 1440 : 320,
        height: 900,
      },
      theme: n ? "dark" : "light",
      density: n ? "focus" : "calm",
      direction: hidden ? "rtl" : "ltr",
      ...(def.zoom ? { zoomFactor } : {}),
      steps: def.steps,
    }));
    await write(gradingPath, {
      schemaVersion: "1.0",
      kind: "independent-task-criteria",
      caseId: id,
      entry: "/src/index.html",
      fixture: { path: fixturePath, sha256: H(await readFile(fixturePath)) },
      scenarios,
    });
    await write(
      worker + "/src/index.html",
      `<!doctype html><html lang="${hidden ? "ar" : "pt-BR"}" dir="${hidden ? "rtl" : "ltr"}" data-in-theme="light" data-in-density="calm"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.requirement} · INTEIRO</title><link rel="stylesheet" href="/__inteiro__/composition.css"></head><body class="in-composition"><main class="in-content-container"><header class="in-page-header"><h1>${task.requirement}</h1></header>${def.html}</main><script type="module" src="./app.js"></script></body></html>\n`,
    );
    await write(
      worker + "/src/app.js",
      "// Implement TASK.md. This starter is intentionally incomplete.\n",
    );
    await write(
      worker + "/TASK.md",
      `# ${task.requirement}\n\n${def.description}\n\nUse o contrato INTEIRO em /__inteiro__/composition.css. Preserve nomes acessíveis e data-testid. Suporte teclado, target 44px, reduced motion, quatro temas e direção RTL. Implemente apenas src. Não altere políticas, testes ou baselines. Dados sintéticos; não são fornecidas soluções de referência.\n`,
    );
    const common = `const el=id=>document.querySelector('[data-testid="'+id+'"]');const button=name=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===name);const announce=text=>document.querySelector('[role=status]').textContent=text;async function api(path,method='GET',body){const response=await fetch(path,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('synthetic response failure');return response.json();}\n`;
    await write(
      `benchmarks/evaluator/references/${id}.js`,
      common + def.reference + "\n",
    );
    await write(`benchmarks/evaluator/mutations/${id}.js`, def.mutation + "\n");
    Object.assign(task, {
      initialImplementation: worker + "/src/index.html",
      initialFiles: [worker + "/src/index.html", worker + "/src/app.js"],
      instructions: worker + "/TASK.md",
      functionalRequirement: def.description,
      contract: "benchmarks/contract/inteiro.config.json",
      fixtures: [fixturePath],
      grading: { path: gradingPath, sha256: H(await readFile(gradingPath)) },
      acceptance: [
        "Independent functional criteria in the immutable grading snapshot",
        "Full INTEIRO static/browser/review gates remain required",
      ],
    });
    delete task.fixture;
  }
  await write(path, dataset);
}
console.log(
  "Authored ten complex public and ten heldout tasks with separate inputs, criteria and evaluator-only controls.",
);
