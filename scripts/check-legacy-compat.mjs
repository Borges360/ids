import { mkdir, mkdtemp, readFile, writeFile, symlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import postcss from "postcss";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const root = process.cwd(),
  gitRoot = process.env.INTEIRO_COMPAT_GIT_ROOT || root,
  gitArgs = ["-c", "safe.directory=" + gitRoot, "-C", gitRoot],
  commit = execFileSync("git", [...gitArgs, "rev-parse", "c8c945e"], {
    encoding: "utf8",
  }).trim();
await mkdir("artifacts", { recursive: true });
const work = await mkdtemp(resolve("artifacts/compat-1.1.0-")),
  legacy = join(work, "source");
await mkdir(legacy);
execFileSync("git", [
  ...gitArgs,
  "archive",
  "--format=tar",
  "--output=" + join(work, "source.tar"),
  commit,
]);
execFileSync("tar", ["-xf", join(work, "source.tar"), "-C", legacy]);
const linked = join(legacy, "node_modules/@inteiro");
await mkdir(linked, { recursive: true });
for (const name of [
  "tokens",
  "agent-core",
  "cli",
  "react",
  "mcp",
  "design-system",
])
  await symlink(
    join(legacy, "packages", name),
    join(linked, name),
    process.platform === "win32" ? "junction" : "dir",
  );
for (const name of ["react", "react-dom"])
  await symlink(
    resolve("node_modules", name),
    join(legacy, "node_modules", name),
    process.platform === "win32" ? "junction" : "dir",
  );
const load = (base, name, file = "index.ts") =>
  import(pathToFileURL(join(base, "packages", name, "src", file)).href);
const previous = await load(legacy, "tokens"),
  current = await load(root, "tokens");
const packageBefore = JSON.parse(
    await readFile(join(legacy, "packages/tokens/package.json"), "utf8"),
  ),
  packageAfter = JSON.parse(
    await readFile("packages/tokens/package.json", "utf8"),
  );
if (packageBefore.version !== "1.1.0")
  throw new Error("Historical ref is not the declared 1.1.0 package");
const tokens = previous.allTokens().map((token) => ({
  id: token.id,
  type: token.type,
  layer: token.layer,
  cssVar: token.cssVar,
  values: Object.fromEntries(
    previous.THEMES.map((theme) => [
      theme,
      previous.formatCssValue(previous.resolveToken(token.id, theme).value),
    ]),
  ),
}));
const violations = [];
const now = new Map(current.allTokens().map((token) => [token.id, token]));
for (const token of tokens) {
  const next = now.get(token.id);
  if (!next) {
    violations.push("Removed token " + token.id);
    continue;
  }
  for (const key of ["type", "layer", "cssVar"])
    if (token[key] !== next[key])
      violations.push("Changed " + key + " " + token.id);
  for (const theme of previous.THEMES)
    if (
      token.values[theme] !==
      current.formatCssValue(current.resolveToken(token.id, theme).value)
    )
      violations.push("Changed value " + token.id + " " + theme);
}
if (current.VERSION !== packageAfter.version)
  violations.push("Current token version metadata mismatch");
const names = ["tokens", "agent-core", "react", "design-system"];
const publicExports = {},
  packageExports = {},
  typeExports = {};
function exportNames(base) {
  const files = names.map((name) =>
    join(base, "packages", name, "src/index.ts"),
  );
  const program = ts.createProgram(files, {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    allowImportingTsExtensions: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  return Object.fromEntries(
    names.map((name, index) => [
      name,
      checker
        .getExportsOfModule(
          checker.getSymbolAtLocation(program.getSourceFile(files[index])),
        )
        .map((symbol) => symbol.name)
        .sort(),
    ]),
  );
}
const oldNames = exportNames(legacy),
  newNames = exportNames(root);
const paths = (value) =>
  typeof value === "string"
    ? ["."]
    : Object.keys(value ?? {}).filter((key) => key.startsWith("."));
for (const name of names) {
  const before = await load(legacy, name),
    after = await load(root, name);
  publicExports[name] = Object.keys(before).sort();
  typeExports[name] = oldNames[name];
  for (const key of publicExports[name])
    if (!(key in after))
      violations.push("Removed runtime export " + name + ":" + key);
  for (const key of oldNames[name])
    if (!newNames[name].includes(key))
      violations.push("Removed public type/export " + name + ":" + key);
  const oldPkg = JSON.parse(
      await readFile(join(legacy, "packages", name, "package.json"), "utf8"),
    ),
    newPkg = JSON.parse(
      await readFile(join(root, "packages", name, "package.json"), "utf8"),
    );
  packageExports[name] = paths(oldPkg.exports);
  for (const path of packageExports[name])
    if (!paths(newPkg.exports).includes(path))
      violations.push("Removed package export " + name + ":" + path);
}
const oldMcp = await load(legacy, "mcp", "tools.ts"),
  newMcp = await load(root, "mcp", "tools.ts"),
  mcpTools = oldMcp.MCP_TOOLS.map((tool) => tool.name);
for (const name of mcpTools)
  if (!newMcp.MCP_TOOLS.some((tool) => tool.name === name))
    violations.push("Removed MCP tool " + name);
const normalize = (selector) =>
  selector
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim();
const selectors = [];
postcss
  .parse(
    await readFile(
      join(legacy, "packages/design-system/src/components.css"),
      "utf8",
    ),
  )
  .walkRules((rule) => selectors.push(normalize(rule.selector)));
const currentSelectors = new Set();
postcss
  .parse(await readFile("packages/design-system/src/components.css", "utf8"))
  .walkRules((rule) => currentSelectors.add(normalize(rule.selector)));
for (const selector of selectors)
  if (!currentSelectors.has(selector))
    violations.push("Removed CSS selector " + selector);
const oldReact = await load(legacy, "react"),
  newReact = await load(root, "react");
const render = (module, appearance) =>
  renderToStaticMarkup(
    createElement(module.InteiroProvider, {
      ...(appearance ? { appearance } : {}),
      density: "focus",
      overrides: { "--consumer-marker": "legacy" },
      children: createElement(
        "button",
        { className: "in-button in-button--primary" },
        "Escolher",
      ),
    }),
  );
const providerRenders = {};
for (const appearance of ["default", "auto", ...previous.THEMES]) {
  const before = render(
      oldReact,
      appearance === "default" ? undefined : appearance,
    ),
    after = render(newReact, appearance === "default" ? undefined : appearance);
  providerRenders[appearance] = before;
  if (before !== after)
    violations.push("Changed legacy provider rendering " + appearance);
}
const fixture = join(work, "consumer");
await mkdir(fixture);
await writeFile(
  join(fixture, "legacy.css"),
  ".legacy { color: var(--in-color-text-primary); }\n",
);
const commands = [
  ["tokens", "list"],
  ["tokens", "explain", "color.identity.primary"],
  ["themes", "list"],
  ["agents", "list"],
  ["audit", "legacy.css"],
  ["migrate", "legacy.css"],
];
const cli = [];
for (const command of commands) {
  const invoke = (base) => {
    try {
      return {
        code: 0,
        data: JSON.parse(
          execFileSync(
            process.execPath,
            [
              join(base, "packages/cli/src/cli.ts"),
              ...command,
              "--cwd",
              fixture,
              "--json",
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          ),
        ),
      };
    } catch (error) {
      return { code: error.status, data: JSON.parse(String(error.stdout)) };
    }
  };
  const before = invoke(legacy),
    after = invoke(root);
  const missing = Array.isArray(before.data)
    ? []
    : Object.keys(before.data).filter((key) => !(key in after.data));
  if (
    before.code !== after.code ||
    Array.isArray(before.data) !== Array.isArray(after.data) ||
    missing.length
  )
    violations.push("Changed legacy CLI contract " + command.join(" "));
  cli.push({
    command: command.join(" "),
    beforeCode: before.code,
    afterCode: after.code,
    legacyShape: Array.isArray(before.data)
      ? "array"
      : Object.keys(before.data).sort(),
    missingKeys: missing,
  });
}
const contract = {
  schemaVersion: "1.0",
  legacyCommit: commit,
  declaredVersion: packageBefore.version,
  historicalReportedTokenVersion: previous.VERSION,
  tokens,
  publicExports,
  typeExports,
  packageExports,
  mcpTools,
  cssSelectors: [...new Set(selectors)].sort(),
  providerRenders,
};
if (process.argv.includes("--record-contract")) {
  await mkdir("tests/fixtures", { recursive: true });
  await writeFile(
    "tests/fixtures/inteiro-1.1.0-contract.json",
    JSON.stringify(contract, null, 2) + "\n",
  );
}
const report = {
  schemaVersion: "1.0",
  status: violations.length ? "failed" : "passed",
  legacyCommit: commit,
  declaredLegacyVersion: packageBefore.version,
  historicalReportedTokenVersion: previous.VERSION,
  currentVersion: current.VERSION,
  legacyTokens: tokens.length,
  themes: previous.THEMES,
  publicExportCounts: Object.fromEntries(
    names.map((name) => [name, publicExports[name].length]),
  ),
  typeExportCounts: Object.fromEntries(
    names.map((name) => [name, typeExports[name].length]),
  ),
  legacyMcpTools: mcpTools.length,
  providerCases: Object.keys(providerRenders),
  cli,
  violations,
  limitations: [
    "Compares public contracts and SSR on the installed React peer version. It does not approve visual goldens or certify every consumer application.",
    "Historical 1.1.0 package reported token VERSION " +
      previous.VERSION +
      "; identity is established by package metadata and Git commit.",
  ],
};
await writeFile(
  "artifacts/p0-legacy-compatibility.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (violations.length) process.exitCode = 6;
