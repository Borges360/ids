import { spawn } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  finding,
  reviewSourceHash,
  safeRead,
  type GateResult,
} from "@inteiro/contracts";

export const RELEASE_QUALIFICATION_CHECKS = Object.freeze([
  "ci",
  "browser-gate",
  "benchmark-grading",
  "public-contracts",
  "worker-isolation",
  "stories",
  "browser-full",
  "performance",
  "dependency-security",
  "pack",
  "offline",
  "worker-bootstrap",
  "public-workers",
]);

/** Only the IDS source checkout can execute its fixed, versioned qualification suite. */
export async function releaseQualification(root: string): Promise<GateResult> {
  const started = performance.now();
  const stop = (
    status: "blocked" | "error" | "failed",
    message: string,
  ): GateResult => ({
    name: "qualification",
    status,
    durationMs: performance.now() - started,
    findings: [finding("REL-QUALIFICATION-001", message, { status })],
  });
  const script = fileURLToPath(
    new URL("../../../scripts/verify-p0.mjs", import.meta.url),
  );
  try {
    const expectedRoot = fileURLToPath(new URL("../../../", import.meta.url));
    if ((await realpath(root)) !== (await realpath(expectedRoot)))
      return stop(
        "blocked",
        "Release source qualification requires the IDS checkout matching this runner",
      );
    await readFile(script);
    if (!process.env.npm_execpath)
      return stop(
        "blocked",
        "Run release through npm run gate:p0 to use the pinned npm launcher",
      );
    const sourceHash = await reviewSourceHash(root);
    const result = await new Promise<{
      code: number | null;
      timedOut: boolean;
    }>((resolveResult) => {
      const child = spawn(process.execPath, [script], {
        cwd: root,
        stdio: "ignore",
        windowsHide: true,
        env: {
          ...process.env,
          CI: "1",
          NEXT_TELEMETRY_DISABLED: "1",
          STORYBOOK_DISABLE_TELEMETRY: "1",
        },
      });
      let timedOut = false;
      const timer = setTimeout(
        () => {
          timedOut = true;
          if (process.platform === "win32" && child.pid)
            spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
              windowsHide: true,
              stdio: "ignore",
            });
          else child.kill("SIGTERM");
        },
        90 * 60 * 1000,
      );
      child.on("error", () => {
        clearTimeout(timer);
        resolveResult({ code: null, timedOut });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolveResult({ code, timedOut });
      });
    });
    if (result.timedOut)
      return stop("error", "Release qualification time limit exceeded");
    if (result.code !== 0)
      return stop(
        "failed",
        "Release qualification failed; inspect artifacts/p0-verification.json",
      );
    const report = JSON.parse(
      await safeRead(root, "artifacts/p0-verification.json"),
    );
    const required = RELEASE_QUALIFICATION_CHECKS;
    if (
      report.status !== "passed" ||
      report.sourceHash !== sourceHash ||
      report.finishedSourceHash !== sourceHash ||
      (await reviewSourceHash(root)) !== sourceHash ||
      required.some(
        (name) =>
          report.checks?.filter(
            (check: { name: string; status: string; exitCode: number }) =>
              check.name === name &&
              check.status === "passed" &&
              check.exitCode === 0,
          ).length !== 1,
      )
    )
      return stop(
        "blocked",
        "Release qualification is incomplete or source changed",
      );
    return {
      name: "qualification",
      status: "passed",
      durationMs: performance.now() - started,
      findings: [],
      sourceHash,
      checks: report.checks,
      evidence: resolve(root, "artifacts/p0-verification.json"),
      kind: "automatic-source-qualification",
    };
  } catch (error) {
    return stop("error", String(error));
  }
}
