import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { relative, sep } from "node:path";
import { hash, safePath, safeRead, validateSchema } from "@inteiro/contracts";
import type { RecordedExperimentInput } from "./experiments.ts";
import { observationEvidence } from "./observation-evidence.ts";

interface Snapshot {
  path: string;
  sha256: string;
}
export interface BenchmarkProtocol {
  schemaVersion: "1.0";
  kind: "frozen-benchmark-protocol";
  idsCommit: string;
  configHash: string;
  dataset: { commit: string; public: Snapshot; heldout: Snapshot };
  environment: Snapshot;
  models: { id: string; version: string }[];
  promptHash: string;
  seeds: number[];
  ablations: string[];
  permissions: {
    readRoots: string[];
    writeRoots: string[];
    tools: string[];
    network: "deny";
  };
  budget: {
    maxAttempts: number;
    maxDurationMs: number;
    maxTokens: number;
    maxCost: number;
    currency: string;
  };
}
interface DatasetTask {
  id: string;
  difficulty?: string;
  requirement: string;
  initialImplementation: string;
  initialFiles?: string[];
  instructions?: string;
  contract: string;
  fixtures: string[];
  grading: Snapshot;
  maxRepairAttempts: number;
}
const nonblank = (value: unknown): value is string =>
  typeof value === "string" && /\S/.test(value);
