import { beforeAll, afterAll, it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { hash, bundle, DEFAULTS } from "@inteiro/contracts";
import {
  ABLATIONS,
  importExperiment,
  validateExperimentProtocol,
  type BenchmarkProtocol,
  type RecordedExperimentInput,
} from "@inteiro/evaluation/experiments";

let root: string;
let protocol: BenchmarkProtocol;
let input: RecordedExperimentInput;
const json = (path: string, value: unknown) =>
  writeFile(join(root, path), JSON.stringify(value));
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "inteiro-protocol-"));
  for (const dir of ["worker", "evaluator"]) await mkdir(join(root, dir));
  for (const file of [
    "worker/initial.html",
    "worker/contract.json",
    "worker/fixture.html",
    "evaluator/criteria.js",
  ])
    await writeFile(join(root, file), "synthetic-no-agent " + file);
  const grading = {
    path: "evaluator/criteria.js",
    sha256: hash(await readFile(join(root, "evaluator/criteria.js"))),
  };
  const tasks = Array.from({ length: 40 }, (_, index) => ({
    id: "synthetic-" + index,
    difficulty:
      ["simple", "medium", "complex"][Math.floor(index / 10)] ?? "heldout",
    requirement: "Synthetic protocol test only",
    initialImplementation: "worker/initial.html",
    contract: "worker/contract.json",
    fixtures: ["worker/fixture.html"],
    grading,
    maxRepairAttempts: 2,
  }));
  await json("worker/public.json", {
    schemaVersion: "1.0",
    tasks: tasks.slice(0, 30),
  });
  await json("evaluator/heldout.json", {
    schemaVersion: "1.0",
    tasks: tasks.slice(30),
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init");
  git("add", "worker", "evaluator");
  git(
    "-c",
    "user.name=Synthetic",
    "-c",
    "user.email=synthetic@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Synthetic protocol fixture; no agent execution",
  );
  const commit = git("rev-parse", "HEAD");
  await json("evaluator/environment.json", {
    idsVersion: "1.2.0",
    harness: { name: "synthetic", version: "1.0" },
    browser: { name: "synthetic", version: "1.0", fingerprint: "e".repeat(64) },
  });
  const snapshot = async (path: string) => ({
    path,
    sha256: hash(await readFile(join(root, path))),
  });
  protocol = {
    schemaVersion: "1.0",
    kind: "frozen-benchmark-protocol",
    idsCommit: commit,
    configHash: "c".repeat(64),
    dataset: {
      commit,
      public: await snapshot("worker/public.json"),
      heldout: await snapshot("evaluator/heldout.json"),
    },
    environment: await snapshot("evaluator/environment.json"),
    models: [
      { id: "synthetic-a", version: "pinned-a" },
      { id: "synthetic-b", version: "pinned-b" },
    ],
    promptHash: "f".repeat(64),
    seeds: [1, 2, 3],
    ablations: [...ABLATIONS],
    permissions: {
      readRoots: ["worker"],
      writeRoots: ["worker"],
      tools: ["synthetic-validator"],
      network: "deny",
    },
    budget: {
      maxAttempts: 3,
      maxDurationMs: 100,
      maxTokens: 100,
      maxCost: 1,
      currency: "USD",
    },
  };
  input = {
    schemaVersion: "1.0",
    idsCommit: commit,
    configHash: protocol.configHash,
    datasetHash: hash({
      public: protocol.dataset.public.sha256,
      heldout: protocol.dataset.heldout.sha256,
    }),
    environmentHash: protocol.environment.sha256,
    observations: [],
  };
  for (const model of protocol.models)
    for (const ablation of ABLATIONS)
      for (const task of tasks)
        for (const seed of protocol.seeds)
          input.observations.push({
            caseId: task.id,
            model: model.id,
            ablation,
            seed,
            accepted: false,
            initialAccepted: false,
            attempts: 1,
            durationMs: 10,
            cost: 0.01,
            tokensIn: 10,
            tokensOut: 5,
            humanMinutes: 0,
            outcome: "model_failure",
          });
  await json("evaluator/protocol.json", protocol);
}, 30000);
afterAll(async () => {
  if (!root) return;
  const target = await realpath(root);
  if (
    dirname(target) !== (await realpath(tmpdir())) ||
    !basename(target).startsWith("inteiro-protocol-")
  )
    throw Error("Unsafe fixture cleanup");
  await rm(target, { recursive: true, force: true });
});
it("validates a complete synthetic 960-row frozen plan without claiming external execution", async () => {
  const result = await validateExperimentProtocol(
    root,
    "evaluator/protocol.json",
    input,
  );
  expect(result).toMatchObject({
    status: "passed",
    expectedObservations: 960,
    publicationReady: false,
    protocolHash: hash(protocol),
  });
  expect(result.limitations.join(" ")).toContain("attestations");
});
for (const [name, patch] of [
  [
    "missing sample",
    (value: RecordedExperimentInput) => value.observations.pop(),
  ],
  [
    "duplicate sample",
    (value: RecordedExperimentInput) =>
      value.observations.push(value.observations[0]!),
  ],
  [
    "unknown model",
    (value: RecordedExperimentInput) =>
      (value.observations[0]!.model = "other"),
  ],
  [
    "wrong dataset",
    (value: RecordedExperimentInput) => (value.datasetHash = "a".repeat(64)),
  ],
  [
    "wrong config",
    (value: RecordedExperimentInput) => (value.configHash = "a".repeat(64)),
  ],
  [
    "wrong environment",
    (value: RecordedExperimentInput) =>
      (value.environmentHash = "a".repeat(64)),
  ],
  [
    "over time",
    (value: RecordedExperimentInput) =>
      (value.observations[0]!.durationMs = 101),
  ],
  [
    "over tokens",
    (value: RecordedExperimentInput) => (value.observations[0]!.tokensIn = 100),
  ],
  [
    "over cost",
    (value: RecordedExperimentInput) => (value.observations[0]!.cost = 1.01),
  ],
  [
    "unknown cost",
    (value: RecordedExperimentInput) => (value.observations[0]!.cost = null),
  ],
  [
    "unknown tokens",
    (value: RecordedExperimentInput) =>
      (value.observations[0]!.tokensOut = null),
  ],
  [
    "unknown human time",
    (value: RecordedExperimentInput) =>
      (value.observations[0]!.humanMinutes = null),
  ],
  [
    "infrastructure error",
    (value: RecordedExperimentInput) =>
      (value.observations[0]!.outcome = "environment_error"),
  ],
  [
    "unclassified failure",
    (value: RecordedExperimentInput) => delete value.observations[0]!.outcome,
  ],
  [
    "invalid input shape",
    (value: RecordedExperimentInput) => (value.observations[0]!.tokensIn = -1),
  ],
] as const)
  it("rejects " + name, async () => {
    const altered = structuredClone(input);
    patch(altered);
    await expect(
      validateExperimentProtocol(root, "evaluator/protocol.json", altered),
    ).rejects.toThrow();
  });
