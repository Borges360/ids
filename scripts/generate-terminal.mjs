import { mkdir, writeFile } from "node:fs/promises";
import {
  TERMINAL_COMPONENTS,
  TERMINAL_CONTEXT,
  SettingsSession,
  PanelController,
  resolveBindings,
} from "../packages/terminal/src/index.ts";
import { fields, defaults } from "../examples/terminal/shared.ts";
const json = (v) => JSON.stringify(v, null, 2) + "\n";
const string = { type: "string", minLength: 1 };
const strings = { type: "array", items: string };
const schema = (name, required, properties) => ({
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: `https://inteiro.dev/schemas/terminal/1.0.0/${name}.schema.json`,
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const component = {
  id: { type: "string", pattern: "^terminal\\.[A-Za-z]+$" },
  version: { const: "1.0.0" },
  name: string,
  purpose: string,
  states: strings,
  actions: strings,
  focus: string,
  keyboard: string,
  linear: string,
  resize: string,
  requiredCapabilities: strings,
  tokens: strings,
  example: string,
};
const action = {
  id: string,
  version: { const: "1.0.0" },
  label: string,
  scope: string,
  effect: { enum: ["local", "external", "destructive"] },
  destination: { type: "string" },
  consequence: { type: "string" },
  essential: { type: "boolean" },
  binding: { type: "string" },
};
const capabilities = {
  interactive: { type: "boolean" },
  columns: { type: "integer", minimum: 1 },
  rows: { type: "integer", minimum: 1 },
  color: { type: "boolean" },
  unicode: { type: "boolean" },
  advancedKeyboard: { type: "boolean" },
  mouse: { type: "boolean" },
  screen: { type: "boolean" },
  mode: { enum: ["linear", "prompts", "panel", "workspace", "host", "json"] },
  reducedMotion: { type: "boolean" },
};
const evidence = {
  schemaVersion: { const: "1.0.0" },
  criterion: {
    enum: Array.from(
      { length: 12 },
      (_, i) => `TERM-${String(i + 1).padStart(2, "0")}`,
    ),
  },
  status: { enum: ["passed", "failed", "pending", "blocked"] },
  kind: {
    enum: ["state", "transcript", "pty", "host", "screen-reader", "review"],
  },
  platform: string,
  terminal: string,
  renderer: string,
  command: string,
  sourceCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
  timestamp: { type: "string", format: "date-time" },
  artifact: string,
  sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  notes: { type: "string" },
};
for (const [name, props] of Object.entries({
  component,
  action,
  capabilities,
  evidence,
}))
  await writeFile(
    `packages/contracts/schemas/terminal-${name}.schema.json`,
    json(
      schema(
        name,
        Object.keys(props).filter(
          (k) =>
            !["binding", "destination", "consequence", "notes"].includes(k),
        ),
        props,
      ),
    ),
  );
await mkdir("docs/terminal/fixtures", { recursive: true });
await writeFile(
  "docs/terminal/catalog.json",
  json({
    contractVersion: "1.0.0",
    components: TERMINAL_COMPONENTS,
    context: TERMINAL_CONTEXT,
  }),
);
await writeFile(
  "docs/terminal/components.md",
  "# Catálogo INTEIRO Terminal 1.0.0\n\nGerado por `npm run generate:terminal`. As projeções retornam `View`; interação pertence aos modelos/controlador e ao renderer. Componentes puros não fazem IO.\n\n" +
    TERMINAL_COMPONENTS.map(
      (c) =>
        `## ${c.id}\n\n${c.purpose}.\n\n- Estados: ${c.states.join(", ")}.\n- Foco: ${c.focus}.\n- Teclado: ${c.keyboard}.\n- Linear: ${c.linear}.\n- Resize: ${c.resize}.\n\n\`\`\`ts\nimport { ${c.name} } from '@inteiro/terminal';\n${c.example}\n\`\`\`\n`,
    ).join("\n"),
);
for (const { columns, rows } of TERMINAL_CONTEXT.matrix) {
  const s = new SettingsSession(fields, defaults);
  s.begin("limit");
  s.edit(5);
  s.confirmEdit();
  const p = new PanelController({
    session: s,
    title: "Preferências",
    scope: "projeto atual",
    persist: async () => {},
    bindings: resolveBindings(),
  });
  await writeFile(
    `docs/terminal/fixtures/${columns}x${rows}.txt`,
    p.render(columns, rows).lines.join("\n") + "\n",
  );
}
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const page = {
  id: "components/terminal",
  title: "INTEIRO Terminal",
  lede: "Gramática portátil de componentes e interação. Contrato 1.0.0; adoção optativa no IDS 1.3.0.",
  status: "implementação em qualificação",
  source: "@inteiro/terminal · docs/terminal/",
  keywords: ["cli", "tui", "terminal", "pi", "menu", "teclado"],
  sections: [
    {
      id: "contrato",
      title: "Estrutura e interação",
      html: "<p>Informação usa saída linear; uma escolha curta usa prompt; configurações usam painel; exploração persistente pode usar workspace. Hosts controlam streams e lifecycle. Não abrir janela externa por padrão.</p><p>Editar altera rascunho; salvar valida e persiste. Efeitos externos exigem ações distintas. Foco, seleção e erro são legíveis sem cor.</p>",
    },
    {
      id: "qualificacao",
      title: "Evidências e limites",
      html: "<p>Estado, teclado, células e PTY possuem verificações distintas. A implementação não certifica leitores de tela nem plataformas sem evidência real. Consulte docs/terminal/qualification.json.</p>",
    },
    {
      id: "componentes",
      title: "Catálogo de componentes",
      html: TERMINAL_COMPONENTS.map(
        (c) =>
          `<h3 id="terminal-${c.name}">${c.name}</h3><p>${esc(c.purpose)}</p><pre><code>${esc(c.example)}</code></pre><p>${esc(c.keyboard)}. ${esc(c.linear)}. ${esc(c.resize)}.</p>`,
      ).join("\n"),
    },
  ],
};
await writeFile(
  "apps/demo/content/terminal.js",
  "// Gerado por scripts/generate-terminal.mjs\nexport const terminalPages = " +
    json([page]) +
    ";\n",
);
console.log(
  `Terminal: ${TERMINAL_COMPONENTS.length} contratos, 4 schemas, documentação e 3 transcripts gerados.`,
);
const englishPurpose = [
  "Arrange context, state, content, feedback and actions",
  "Distinguish values, routes, actions and status",
  "Separate persisted, draft and effective values",
  "Edit labeled text with validation",
  "Accept a secret without echo or disclosure",
  "Choose one value while keeping focus distinct from selection",
  "Mark several choices and explicitly finish",
  "Filter without dispatching typed characters as commands",
  "Keep essential actions reachable without shortcuts",
  "Display resolved keyboard bindings",
  "Preserve orientation and return location",
  "Review the object, destination and consequence",
  "Review changes without performing an external effect",
  "Explain status and the next available step",
  "Report known progress and cancellation outcomes",
  "Present task stages and final states",
  "Explore a stable list and its details",
  "Expose complete labeled values",
  "Compare records with announced sorting",
  "Follow bounded logs, pause and export plain text",
  "Distinguish empty, filtered and unavailable data",
  "Preserve context and explain recovery",
  "Expose available actions and exit paths",
];
const english = [
  {
    id: "contrato",
    title: "Structure and interaction",
    html: "<p>Use linear output for information, an inline prompt for a short choice, a local panel for related settings, and a deliberate workspace for persistent exploration. Hosts own their streams, theme and lifecycle. Do not open an external operating-system window by default.</p><p>Editing changes a draft. Explicit save validates and persists while keeping the panel open. External effects use separate actions. Focus, selection, errors and progress remain readable without color.</p>",
  },
  {
    id: "qualificacao",
    title: "Evidence and limits",
    html: "<p>State, key events, cell transcripts, PTY runs, real host tests and identified screen-reader reviews are separate forms of evidence. Implementation does not certify an untested platform. See docs/terminal/qualification.json.</p>",
  },
  {
    id: "componentes",
    title: "Component catalogue",
    html: TERMINAL_COMPONENTS.map(
      (c, i) =>
        `<h3 id="terminal-${c.name}">${c.name}</h3><p>${englishPurpose[i]}.</p><pre><code>${esc(c.example)}</code></pre><p>States: ${esc(c.states.join(", "))}. Semantic actions: ${esc(c.actions.join(", "))}.</p><p>Use the host or renderer's resolved bindings. The linear representation uses labeled text; compact layouts reflow in terminal cells. Complete content remains available without relying on color. Persistence and external actions belong to the consumer.</p>`,
    ).join("\n"),
  },
];
await writeFile(
  "apps/demo/content/terminal-en.js",
  "// Generated by scripts/generate-terminal.mjs\nexport const terminalEnglishSections = " +
    json(english) +
    ";\n",
);
