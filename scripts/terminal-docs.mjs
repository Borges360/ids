// Páginas de documentação do INTEIRO Terminal (pt-BR e inglês).
// Os quadros são a saída REAL das projeções de @inteiro/terminal, não ilustração:
// qualquer mudança nos componentes muda a documentação na próxima geração.
import { readFile } from "node:fs/promises";
import {
  TERMINAL_COMPONENTS,
  SEMANTIC_ROLES,
  SettingsSession,
  PanelController,
  TableModel,
  LogModel,
  resolveBindings,
  TerminalPanel,
  MenuList,
  SettingsList,
  TextInput,
  SecretInput,
  Select,
  MultiSelect,
  SearchField,
  ActionBar,
  KeyHints,
  Breadcrumbs,
  ConfirmAction,
  ChangeSummary,
  StatusMessage,
  Progress,
  TaskList,
  ResultList,
  DetailView,
  DataTable,
  LogView,
  EmptyState,
  ErrorState,
  HelpView,
} from "../packages/terminal/src/index.ts";
import { fields, defaults } from "../examples/terminal/shared.ts";

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/* ------------------------------------------------------------------ pintura */
// Papéis semânticos de SEMANTIC_ROLES aplicados ao texto real. A pintura nunca
// acrescenta nem remove caracteres: o texto sem cor continua completo.
const COMMIT = /^(Salvar|Excluir|Remover|Exportar|Publicar|Descartar)/;
const MUTED_BRACKET = /^(protegido|entrada protegida|origem:|indisponível)/;
const STATUS_CLASS = {
  Erro: "danger",
  Concluído: "success",
  Atenção: "warning",
  Informação: "info",
};

function paintLine(raw, index, { title, color }) {
  const blank = raw.trim() === "";
  let html = esc(raw);
  let cls = "tm-line";
  if (blank) return `<span class="${cls}"></span>`;
  if (color) {
    if (/^> /.test(raw)) {
      cls += " tm-line--focus";
      html = html.replace(/^&gt; /, '<span class="tm-marker">&gt;</span> ');
    }
    html = html.replace(
      /^(\s*)(Erro|Concluído|Atenção|Informação):/,
      (_, space, kind) =>
        `${space}<span class="tm-${STATUS_CLASS[kind]}">${kind}:</span>`,
    );
    html = html.replace(/\[([^\]]+)\]/g, (whole, inner) => {
      if (inner === "x" || inner === " ") return whole;
      if (MUTED_BRACKET.test(inner))
        return `<span class="tm-muted">${whole}</span>`;
      return `<span class="tm-${COMMIT.test(inner) ? "commit" : "choose"}">${whole}</span>`;
    });
    if (title && index === 0) cls += " tm-line--title";
    if (
      (title && index === 1) ||
      /^\d+-\d+ de \d+ linhas$/.test(raw) ||
      /^Enter .* · .*Esc /.test(raw)
    )
      cls += " tm-line--muted";
  }
  return `<span class="${cls}">${html}</span>`;
}

function screen(lines, options) {
  return lines.map((line, i) => paintLine(line, i, options)).join("");
}

/** Quadro de terminal: saída real de um componente, com o nome e a largura em células. */
function frame({ name, cols, lines, note = "", title = false, color = true }) {
  const meta = [`${cols} col`, note].filter(Boolean).join(" · ");
  return `<figure class="term" style="--cols:${cols}"><figcaption><span class="term__name">${esc(name)}</span><span class="term__meta">${esc(meta)}</span></figcaption><pre class="term__screen" tabindex="0">${screen(lines, { title, color })}</pre></figure>`;
}

const join = (...views) =>
  views.flatMap((v, i) => (i ? ["", ...v.lines] : v.lines));

/* -------------------------------------------------------------------- dados */
const bindings = resolveBindings();
const session = (list = fields) =>
  new SettingsSession(list, structuredClone(defaults));
const controller = (list = fields) =>
  new PanelController({
    session: session(list),
    title: "Preferências",
    scope: "projeto atual",
    persist: async () => {},
    bindings,
  });
const withOverride = fields.map((f) =>
  f.id === "language"
    ? { ...f, override: { value: "en", source: "variável INTEIRO_LANG" } }
    : f,
);

const projectChoices = [
  { id: "a", label: "inteiro-docs" },
  { id: "b", label: "inteiro-cli" },
  { id: "c", label: "inteiro-mcp" },
];
const tableColumns = [
  { id: "name", label: "Nome", priority: 1 },
  { id: "env", label: "Ambiente", priority: 2 },
  { id: "state", label: "Estado", priority: 3 },
  { id: "owner", label: "Responsável", priority: 4 },
  { id: "updated", label: "Atualizado", priority: 5 },
  { id: "notes", label: "Notas", priority: 6 },
];
const tableRecords = [
  {
    name: "inteiro-mcp",
    env: "homelab",
    state: "ativo",
    owner: "plataforma",
    updated: "hoje",
    notes: "sem pendências",
  },
  {
    name: "inteiro-docs",
    env: "homelab",
    state: "ativo",
    owner: "design",
    updated: "ontem",
    notes: "revisão aberta",
  },
  {
    name: "inteiro-cli",
    env: "local",
    state: "pausado",
    owner: "design",
    updated: "há 3 dias",
    notes: "aguarda decisão",
  },
];
const table = () => {
  const t = new TableModel(tableColumns, tableRecords);
  t.order("name");
  return t;
};
const logs = () => {
  const log = new LogModel(50);
  for (const line of [
    "10:41:02 configuração lida",
    "10:41:03 conexão local verificada",
    "10:41:05 limite de tarefas: 5",
    "10:41:08 diagnóstico concluído",
  ])
    log.append(line);
  return log;
};
const detail = (name) =>
  DetailView(name, {
    Ambiente: "homelab",
    Estado: "ativo",
    Responsável: "design",
  });

