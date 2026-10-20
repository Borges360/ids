import {
  finding,
  hash,
  safeRead,
  type Config,
  type EvidenceBundle,
  type GateResult,
  validateSchema,
  REVIEW_AXES,
} from "@inteiro/contracts";
import { canonical, reviewSourceHash, readEvidence } from "@inteiro/contracts";
import { verify, createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { safePath } from "@inteiro/contracts";
import { taskManifestErrors, type TaskManifest } from "./task-context.ts";
import { contextTaskHash } from "./context.ts";
export { REVIEW_AXES } from "@inteiro/contracts";
export interface ReviewDecision {
  runId: string;
  evidenceHash: string;
  reviewer: string;
  approvalRef: string;
  reason: string;
  axes: {
    axis: (typeof REVIEW_AXES)[number];
    score: number;
    evidenceId: string;
    element: string;
    reason: string;
    action: string;
  }[];
}
export interface SignedReviewDecision extends ReviewDecision {
  signature: string;
  configHash: string;
  sourceCommit: string;
  sourceHash: string;
  taskHash: string;
  artifactHashes: string[];
  expiresAt: string;
}
export interface ReviewCaptureReference {
  gate: string;
  kind: "final" | "action";
  actual: string;
  sha256: string;
  route?: string;
  state?: string;
  viewport?: string;
  theme?: string;
  density?: string;
  actionIndex?: number;
  [key: string]: unknown;
}
function captures(gates: GateResult[]): ReviewCaptureReference[] {
  return gates.flatMap((gate) =>
    (["captures", "actionCaptures"] as const).flatMap((field) => {
      if (gate[field] === undefined) return [];
      if (!Array.isArray(gate[field]))
        throw new Error("Invalid visual capture list");
      return (gate[field] as unknown[]).map((value) => {
        if (!value || typeof value !== "object")
          throw new Error("Invalid visual capture");
        const capture = value as Record<string, unknown>;
        if (
          typeof capture.actual !== "string" ||
          !capture.actual.trim() ||
          typeof capture.sha256 !== "string" ||
          !/^[a-f0-9]{64}$/.test(capture.sha256)
        )
          throw new Error("Invalid visual capture reference");
        for (const key of [
          "route",
          "state",
          "viewport",
          "theme",
          "density",
          "key",
          "fixtureHash",
          "environmentFingerprint",
        ])
          if (capture[key] !== undefined && typeof capture[key] !== "string")
            throw new Error("Invalid capture identity");
        if (
          capture.actionIndex !== undefined &&
          (typeof capture.actionIndex !== "number" ||
            !Number.isInteger(capture.actionIndex) ||
            capture.actionIndex < 0)
        )
          throw new Error("Invalid capture action index");
        return {
          ...capture,
          actual: capture.actual,
          sha256: capture.sha256,
          gate: gate.name,
          kind: field === "captures" ? ("final" as const) : ("action" as const),
        };
      });
    }),
  );
}
function captureIdentity(gates: GateResult[]) {
  return captures(gates)
    .map(({ actual: _, ...identity }) => hash(identity))
    .sort();
}
export function validateReview(review: ReviewDecision, report: EvidenceBundle) {
  if (!validateSchema("review", review).valid)
    return ["Invalid qualitative review schema"];
  const errors = [];
  if (
    review.runId !== report.runId ||
    review.evidenceHash !== report.hash ||
    !review.reviewer.trim() ||
    !review.approvalRef.trim() ||
    !review.reason.trim()
  )
    errors.push("Review must bind evidence, run and accountable reviewer");
  for (const axis of REVIEW_AXES) {
    const a = review.axes.find((a) => a.axis === axis);
    if (
      !a ||
      !Number.isInteger(a.score) ||
      a.score < 0 ||
      a.score > 4 ||
      !a.reason.trim() ||
      !a.evidenceId.trim() ||
      !report.artifacts.some(
        (artifact) =>
          artifact.path === a.evidenceId || artifact.sha256 === a.evidenceId,
      ) ||
      !a.element.trim() ||
      !a.action.trim()
    )
      errors.push("Incomplete rubric: " + axis);
  }
  return errors;
}
export function reviewRequest(
  report: EvidenceBundle,
  config: Config,
  taskHash?: string,
) {
  const errors: string[] = [];
  let images: ReturnType<typeof captures> = [];
  try {
    images = captures(report.gates);
  } catch {
    errors.push("Invalid visual capture metadata");
  }
  if (!images.length) errors.push("Visual captures required");
  if (
    images.some(
      (image) =>
        !report.artifacts.some(
          (artifact) =>
            artifact.path === image.actual && artifact.sha256 === image.sha256,
        ),
    )
  )
    errors.push("Capture not bound to an evidence artifact");
  const declaredTask = report.gates.find(
    (gate) => gate.name === "task-context",
  )?.taskHash;
  const resolvedTask = taskHash ?? declaredTask;
  if (typeof resolvedTask !== "string" || !/^[a-f0-9]{64}$/.test(resolvedTask))
    errors.push("Task hash required");
  if (taskHash && declaredTask && taskHash !== declaredTask)
    errors.push("Task does not match evidence");
  if (
    !report.sourceHash ||
    !/^[a-f0-9]{64}$/.test(report.sourceHash) ||
    !report.gitSha ||
    !/^[a-f0-9]{40}$/.test(report.gitSha)
  )
    errors.push("Source provenance required");
  if (report.configHash !== hash(config))
    errors.push("Configuration does not match evidence");
  return {
    schemaVersion: "1.0",
    kind: "review-request" as const,
    runId: report.runId,
    sourceHash:
      report.sourceHash && /^[a-f0-9]{64}$/.test(report.sourceHash)
        ? report.sourceHash
        : null,
    sourceCommit:
      report.gitSha && /^[a-f0-9]{40}$/.test(report.gitSha)
        ? report.gitSha
        : null,
    evidenceHash: report.hash,
    configHash: report.configHash,
    taskHash:
      typeof resolvedTask === "string" && /^[a-f0-9]{64}$/.test(resolvedTask)
        ? resolvedTask
        : null,
    artifactHashes: images.map((image) => image.sha256).sort(),
    captures: images,
    validationErrors: errors,
    status: errors.length ? ("blocked" as const) : ("needs_review" as const),
    method: config.review.method,
    externalProviderAllowed: config.review.allowExternalProvider,
    axes: REVIEW_AXES,
    artifacts: report.artifacts,
    findings: report.findings.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      evidenceRefs: f.evidenceRefs,
    })),
    reason:
      "Accountable qualitative decision required; deterministic failures cannot be offset by rubric scores.",
  };
}
export async function resolvedReviewRequest(
  root: string,
  config: Config,
  report: EvidenceBundle,
) {
  try {
    const task = JSON.parse(
      await safeRead(root, ".inteiro/task.json"),
    ) as TaskManifest;
    if (
      taskManifestErrors(task, root).length ||
      report.sourceHash !== (await reviewSourceHash(root))
    )
      throw new Error();
    return reviewRequest(report, config, contextTaskHash(task));
  } catch {
    const request = reviewRequest(report, config);
    return {
      ...request,
      status: "blocked" as const,
      validationErrors: [
        ...request.validationErrors,
        "Current task or source does not match evidence",
      ],
    };
  }
}
export async function reviewGate(
  root: string,
  config: Config,
  gates: GateResult[] = [],
): Promise<GateResult> {
  let task: TaskManifest;
  try {
    task = JSON.parse(await safeRead(root, ".inteiro/task.json"));
    if (taskManifestErrors(task, root).length)
      throw new Error("Invalid task manifest");
  } catch {
    return {
      name: "review",
      status: "blocked",
      findings: [
        finding("VIS-REVIEW-001", "Task classification manifest required", {
          status: "blocked",
        }),
      ],
      durationMs: 0,
    };
  }
  if (
    !config.review.requiredFor.includes(task.type) &&
    task.reviewRequired !== true
  )
    return {
      name: "review",
      status: "passed",
      findings: [],
      durationMs: 0,
      reason: "Task classification does not require qualitative review",
      taskHash: contextTaskHash(task),
    };
  try {
    const decision = JSON.parse(
      await safeRead(root, ".inteiro/reviews/decision.json"),
    ) as SignedReviewDecision;
    if (!validateSchema("review", decision).valid)
      throw new Error("Invalid review schema");
    const policy = JSON.parse(
      await safeRead(root, ".inteiro/reviewers.json"),
    ) as { reviewers: Record<string, string> };
    const { signature, ...payload } = decision;
    const currentCaptures = captures(gates);
    const hashes = currentCaptures.map((capture) => capture.sha256).sort();
    if (!hashes.length) throw new Error("Visual captures required");
    if (
      !policy.reviewers[decision.reviewer] ||
      !signature ||
      !verify(
        null,
        Buffer.from(canonical(payload)),
        createPublicKey(policy.reviewers[decision.reviewer]!),
        Buffer.from(signature, "base64"),
      )
    )
      throw new Error("Invalid reviewer identity/signature");
    if (
      decision.configHash !== hash(config) ||
      decision.taskHash !== contextTaskHash(task) ||
      decision.sourceHash !== (await reviewSourceHash(root)) ||
      !/^[a-f0-9]{40}$/.test(decision.sourceCommit) ||
      hash([...decision.artifactHashes].sort()) !== hash(hashes) ||
      !Number.isFinite(Date.parse(decision.expiresAt)) ||
      Date.parse(decision.expiresAt) <= Date.now()
    )
      throw new Error(
        "Review does not match current artifacts, task, commit or policy",
      );
    const report = await readEvidence(
      root,
      config.reporting.outDir + "/" + decision.runId + "/summary.json",
    );
    if (
      decision.sourceCommit !== report.gitSha ||
      decision.sourceHash !== report.sourceHash ||
      decision.configHash !== report.configHash ||
      report.gates.some(
        (gate) =>
          gate.name === "task-context" &&
          gate.taskHash !== undefined &&
          gate.taskHash !== decision.taskHash,
      )
    )
      throw new Error("Review source provenance mismatch");
    if (hash(captureIdentity(report.gates)) !== hash(captureIdentity(gates)))
      throw new Error("Visual capture identity changed");
    for (const capture of captures(report.gates))
      if (
        !report.artifacts.some(
          (artifact) =>
            artifact.path === capture.actual &&
            artifact.sha256 === capture.sha256,
        )
      )
        throw new Error("Reviewed capture is not bound to an artifact");
    for (const capture of currentCaptures)
      if (
        hash(await readFile(safePath(root, capture.actual))) !== capture.sha256
      )
        throw new Error("Current capture bytes changed");
    const errors = validateReview(decision, report);
    if (errors.length) throw new Error(errors.join("; "));
    const unacceptable = decision.axes.some((a) => a.score < 2);
    if (!unacceptable)
      return {
        name: "review",
        status: "passed",
        findings: [],
        durationMs: 0,
        reviewer: decision.reviewer,
        approvalRef: decision.approvalRef,
        evidenceHash: decision.evidenceHash,
      };
  } catch {
    /* Invalid, stale or unavailable decisions remain review pending. */
  }
  return {
    name: "review",
    status: "needs_review",
    findings: [
      finding(
        "VIS-REVIEW-001",
        "Qualitative review required for " + task.type,
        { status: "needs_review" },
      ),
    ],
    durationMs: 0,
  };
}
