import * as pty from "node-pty";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { terminalSource } from "./terminal-evidence.mjs";
const temporary = await mkdtemp(join(tmpdir(), "inteiro-terminal-"));
const artifacts = resolve("artifacts/terminal");
await mkdir(artifacts, { recursive: true });
const results = [];
async function run(columns, rows, scenario) {
  const file = join(temporary, `${columns}-${scenario}.json`);
  const env = { ...process.env, TERM: "xterm-256color", NO_COLOR: "1" };
  delete env.CI;
  const code =
    "const {main}=await import('./examples/terminal/standalone.ts');const exit=await main(process.argv.slice(1));console.log('__TERMINAL_STATE__'+JSON.stringify({raw:!!process.stdin.isRaw,exit}));process.exitCode=exit;";
  const terminal = pty.spawn(
    process.execPath,
    ["--input-type=module", "-e", code, "--", "--config", file, "--ascii"],
    {
      name: "xterm-256color",
      cols: columns,
      rows,
      cwd: process.cwd(),
      env,
      ...(process.platform === "win32" ? { useConptyDll: true } : {}),
    },
  );
  let output = "",
    exited = false,
    exitCode;
  const waiters = new Set();
  terminal.onData((data) => {
    output += data;
    for (const fn of waiters) fn();
  });
  const end = new Promise((resolve) =>
    terminal.onExit((e) => {
      exited = true;
      exitCode = e.exitCode;
      for (const fn of waiters) fn();
      resolve(e);
    }),
  );
  const wait = async (text, since = 0) =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        waiters.delete(check);
        reject(
          Error(
            `Timeout ${scenario} ${columns}: ${text}\n${output.slice(-1600)}`,
          ),
        );
      }, 15000);
      function check() {
        if (output.slice(since).includes(text)) {
          clearTimeout(timeout);
          waiters.delete(check);
          resolve();
        } else if (exited) {
          clearTimeout(timeout);
          waiters.delete(check);
          reject(
            Error(
              `Exited ${exitCode} waiting for ${text}: ${output.slice(-2000)}`,
            ),
          );
        }
      }
      waiters.add(check);
      check();
    });
  const send = async (data, text) => {
    const start = output.length;
    terminal.write(data);
    if (text) await wait(text, start);
  };
  try {
    await wait("Configurações");
    if (scenario === "interrupt") {
      await send("\x03", "__TERMINAL_STATE__");
      await end;
      if (exitCode !== 130) throw Error("Ctrl+C did not return 130");
    } else {
      await send("\x1b[B\x1b[B\r", "? Limite de tarefas");
      terminal.resize(120, 36);
      terminal.resize(columns, rows);
      await send("\x15" + "5\r", "? Configurações");
      await send("\x1b[B\x1b[B\x1b[B\r", "Alterações salvas");
      await wait("Configurações");
      await send("\x1b[B".repeat(6) + "\r", "__TERMINAL_STATE__");
      await end;
      if (exitCode !== 0) throw Error(`Exit ${exitCode}`);
      const saved = JSON.parse(await readFile(file, "utf8"));
      if (saved.limit !== 5) throw Error("Wrong saved draft");
    }
    if (!output.includes('"raw":false')) throw Error("Raw mode not restored");
    const artifact = `${columns}x${rows}-${scenario}.txt`;
    await writeFile(join(artifacts, artifact), output);
    results.push({
      columns,
      rows,
      scenario,
      status: "passed",
      exitCode,
      artifact,
      sha256: createHash("sha256").update(output).digest("hex"),
      terminal:
        process.platform === "win32"
          ? "Windows ConPTY (node-pty)"
          : "POSIX PTY (node-pty)",
      renderer: "Inquirer 7.10.1",
      notes:
        "PTY automation; does not certify Windows Terminal GUI or screen reader",
    });
    console.log(`PASS ${columns}x${rows} ${scenario}`);
  } finally {
    if (!exited) terminal.kill();
  }
}
let failure;
try {
  for (const [columns, rows] of [
    [40, 12],
    [80, 24],
    [120, 36],
  ])
    await run(columns, rows, "edit-save-close");
  await run(80, 24, "interrupt");
} catch (error) {
  failure = error;
} finally {
  await writeFile(
    join(artifacts, "smoke.json"),
    JSON.stringify(
      {
        ...(await terminalSource()),
        timestamp: new Date().toISOString(),
        platform: process.platform,
        node: process.version,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  await rm(temporary, { recursive: true, force: true });
}
if (failure) console.error(failure);
// ConPTY worker handles in node-pty can outlive an already exited child. All child
// exits, terminal state checks and artifact writes have completed above.
process.exit(failure ? 1 : 0);
