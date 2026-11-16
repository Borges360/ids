import { readFile } from "node:fs/promises";
import {
  hash,
  safeRead,
  safePath,
  readEvidence,
  validateSchema,
  reviewSourceHash,
  type EvidenceBundle,
  requiredGates,
  assertGovernanceEvidence,
  resolveConfig,
} from "@inteiro/contracts";
import type { Observation } from "./index.ts";
import type { TaskGrading, gradeBenchmarkTask } from "./grading.ts";
import {
  readBenchmarkWorkerReceipt,
  auditBenchmarkWorker,
} from "./workspace.ts";
interface Snapshot {
  path: string;
  sha256: string;
}
export async function catalogGrading(
  root: string,
  caseId: string,
  paths = ["benchmarks/tasks.public.json", "benchmarks/tasks.heldout.json"],
): Promise<Snapshot> {
  const tasks = (
    await Promise.all(
      paths.map(async (path) => JSON.parse(await safeRead(root, path)).tasks),
    )
  ).flat();
  const matches = tasks.filter((task) => task?.id === caseId);
  if (
    matches.length !== 1 ||
    typeof matches[0].grading?.path !== "string" ||
    !/^[a-f0-9]{64}$/.test(matches[0].grading?.sha256 ?? "")
  )
    throw Error("Unknown or ambiguous accepted task grading snapshot");
  return matches[0].grading;
}
export async function functionalAcceptance(
  datasetRoot: string,
  evidenceRoot: string,
  row: Observation,
  evidence: EvidenceBundle,
  snapshot: Snapshot,
) {
  if (!row.gradingPath || !row.gradingHash)
    throw Error("Accepted observations require independent functional grading");
  const report = JSON.parse(
    await safeRead(evidenceRoot, row.gradingPath),
  ) as Awaited<ReturnType<typeof gradeBenchmarkTask>>;
  if (
    !validateSchema("task-grading-result", report).valid ||
    report.status !== "passed"
  )
    throw Error("Functional grading is not a complete passing receipt");
  const { hash: expected, ...payload } = report;
  if (
    hash(payload) !== expected ||
    expected !== row.gradingHash ||
    report.caseId !== row.caseId ||
    report.sourceHash !== evidence.sourceHash ||
    report.gitSha !== evidence.gitSha ||
    report.configHash !== evidence.configHash ||
    report.grading.path !== snapshot.path ||
    report.grading.sha256 !== snapshot.sha256
  )
    throw Error(
      "Functional grading differs from accepted source/config/task snapshot",
    );
  const specBytes = Buffer.from(await safeRead(datasetRoot, snapshot.path));
  const spec: TaskGrading = JSON.parse(specBytes.toString());
  if (
    hash(specBytes) !== snapshot.sha256 ||
    !validateSchema("task-grading", spec).valid ||
    spec.caseId !== row.caseId ||
    hash(report.fixture) !== hash(spec.fixture)
  )
    throw Error(
      "Independent grading specification changed or belongs to another task",
    );
  await safeRead(datasetRoot, spec.fixture.path);
  if (
    hash(await readFile(safePath(datasetRoot, spec.fixture.path))) !==
    spec.fixture.sha256
  )
    throw Error("Independent grading fixture changed");
  if (
    report.executed !== spec.scenarios.length ||
    report.plannedScenarios !== spec.scenarios.length ||
    report.results.length !== spec.scenarios.length ||
    new Set(report.results.map((result) => result.id)).size !==
      spec.scenarios.length
  )
    throw Error("Incomplete functional grading scenario coverage");
  for (const scenario of spec.scenarios) {
    const result = report.results.find((result) => result.id === scenario.id);
    if (
      !result ||
      result.status !== "passed" ||
      result.plannedSteps !== scenario.steps.length ||
      result.completedSteps !== scenario.steps.length
    )
      throw Error("Functional grading omitted or failed required steps");
    if (scenario.zoomFactor !== undefined) {
      const zoom = result.zoom;
      if (
        !zoom ||
        zoom.factor !== scenario.zoomFactor ||
        zoom.before.cssWidth !== scenario.viewport.width ||
        Math.abs(zoom.after.cssWidth * zoom.factor - zoom.before.cssWidth) >
          2 ||
        Math.abs(zoom.after.dpr - zoom.before.dpr * zoom.factor) > 0.01
      )
        throw Error("Functional grading native zoom evidence is incomplete");
    }
  }
  const browser = evidence.gates.find((gate) => gate.name === "browser");
  if (
    !Array.isArray(browser?.captures) ||
    browser.captures.some(
      (capture) =>
        !capture ||
        typeof capture !== "object" ||
        capture.browserVersion !== report.browserVersion,
    )
  )
    throw Error(
      "Functional and visual grading used different browser versions",
    );
  return report;
}
export async function observationEvidence(
  datasetRoot: string,
  row: Observation,
  configHash: string,
  snapshot?: Snapshot,
) {
  let root = datasetRoot;
  let worker:
    Awaited<ReturnType<typeof readBenchmarkWorkerReceipt>> | undefined;
  if (row.workerId) {
    worker = await readBenchmarkWorkerReceipt(datasetRoot, row.workerId);
    if (worker.caseId !== row.caseId)
      throw Error("Worker belongs to another task");
    root = worker.root;
    if (row.accepted) {
      if (!worker.readyForValidation)
        throw Error("Accepted worker bootstrap is incomplete");
      if (
        (await auditBenchmarkWorker(datasetRoot, row.workerId)).status !==
        "passed"
      )
        throw Error("Accepted worker integrity audit failed");
    }
  }
  if (!row.evidencePath) return undefined;
  const evidence = await readEvidence(root, row.evidencePath);
  if (
    (row.accepted && evidence.status !== "passed") ||
    evidence.hash !== row.evidenceHash ||
    evidence.configHash !== configHash
  )
    throw Error("Observation does not match validated gate evidence");
  if (row.accepted) {
    completeGateAcceptance(evidence, row);
    if (
      (await resolveConfig(root)).config.governance.mode ===
      "technical-autonomous"
    )
      assertGovernanceEvidence(evidence);
    if (
      worker?.bootstrap?.configHash !== undefined &&
      worker.bootstrap.configHash !== evidence.configHash
    )
      throw Error(
        "Accepted gate configuration differs from bootstrapped worker",
      );
    const expectedGrading =
      snapshot ?? (await catalogGrading(datasetRoot, row.caseId));
    if (worker && worker.gradingHash !== expectedGrading.sha256)
      throw Error("Worker was prepared for another grading snapshot");
    await functionalAcceptance(
      datasetRoot,
      root,
      row,
      evidence,
      expectedGrading,
    );
    if (row.workerId && (await reviewSourceHash(root)) !== evidence.sourceHash)
      throw Error("Accepted worker source changed after validation");
  }
  return { root, evidence, worker };
}

