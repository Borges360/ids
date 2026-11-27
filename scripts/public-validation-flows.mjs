// Public checks authored from TASK.md requirements. Never import private grading criteria here.
const role = (role, name) => ({ role, ...(name ? { name } : {}) });
const click = (name) => ({ type: "click", target: role("button", name) });
const fill = (name, value) => ({
  type: "fill",
  target: role("textbox", name),
  value,
});
const text = (name, value) => ({
  type: "expectText",
  target: role(name),
  value,
});
const visible = (name, label) => ({
  type: "expectVisible",
  target: role(name, label),
});
const focus = (name, label) => ({
  type: "expectFocused",
  target: role(name, label),
});
const key = (value) => ({ type: "keyboard", key: value });
const shot = () => ({ type: "screenshot" });
const wait = (name, index = 0) => ({
  type: "waitForResponseAlias",
  alias: name + "-" + index,
});
const release = (alias) => ({ type: "releaseResponseAlias", alias });
const person = [
  fill("Nome", "Rafa Silva"),
  fill("E-mail", "rafa@example.test"),
];

function declaredFlow(number) {
  switch (number) {
    case 1:
      return [
        ...person,
        click("Criar cadastro"),
        wait("create"),
        text("status", "Cadastro criado"),
      ];
    case 2:
      return [
        wait("page1"),
        click("Próxima página"),
        wait("page2"),
        text("status", "Página 2"),
        click("Página anterior"),
        wait("page1", 1),
      ];
    case 3:
      return [
        wait("dashboard"),
        click("Atualizar dados"),
        wait("dashboard", 1),
        { type: "expectVisible", target: { testId: "kpi-total" } },
      ];
    case 4:
      return [
        click("Abrir navegação"),
        visible("navigation", "Navegação principal"),
        shot(),
        key("Escape"),
        focus("button", "Abrir navegação"),
      ];
    case 5:
      return [
        wait("items"),
        fill("Nome do item", "Caderno"),
        click("Adicionar item"),
        wait("create"),
        visible("button", "Editar Caderno"),
      ];
    case 6:
      return [
        text("status", "Carregando"),
        shot(),
        release("initial"),
        wait("items"),
        text("alert", "Não foi possível carregar"),
        shot(),
        click("Tentar novamente"),
        release("empty"),
        wait("items", 1),
        text("status", "Nenhum item"),
        shot(),
        click("Atualizar"),
        release("success"),
        wait("items", 2),
      ];
    case 7:
      return [
        click("Editar observação"),
        visible("dialog", "Editar observação"),
        focus("textbox", "Assunto"),
        key("Shift+Tab"),
        focus("button", "Fechar"),
        key("Tab"),
        focus("textbox", "Assunto"),
        shot(),
        key("Escape"),
        focus("button", "Editar observação"),
      ];
    case 8:
      return [
        click("Abrir detalhes"),
        visible("dialog", "Detalhes do item"),
        focus("button", "Fechar detalhes"),
        shot(),
        key("Escape"),
        focus("button", "Abrir detalhes"),
      ];
    case 9:
      return [
        {
          type: "select",
          target: role("combobox", "Tema"),
          value: "contrast-dark",
        },
        {
          type: "select",
          target: role("combobox", "Densidade"),
          value: "focus",
        },
        shot(),
        { type: "reload" },
        visible("combobox", "Tema"),
      ];
    case 10:
      return [wait("content"), visible("main"), shot()];
    case 11:
      return [
        ...person,
        click("Salvar perfil"),
        wait("save"),
        text("status", "Perfil salvo"),
      ];
    case 12:
      return [
        click("Atualizar"),
        wait("summary"),
        { type: "expectVisible", target: { testId: "painel" } },
      ];
    case 13:
      return [
        { type: "click", target: role("tab", "Visão geral") },
        key("ArrowRight"),
        focus("tab", "Histórico"),
        key("Home"),
        focus("tab", "Visão geral"),
        key("End"),
        focus("tab", "Histórico"),
      ];
    case 14:
      return [
        wait("records"),
        { type: "fill", target: role("searchbox", "Buscar"), value: "mar" },
        click("Filtrar"),
        shot(),
        click("Limpar"),
      ];
    case 15:
      return [
        click("Salvar código"),
        text("alert", "Informe seis caracteres"),
        focus("textbox", "Código"),
        shot(),
        fill("Código", "ABC123"),
        click("Salvar código"),
        wait("save"),
        text("status", "Código salvo"),
      ];
    case 16:
      return [
        {
          type: "setInputFiles",
          target: { label: "Arquivo" },
          file: {
            name: "note.txt",
            mimeType: "text/plain",
            content: "Arquivo sintético",
          },
        },
        click("Enviar arquivo"),
        visible("progressbar", "Progresso do envio"),
        { type: "expectDisabled", target: role("button", "Enviar arquivo") },
        shot(),
        release("uploaded"),
        wait("upload"),
        text("status", "Envio concluído"),
      ];
    case 17:
      return [
        wait("profile"),
        { type: "expectVisible", target: { testId: "avatar" } },
        click("Recarregar perfil"),
        wait("profile", 1),
      ];
    case 18:
      return [
        click("Continuar"),
        focus("textbox", "Nome"),
        fill("Nome", "Rafa Silva"),
        click("Continuar"),
        click("Voltar"),
        click("Continuar"),
        click("Confirmar pedido"),
        wait("order"),
        text("status", "Pedido confirmado"),
      ];
    case 19:
      return [
        click("Ajuda sobre prazo"),
        { type: "expectVisible", target: { testId: "help-panel" } },
        key("Tab"),
        focus("link", "Política de prazos"),
        key("Escape"),
        focus("button", "Ajuda sobre prazo"),
      ];
    case 20:
      return [
        click("Ações"),
        focus("menuitem", "Editar"),
        key("ArrowDown"),
        focus("menuitem", "Arquivar"),
        key("Enter"),
        wait("archive"),
        text("status", "Registro arquivado"),
      ];
    case 21:
      return [
        wait("metrics"),
        fill("Buscar", "Registro especial"),
        click("Filtrar"),
        shot(),
        click("Limpar"),
      ];
    case 22:
      return [
        fill("Nome", "Rafa Silva"),
        click("Continuar"),
        fill("Endereço", "Rua Sintética 123"),
        click("Revisar"),
        shot(),
        click("Confirmar cadastro"),
        wait("enroll"),
        text("status", "Cadastro confirmado"),
      ];
    case 23:
      return [
        wait("selection"),
        click("Ordenar"),
        shot(),
        click("Limpar seleção"),
      ];
    case 24:
      return [
        click("Buscar perfil"),
        wait("identity"),
        { type: "expectVisible", target: { testId: "identity" } },
      ];
    case 25:
      return [
        wait("content"),
        click("Copiar identificador"),
        visible("textbox", "Identificador copiado"),
      ];
    case 26:
      return [
        click("Ler documento"),
        wait("document"),
        visible("dialog", "Documento completo"),
        focus("button", "Fechar documento"),
        {
          type: "expectReachable",
          target: role("button", "Aceitar documento"),
        },
        shot(),
        click("Aceitar documento"),
        text("status", "Documento aceito"),
        focus("button", "Ler documento"),
      ];
    case 27:
      return [
        ...person,
        click("Enviar dados"),
        wait("zoom"),
        text("status", "Dados enviados"),
      ];
    case 28:
      return [
        wait("people"),
        fill("Nota persistente", "Nota sintética"),
        { type: "click", target: role("link", "Projetos") },
        wait("projects"),
        visible("heading", "Projetos"),
        { type: "click", target: role("link", "Pessoas") },
        wait("people", 1),
      ];
    case 29:
      return [
        wait("recovery"),
        text("alert", "Não foi possível conectar"),
        click("Tentar novamente"),
        wait("recovery", 1),
        text("status", "Conexão restaurada"),
      ];
    case 30:
      return [
        wait("draft"),
        fill("Título", "Título sintético"),
        click("Visualizar"),
        {
          type: "expectText",
          target: { testId: "preview-title" },
          value: "Título sintético",
        },
        click("Publicar conteúdo"),
        visible("dialog", "Publicar versão"),
        click("Confirmar publicação"),
        {
          type: "expectDisabled",
          target: role("button", "Confirmar publicação"),
        },
        shot(),
        release("published"),
        wait("publish"),
        text("status", "Publicação concluída"),
      ];
    default:
      throw Error("Unknown public task family");
  }
}

