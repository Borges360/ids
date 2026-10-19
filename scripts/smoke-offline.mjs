import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { reviewSourceHash } from "../packages/contracts/src/index.ts";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run smoke:offline");
const manifest = JSON.parse(
  await readFile("artifacts/p0-package-manifest.json", "utf8"),
);
if (manifest.sourceHash !== (await reviewSourceHash(process.cwd())))
  throw new Error("Package manifest is stale; run pack:p0 for this checkout");
for (const pkg of manifest.packages) {
  const bytes = await readFile(resolve("artifacts/tarballs", pkg.filename));
  if (
    pkg.integrity !==
    "sha512-" + createHash("sha512").update(bytes).digest("base64")
  )
    throw new Error("Tarball differs from package manifest");
}
const packageSet = createHash("sha256")
  .update(JSON.stringify(manifest.packages))
  .digest("hex")
  .slice(0, 16);
const root = resolve("artifacts/offline-consumer-" + packageSet);
await mkdir(root, { recursive: true });
await writeFile(
  join(root, "package.json"),
  JSON.stringify({
    name: "inteiro-offline-consumer",
    version: "1.0.0",
    private: true,
    type: "module",
    dependencies: {
      ...Object.fromEntries(
        manifest.packages.map((pkg) => [
          pkg.name,
          "file:../tarballs/" + pkg.filename,
        ]),
      ),
      ...Object.fromEntries(
        await Promise.all(
          ["react", "react-dom", "@types/react", "@types/react-dom"].map(
            async (name) => [
              name,
              JSON.parse(
                await readFile(
                  resolve("node_modules", name, "package.json"),
                  "utf8",
                ),
              ).version,
            ],
          ),
        ),
      ),
    },
  }),
);
const tarballs = manifest.packages.map((pkg) =>
  resolve("artifacts/tarballs", pkg.filename),
);
if (process.argv.includes("--seed-cache")) {
  const prepare = spawnSync(
    process.execPath,
    [npmCli, "install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: root, encoding: "utf8" },
  );
  if (prepare.status !== 0) throw new Error(prepare.stderr);
}
const hasLock = (await readdir(root)).includes("package-lock.json");
const install = spawnSync(
  process.execPath,
  [
    npmCli,
    hasLock ? "ci" : "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  { cwd: root, encoding: "utf8" },
);
if (install.status !== 0) throw new Error(install.stderr);
const lock = JSON.parse(
  await readFile(join(root, "package-lock.json"), "utf8"),
);
for (const pkg of manifest.packages)
  if (lock.packages["node_modules/" + pkg.name]?.integrity !== pkg.integrity)
    throw new Error(
      "Installed lock integrity differs from current tarball: " + pkg.name,
    );
const cli = join(root, "node_modules/@inteiro/cli/runtime/cli.js");
const commands = [
  ["tokens", "list", "--json"],
  ["compose", "show", "data-table", "--json"],
  ["contract", "inspect", "--json"],
  ["init", "--harness", "pi", "--yes", "--json"],
  ["agents", "install", "pi", "--yes", "--json"],
  ...((await readdir(join(root, ".inteiro")).catch(() => [])).includes(
    "task.json",
  )
    ? [["context", "resolve", "--record", "--json"]]
    : [
        [
          "context",
          "plan",
          "--task",
          "Formulário de cadastro",
          "--type",
          "component",
          "--files",
          "src/form.html",
          "--patterns",
          "form-layout",
          "--acceptance",
          "Campos identificados e erros associados",
          "--record",
          "--json",
        ],
      ]),
  ["context", "verify", "--task-context", "--json"],
  ["context", "verify", "--harness", "pi", "--json"],
  ["agents", "install", "codex", "--yes", "--json"],
  ["context", "verify", "--harness", "codex", "--json"],
  ["context", "verify", "--harness", "pi", "--json"],
];
commands.push(
  ["context", "resolve", "--record", "--json"],
  ["context", "verify", "--task-context", "--json"],
);
for (const args of commands) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(
      args.join(" ") + ": " + result.stdout + " " + result.stderr,
    );
  JSON.parse(result.stdout);
}
const executable = spawnSync(
  process.execPath,
  [npmCli, "exec", "--offline", "--", "inteiro", "tokens", "list", "--json"],
  { cwd: root, encoding: "utf8" },
);
if (executable.status !== 0) throw new Error(executable.stderr);
JSON.parse(executable.stdout);
await writeFile(
  join(root, "consumer.ts"),
  'import {DEFAULTS,aggregate,type Config,type GateStatus} from "@inteiro/contracts";\nimport {getPattern} from "@inteiro/composition";\nimport {enhance} from "@inteiro/composition/behavior";\nimport {run} from "@inteiro/cli";\nimport {recordTaskContext,type TaskManifest} from "@inteiro/agent-core";\nimport {planMigration,type MigrationPolicy} from "@inteiro/lint";\nimport {InteiroProvider,type InteiroContextValue} from "@inteiro/react";\nconst config:Config=DEFAULTS;const status:GateStatus=aggregate([]);const policy:MigrationPolicy={schemaVersion:"1.0",mappings:[]};const task:TaskManifest={schemaVersion:"1.0",id:"consumer",type:"component",description:"Form",patternIds:["form-layout"],scope:{allowedFiles:["src/form.html"]},acceptanceCriteria:["Valid form"]};const provider:Parameters<typeof InteiroProvider>[0]={appearance:"light",density:"focus",children:"legacy"};void [config,status,getPattern("app-shell"),enhance,run,recordTaskContext,planMigration,policy,task,provider];\n',
);
await writeFile(
  join(root, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      esModuleInterop: true,
      types: [],
      lib: ["ES2022", "DOM"],
    },
    include: ["consumer.ts"],
  }),
);
const typecheck = spawnSync(
  process.execPath,
  [join(root, "node_modules/typescript/bin/tsc"), "--project", "tsconfig.json"],
  { cwd: root, encoding: "utf8" },
);
if (typecheck.status !== 0)
  throw new Error(typecheck.stdout + typecheck.stderr);