export function completeGateAcceptance(
  evidence: EvidenceBundle,
  row: Observation,
) {
  const required = requiredGates("pr");
  if (evidence.governanceContractHash !== undefined)
    assertGovernanceEvidence(evidence);
  if (
    required.some(
      (name) =>
        evidence.gates.filter(
          (gate) => gate.name === name && gate.status === "passed",
        ).length !== 1,
    ) ||
    new Set(evidence.gates.map((gate) => gate.name)).size !==
      evidence.gates.length ||
    evidence.gates.some(
      (gate) =>
        gate.status !== "passed" ||
        gate.findings.some(
          (finding) => !["passed", "waived"].includes(finding.status),
        ),
    ) ||
    evidence.findings.some(
      (finding) => !["passed", "waived"].includes(finding.status),
    ) ||
    !/^[a-f0-9]{40}$/.test(evidence.gitSha ?? "") ||
    !/^[a-f0-9]{64}$/.test(evidence.sourceHash ?? "")
  )
    throw new Error(
      "Accepted observations require complete passing gate evidence",
    );
  const context = evidence.gates.find((gate) => gate.name === "context")!;
  const task = evidence.gates.find((gate) => gate.name === "task-context")!;
  const lint = evidence.gates.find((gate) => gate.name === "static")!;
  const browser = evidence.gates.find((gate) => gate.name === "browser")!;
  if (
    context.discoverable !== true ||
    !Array.isArray(context.provenance) ||
    !context.provenance.length ||
    task.taskId !== row.caseId ||
    typeof task.taskHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(task.taskHash) ||
    lint.adoption !== "enforce-all" ||
    lint.coverage !== 1 ||
    !Number.isSafeInteger(lint.files) ||
    (lint.files as number) < 1 ||
    !Number.isSafeInteger(browser.executed) ||
    (browser.executed as number) < 1 ||
    !Array.isArray(browser.captures) ||
    browser.captures.length !== browser.executed ||
    typeof browser.environmentFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(browser.environmentFingerprint)
  )
    throw new Error(
      "Incomplete task, source coverage or browser execution evidence",
    );
  for (const capture of browser.captures) {
    if (
      !capture ||
      typeof capture !== "object" ||
      typeof capture.actual !== "string" ||
      typeof capture.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(capture.sha256) ||
      capture.environmentFingerprint !== browser.environmentFingerprint ||
      ["route", "state", "viewport", "theme", "density"].some(
        (field) => typeof capture[field] !== "string" || !capture[field].trim(),
      ) ||
      !evidence.artifacts.some(
        (artifact) =>
          artifact.path === capture.actual &&
          artifact.sha256 === capture.sha256,
      )
    )
      throw new Error(
        "Browser capture is not bound to complete acceptance evidence",
      );
  }
}