const payload = (fixture, id, index = 0) =>
  fixture.routes.find((route) => route.id === id)?.responses[index]?.json;
const attr = (target, attribute, value) => ({
  type: "expectAttribute",
  target,
  attribute,
  value,
});
export function publicFlow(number, fixture) {
  let actions = declaredFlow(number);
  if (number === 5)
    actions = [
      wait("items"),
      fill("Nome do item", "Caderno"),
      click("Adicionar item"),
      wait("create"),
      click("Editar Caderno"),
      fill("Nome do item", "Caderno revisado"),
      click("Salvar alterações"),
      wait("update"),
      click("Excluir Caderno revisado"),
      visible("dialog", "Excluir item"),
      shot(),
      click("Cancelar"),
      click("Excluir Caderno revisado"),
      click("Excluir item"),
      wait("delete"),
      text("main", "Nenhum item"),
    ];
  if (number === 9)
    actions.push(
      {
        type: "expectValue",
        target: role("combobox", "Tema"),
        value: "contrast-dark",
      },
      {
        type: "expectValue",
        target: role("combobox", "Densidade"),
        value: "focus",
      },
      attr({ document: true }, "data-in-theme", "contrast-dark"),
      attr({ document: true }, "data-in-density", "focus"),
    );
  if (number === 10)
    actions.push(
      attr({ document: true }, "dir", "rtl"),
      text("main", payload(fixture, "content").body),
    );
  if (number === 13)
    actions.push(
      attr(role("tab", "Histórico"), "aria-selected", "true"),
      attr(role("tab", "Visão geral"), "aria-selected", "false"),
    );
  if (number === 17) {
    const data = payload(fixture, "profile", 1);
    actions.push(
      {
        type: "expectText",
        target: { testId: "profile-name" },
        value: data.name,
      },
      {
        type: "expectText",
        target: { testId: "avatar" },
        value: data.name
          .split(/\s+/)
          .map((word) => word[0])
          .join("")
          .toUpperCase(),
      },
    );
  }
  if (number === 23) {
    const name = payload(fixture, "selection").items[0].name;
    actions = [
      wait("selection"),
      { type: "click", target: role("checkbox", "Selecionar " + name) },
      {
        type: "expectChecked",
        target: role("checkbox", "Selecionar " + name),
        value: "true",
      },
      click("Ordenar"),
      {
        type: "expectChecked",
        target: role("checkbox", "Selecionar " + name),
        value: "true",
      },
      shot(),
      click("Limpar seleção"),
      {
        type: "expectChecked",
        target: role("checkbox", "Selecionar " + name),
        value: "false",
      },
    ];
  }
  if (number === 25)
    actions.push({
      type: "expectValue",
      target: role("textbox", "Identificador copiado"),
      value: payload(fixture, "content").identifier,
    });
  if (number === 26) {
    const index = actions.findIndex((action) => action.type === "screenshot");
    actions.splice(index, 0, {
      type: "expectText",
      target: { testId: "document-body" },
      value: payload(fixture, "document").body,
    });
  }
  if (number === 29) actions.splice(2, 0, shot());
  const labels = {
    5: ["modal"],
    6: ["loading", "error", "empty"],
    7: ["modal"],
    8: ["modal"],
    9: ["selected"],
    10: ["long-content"],
    15: ["invalid"],
    16: ["loading"],
    22: ["review"],
    23: ["selected"],
    26: ["modal"],
    29: ["error"],
    30: ["loading"],
  };
  let index = 0;
  for (const action of actions)
    if (action.type === "screenshot") {
      const label = labels[number]?.[index++];
      if (label) action.stateId = label;
    }
  return actions;
}

