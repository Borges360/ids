import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run smoke:offline");
const root = resolve("artifacts/offline-consumer");
await mkdir(root, { recursive: true });
await writeFile(
  join(root, "package.json"),
  JSON.stringify({
    name: "inteiro-offline-consumer",
    version: "1.0.0",
    private: true,
    type: "module",
  }),
);
const tarballs = (await readdir("artifacts/tarballs"))
  .filter((f) => f.endsWith(".tgz"))
  .map((f) => resolve("artifacts/tarballs", f));
if (process.argv.includes("--seed-cache")) {
  const prepare = spawnSync(
    process.execPath,
    [
      npmCli,
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...tarballs,
    ],
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
    ...(hasLock ? [] : tarballs),
  ],
  { cwd: root, encoding: "utf8" },
);
if (install.status !== 0) throw new Error(install.stderr);
const cli = join(root, "node_modules/@inteiro/cli/runtime/cli.js");
const commands = [
  ["tokens", "list", "--json"],
  ["compose", "show", "data-table", "--json"],
  ["contract", "inspect", "--json"],
  ["agents", "install", "pi", "--yes", "--json"],
  ["context", "verify", "--harness", "pi", "--json"],
  ["agents", "install", "codex", "--yes", "--json"],
  ["context", "verify", "--harness", "codex", "--json"],
  ["context", "verify", "--harness", "pi", "--json"],
];
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
  'import {DEFAULTS,aggregate,type Config,type GateStatus} from "@inteiro/contracts";\nimport {getPattern} from "@inteiro/composition";\nimport {enhance} from "@inteiro/composition/behavior";\nimport {run} from "@inteiro/cli";\nconst config:Config=DEFAULTS;const status:GateStatus=aggregate([]);void [config,status,getPattern("app-shell"),enhance,run];\n',
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
  commands: commands.map((c) => c.join(" ")),
  mcpTools: response.result.tools.length,
  declarations: "strict NodeNext consumer typecheck passed",
  network: "npm install --offline; commands use local assets",
  limitation: "Dependency cache must be populated before offline installation.",
};
await writeFile("artifacts/p0-offline.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
