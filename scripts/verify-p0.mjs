import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync, execFileSync } from "node:child_process";
import { resolve } from "node:path";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run verify:p0");
await mkdir("artifacts", { recursive: true });
const tasks = [
  ...(process.argv.includes("--clean")
    ? [{ name: "install", args: ["ci", "--no-audit", "--no-fund"] }]
    : []),
  { name: "ci", args: ["run", "ci"] },
  { name: "browser-gate", args: ["run", "test:browser-gate"] },
  { name: "stories", args: ["run", "test:stories"] },
  {
    name: "browser-full",
    args: ["run", "test:browser", "--", "--workers=4", "--fully-parallel"],
    env: { INTEIRO_FULL_MATRIX: "1" },
  },
  { name: "performance", args: ["run", "measure:p0"] },
  { name: "pack", args: ["run", "pack:p0"] },
  { name: "offline", args: ["run", "smoke:offline", "--", "--seed-cache"] },
];
const report = {
  schemaVersion: "1.0",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  status: "running",
  checks: [],
};
for (const task of tasks) {
  const started = performance.now();
  console.log("Running " + task.name);
  const child = spawnSync(process.execPath, [npmCli, ...task.args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      ...task.env,
      NEXT_TELEMETRY_DISABLED: "1",
      STORYBOOK_DISABLE_TELEMETRY: "1",
    },
  });
  const log = "artifacts/p0-final-" + task.name + ".log";
  await writeFile(log, (child.stdout ?? "") + "\n" + (child.stderr ?? ""));
  report.checks.push({
    name: task.name,
    exitCode: child.status,
    status: child.status === 0 ? "passed" : "failed",
    durationMs: performance.now() - started,
    log,
  });
  await writeFile(
    "artifacts/p0-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log(task.name + ": " + child.status);
  if (child.status !== 0) {
    report.status = "failed";
    break;
  }
}
report.finishedAt = new Date().toISOString();
if (report.status === "running") report.status = "passed";
await writeFile(
  "artifacts/p0-verification.json",
  JSON.stringify(report, null, 2),
);
process.exitCode = report.status === "passed" ? 0 : 1;
