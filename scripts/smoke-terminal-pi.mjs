import * as pty from "node-pty";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { terminalSource } from "./terminal-evidence.mjs";
const launcher =
  process.env.INTEIRO_PI_LAUNCHER ||
  join(homedir(), ".pi", "agent", "bin", "pi-launcher.js");
const workspace = await mkdtemp(join(tmpdir(), "inteiro-pi-pilot-"));
const artifacts = resolve("artifacts/terminal");
await mkdir(artifacts, { recursive: true });
let output = "",
  failure;
const env = {
  ...process.env,
  PI_OFFLINE: "1",
  PI_TELEMETRY: "0",
  NO_COLOR: "1",
  TERM: "xterm-256color",
};
delete env.CI;
const terminal = pty.spawn(
  process.execPath,
  [
    launcher,
    "--no-extensions",
    "--extension",
    resolve("examples/terminal/pi-extension.ts"),
    "--no-session",
    "--offline",
    "--no-tools",
    "--no-context-files",
    "--no-skills",
    "--no-prompt-templates",
    "--no-themes",
    "--approve",
    "--tui-mode",
    "regular",
  ],
  {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: workspace,
    env,
    ...(process.platform === "win32" ? { useConptyDll: true } : {}),
  },
);
let exited = false;
const updates = new Set();
terminal.onData((data) => {
  output += data;
  for (const update of updates) update();
});
terminal.onExit(() => {
  exited = true;
  for (const update of updates) update();
});
const wait = (text, start = 0) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      updates.delete(check);
      reject(Error(`Pi timeout waiting for ${text}: ${output.slice(-2200)}`));
    }, 30000);
    function check() {
      if (output.slice(start).includes(text)) {
        clearTimeout(timeout);
        updates.delete(check);
        resolve();
      } else if (exited) {
        clearTimeout(timeout);
        updates.delete(check);
        reject(Error(`Pi exited: ${output.slice(-2200)}`));
      }
    }
    updates.add(check);
    check();
  });
const send = async (data, text) => {
  const start = output.length;
  terminal.write(data);
  if (text) await wait(text, start);
};
try {
  await wait("pi-extension.ts");
  await send("/terminal-preferences\r", "Sem alterações");
  const compactStart = output.length;
  terminal.resize(40, 12);
  await wait("Salvar", compactStart);
  await send("\r", "(x) Local");
  await send("\x1b[B\r", "Alterações não salvas");
  await send("\x13", "Alterações salvas");
  const saved = JSON.parse(
    await readFile(
      join(workspace, ".inteiro", "terminal-preferences.json"),
      "utf8",
    ),
  );
  if (saved.connection !== "lab") throw Error("Pi saved stale field");
  terminal.resize(120, 36);
  terminal.resize(80, 24);
  await send("\x1b");
  // Wait for the host to restore its editor after closing the overlay.
  await new Promise((resolve) => setTimeout(resolve, 150));
  await send("/terminal-workspace\r", "Workspace");
  await send("\t\x1b[B\r", "Ordem original");
  await send("\x1b[B\x1b[B\r", "Ordenado por");
  await send("\x1b");
  console.log(
    "PASS Pi 1.5.2: native host open/edit/save/resize/close and data workspace",
  );
} catch (error) {
  failure = error;
  console.error(error.message);
} finally {
  if (!exited) terminal.kill();
  const artifact = "pi-host.txt";
  await writeFile(join(artifacts, artifact), output);
  await writeFile(
    join(artifacts, "pi-host.json"),
    JSON.stringify(
      {
        status: failure ? "failed" : "passed",
        timestamp: new Date().toISOString(),
        ...(await terminalSource()),
        platform: process.platform,
        terminal: "ConPTY",
        host: "Pi 1.5.2",
        renderer: "Pi native custom overlay + Input",
        artifact,
        sha256: createHash("sha256").update(output).digest("hex"),
        notes:
          "Actual host keyboard automation; no model request, screen-reader or qualitative approval.",
      },
      null,
      2,
    ) + "\n",
  );
  await rm(workspace, { recursive: true, force: true });
}
process.exit(failure ? 1 : 0);
