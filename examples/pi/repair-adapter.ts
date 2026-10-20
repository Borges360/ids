import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  parseGateOutput,
  resolvedRepairContext,
  runRepairController,
  type RepairConsumer,
  type RepairTask,
} from "@inteiro/agent-core";
import { resolveConfig } from "@inteiro/contracts";

/** Reference for a Pi extension. No Pi hooks or model SDK are assumed. */
export function createPiValidator(root: string) {
  const cli = fileURLToPath(import.meta.resolve("@inteiro/cli"));
  return async (scope: "affected" | "full") => {
    const args = [
      cli,
      "gate",
      "run",
      "--profile",
      "pr",
      "--json",
      ...(scope === "affected" ? ["--changed"] : []),
    ];
    return new Promise<ReturnType<typeof parseGateOutput>>(
      (resolve, reject) => {
        const child = spawn(process.execPath, args, {
          cwd: root,
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "",
          bytes = 0;
        let done = false;
        const stop = (error: Error) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          child.kill();
          reject(error);
        };
        const timeout = setTimeout(
          () => stop(new Error("CLI gate timed out")),
          15 * 60 * 1000,
        );
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          bytes += Buffer.byteLength(chunk);
          if (bytes > 16 * 1024 * 1024)
            stop(new Error("CLI output exceeds limit"));
          else output += chunk;
        });
        // Do not forward uncontrolled stderr (which may include application data) to a model.
        child.stderr.resume();
        child.on("error", stop);
        child.on("close", (code) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          try {
            resolve(parseGateOutput(output, code));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
  };
}
export async function runPiRepair(
  root: string,
  task: RepairTask,
  propose: RepairConsumer["propose"],
) {
  const { config } = await resolveConfig(root);
  const validate = createPiValidator(root);
  const initial = await validate("full");
  return runRepairController(root, config, initial, task, {
    propose,
    validate,
  });
}
export async function piDiagnosticsOnly(root: string) {
  const { config } = await resolveConfig(root);
  return resolvedRepairContext(
    root,
    config,
    await createPiValidator(root)("full"),
  );
}
