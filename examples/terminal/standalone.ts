import { pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import {
  detectCapabilities,
  type TerminalResult,
  type Values,
} from "@inteiro/terminal";
import { loadSession, diagnostics } from "./shared.ts";
class UsageError extends Error {}
export async function main(args = process.argv.slice(2)) {
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  const caps = detectCapabilities({
    inputTTY: !!process.stdin.isTTY,
    outputTTY: !!process.stdout.isTTY,
    uiTTY: !!process.stderr.isTTY,
    columns: process.stderr.columns,
    rows: process.stderr.rows,
    env: process.env,
    json: args.includes("--json"),
    noInput: args.includes("--no-input"),
    ...(flag("--ui") === "linear" ? { mode: "linear" as const } : {}),
    ascii: args.includes("--ascii"),
    ...(flag("--color") === "always"
      ? { color: "always" as const }
      : flag("--color") === "never"
        ? { color: "never" as const }
        : {}),
  });
  let result: TerminalResult<Values>;
  try {
    if (args.includes("--help")) {
      process.stdout.write(
        "Referência INTEIRO Terminal — --config arquivo --ui linear|prompts --json --no-input --ascii --color auto|always|never --connection local|lab --language pt-BR|en --limit 1..8 --save\nSem TTY não pede entrada. Argumentos mostram o rascunho; --save persiste explicitamente. Sem --config usa .inteiro/terminal-preferences.json no projeto.\n",
      );
      return 0;
    }
    const booleanFlags = new Set([
      "--json",
      "--no-input",
      "--ascii",
      "--no-motion",
      "--save",
    ]);
    const valueFlags = new Set([
      "--config",
      "--ui",
      "--color",
      "--connection",
      "--language",
      "--limit",
    ]);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (booleanFlags.has(arg)) continue;
      if (!valueFlags.has(arg))
        throw new UsageError(`Opção desconhecida: ${arg}. Use --help.`);
      if (!args[i + 1] || args[i + 1]!.startsWith("--"))
        throw new UsageError(`Informe um valor para ${arg}.`);
      i++;
    }
    if (flag("--ui") && !["linear", "prompts"].includes(flag("--ui")!))
      throw new UsageError("Use --ui linear ou --ui prompts.");
    if (
      flag("--color") &&
      !["auto", "always", "never"].includes(flag("--color")!)
    )
      throw new UsageError("Use --color auto, always ou never.");
    const { session, persist } = await loadSession(
      flag("--config") ??
        join(process.cwd(), ".inteiro", "terminal-preferences.json"),
    );
    let argumentError: TerminalResult<Values> | undefined;
    for (const id of ["connection", "language", "limit"]) {
      const value = flag(`--${id}`);
      if (value !== undefined) {
        session.begin(id);
        session.edit(
          id === "limit" ? (value.trim() ? Number(value) : NaN) : value,
        );
        if (!session.confirmEdit()) {
          argumentError = {
            status: "invalid",
            message: `${id}: ${session.errors[id]}`,
          };
          break;
        }
      }
    }
    if (argumentError) result = argumentError;
    else if (args.includes("--save")) result = await session.save(persist);
    else if (!caps.interactive)
      result = {
        status: "succeeded",
        value: Object.fromEntries(
          session.fields
            .filter((f) => f.kind !== "secret")
            .map((f) => [f.id, session.draft[f.id]!]),
        ),
      };
    else {
      const abort = new AbortController(),
        interrupt = () => abort.abort();
      process.once("SIGINT", interrupt);
      try {
        if (caps.mode === "linear") {
          const { runLinear } = await import("@inteiro/terminal/linear");
          result = await runLinear({
            title: "Preferências",
            scope: "projeto atual",
            session,
            persist,
            capabilities: caps,
            input: process.stdin,
            output: process.stderr,
            signal: abort.signal,
          });
        } else {
          const { runPrompts } = await import("@inteiro/terminal/prompts");
          result = await runPrompts({
            title: "Preferências",
            scope: "projeto atual",
            session,
            persist,
            capabilities: caps,
            input: process.stdin,
            output: process.stderr,
            signal: abort.signal,
            task: diagnostics,
          });
        }
      } finally {
        process.removeListener("SIGINT", interrupt);
      }
    }
  } catch (error) {
    result =
      error instanceof UsageError
        ? { status: "invalid", message: error.message }
        : {
            status: "failed",
            message:
              "Não foi possível carregar as preferências. Verifique --config e o formato do arquivo.",
          };
  }
  process.stdout.write(
    caps.mode === "json"
      ? JSON.stringify(result) + "\n"
      : result.status === "succeeded"
        ? Object.entries(result.value)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n") + "\n"
        : result.message + "\n",
  );
  return result.status === "succeeded"
    ? 0
    : result.status === "cancelled"
      ? 130
      : result.status === "invalid"
        ? 2
        : 1;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = await main();
