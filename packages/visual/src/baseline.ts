import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { verify, createPublicKey } from "node:crypto";
import { dirname } from "node:path";
import { hash, canonical, safePath, safeRead } from "@inteiro/contracts";
export interface Baseline {
  id: string;
  key: string;
  state:
    | "proposed"
    | "approved"
    | "superseded"
    | "rejected"
    | "expired"
    | "under_review";
  image: string;
  imageSha256: string;
  sourceCommit: string;
  sourcePullRequest: string;
  contractHash: string;
  fixtureHash: string;
  environmentFingerprint: string;
  projectId: string;
  routeId: string;
  stateId: string;
  viewportId: string;
  theme: string;
  density: string;
  browserVersion: string;
  renderProfile: string;
  baselineVersion: number;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  previousBaselineId?: string;
  approvalRef?: string;
}
export interface Approval {
  reviewId: string;
  candidateId: string;
  candidateHash: string;
  imageSha256: string;
  sourceCommit: string;
  contractHash: string;
  policyHash: string;
  reviewer: string;
  reason: string;
  approvedAt: string;
  expiresAt: string;
  signature: string;
}
export async function registry(root: string, dir: string): Promise<Baseline[]> {
  try {
    return JSON.parse(
      await safeRead(root, dir + "/registry.json"),
    ) as Baseline[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
export function baselineMetadataHash(candidate: Baseline): string {
  const {
    state,
    approvedBy,
    approvedAt,
    approvalReason,
    approvalRef,
    ...metadata
  } = candidate;
  return hash(metadata);
}
export async function proposeBaseline(
  root: string,
  dir: string,
  data: Omit<Baseline, "id" | "state" | "imageSha256" | "baselineVersion">,
) {
  const entries = await registry(root, dir),
    image = await readFile(safePath(root, data.image));
  const candidate: Baseline = {
    ...data,
    imageSha256: hash(image),
    baselineVersion:
      1 +
      Math.max(
        0,
        ...entries
          .filter((b) => b.key === data.key)
          .map((b) => b.baselineVersion),
      ),
    state: "proposed",
    id: "",
  };
  candidate.id = "baseline-" + hash(candidate).slice(0, 24);
  if (entries.some((e) => e.id === candidate.id))
    return entries.find((e) => e.id === candidate.id)!;
  const target = dir + "/candidates/" + candidate.id + ".png";
  await mkdir(dirname(safePath(root, target)), { recursive: true });
  await copyFile(safePath(root, data.image), safePath(root, target));
  candidate.image = target;
  const predecessor = entries.find(
    (e) => e.key === candidate.key && e.state === "approved",
  );
  if (predecessor) candidate.previousBaselineId = predecessor.id;
  entries.push(candidate);
  await writeFile(
    safePath(root, dir + "/registry.json"),
    JSON.stringify(entries, null, 2),
  );
  return candidate;
}
export function verifyApproval(
  approval: Approval,
  candidate: Baseline,
  policy: { reviewers: Record<string, string> },
  now = Date.now(),
) {
  if (
    !approval.signature ||
    !policy.reviewers[approval.reviewer] ||
    !approval.reason ||
    !approval.reviewId
  )
    throw new Error("Authenticated reviewer and reason required");
  if (
    approval.candidateId !== candidate.id ||
    approval.candidateHash !== baselineMetadataHash(candidate) ||
    approval.imageSha256 !== candidate.imageSha256 ||
    approval.sourceCommit !== candidate.sourceCommit ||
    approval.contractHash !== candidate.contractHash ||
    approval.policyHash !== hash(policy)
  )
    throw new Error(
      "Approval does not bind current artifact, commit and policy",
    );
  if (
    !Number.isFinite(Date.parse(approval.expiresAt)) ||
    Date.parse(approval.expiresAt) <= now ||
    !Number.isFinite(Date.parse(approval.approvedAt)) ||
    Date.parse(approval.approvedAt) > now
  )
    throw new Error("Invalid approval validity");
  const { signature, ...payload } = approval;
  if (
    !verify(
      null,
      Buffer.from(canonical(payload)),
      createPublicKey(policy.reviewers[approval.reviewer]!),
      Buffer.from(signature, "base64"),
    )
  )
    throw new Error("Invalid review signature");
}
export async function approveBaseline(
  root: string,
  dir: string,
  approval: Approval,
  policy: { reviewers: Record<string, string> },
) {
  const entries = await registry(root, dir),
    candidate = entries.find((e) => e.id === approval.candidateId);
  if (!candidate || !["proposed", "under_review"].includes(candidate.state))
    throw new Error("Candidate unavailable for approval");
  verifyApproval(approval, candidate, policy);
  if (
    hash(await readFile(safePath(root, candidate.image))) !==
    candidate.imageSha256
  )
    throw new Error("Artifact hash mismatch");
  const previous = entries.find(
    (e) => e.key === candidate.key && e.state === "approved",
  );
  if (previous?.id !== candidate.previousBaselineId)
    throw new Error("Baseline predecessor changed; new review required");
  if (previous) {
    previous.state = "superseded";
  }
  Object.assign(candidate, {
    state: "approved",
    approvedBy: approval.reviewer,
    approvedAt: approval.approvedAt,
    approvalReason: approval.reason,
    approvalRef: approval.reviewId,
  });
  await writeFile(
    safePath(root, dir + "/registry.json"),
    JSON.stringify(entries, null, 2),
  );
  await writeFile(
    safePath(root, dir + "/" + candidate.id + ".approval.json"),
    JSON.stringify(approval, null, 2),
  );
  return candidate;
}
