import {
  finding,
  hash,
  safeRead,
  type Config,
  type EvidenceBundle,
  type GateResult,
} from "@inteiro/contracts";
import { canonical,reviewSourceHash,readEvidence } from "@inteiro/contracts";
import { verify, createPublicKey } from "node:crypto";
import { execFileSync } from "node:child_process";
export const REVIEW_AXES = [
  "hierarchy",
  "composition",
  "density",
  "identity",
  "content",
  "responsiveness",
  "robustness",
] as const;
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
export function validateReview(review: ReviewDecision, report: EvidenceBundle) {
  const errors = [];
  if (
    review.runId !== report.runId ||
    review.evidenceHash !== report.hash ||
    !review.reviewer ||
    !review.approvalRef ||
    !review.reason
  )
    errors.push("Review must bind evidence, run and accountable reviewer");
  for (const axis of REVIEW_AXES) {
    const a = review.axes.find((a) => a.axis === axis);
    if (
      !a ||
      !Number.isInteger(a.score) ||
      a.score < 0 ||
      a.score > 4 ||
      !a.reason ||
      !a.evidenceId ||
      !report.artifacts.some(
        (artifact) =>
          artifact.path === a.evidenceId || artifact.sha256 === a.evidenceId,
      ) ||
      !a.element ||
      !a.action
    )
      errors.push("Incomplete rubric: " + axis);
  }
  return errors;
}
export function reviewRequest(report: EvidenceBundle, config: Config) {
  return {
    schemaVersion: "1.0",
    runId: report.runId,
    sourceHash:report.sourceHash,
    sourceCommit:report.gitSha,
    evidenceHash: report.hash,
    status: "needs_review",
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
export async function reviewGate(
  root: string,
  config: Config,
  gates: GateResult[] = [],
): Promise<GateResult> {
  let task: { type: string };
  try {
    task = JSON.parse(await safeRead(root, ".inteiro/task.json"));
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
  if (!config.review.requiredFor.includes(task.type))
    return {
      name: "review",
      status: "passed",
      findings: [],
      durationMs: 0,
      reason: "Task classification does not require qualitative review",
      taskHash: hash(task),
    };
  try {
    const decision = JSON.parse(
      await safeRead(root, ".inteiro/reviews/decision.json"),
    ) as ReviewDecision & {
      signature: string;
      configHash: string;
      sourceCommit: string;
      sourceHash:string;
      taskHash: string;
      artifactHashes: string[];
      expiresAt: string;
    };
    const policy = JSON.parse(
      await safeRead(root, ".inteiro/reviewers.json"),
    ) as { reviewers: Record<string, string> };
    const { signature, ...payload } = decision;
    const hashes = gates
      .flatMap((g) =>
        Array.isArray(g.captures)
          ? (g.captures as { sha256: string }[]).map((c) => c.sha256)
          : [],
      )
      .sort();
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
      decision.taskHash !== hash(task) ||
      decision.sourceHash !== await reviewSourceHash(root) ||
      !/^[a-f0-9]{40}$/.test(decision.sourceCommit) ||
      hash([...decision.artifactHashes].sort()) !== hash(hashes) ||
      !Number.isFinite(Date.parse(decision.expiresAt)) ||
      Date.parse(decision.expiresAt) <= Date.now()
    )
      throw new Error(
        "Review does not match current artifacts, task, commit or policy",
      );
    const report = await readEvidence(root,config.reporting.outDir+'/'+decision.runId+'/summary.json');
    if(decision.sourceCommit!==report.gitSha||decision.sourceHash!==report.sourceHash)throw new Error('Review source provenance mismatch');
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
