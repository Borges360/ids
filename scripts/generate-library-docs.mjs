import { writeFileSync } from "node:fs";
import { COMPONENTS } from "../packages/agent-core/src/library.ts";
import ts from "typescript";
import { resolve } from "node:path";
const program = ts.createProgram(["packages/react/src/index.ts"], {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true,
  noEmit: true,
  skipLibCheck: true,
  strict: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(resolve("packages/react/src/index.ts"));
const moduleSymbol = checker.getSymbolAtLocation(source);
const apiProps = {};
for (const exported of checker.getExportsOfModule(moduleSymbol)) {
  const signature = checker
    .getTypeOfSymbolAtLocation(exported, source)
    .getCallSignatures()[0];
  const parameter = signature?.getParameters()[0];
  if (!parameter) continue;
  const type = checker.getTypeOfSymbolAtLocation(parameter, source);
  apiProps[exported.name] = type
    .getProperties()
    .filter((prop) =>
      prop.declarations?.some((d) =>
        d
          .getSourceFile()
          .fileName.replaceAll("\\", "/")
          .includes("/packages/react/src/"),
      ),
    )
    .map((prop) => ({
      name: prop.name,
      required: !(prop.flags & ts.SymbolFlags.Optional),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(prop, source),
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      ),
    }));
}
writeFileSync(
  "packages/agent-core/src/component-props.json",
  JSON.stringify(apiProps, null, 2) + "\n",
);
const components = COMPONENTS.map((c) => ({
  ...c,
  props: apiProps[c.name] ?? [],
}));
const table = (c) =>
  c.props.length
    ? "| Prop | Obrigatória | Tipo |\n|---|---|---|\n" +
      c.props
        .map(
          (p) =>
            `| ${p.name} | ${p.required ? "sim" : "não"} | \`${p.type.replaceAll("|", "\\|")}\` |`,
        )
        .join("\n")
    : "Atributos HTML nativos do elemento correspondente.";
const intro =
  "# Biblioteca React e templates\n\nInstale `@inteiro/react` e importe `@inteiro/tokens/css` e `@inteiro/design-system/css/components`. Envolva a aplicação em `InteiroProvider`. Componentes usam elementos nativos, CSS lógico, quatro temas e duas densidades.\n\n`DatePicker` e `TimePicker` usam seletores nativos do navegador; o calendário e as interações variam por plataforma. `MultiSelect` usa select múltiplo nativo. Labels e conteúdos são props traduzíveis.\n\nA API completa de props usa atributos HTML nativos e os tipos publicados em `@inteiro/react`. Execute `npm run storybook` para controles, variantes e exemplos interativos.\n\n";
writeFileSync(
  "docs/LIBRARY.md",
  intro +
    components
      .map(
        (c) =>
          `## ${c.name}\n\nCategoria: ${c.category}.\n\n\`\`\`tsx\n${c.import}\n${c.example}\n\`\`\`\n\n${table(c)}\n\n${c.accessibility.join(" ")}\n\nEstados aplicáveis à categoria: ${c.states.join(", ")}.\n`,
      )
      .join("\n"),
);
const page = {
  id: "components/library",
  title: "Biblioteca React",
  lede: `${COMPONENTS.length} componentes e templates implementados. Exemplos, imports e acessibilidade.`,
  status: "implementado",
  source: "@inteiro/react · docs/LIBRARY.md",
  sections: components.map((c) => ({
    id: c.name.toLowerCase(),
    title: c.name,
    html: `<p>${c.category} · ${c.accessibility.join(" ")}</p><pre tabindex="0"><code>${(c.import + "\n" + c.example).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></pre>`,
  })),
};
writeFileSync(
  "apps/demo/content/library.js",
  "// Gerado por scripts/generate-library-docs.mjs\nexport const libraryPages = " +
    JSON.stringify([page], null, 2) +
    ";\n",
);
const selections = {
  catalog: COMPONENTS,
  button: COMPONENTS.filter((c) => ["Button", "IconButton"].includes(c.name)),
  input: COMPONENTS.filter((c) => c.category === "forms"),
  card: COMPONENTS.filter((c) =>
    ["Card", "Panel", "CardHeader", "CardBody", "CardFooter"].includes(c.name),
  ),
  badge: COMPONENTS.filter((c) =>
    ["Badge", "Tag", "Avatar", "AvatarGroup"].includes(c.name),
  ),
  specified: COMPONENTS.filter((c) =>
    ["overlays", "navigation", "templates", "data", "feedback"].includes(
      c.category,
    ),
  ),
};
const titles = {
  catalog: "Catálogo",
  button: "Button",
  input: "Formulários",
  card: "Card e painéis",
  badge: "Badge e identidade",
  specified: "Composição e interação",
};
const componentPages = Object.entries(selections).map(([key, items]) => ({
  id: `components/${key}`,
  title: titles[key],
  lede: "Biblioteca implementada em @inteiro/react 1.3.0, com CSS compartilhado e API tipada.",
  status: "implementado",
  source: "docs/LIBRARY.md · packages/react/src · components.css",
  sections: [
    {
      id: "anatomia",
      title: "Anatomia, variantes e estados",
      html: `<p>Componentes: ${items.map((c) => c.name).join(", ")}. Quatro temas, densidades calm/focus, foco visível e layout lógico para RTL.</p><p>Button: primary/commit/danger/secondary/ghost/quiet e aliases solid/outline/text; tamanhos sm/md/lg, disabled e loading. Campos: estados de erro, ajuda, disabled e readonly. Navegação usa estados ARIA distintos de foco.</p>`,
    },
    {
      id: "api",
      title: "API e uso",
      html: items
        .map(
          (c) =>
            `<h3>${c.name}</h3><pre tabindex="0"><code>${(c.import + "\n" + c.example).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></pre><p>${c.accessibility.join(" ")}</p>`,
        )
        .join(""),
    },
    {
      id: "playground",
      title: "Exemplos interativos",
      html: '<p><a href="/storybook/" target="_blank" rel="noopener">Abrir Storybook</a> para variantes, estados, controles, templates e verificações axe. No desenvolvimento, execute <code>npm run storybook</code> para abrir na porta 6006.</p><p><a href="#/components/library">Referência completa da biblioteca</a></p>',
    },
  ],
}));
writeFileSync(
  "apps/demo/content/components.js",
  "// Gerado por scripts/generate-library-docs.mjs\nexport const componentPages = " +
    JSON.stringify(componentPages, null, 2) +
    ";\n",
);