for (const [name, patch] of [
  [
    "root read permissions",
    (value: BenchmarkProtocol) => (value.permissions.readRoots = ["."]),
  ],
  [
    "evaluator write permissions",
    (value: BenchmarkProtocol) =>
      (value.permissions.writeRoots = ["evaluator"]),
  ],
  [
    "Git object read permissions",
    (value: BenchmarkProtocol) =>
      (value.permissions.readRoots = [".git/objects"]),
  ],
  [
    "duplicate model ID with different version",
    (value: BenchmarkProtocol) => (value.models[1]!.id = value.models[0]!.id),
  ],
  ["two samples", (value: BenchmarkProtocol) => value.seeds.pop()],
  ["missing ablation", (value: BenchmarkProtocol) => value.ablations.pop()],
  ["duplicate seed", (value: BenchmarkProtocol) => (value.seeds[2] = 1)],
  [
    "unknown version",
    (value: BenchmarkProtocol) => (value.models[0]!.version = " "),
  ],
  [
    "dataset hash mismatch",
    (value: BenchmarkProtocol) =>
      (value.dataset.public.sha256 = "a".repeat(64)),
  ],
  [
    "path escape",
    (value: BenchmarkProtocol) => (value.environment.path = "../outside.json"),
  ],
] as const)
  it("rejects protocol " + name, async () => {
    const altered = structuredClone(protocol);
    patch(altered);
    await json("evaluator/altered.json", altered);
    await expect(
      validateExperimentProtocol(root, "evaluator/altered.json", input),
    ).rejects.toThrow();
  });
it("checks initial implementation bytes against the frozen commit", async () => {
  const path = join(root, "worker/initial.html"),
    bytes = await readFile(path);
  try {
    await writeFile(path, "mutated start");
    await expect(
      validateExperimentProtocol(root, "evaluator/protocol.json", input),
    ).rejects.toThrow("frozen Git commit");
  } finally {
    await writeFile(path, bytes);
  }
});
it("binds observation evidence to the declared IDS and browser environment", async () => {
  const recording = structuredClone(input);
  for (const [idsVersion, fingerprint, browserVersion] of [
    ["9.9.9", "e".repeat(64), "1.0"],
    ["1.2.0", "a".repeat(64), "1.0"],
    ["1.2.0", "e".repeat(64), "2.0"],
  ]) {
    const { hash: discarded, ...report } = bundle(DEFAULTS, [
      {
        name: "browser",
        status: "passed",
        durationMs: 0,
        findings: [],
        environmentFingerprint: fingerprint,
        captures: [{ browserVersion }],
      },
    ]);
    void discarded;
    report.configHash = recording.configHash;
    report.inteiroVersion = idsVersion!;
    const proof = { ...report, hash: hash(report) };
    await json("evaluator/evidence.json", proof);
    Object.assign(recording.observations[0]!, {
      evidencePath: "evaluator/evidence.json",
      evidenceHash: proof.hash,
    });
    await expect(
      validateExperimentProtocol(root, "evaluator/protocol.json", recording),
    ).rejects.toThrow("frozen environment");
  }
});
it("marks imports without a protocol as descriptive and binds explicit validation in dry-run", async () => {
  await json("input.json", input);
  const plain = await importExperiment(root, "input.json", "out", {
    dryRun: true,
  });
  expect(plain.protocol).toMatchObject({
    status: "not_verified",
    publicationReady: false,
  });
  const strict = await importExperiment(root, "input.json", "out", {
    dryRun: true,
    protocolPath: "evaluator/protocol.json",
  });
  expect(strict.protocol).toMatchObject({
    status: "passed",
    publicationReady: false,
    protocolHash: hash(protocol),
  });
});
it("rejects an accepted frozen sample without an isolated worker receipt", async () => {
  const recording = structuredClone(input);
  Object.assign(recording.observations[0]!, {
    accepted: true,
    outcome: "accepted",
    evidencePath: "evaluator/missing.json",
    evidenceHash: "a".repeat(64),
    gradingPath: "evaluator/missing-grade.json",
    gradingHash: "b".repeat(64),
  });
  await expect(
    validateExperimentProtocol(root, "evaluator/protocol.json", recording),
  ).rejects.toThrow("isolated worker");
});