/* -------------------------------------------- amostras: uma por componente */
// Cada amostra chama a projeção real do componente.
function samples() {
  const keyHints = KeyHints(bindings, {
    activate: "editar/abrir",
    nextRegion: "ações",
    back: "voltar",
    save: "salvar",
  });
  return {
    TerminalPanel: [
      { cols: 80, title: true, lines: controller().render(80, 12).lines },
      {
        cols: 40,
        title: true,
        lines: controller().render(40, 12).lines,
        note: "valores sob o rótulo",
      },
    ],
    Breadcrumbs: [
      {
        cols: 60,
        lines: Breadcrumbs(["Preferências", "Conexão", "Homelab"]).lines,
      },
    ],
    ActionBar: [
      {
        cols: 60,
        lines: ActionBar(
          [
            { id: "save", label: "Salvar alterações" },
            { id: "help", label: "Ajuda" },
            { id: "close", label: "Fechar" },
          ],
          "help",
        ).lines,
        note: "foco em Ajuda",
      },
    ],
    KeyHints: [
      { cols: 80, lines: keyHints.lines, note: "Unicode" },
      {
        cols: 80,
        lines: KeyHints(
          bindings,
          {
            activate: "editar/abrir",
            nextRegion: "ações",
            back: "voltar",
            save: "salvar",
          },
          true,
        ).lines,
        note: "ASCII",
      },
    ],
    HelpView: [
      { cols: 80, lines: HelpView("painel", bindings.slice(0, 6)).lines },
    ],
    MenuList: [
      {
        cols: 60,
        lines: MenuList(
          [
            { id: "conn", label: "Conexão", kind: "value", value: "local" },
            {
              id: "prefs",
              label: "Preferências",
              kind: "route",
              target: "prefs",
            },
            { id: "test", label: "Testar rascunho", kind: "action" },
            {
              id: "sync",
              label: "Sincronizar",
              kind: "action",
              disabled: "sem rede",
            },
          ],
          "prefs",
        ).lines,
      },
    ],
    SearchField: [
      {
        cols: 60,
        lines: join(SearchField("conex", 2), SearchField("zzz", 0)),
        note: "com e sem resultado",
      },
    ],
    SettingsList: [
      {
        cols: 80,
        lines: SettingsList(
          new SettingsSession(withOverride, structuredClone(defaults)),
          80,
        ).lines,
        note: "valor com origem",
      },
      {
        cols: 40,
        lines: SettingsList(
          new SettingsSession(withOverride, structuredClone(defaults)),
          40,
        ).lines,
        note: "compacta",
      },
    ],
    TextInput: [
      {
        cols: 60,
        lines: join(
          TextInput("Nome do projeto", "inteiro-docs"),
          TextInput("Nome do projeto", "", "Informe um nome."),
        ),
        note: "valor e erro",
      },
    ],
    SecretInput: [
      {
        cols: 60,
        lines: SecretInput("Token de acesso", "").lines.concat([
          "",
          ...SecretInput("Token de acesso", "Informe um token.").lines,
        ]),
        note: "sem eco",
      },
    ],
    Select: [
      {
        cols: 60,
        lines: Select(
          "Conexão",
          [
            { id: "local", label: "Local" },
            { id: "lab", label: "Homelab" },
            { id: "prod", label: "Produção", disabled: "somente leitura" },
          ],
          "lab",
          "local",
        ).lines,
        note: "foco em Homelab, valor atual Local",
      },
    ],
    MultiSelect: [
      {
        cols: 60,
        lines: MultiSelect(
          "Plugins",
          [
            { id: "a", label: "Tokens" },
            { id: "b", label: "Recipes" },
            { id: "c", label: "Auditoria" },
          ],
          "b",
          ["a"],
        ).lines,
      },
    ],
    ConfirmAction: [
      {
        cols: 80,
        lines: ConfirmAction(
          "ambiente staging",
          "Remove o ambiente e seus dados. Não pode ser desfeito.",
          "homelab · cluster k3s",
          "Excluir ambiente",
        ).lines,
        note: "foco começa no lado seguro",
      },
    ],
    ChangeSummary: [
      {
        cols: 80,
        lines: ChangeSummary(
          [
            { label: "Limite de tarefas", before: 3, after: 5 },
            { label: "Idioma", before: "pt-BR", after: "en" },
          ],
          "projeto atual",
        ).lines,
      },
    ],
    StatusMessage: [
      {
        cols: 80,
        lines: join(
          StatusMessage("success", "Configuração salva."),
          StatusMessage(
            "warning",
            "O rascunho não foi salvo.",
            "Revise e salve antes de fechar.",
          ),
          StatusMessage(
            "danger",
            "Não foi possível gravar o arquivo.",
            "O rascunho foi preservado. Tente de novo.",
          ),
          StatusMessage("info", "Usando a configuração do projeto."),
        ),
        note: "quatro tipos",
      },
    ],
    Progress: [
      {
        cols: 80,
        lines: join(
          Progress("Importando tokens", "executando", 3, 8, true),
          Progress(
            "Conferindo limites",
            "executando",
            undefined,
            undefined,
            true,
          ),
        ),
        note: "com e sem total conhecido",
      },
    ],
    TaskList: [
      {
        cols: 80,
        lines: TaskList([
          { label: "Validar conexão", state: "concluído" },
          { label: "Conferir limites", state: "executando" },
          { label: "Gravar configuração", state: "aguardando" },
        ]).lines,
      },
    ],
    EmptyState: [
      {
        cols: 80,
        lines: join(
          EmptyState("empty", "Crie o primeiro projeto para começar."),
          EmptyState("filtered", "Limpe a busca para ver todos os itens."),
          EmptyState("unavailable", "Tente de novo ou use o modo linear."),
        ),
        note: "vazio, filtrado, indisponível",
      },
    ],
    ErrorState: [
      {
        cols: 80,
        lines: ErrorState(
          "Não foi possível ler as preferências.",
          "Verifique o arquivo e tente de novo.",
        ).lines,
      },
    ],
    ResultList: [
      {
        cols: 80,
        lines: ResultList(projectChoices, "b", detail("inteiro-cli"), 80).lines,
        note: "detalhe empilhado",
      },
      {
        cols: 120,
        lines: ResultList(projectChoices, "b", detail("inteiro-cli"), 120)
          .lines,
        note: "detalhe ao lado",
      },
    ],
    DetailView: [{ cols: 60, lines: detail("inteiro-cli").lines }],
    DataTable: [
      {
        cols: 80,
        lines: DataTable(table(), 80).lines,
        note: "colunas por prioridade",
      },
      {
        cols: 40,
        lines: DataTable(table(), 40).lines,
        note: "compacta vira registros",
      },
    ],
    LogView: [{ cols: 80, lines: LogView(logs()).lines }],
  };
}

