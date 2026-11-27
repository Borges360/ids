import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { spawnSync, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { reviewSourceHash, hash } from "../packages/contracts/src/index.ts";
import { RELEASE_QUALIFICATION_CHECKS } from "../packages/agent-core/src/release-qualification.ts";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run verify:p0");
const linuxRuntime = process.argv.includes("--linux-runtime");
if (linuxRuntime && process.platform !== "linux")
  throw Error("Linux runtime qualification requires Linux");
await mkdir("artifacts", { recursive: true });
const runDirectory = "artifacts/verification-" + randomUUID();
await mkdir(runDirectory);
const tasks = [
  ...(process.argv.includes("--clean")
    ? [{ name: "install", args: ["ci", "--no-audit", "--no-fund"] }]
    : []),
  { name: "ci", args: ["run", "ci"] },
  { name: "browser-gate", args: ["run", "test:browser-gate"] },
  { name: "benchmark-grading", args: ["run", "test:benchmark-grading"] },
  {
    name: "public-contracts",
    args: ["run", "test:public-contracts"],
  },
  ...(linuxRuntime
    ? []
    : [{ name: "worker-isolation", args: ["run", "test:worker-isolation"] }]),
  { name: "stories", args: ["run", "test:stories"] },
  {
    name: "browser-full",
    args: [
      "run",
      "test:browser",
      "--",
      process.platform === "linux" ? "--workers=1" : "--workers=4",
      "--fully-parallel",
    ],
    env: { INTEIRO_FULL_MATRIX: "1" },
  },
  { name: "performance", args: ["run", "measure:p0"] },
  {
    name: "dependency-security",
    args: ["run", "audit:dependencies"],
  },
  { name: "pack", args: ["run", "pack:p0"] },
  { name: "offline", args: ["run", "smoke:offline", "--", "--seed-cache"] },
  { name: "worker-bootstrap", args: ["run", "test:worker-bootstrap"] },
  {
    name: "public-workers",
    args: ["run", "test:public-workers"],
  },
];
const required = RELEASE_QUALIFICATION_CHECKS.filter(
  (name) => !linuxRuntime || name !== "worker-isolation",
);
if (
  new Set(tasks.map((task) => task.name)).size !== tasks.length ||
  required.some((name) => !tasks.some((task) => task.name === name))
)
  throw Error("Incomplete fixed qualification task inventory");
const report = {
  runDirectory,
  schemaVersion: "1.0",
  platform: process.platform,
  node: process.version,
  scope: linuxRuntime ? "linux-runtime" : "full-source",
  externalCoverageRequired: linuxRuntime ? ["worker-isolation"] : [],
  startedAt: new Date().toISOString(),
  finishedAt: null,
  // Structured runner results name absolute test paths below this root.
  root: process.cwd(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTreeDirty: Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  ),
  status: "running",
  sourceHash: await reviewSourceHash(process.cwd()),
  finishedSourceHash: null,
  checks: [],
};
for (const task of tasks) {
  const started = performance.now();
  console.log("Running " + task.name);
  const resultsDirectory = runDirectory + "/results/" + task.name;
  await mkdir(resultsDirectory, { recursive: true });
  const child = spawnSync(process.execPath, [npmCli, ...task.args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      ...task.env,
      INTEIRO_TEST_RESULTS: resolve(resultsDirectory),
      NEXT_TELEMETRY_DISABLED: "1",
      STORYBOOK_DISABLE_TELEMETRY: "1",
    },
  });
  const results = [];
  for (const name of (await readdir(resultsDirectory)).sort()) {
    const format = name.startsWith("playwright-")
      ? "playwright-json"
      : name.startsWith("vitest-")
        ? "vitest-json"
        : undefined;
    if (!format || !name.endsWith(".json")) continue;
    const path = resultsDirectory + "/" + name;
    results.push({ path, sha256: hash(await readFile(path)), format });
  }
  const log = runDirectory + "/" + task.name + ".log";
  const logBytes = Buffer.from(
    (child.stdout ?? "") + "\n" + (child.stderr ?? ""),
  );
  await writeFile(log, logBytes);
  report.checks.push({
    name: task.name,
    command: "npm " + task.args.join(" "),
    exitCode: child.status,
    status: child.status === 0 ? "passed" : "failed",
    durationMs: performance.now() - started,
    log,
    sha256: hash(logBytes),
    results,
  });
  const afterSourceHash = await reviewSourceHash(process.cwd());
  if (afterSourceHash !== report.sourceHash) {
    report.status = "error";
    report.sourceDrift = {
      stage: task.name,
      expected: report.sourceHash,
      actual: afterSourceHash,
    };
    break;
  }
  await writeFile(
    "artifacts/p0-verification.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    runDirectory + "/verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log(task.name + ": " + child.status);
  if (child.status !== 0) {
    report.status = "failed";
    break;
  }
}
report.finishedSourceHash = await reviewSourceHash(process.cwd());
report.finishedCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (report.finishedSourceHash !== report.sourceHash) {
  report.status = "error";
  report.sourceDrift ??= {
    stage: "final",
    expected: report.sourceHash,
    actual: report.finishedSourceHash,
  };
}
report.finishedAt = new Date().toISOString();
if (report.status === "running") report.status = "passed";
await writeFile(
  runDirectory + "/verification.json",
  JSON.stringify(report, null, 2),
);
await writeFile(
  "artifacts/p0-verification.json",
  JSON.stringify(report, null, 2),
);
process.exitCode = report.status === "passed" ? 0 : 1;