const within = (parent: string, child: string) => {
  const path = relative(parent, child);
  return (
    path === "" ||
    (path !== ".." && !path.startsWith(".." + sep) && !path.startsWith(sep))
  );
};
async function snapshot(root: string, ref: Snapshot) {
  // Resolve within the project before hashing the original bytes.
  await safeRead(root, ref.path);
  const bytes = await readFile(safePath(root, ref.path));
  if (hash(bytes) !== ref.sha256)
    throw Error("Protocol snapshot hash mismatch: " + ref.path);
  return bytes;
}
function git(root: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
/** Validates recorded declarations; does not attest that an external worker obeyed them. */
export async function validateExperimentProtocol(
  root: string,
  path: string,
  input: RecordedExperimentInput,
) {
  if (!validateSchema("experiment-input", input).valid)
    throw Error("Invalid experiment input for frozen protocol");
  const protocol: BenchmarkProtocol = JSON.parse(await safeRead(root, path));
  if (!validateSchema("benchmark-protocol", protocol).valid)
    throw Error("Invalid frozen benchmark protocol schema");
  if (
    protocol.idsCommit !== input.idsCommit ||
    protocol.configHash !== input.configHash
  )
    throw Error("Protocol IDS/config mismatch");
  git(root, ["cat-file", "-e", protocol.idsCommit + "^{commit}"]);
  const names = protocol.models.map((model) => model.id);
  if (new Set(names).size !== names.length)
    throw Error("Duplicate protocol model identity");
  const permissions = [
    ...protocol.permissions.readRoots,
    ...protocol.permissions.writeRoots,
  ];
  const allowed = await Promise.all(
    permissions.map(async (item) => realpath(safePath(root, item))),
  );
  const gitDirectory = await realpath(
    git(root, ["rev-parse", "--absolute-git-dir"]).toString("utf8").trim(),
  );
  if (
    allowed.some(
      (parent) => within(parent, gitDirectory) || within(gitDirectory, parent),
    ) ||
    permissions.some((path) =>
      relative(root, safePath(root, path)).split(sep).includes(".git"),
    )
  )
    throw Error(
      "Worker permissions expose Git history containing evaluator material",
    );
  const hidden = [protocol.dataset.heldout.path, path];
  const allTasks: DatasetTask[] = [];
  const prefix = git(root, ["rev-parse", "--show-prefix"])
    .toString("utf8")
    .trim();
  const checked = new Set<string>();
  const frozen = async (path: string, bytes?: Buffer) => {
    const file = relative(root, safePath(root, path)).split(sep).join("/");
    if (checked.has(file)) return;
    const committed = git(root, [
      "show",
      `${protocol.dataset.commit}:${prefix}${file}`,
    ]);
    if (!(bytes ?? (await readFile(safePath(root, path)))).equals(committed))
      throw Error("Dataset resource differs from frozen Git commit: " + path);
    checked.add(file);
  };
  for (const [visibility, ref] of [
    ["public", protocol.dataset.public],
    ["heldout", protocol.dataset.heldout],
  ] as const) {
    const bytes = await snapshot(root, ref);
    await frozen(ref.path, bytes);
    const dataset = JSON.parse(bytes.toString("utf8"));
    if (
      !Array.isArray(dataset.tasks) ||
      dataset.tasks.length !== (visibility === "public" ? 30 : 10)
    )
      throw Error("Protocol requires 30 public and 10 heldout tasks");
    if (
      visibility === "public" &&
      ["simple", "medium", "complex"].some(
        (level) =>
          dataset.tasks.filter((task: DatasetTask) => task.difficulty === level)
            .length !== 10,
      )
    )
      throw Error("Public difficulty distribution must be 10/10/10");
    for (const task of dataset.tasks as DatasetTask[]) {
      if (
        !nonblank(task.id) ||
        !nonblank(task.requirement) ||
        !nonblank(task.initialImplementation) ||
        !nonblank(task.contract) ||
        !Array.isArray(task.fixtures) ||
        !task.fixtures.length ||
        task.fixtures.some((item) => !nonblank(item)) ||
        !task.grading ||
        !nonblank(task.grading.path) ||
        !/^[a-f0-9]{64}$/.test(task.grading.sha256) ||
        !Number.isSafeInteger(task.maxRepairAttempts) ||
        task.maxRepairAttempts < 0 ||
        task.maxRepairAttempts > 2 ||
        task.maxRepairAttempts + 1 < protocol.budget.maxAttempts
      )
        throw Error(
          "Task lacks executable grading, fixtures or compatible repair budget",
        );
      for (const file of [
        task.initialImplementation,
        ...(task.initialFiles ?? []),
        ...(task.instructions ? [task.instructions] : []),
        task.contract,
        ...task.fixtures,
      ]) {
        await safeRead(root, file);
        await frozen(file);
      }
      await snapshot(root, task.grading);
      await frozen(task.grading.path);
      hidden.push(task.grading.path);
      allTasks.push(task);
    }
  }
  if (new Set(allTasks.map((task) => task.id)).size !== allTasks.length)
    throw Error("Duplicate dataset task identity");
  for (const path of hidden) {
    const target = await realpath(safePath(root, path));
    if (allowed.some((parent) => within(parent, target)))
      throw Error("Worker permissions expose evaluator-only material");
  }
  if (
    input.datasetHash !==
    hash({
      public: protocol.dataset.public.sha256,
      heldout: protocol.dataset.heldout.sha256,
    })
  )
    throw Error("Protocol dataset digest mismatch");
  const environment = JSON.parse(
    (await snapshot(root, protocol.environment)).toString("utf8"),
  );
  if (
    input.environmentHash !== protocol.environment.sha256 ||
    !nonblank(environment.idsVersion) ||
    !nonblank(environment.harness?.name) ||
    !nonblank(environment.harness?.version) ||
    !nonblank(environment.browser?.name) ||
    !nonblank(environment.browser?.version) ||
    !/^[a-f0-9]{64}$/.test(environment.browser?.fingerprint ?? "")
  )
    throw Error(
      "Protocol environment versions/fingerprint missing or mismatched",
    );
  const expected = new Set<string>();
  const workers = new Set<string>();
  for (const model of names)
    for (const ablation of protocol.ablations)
      for (const task of allTasks)
        for (const seed of protocol.seeds)
          expected.add(JSON.stringify([model, ablation, task.id, seed]));
  for (const row of input.observations) {
    if (row.accepted && !row.workerId)
      throw Error("Frozen accepted samples require an isolated worker receipt");
    if (row.workerId) {
      if (workers.has(row.workerId))
        throw Error("Worker reused by multiple protocol samples");
      workers.add(row.workerId);
    }
    const verified = await observationEvidence(
      root,
      row,
      input.configHash,
      allTasks.find((task) => task.id === row.caseId)?.grading,
    );
    if (verified) {
      const evidence = verified!.evidence;
      if (
        verified.worker &&
        verified.worker.datasetHash !==
          hash([protocol.dataset.public, protocol.dataset.heldout])
      )
        throw Error("Worker was prepared from another frozen dataset snapshot");
      const browser = evidence.gates.find((gate) => gate.name === "browser");
      if (
        evidence.hash !== row.evidenceHash ||
        evidence.configHash !== input.configHash ||
        evidence.inteiroVersion !== environment.idsVersion ||
        (browser &&
          (browser.environmentFingerprint !== environment.browser.fingerprint ||
            !Array.isArray(browser.captures) ||
            browser.captures.some(
              (capture) =>
                !capture ||
                typeof capture !== "object" ||
                capture.browserVersion !== environment.browser.version,
            )))
      )
        throw Error(
          "Protocol observation evidence differs from frozen environment/configuration",
        );
    }
    if (
      !expected.delete(
        JSON.stringify([row.model, row.ablation, row.caseId, row.seed]),
      )
    )
      throw Error("Unexpected or duplicate protocol sample");
    if (
      row.attempts > protocol.budget.maxAttempts ||
      row.durationMs > protocol.budget.maxDurationMs ||
      row.tokensIn === null ||
      row.tokensOut === null ||
      row.tokensIn + row.tokensOut > protocol.budget.maxTokens ||
      row.cost === null ||
      row.cost > protocol.budget.maxCost ||
      row.humanMinutes === null ||
      !row.outcome ||
      ["incomplete", "environment_error"].includes(row.outcome)
    )
      throw Error(
        "Protocol sample exceeds budget or has unknown/incomplete accounting",
      );
  }
  if (expected.size)
    throw Error(
      `Incomplete protocol sampling: ${expected.size} observations missing`,
    );
  return {
    status: "passed" as const,
    protocolHash: hash(protocol),
    scope: "frozen-declarations-and-recorded-sampling" as const,
    expectedObservations: input.observations.length,
    publicationReady: false as const,
    limitations: [
      "External worker execution, permission enforcement, prompt delivery and independent grading still require producer attestations. Human calibration and real model experiments are not certified by this validator.",
    ],
  };
}