const families = [
  {
    id: "estrutura",
    names: [
      "TerminalPanel",
      "Breadcrumbs",
      "ActionBar",
      "KeyHints",
      "HelpView",
    ],
  },
  { id: "navegacao", names: ["MenuList", "SearchField"] },
  {
    id: "entrada",
    names: [
      "SettingsList",
      "TextInput",
      "SecretInput",
      "Select",
      "MultiSelect",
    ],
  },
  { id: "revisao", names: ["ConfirmAction", "ChangeSummary"] },
  {
    id: "feedback",
    names: [
      "StatusMessage",
      "Progress",
      "TaskList",
      "EmptyState",
      "ErrorState",
    ],
  },
  { id: "dados", names: ["ResultList", "DetailView", "DataTable", "LogView"] },
];

const englishPurpose = {
  TerminalPanel: "Arrange context, state, content, feedback and actions",
  MenuList: "Distinguish values, routes, actions and status",
  SettingsList: "Separate persisted, draft and effective values",
  TextInput: "Edit labeled text with validation",
  SecretInput: "Accept a secret without echo or disclosure",
  Select: "Choose one value while keeping focus distinct from selection",
  MultiSelect: "Mark several choices and explicitly finish",
  SearchField: "Filter without dispatching typed characters as commands",
  ActionBar: "Keep essential actions reachable without shortcuts",
  KeyHints: "Display resolved keyboard bindings",
  Breadcrumbs: "Preserve orientation and return location",
  ConfirmAction: "Review the object, destination and consequence",
  ChangeSummary: "Review changes without performing an external effect",
  StatusMessage: "Explain status and the next available step",
  Progress: "Report known progress and cancellation outcomes",
  TaskList: "Present task stages and final states",
  ResultList: "Explore a stable list and its details",
  DetailView: "Expose complete labeled values",
  DataTable: "Compare records with announced sorting",
  LogView: "Follow bounded logs, pause and export plain text",
  EmptyState: "Distinguish empty, filtered and unavailable data",
  ErrorState: "Preserve context and explain recovery",
  HelpView: "Expose available actions and exit paths",
};

