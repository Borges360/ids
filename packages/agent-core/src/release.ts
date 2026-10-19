import { verify, createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  canonical,
  finding,
  hash,
  safePath,
  safeRead,
  reviewSourceHash,
  type Config,
  type GateResult,
} from "@inteiro/contracts";

export const RELEASE_REQUIREMENTS = [
  ...Array.from({ length: 11 }, (_, i) => "E" + String(i).padStart(2, "0")),
  ...Array.from(
    { length: 23 },
    (_, i) => "WP-" + String(i + 1).padStart(2, "0"),
  ),
  ...Array.from(
    { length: 12 },
    (_, i) => "DoD-" + String(i + 1).padStart(2, "0"),
  ),
  ...Array.from(
    { length: 12 },
    (_, i) => "SCN-" + String(i + 1).padStart(2, "0"),
  ),
];
export interface ReleaseEvidence {
  schemaVersion: "1.0";
  version: string;
  sourceCommit: string;
  sourceHash: string;
  configHash: string;
  policyHash: string;
  scopeExclusions: string[];
  requirements: {
    id: string;
    status: "passed" | "failed" | "blocked" | "needs_review" | "not_run";
    reason: string;
    evidence: { path: string; sha256: string }[];
  }[];
  approval: null | {
    reviewer: string;
    approvalRef: string;
    approvedAt: string;
    expiresAt: string;
    signature: string;
  };
}
/** A release requires the complete requirement matrix and a maintainer signature. */
export async function releaseGate(
  root: string,
  config: Config,
): Promise<GateResult> {
  const started = performance.now();
  const stop = (
    status: "blocked" | "needs_review",
    message: string,
  ): GateResult => ({
    name: "release",
    status,
    findings: [finding("REL-EVIDENCE-001", message, { status })],
    durationMs: performance.now() - started,
  });
  let ledger: ReleaseEvidence;
  try {
    ledger = JSON.parse(
      await safeRead(root, "release-evidence.json"),
    ) as ReleaseEvidence;
  } catch {
    return stop("blocked", "Release evidence matrix unavailable");
  }
  if (
    ledger.schemaVersion !== "1.0" ||
    !Array.isArray(ledger.requirements) ||
    !Array.isArray(ledger.scopeExclusions)
  )
    return stop("blocked", "Invalid release evidence schema");
  const ids = ledger.requirements.map((row) => row?.id);
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== RELEASE_REQUIREMENTS.length ||
    RELEASE_REQUIREMENTS.some((id) => !ids.includes(id))
  )
    return stop(
      "blocked",
      "Release matrix must contain every epic, work package, DoD and scenario exactly once",
    );
  const pending = ledger.requirements.filter(
    (row) =>
      row.status !== "passed" ||
      !row.reason ||
      !Array.isArray(row.evidence) ||
      !row.evidence.length,
  );
  if (pending.length)
    return stop(
      "blocked",
      "Release requirements pending: " +
        pending.map((row) => row.id).join(", "),
    );
  try {
    if (
      ledger.configHash !== hash(config) ||
      ledger.sourceHash !== (await reviewSourceHash(root)) ||
      !/^[a-f0-9]{40}$/.test(ledger.sourceCommit)
    )
      return stop(
        "blocked",
        "Release evidence does not match current source/configuration",
      );
    for (const row of ledger.requirements)
      for (const evidence of row.evidence) {
        if (
          !/^[a-f0-9]{64}$/.test(evidence.sha256) ||
          hash(await readFile(safePath(root, evidence.path))) !==
            evidence.sha256
        )
          return stop(
            "blocked",
            "Release evidence artifact mismatch for " + row.id,
          );
      }
    const policy = JSON.parse(
      await safeRead(root, ".inteiro/reviewers.json"),
    ) as { reviewers: Record<string, string> };
    if (ledger.policyHash !== hash(policy))
      return stop("blocked", "Release reviewer policy changed");
    const { approval, ...payload } = ledger;
    if (!approval)
      return stop(
        "needs_review",
        "Maintainer signature required for release matrix",
      );
    const { signature, ...decision } = approval;
    if (
      !decision.approvalRef ||
      !Number.isFinite(Date.parse(decision.approvedAt)) ||
      Date.parse(decision.approvedAt) > Date.now() ||
      Date.parse(decision.expiresAt) <= Date.now() ||
      !Number.isFinite(Date.parse(decision.expiresAt))
    )
      return stop("needs_review", "Invalid or expired release approval");
    const publicKey = policy.reviewers[decision.reviewer];
    if (
      !publicKey ||
      !verify(
        null,
        Buffer.from(canonical({ ledger: payload, approval: decision })),
        createPublicKey(publicKey),
        Buffer.from(signature, "base64"),
      )
    )
      return stop("needs_review", "Invalid maintainer identity/signature");
    return {
      name: "release",
      status: "passed",
      findings: [],
      durationMs: performance.now() - started,
      reviewer: decision.reviewer,
      approvalRef: decision.approvalRef,
      requirements: ids.length,
    };
  } catch {
    return stop(
      "blocked",
      "Release evidence or reviewer policy could not be verified",
    );
  }
}
