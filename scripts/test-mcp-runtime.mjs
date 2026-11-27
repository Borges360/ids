// Fumaça do MCP HTTP empacotado: monta runtime/inteiro-mcp, copia para uma pasta vazia fora do
// monorepo (como na imagem) e conversa com o processo real. Pega recurso faltando no pacote,
// que os testes do código-fonte não enxergam.
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const build = spawnSync(process.execPath, ["scripts/build-mcp-runtime.mjs"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const sandbox = mkdtempSync(join(tmpdir(), "inteiro-mcp-"));
cpSync(join("runtime", "inteiro-mcp"), join(sandbox, "inteiro-mcp"), { recursive: true });

const child = spawn(process.execPath, [join("inteiro-mcp", "dist", "inteiro-mcp.mjs")], {
  cwd: sandbox,
  env: { PATH: process.env.PATH, HOST: "127.0.0.1", PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
let closing = false;
child.stderr.on("data", (chunk) => (stderr += chunk));

// No Windows a pasta não pode ser apagada enquanto o filho a usa: encerra e espera antes.
async function stop() {
  closing = true;
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
  rmSync(sandbox, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("não iniciou em 10 s")), 10_000);
    child.once("exit", (code) => closing || reject(new Error(`encerrou na partida (código ${code})`)));
    child.stdout.on("data", (chunk) => {
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/mcp/.exec(String(chunk));
      if (match) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
  });

  const rpc = async (id, method, params = {}) => (await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  })).json();
  const call = async (id, name, args = {}) => {
    const reply = await rpc(id, "tools/call", { name, arguments: args });
    check(!reply.result?.isError, `${name} devolveu erro: ${reply.result?.content?.[0]?.text}`);
    return JSON.parse(reply.result.content[0].text);
  };

  const health = await (await fetch(`${base}/health`)).json();
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  check(health.status === "ok" && health.version === version, `/health inesperado: ${JSON.stringify(health)} (esperado ${version})`);

  const tools = (await rpc(1, "tools/list")).result?.tools ?? [];
  for (const name of ["inteiro_get_terminal_component", "inteiro_get_component", "inteiro_get_visual_review"]) {
    check(tools.some((tool) => tool.name === name), `ferramenta ausente: ${name}`);
  }
  // Uma chamada por pacote que lê arquivo em tempo de execução: contratos, composição e tokens.
  check(Array.isArray(await call(2, "inteiro_get_terminal_component")), "terminal: resposta inesperada");
  check(Array.isArray(await call(3, "inteiro_get_component_recipe", { name: "mobile-navigation" })), "recipe: resposta inesperada");
  const stats = (await rpc(4, "resources/read", { uri: "inteiro://catalog/stats" })).result?.contents?.[0]?.text;
  check(stats && JSON.parse(stats).total > 0, "catálogo de tokens vazio");

  await stop();
  console.log(`MCP empacotado ok: ${tools.length} ferramentas, versão ${health.version}.`);
} catch (error) {
  console.error(`MCP empacotado: ${error instanceof Error ? error.message : error}`);
  if (stderr) console.error(stderr.trim());
  await stop();
  process.exit(1);
}