/* -------------------------------------------------------------- utilitários */
const cssVar = (role) => `--in-${SEMANTIC_ROLES[role].replaceAll(".", "-")}`;
const table_ = (head, rows) =>
  `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`,
    )
    .join("")}</tbody></table></div>`;
const code = (s) => `<code>${esc(s)}</code>`;
const frames = (list, name) => list.map((f) => frame({ name, ...f })).join("");
const set = (html) => `<div class="term-set">${html}</div>`;

async function qualification() {
  return JSON.parse(await readFile("docs/terminal/qualification.json", "utf8"));
}

/* ------------------------------------------------------------------- páginas */
export async function buildTerminalDocs() {
  const q = await qualification();
  const S = samples();
  const P = await panelStates();
  const byName = new Map(TERMINAL_COMPONENTS.map((c, i) => [c.name, { c, i }]));

  const build = (L) => {
    const t = (pt, en) => (L === "pt" ? pt : en);

    /* ---------------------------------------------------------- visão geral */
    const overview = [
      {
        id: "como-fica",
        title: t("Como fica", "What it looks like"),
        html:
          `<p>${t(
            "O Terminal leva a identidade INTEIRO para células de texto: violeta escolhe, laranja confirma um efeito real e nada depende só de cor. Os quadros abaixo são a saída verdadeira de <code>TerminalPanel</code>, gerada pelo código do pacote.",
            "Terminal brings the INTEIRO identity to text cells: violet chooses, orange confirms a real effect, and nothing depends on color alone. The frames below are the actual output of <code>TerminalPanel</code>, generated by the package code.",
          )}</p>` +
          set(
            frame({
              name: "TerminalPanel",
              cols: 80,
              title: true,
              lines: controller().render(80, 12).lines,
            }) +
              frame({
                name: "TerminalPanel",
                cols: 40,
                title: true,
                lines: controller().render(40, 12).lines,
                note: t("compacto", "compact"),
              }),
          ) +
          `<p>${t(
            "Cinco regiões, sempre na mesma ordem: contexto e escopo, estado, conteúdo, ajuda e feedback, ações e atalhos. O item com foco é marcado por <code>&gt;</code> e por fundo, não só pela cor.",
            "Five regions, always in the same order: context and scope, state, content, help and feedback, actions and hints. The focused item is marked by <code>&gt;</code> and by background, not by color alone.",
          )}</p>` +
          `<aside class="callout"><div class="callout__body"><p>${t(
            "Os quadros mostram o texto em português porque as mensagens vêm dos componentes. A pintura segue os papéis de cor do IDS e acompanha o tema escolhido nesta documentação.",
            "Frames show Portuguese text because messages come from the components. Painting follows the IDS color roles and follows the theme chosen in this documentation.",
          )}</p></div></aside>`,
      },
      {
        id: "formatos",
        title: t("Quando usar cada formato", "When to use each format"),
        html:
          `<p>${t(
            "Escolha o formato pela necessidade, não pelo componente. Quanto menor a interação, mais linear a saída.",
            "Choose the format by need, not by component. The smaller the interaction, the more linear the output.",
          )}</p>` +
          table_(
            [t("Necessidade", "Need"), t("Formato", "Format")],
            [
              [
                t(
                  "Informação, ajuda, diagnóstico, logs, resultado",
                  "Information, help, diagnostics, logs, results",
                ),
                t(
                  "Saída linear, preservada no histórico",
                  "Linear output, kept in history",
                ),
              ],
              [
                t("Escolha curta", "Short choice"),
                t(
                  "Prompt no fluxo, com resumo final",
                  "Inline prompt with a final summary",
                ),
              ],
              [
                t("Vários valores relacionados", "Several related values"),
                t("Painel com as cinco regiões", "Panel with the five regions"),
              ],
              [
                t(
                  "Lista e detalhe, tabela, logs persistentes",
                  "Persistent list and detail, table, logs",
                ),
                t("Workspace deliberado", "Deliberate workspace"),
              ],
              [
                t("Extensão dentro de um host", "Extension inside a host"),
                t(
                  "API, tema e teclado do host",
                  "Host API, theme and keyboard",
                ),
              ],
            ],
          ) +
          `<p>${t(
            'Não abra uma janela externa por padrão. Veja os fluxos completos em <a href="#/terminal/patterns">Padrões</a>.',
            'Do not open an external window by default. See complete flows in <a href="#/terminal/patterns">Patterns</a>.',
          )}</p>`,
      },
      {
        id: "escopo",
        title: t(
          "O que o Terminal é e o que não é",
          "What Terminal is and is not",
        ),
        html: `<ul><li>${t(
          "É a gramática visual e de interação para ferramentas e extensões em terminal: componentes, foco, teclado e larguras.",
          "It is the visual and interaction grammar for terminal tools and extensions: components, focus, keyboard and widths.",
        )}</li><li>${t(
          "Não é um novo CLI para operar o design system, nem um renderer ANSI. O núcleo devolve linhas de texto; o host ou renderer aplica cor.",
          "It is not a new CLI for operating the design system, nor an ANSI renderer. The core returns lines of text; the host or renderer applies color.",
        )}</li><li>${t(
          "A adoção é optativa e escolhida por projeto. Os tokens de cor são os mesmos do restante do IDS.",
          "Adoption is optional and chosen per project. Color tokens are the same as in the rest of IDS.",
        )}</li></ul>`,
      },
      {
        id: "adocao",
        title: t("Como adotar", "How to adopt it"),
        html: `<pre tabindex="0"><code>${esc(
          "import { SettingsSession, PanelController, resolveBindings } from '@inteiro/terminal';\nimport { openPiSettings } from '@inteiro/terminal/pi';      // peer opcional\nimport { runPrompts } from '@inteiro/terminal/prompts';     // peer opcional\nimport { runLinear } from '@inteiro/terminal/linear';       // Node readline",
        )}</code></pre><p>${t(
          'O núcleo não carrega Pi, Inquirer, streams nem arquivos. Veja as regras de cor e texto em <a href="#/terminal/foundations">Fundamentos</a> e cada componente em <a href="#/terminal/components">Componentes</a>.',
          'The core does not load Pi, Inquirer, streams or files. See color and text rules in <a href="#/terminal/foundations">Foundations</a> and each component in <a href="#/terminal/components">Components</a>.',
        )}</p>`,
      },
    ];

    /* --------------------------------------------------------- fundamentos */
    const roleRows = Object.keys(SEMANTIC_ROLES).map((role) => {
      const meaning = {
        text: t("Texto principal", "Primary text"),
        muted: t(
          "Apoio: escopo, contadores e atalhos",
          "Support: scope, counters and hints",
        ),
        choose: t(
          "Escolha: ações e rotas que levam a outra tela",
          "Choice: actions and routes that lead elsewhere",
        ),
        commit: t(
          "Efeito real: salvar, exportar, excluir",
          "Real effect: save, export, delete",
        ),
        focus: t(
          "Anel de foco, onde o renderer tem cor",
          "Focus ring, where the renderer has color",
        ),
        selection: t(
          "Fundo do item com foco ou selecionado",
          "Background of the focused or selected item",
        ),
        success: t("Concluído", "Done"),
        warning: t("Atenção", "Attention"),
        danger: t("Erro", "Error"),
        info: t("Informação", "Information"),
      }[role];
      return [
        `<span class="term-chip" style="background:var(${cssVar(role)})"></span>${esc(role)}`,
        `<code class="term-token">${esc(SEMANTIC_ROLES[role])}</code>`,
        meaning,
      ];
    });
    const colorPair = (lines) =>
      `<div class="pair"><div><p class="pair__label">${t("Com cor", "With color")}</p>${frame({ name: "StatusMessage", cols: 56, lines })}</div><div><p class="pair__label">${t("Sem cor (NO_COLOR)", "Without color (NO_COLOR)")}</p>${frame({ name: "StatusMessage", cols: 56, lines, color: false })}</div></div>`;
    const statusLines = join(
      StatusMessage("success", "Configuração salva."),
      StatusMessage(
        "danger",
        "Não foi possível gravar.",
        "O rascunho foi preservado.",
      ),
    );
    const markerRows = [
      [
        t("Foco", "Focus"),
        code("> item"),
        t("Marcador e fundo", "Marker and background"),
      ],
      [
        t("Escolha única", "Single choice"),
        code("(x) Local"),
        t(
          "Parênteses; valor atual indicado",
          "Parentheses; current value shown",
        ),
      ],
      [
        t("Escolha múltipla", "Multiple choice"),
        code("[x] Tokens"),
        t("Colchetes e contagem", "Brackets and count"),
      ],
      [
        t("Ação", "Action"),
        code("[Salvar alterações]"),
        t(
          "Colchetes; laranja se grava ou exporta",
          "Brackets; orange if it saves or exports",
        ),
      ],
      [
        t("Rota", "Route"),
        code("Preferências >"),
        t("Leva a outra tela", "Leads to another screen"),
      ],
      [
        t("Estado do item", "Item state"),
        code("Erro: …  Concluído: …"),
        t(
          "Rótulo escrito antes da mensagem",
          "Label written before the message",
        ),
      ],
      [
        t("Indisponível", "Unavailable"),
        code("[indisponível: sem rede]"),
        t("Sempre com o motivo", "Always with the reason"),
      ],
      [
        t("Segredo", "Secret"),
        code("[entrada protegida]"),
        t("Nunca eco nem tamanho", "Never echo nor length"),
      ],
      [
        t("Origem do valor", "Value origin"),
        code("[origem: INTEIRO_LANG]"),
        t("Mostra quem definiu", "Shows who set it"),
      ],
    ];
    const foundations = [
      {
        id: "cor",
        title: t("Papéis de cor", "Color roles"),
        html:
          `<p>${t(
            "O Terminal não cria cores novas. Cada papel aponta para um token que já existe no IDS e segue o tema do host. As amostras abaixo acompanham o tema desta página.",
            "Terminal creates no new colors. Each role points to a token that already exists in IDS and follows the host theme. The swatches below follow this page's theme.",
          )}</p>` +
          table_(
            [t("Papel", "Role"), t("Token", "Token"), t("Uso", "Use")],
            roleRows,
          ) +
          `<p>${t(
            "Violeta escolhe; laranja só marca o que cruza a fronteira para o mundo real. Se tudo for laranja, nada é.",
            "Violet chooses; orange only marks what crosses into the real world. If everything is orange, nothing is.",
          )}</p>`,
      },
      {
        id: "sem-cor",
        title: t("Cor nunca sozinha", "Color is never alone"),
        html:
          `<p>${t(
            "Todo estado tem texto. Compare o mesmo resultado com e sem cor: a informação é a mesma. Isso vale para <code>NO_COLOR</code>, terminais sem cor, leitores de tela e logs gravados.",
            "Every state has text. Compare the same result with and without color: the information is identical. This holds for <code>NO_COLOR</code>, colorless terminals, screen readers and recorded logs.",
          )}</p>` + colorPair(statusLines),
      },
      {
        id: "marcadores",
        title: t("Marcadores e símbolos", "Markers and symbols"),
        html:
          `<p>${t(
            "O vocabulário é curto e escrito em caracteres. Não há ícones decorativos.",
            "The vocabulary is short and written in characters. There are no decorative icons.",
          )}</p>` +
          table_(
            [
              t("Elemento", "Element"),
              t("Como aparece", "How it appears"),
              t("Regra", "Rule"),
            ],
            markerRows,
          ),
      },
      {
        id: "texto-e-celulas",
        title: t("Texto e células", "Text and cells"),
        html:
          `<ul><li>${t(
            "A unidade é a célula do terminal, não o pixel. A largura de acentos, caracteres combinados, CJK e emoji é medida por <code>string-width</code> e <code>Intl.Segmenter</code>.",
            "The unit is the terminal cell, not the pixel. The width of accents, combining characters, CJK and emoji is measured with <code>string-width</code> and <code>Intl.Segmenter</code>.",
          )}</li><li>${t(
            "Fonte monoespaçada do próprio terminal. O Terminal não escolhe fonte nem tamanho.",
            "The terminal's own monospace font. Terminal does not choose a font or size.",
          )}</li><li>${t(
            "Texto longo quebra; não é cortado de forma definitiva. O valor integral continua disponível em <code>fullText</code>.",
            "Long text wraps; it is never permanently cut. The full value stays available in <code>fullText</code>.",
          )}</li><li>${t(
            "Sem Unicode, <code>·</code> vira <code>|</code> e <code>…</code> vira <code>...</code>.",
            "Without Unicode, <code>·</code> becomes <code>|</code> and <code>…</code> becomes <code>...</code>.",
          )}</li></ul>` + set(frames(S.KeyHints, "KeyHints")),
      },
      {
        id: "larguras",
        title: t("Larguras", "Widths"),
        html:
          `<p>${t(
            "O layout reorganiza o conteúdo por largura, sem perder foco nem ações. Abaixo de 40×12, o painel oferece o modo linear e preserva o rascunho.",
            "The layout reorganizes content by width without losing focus or actions. Below 40×12, the panel offers linear mode and keeps the draft.",
          )}</p>` +
          table_(
            [t("Largura", "Width"), t("O que muda", "What changes")],
            [
              [
                code("< 40×12"),
                t(
                  "Modo linear; o rascunho é preservado",
                  "Linear mode; the draft is kept",
                ),
              ],
              [
                code("< 60"),
                t(
                  "Valor sob o rótulo; tabela vira registros",
                  "Value under the label; table becomes records",
                ),
              ],
              [
                code("60–119"),
                t(
                  "Colunas por prioridade; detalhe empilhado",
                  "Columns by priority; stacked detail",
                ),
              ],
              [
                code("≥ 120"),
                t(
                  "Detalhe ao lado da lista; mais colunas",
                  "Detail beside the list; more columns",
                ),
              ],
            ],
          ) +
          set(
            frame({
              name: "TerminalPanel",
              cols: 30,
              title: true,
              lines: controller().render(30, 10).lines,
              note: t("abaixo de 40×12", "below 40×12"),
            }) +
              frame({
                name: "DataTable",
                cols: 120,
                lines: DataTable(table(), 120).lines,
                note: t("120 colunas", "120 columns"),
              }),
          ),
      },
    ];

    /* ---------------------------------------------------------- componentes */
    const familyText = {
      estrutura: [
        t("Estrutura", "Structure"),
        t("Onde estou e o que posso fazer.", "Where I am and what I can do."),
      ],
      navegacao: [
        t("Navegação", "Navigation"),
        t("Mover, filtrar e abrir.", "Move, filter and open."),
      ],
      entrada: [
        t("Entrada", "Input"),
        t(
          "Editar valores sem perder o rascunho.",
          "Edit values without losing the draft.",
        ),
      ],
      revisao: [
        t("Revisão", "Review"),
        t("Ver o efeito antes de aceitar.", "See the effect before accepting."),
      ],
      feedback: [
        t("Feedback", "Feedback"),
        t(
          "Dizer o que aconteceu e o que fazer.",
          "Say what happened and what to do.",
        ),
      ],
      dados: [
        t("Dados", "Data"),
        t(
          "Explorar listas, tabelas e logs.",
          "Explore lists, tables and logs.",
        ),
      ],
    };
    const component = (name) => {
      const { c, i } = byName.get(name);
      void i;
      const spec =
        L === "pt"
          ? [
              ["Estados", c.states.join(", ")],
              ["Foco", c.focus],
              ["Teclado", c.keyboard],
              ["Linear", c.linear],
              ["Largura", c.resize],
            ]
          : [
              ["States", c.states.join(", ")],
              ["Semantic actions", c.actions.join(", ")],
            ];
      return (
        `<h3 id="${name.toLowerCase()}">${esc(name)}</h3>` +
        `<p>${esc(t(c.purpose, englishPurpose[name]))}.</p>` +
        set(frames(S[name], name)) +
        `<pre tabindex="0"><code>${esc(c.example)}</code></pre>` +
        `<dl class="meta">${spec.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
      );
    };
    const componentsPage = families.map((f) => ({
      id: f.id,
      title: familyText[f.id][0],
      html:
        (f.id === "estrutura"
          ? `<p>${t(
              "Cada quadro é a saída real do componente, com dados de exemplo. Abaixo dele: a assinatura, os estados e as regras de foco, teclado e largura. Persistência e ações externas pertencem a quem consome o componente.",
              "Each frame is the component's real output with sample data. Below it: the signature, states and the focus, keyboard and width rules. Persistence and external actions belong to whoever consumes the component. Rules below are stated in terms of states and semantic actions; the linear form always uses labeled text.",
            )}</p>`
          : "") +
        `<p>${familyText[f.id][1]}</p>` +
        f.names.map(component).join(""),
    }));

    /* -------------------------------------------------------------- padrões */
    const flowFrame = (name, lines, note = "") =>
      frame({ name, cols: 80, title: true, lines, note });
    const plain = (name, lines, note = "") =>
      frame({ name, cols: 80, lines, note });
    const patterns = [
      {
        id: "configurar",
        title: t("Configurar e salvar", "Configure and save"),
        html:
          `<p>${t(
            "Editar altera só o rascunho. Salvar é uma ação visível, validada e separada. Fechar com alterações pede uma decisão, começando em continuar editando.",
            "Editing changes only the draft. Saving is a visible, validated and separate action. Closing with changes asks for a decision, starting at keep editing.",
          )}</p>` +
          flowFrame(t("1 · Lista", "1 · List"), P.list) +
          flowFrame(t("2 · Editar um campo", "2 · Edit a field"), P.editing) +
          flowFrame(
            t("3 · Valor inválido", "3 · Invalid value"),
            P.invalid,
            t("o erro aponta o campo", "the error points at the field"),
          ) +
          flowFrame(
            t("4 · Rascunho alterado", "4 · Draft changed"),
            P.dirty,
            t("ainda não salvo", "not saved yet"),
          ) +
          flowFrame(
            t("5 · Fechar com alterações", "5 · Close with changes"),
            P.decision,
            t("Esc pede decisão", "Esc asks for a decision"),
          ) +
          flowFrame(t("6 · Salvo", "6 · Saved"), P.saved),
      },
      {
        id: "confirmar",
        title: t(
          "Confirmar uma ação destrutiva",
          "Confirm a destructive action",
        ),
        html:
          `<p>${t(
            "Primeiro o resumo do que muda, sem executar. Depois uma confirmação que diz o objeto, o destino e a consequência, com verbos concretos. O foco começa no lado seguro.",
            "First a summary of what changes, without executing. Then a confirmation that states the object, destination and consequence, with concrete verbs. Focus starts on the safe side.",
          )}</p>` +
          plain("ChangeSummary", S.ChangeSummary[0].lines) +
          plain("ConfirmAction", S.ConfirmAction[0].lines) +
          plain(
            "StatusMessage",
            StatusMessage(
              "success",
              "Ambiente staging excluído.",
              "Nada mais foi alterado.",
            ).lines,
          ),
      },
      {
        id: "acompanhar",
        title: t("Acompanhar uma tarefa longa", "Follow a long task"),
        html:
          `<p>${t(
            "Mostre só progresso real. Cancelar é uma ação visível e não promete desfazer o que já aconteceu. Se o resultado é desconhecido, diga isso em vez de repetir.",
            "Show only real progress. Cancel is a visible action and does not promise to undo what already happened. If the outcome is unknown, say so instead of retrying.",
          )}</p>` +
          plain(
            "Progress",
            join(
              Progress("Aplicar configuração", "executando", 2, 5, true),
              TaskList([
                { label: "Validar", state: "concluído" },
                { label: "Gravar", state: "executando" },
                { label: "Verificar", state: "aguardando" },
              ]),
            ),
            t("em andamento", "running"),
          ) +
          plain(
            "Progress",
            Progress("Aplicar configuração", "cancelando", 2, 5, false).lines,
            t("Esc solicitou cancelamento", "Esc requested cancellation"),
          ) +
          plain(
            "StatusMessage",
            StatusMessage(
              "warning",
              "O resultado da gravação é desconhecido.",
              "Consulte o estado antes de tentar de novo.",
            ).lines,
            t("resultado desconhecido", "unknown outcome"),
          ),
      },
      {
        id: "explorar",
        title: t("Explorar lista e detalhe", "Explore list and detail"),
        html:
          `<p>${t(
            "Setas navegam sem abrir; Enter abre o detalhe; Esc volta sem mudar a seleção. Em 120 colunas o detalhe fica ao lado; abaixo disso, embaixo.",
            "Arrows navigate without opening; Enter opens the detail; Esc returns without changing the selection. At 120 columns the detail sits beside the list; below that, beneath it.",
          )}</p>` + set(frames(S.ResultList, "ResultList")),
      },
      {
        id: "vazio-e-erro",
        title: t("Vazio, filtrado e erro", "Empty, filtered and error"),
        html:
          `<p>${t(
            "Vazio, sem resultado para o filtro e indisponível são três situações diferentes, e cada uma diz o próximo passo. O erro preserva o contexto e oferece recuperação.",
            "Empty, no result for the filter and unavailable are three different situations, and each states the next step. The error preserves context and offers recovery.",
          )}</p>` +
          frames(S.EmptyState, "EmptyState") +
          frames(S.ErrorState, "ErrorState"),
      },
    ];

    /* --------------------------------------------------------- qualificação */
    const verdict = (s) =>
      L === "pt"
        ? ({
            passed: "aprovado",
            failed: "reprovado",
            pending: "pendente",
            blocked: "bloqueado",
          }[s] ?? s)
        : s;
    const list = (items) =>
      `<ul>${(Array.isArray(items) ? items : []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    const quality = [
      {
        id: "evidencias",
        title: t("Como ler a evidência", "How to read the evidence"),
        html: `<p>${t(
          "Estado, teclado, células, PTY, hosts reais e leitores de tela são evidências diferentes. Ter implementação não equivale a qualificação, e pendência não conta como aprovação. O registro completo está em <code>docs/terminal/qualification.json</code>.",
          "State, keyboard, cell transcripts, PTY runs, real hosts and screen readers are different forms of evidence. Having an implementation is not qualification, and a pending item is not an approval. The full record is in <code>docs/terminal/qualification.json</code>.",
        )}</p><p>${t(
          "Os textos abaixo vêm do registro e ficam no idioma original.",
          "The text below comes from the record and stays in its original language.",
        )}</p>`,
      },
      {
        id: "verificacoes",
        title: t("Verificações executadas", "Checks run"),
        html: table_(
          [
            t("Verificação", "Check"),
            t("Comando", "Command"),
            t("Resultado", "Result"),
          ],
          (q.checks ?? []).map((c) => [
            esc(c.name),
            `<code>${esc(c.command ?? "")}</code>`,
            esc(verdict(c.status)),
          ]),
        ),
      },
      {
        id: "pendencias",
        title: t("Pendências", "Pending"),
        html: list(q.pending),
      },
      {
        id: "limites",
        title: t("Limites conhecidos", "Known limits"),
        html: list(q.limitations),
      },
    ];

    return {
      overview,
      foundations,
      components: componentsPage,
      patterns,
      quality,
    };
  };

  const pt = build("pt");
  const en = build("en");
  const defs = [
    {
      id: "terminal/overview",
      key: "overview",
      title: "INTEIRO Terminal",
      lede: "A identidade INTEIRO em células de texto: violeta escolhe, laranja confirma e nada depende só de cor.",
      keywords: ["cli", "tui", "terminal", "pi", "painel", "visão geral"],
      source: "@inteiro/terminal · docs/terminal/",
    },
    {
      id: "terminal/foundations",
      key: "foundations",
      title: "Fundamentos do Terminal",
      lede: "Papéis de cor, marcadores, texto em células e larguras. As regras visuais que valem para todos os componentes.",
      keywords: ["cor", "ansi", "no_color", "marcadores", "células", "largura"],
      source: "@inteiro/terminal · contracts.ts, text.ts",
    },
    {
      id: "terminal/components",
      key: "components",
      title: "Componentes do Terminal",
      lede: "Os 23 componentes, cada um com a saída real que produz, o teclado e o comportamento em larguras pequenas.",
      keywords: ["componentes", "menu", "select", "tabela", "logs", "teclado"],
      source: "@inteiro/terminal · components.ts",
    },
    {
      id: "terminal/patterns",
      key: "patterns",
      title: "Padrões do Terminal",
      lede: "Fluxos completos: configurar e salvar, confirmar uma ação destrutiva, acompanhar uma tarefa e explorar dados.",
      keywords: ["fluxo", "configurar", "confirmar", "progresso", "erro"],
      source: "@inteiro/terminal · controller.ts",
    },
    {
      id: "terminal/quality",
      key: "quality",
      title: "Qualificação do Terminal",
      lede: "O que foi verificado, o que está pendente e o que a implementação ainda não comprova.",
      keywords: ["qualificação", "evidência", "leitor de tela", "pty"],
      source: "docs/terminal/qualification.json",
    },
  ];
  return {
    pages: defs.map((d) => ({
      id: d.id,
      title: d.title,
      lede: d.lede,
      status: "em qualificação",
      source: d.source,
      keywords: d.keywords,
      sections: pt[d.key],
    })),
    english: Object.fromEntries(defs.map((d) => [d.id, en[d.key]])),
  };
}

/** Estados reais do painel de preferências, calculados com o controlador. */
async function panelStates() {
  const view = (c, rows = 12) => c.render(80, rows).lines;
  const list = controller();
  const editing = controller();
  editing.begin("connection");
  const invalid = controller();
  invalid.begin("limit");
  invalid.setText("12");
  invalid.session.confirmEdit();
  const dirty = controller();
  dirty.begin("limit");
  dirty.setText("5");
  dirty.session.confirmEdit();
  const decision = controller();
  decision.begin("limit");
  decision.setText("5");
  decision.session.confirmEdit();
  await decision.dispatch("back");
  const saved = controller();
  saved.begin("limit");
  saved.setText("5");
  saved.session.confirmEdit();
  await saved.session.save(async () => {});
  return {
    list: view(list),
    editing: view(editing),
    invalid: view(invalid),
    dirty: view(dirty),
    decision: view(decision),
    saved: view(saved),
  };
}