await writeFile(
  join(root, "verify-runtime.mjs"),
  'import {createElement} from "react";import {renderToStaticMarkup} from "react-dom/server";import {InteiroProvider} from "@inteiro/react";const markup=renderToStaticMarkup(createElement(InteiroProvider,{children:"legacy",overrides:{"--consumer-marker":"kept"}}));if(markup.includes("data-in-theme")||!markup.includes("--consumer-marker:kept"))throw new Error("Packaged provider changed inherited theme contract");console.log(JSON.stringify({provider:"passed"}));\n',
);
const provider = spawnSync(process.execPath, ["verify-runtime.mjs"], {
  cwd: root,
  encoding: "utf8",
});
if (provider.status !== 0) throw new Error(provider.stdout + provider.stderr);
JSON.parse(provider.stdout);
const registration = JSON.parse(await readFile(join(root, "mcp.json"), "utf8"))
  .mcpServers.inteiro;
const rpc = spawnSync(process.execPath, registration.args, {
  cwd: root,
  encoding: "utf8",
  input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n",
  timeout: 10000,
});
if (rpc.status !== 0) throw new Error(rpc.stderr);
const response = JSON.parse(rpc.stdout);
if (!response.result.tools.some((t) => t.name === "inteiro_get_contract"))
  throw new Error("MCP tools missing");
const report = {
  schemaVersion: "1.0",
  status: "passed",
  tarballs: tarballs.length,
  consumerRoot: root,
  sourceHash: manifest.sourceHash,
  integrity: "All installed lock entries match current tarball SHA-512",
  provider: "Packaged SSR preserves inherited theme and consumer overrides",
  commands: commands.map((c) => c.join(" ")),
  mcpTools: response.result.tools.length,
  declarations: "strict NodeNext consumer typecheck passed",
  network: "npm install --offline; commands use local assets",
  limitation: "Dependency cache must be populated before offline installation.",
};
await writeFile("artifacts/p0-offline.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