export function publicStateContract(number, fixture) {
  const primary = publicFlow(number, fixture),
    states = [
      { id: "default", actions: [visible("main")] },
      {
        id: "primary-flow",
        actions: primary,
        ...([4, 8].includes(number)
          ? {
              viewports: ["small", "mobile"],
              viewportReason:
                "Mobile overlay interaction; desktop rendering remains a default-state case.",
            }
          : {}),
      },
    ];
  const supported = { default: { scenario: "default", phase: "final" } };
  const screenshot = (state) => {
    const index = primary.findIndex((action) => action.stateId === state);
    if (index >= 0)
      supported[state] = {
        scenario: "primary-flow",
        phase: "action-capture",
        actionIndex: index,
      };
  };
  for (const state of [
    "loading",
    "error",
    "empty",
    "modal",
    "invalid",
    "selected",
    "long-content",
  ])
    screenshot(state);
  const invalidNames = {
    1: "Criar cadastro",
    11: "Salvar perfil",
    18: "Continuar",
    22: "Continuar",
  };
  if (invalidNames[number]) {
    states.push({
      id: "invalid",
      actions: [click(invalidNames[number]), focus("textbox", "Nome")],
    });
    supported.invalid = { scenario: "invalid", phase: "final" };
  }
  if (number === 2) {
    states.push({
      id: "disabled",
      actions: [
        wait("page1"),
        { type: "expectDisabled", target: role("button", "Página anterior") },
      ],
    });
    supported.disabled = { scenario: "disabled", phase: "final" };
  }
  if ([16, 30].includes(number)) supported.disabled = { ...supported.loading };
  if (number === 30) supported.modal = { ...supported.loading };
  if (number === 13)
    supported.selected = { scenario: "primary-flow", phase: "final" };
  if ([10, 21, 25].includes(number))
    supported["long-content"] = { scenario: "primary-flow", phase: "final" };
  if (number === 26) supported["long-content"] = { ...supported.modal };
  if ([1, 5, 6, 11, 15, 16, 18, 22, 27, 29, 30].includes(number))
    supported.success = { scenario: "primary-flow", phase: "final" };
  const names = [
    "default",
    "loading",
    "empty",
    "error",
    "disabled",
    "invalid",
    "success",
    "modal",
    "selected",
    "readonly",
    "long-content",
  ];
  const coverage = Object.fromEntries(
    names.map((state) => [
      state,
      supported[state]
        ? { applicable: true, ...supported[state] }
        : {
            applicable: false,
            reason: `Task family ${number} does not expose ${state} in its published functional/fixture contract. Declared API statuses: ${[...new Set(fixture.routes.flatMap((route) => route.responses.map((response) => (response.abort ? "network-abort" : response.status))))].join(", ") || "no API"}. General component state robustness is covered by the composition matrix.`,
          },
    ]),
  );
  return { states, coverage };
}

export const familyPatterns = [
  "form-layout",
  "pagination",
  "dashboard-grid",
  "mobile-navigation",
  "data-list",
  "empty-state",
  "dialog",
  "drawer",
  "select",
  "editorial",
  "form-layout",
  "stat-card",
  "tabs",
  "filter-bar",
  "inline-error",
  "progress",
  "profile",
  "stepper",
  "popover",
  "dropdown-menu",
  "dashboard-grid",
  "stepper",
  "data-table",
  "profile",
  "editorial",
  "dialog",
  "form-layout",
  "navigation-menu",
  "alert",
  "action-commit",
];
