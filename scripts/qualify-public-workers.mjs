import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  reviewSourceHash,
  safePath,
  hash,
  governanceContractHash,
} from "../packages/contracts/src/index.ts";
import {
  prepareBenchmarkWorker,
  auditBenchmarkWorker,
} from "../packages/evaluation/src/workspace.ts";

// Trusted installer qualification. It creates no model runs or baseline approvals.
const root = await realpath(process.cwd());
const output = "artifacts/public-workers-" + randomUUID();
await mkdir(safePath(root, output), { recursive: true });
const report = {
  schemaVersion: "1.0",
  kind: "public-worker-offline-qualification",
  classification: "synthetic-evaluator-self-test",
  status: "running",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  sourceHash: await reviewSourceHash(root),
  finishedSourceHash: null,
  governanceContractHash: governanceContractHash(),
  agentsExecuted: 0,
  cases: [],
};
try {
  const distributionManifest = "artifacts/p0-package-manifest.json";
  const distribution = JSON.parse(
    await readFile(safePath(root, distributionManifest), "utf8"),
  );
  const offline = JSON.parse(
    await readFile(safePath(root, "artifacts/p0-offline.json"), "utf8"),
  );
  if (
    distribution.sourceHash !== report.sourceHash ||
    offline.status !== "passed" ||
    offline.sourceHash !== report.sourceHash
  )
    throw Error("Distribution or offline evidence differs from the source");
  const consumerName = offline.consumerRoot.split(/[\\/]/).at(-1);
  if (!/^offline-consumer-[a-f0-9]{16}$/.test(consumerName ?? ""))
    throw Error("Invalid offline consumer identity");
  const dependencyLock = "artifacts/" + consumerName + "/package-lock.json";
  report.distributionHash = hash(
    await readFile(safePath(root, distributionManifest)),
  );
  report.dependencyLockHash = hash(
    await readFile(safePath(root, dependencyLock)),
  );
  const tasks = (
    await Promise.all(
      ["public", "heldout"].map(
        async (name) =>
          JSON.parse(
            await readFile(
              safePath(root, "benchmarks/tasks." + name + ".json"),
              "utf8",
            ),
          ).tasks,
      ),
    )
  ).flat();
  if (tasks.length !== 40 || new Set(tasks.map((task) => task.id)).size !== 40)
    throw Error("Expected forty distinct published tasks");
  for (const task of tasks) {
    const started = performance.now(),
      target = safePath(root, output + "/" + task.id);
    const prepared = await prepareBenchmarkWorker(root, target, task.id, {
      bootstrap: {
        distributionManifest,
        dependencyLock,
        harness: "pi",
      },
    });
    if (prepared.status !== "passed" || !prepared.readyForValidation)
      throw Error("Worker prerequisites incomplete: " + task.id);
    const audit = await auditBenchmarkWorker(root, prepared.id);
    if (audit.status !== "passed" || !audit.readyForValidation)
      throw Error("Worker audit failed: " + task.id);
    const checks = [];
    for (const args of [
      ["contract", "inspect", "--json"],
      ["context", "verify", "--task-context", "--json"],
    ]) {
      const command = spawnSync(
        process.execPath,
        [join(target, "node_modules/@inteiro/cli/runtime/cli.js"), ...args],
        {
          cwd: target,
          encoding: "utf8",
          timeout: 30000,
          maxBuffer: 4 * 1024 * 1024,
          windowsHide: true,
        },
      );
      if (command.error || command.status !== 0)
        throw Error(
          "Installed worker command failed: " + task.id + " " + args.join(" "),
        );
      const result = JSON.parse(command.stdout);
      const path = output + "/" + task.id + "-" + checks.length + ".json";
      await writeFile(safePath(root, path), command.stdout);
      checks.push({
        command: "inteiro " + args.join(" "),
        status: "passed",
        exitCode: 0,
        evidence: { path, sha256: hash(Buffer.from(command.stdout)) },
      });
    }
    report.cases.push({
      caseId: task.id,
      status: "passed",
      worker: prepared.id,
      directory: relative(root, target).replaceAll("\\", "/"),
      publicValidationHash: task.validation.sha256,
      readyForValidation: true,
      bootstrap: prepared.bootstrap,
      audit,
      checks,
      durationMs: performance.now() - started,
    });
    await writeFile(
      safePath(root, output + "/qualification.json"),
      JSON.stringify(report, null, 2),
    );
  }
  report.finishedSourceHash = await reviewSourceHash(root);
  if (report.finishedSourceHash !== report.sourceHash)
    throw Error("Source changed during worker qualification");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error);
} finally {
  report.finishedAt = new Date().toISOString();
  report.finishedSourceHash = await reviewSourceHash(root);
  await writeFile(
    safePath(root, output + "/qualification.json"),
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    safePath(root, "artifacts/p0-public-workers.json"),
    JSON.stringify(report, null, 2),
  );
}
console.log(
  JSON.stringify({
    status: report.status,
    kind: report.kind,
    cases: report.cases.length,
    planned: 40,
    sourceHash: report.sourceHash,
    evidence: output + "/qualification.json",
    error: report.error ?? null,
  }),
);
process.exitCode = report.status === "passed" ? 0 : 1;
