import { verify, createPublicKey } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  canonical,
  hash,
  safePath,
  verifyTechnicalAttestation,
  type TechnicalAttestation,
  type TechnicalAuthorityPolicy,
  reviewSourceHash,
} from "@inteiro/contracts";
import { registry, baselineMetadataHash, type Baseline } from "./baseline.ts";
import {
  withBaselineRegistryLock,
  writeBaselineRegistry,
} from "./registry-storage.ts";

export const BASELINE_TECHNICAL_CHECKS = Object.freeze([
  "context",
  "task-context",
  "static",
  "browser-layout",
  "a11y",
  "interaction",
  "runtime",
  "determinism",
]);
export interface VisualChangeIntent {
  allowedRegions: { x: number; y: number; width: number; height: number }[];
  kind: "declared-visual-change";
  authority: string;
  policyHash: string;
  key: string;
  previousBaselineId: string;
  previousImageSha256: string;
  sourceHashBeforeChange: string;
  reason: string;
  declaredAt: string;
  signature: string;
}
export interface TechnicalBaselineApproval extends TechnicalAttestation {
  purpose: "baseline-promotion";
  candidateId: string;
  candidateHash: string;
  imageSha256: string;
  intent?: VisualChangeIntent;
}

/** The implementation executor has no signer API. A protected evaluator issues this receipt. */
export function verifyTechnicalBaselineApproval(
  approval: TechnicalBaselineApproval,
  candidate: Baseline,
  policy: TechnicalAuthorityPolicy,
  previous?: Baseline,
) {
  verifyTechnicalAttestation(approval, policy, {
    sourceHash: candidate.sourceHash ?? "",
    sourceCommit: candidate.sourceCommit,
    configHash: candidate.contractHash,
  });
  if (
    approval.purpose !== "baseline-promotion" ||
    approval.candidateId !== candidate.id ||
    approval.candidateHash !== baselineMetadataHash(candidate) ||
    approval.imageSha256 !== candidate.imageSha256 ||
    !/^[a-f0-9]{64}$/.test(candidate.sourceHash ?? "") ||
    BASELINE_TECHNICAL_CHECKS.some(
      (name) => approval.checks.filter((c) => c.command === name).length !== 1,
    )
  )
    throw Error("Baseline technical checks or candidate binding incomplete");
  if (!candidate.previousBaselineId) {
    if (previous || approval.intent)
      throw Error("Unexpected initial baseline predecessor or intent");
    return;
  }
  verifyVisualChangeIntent(
    approval.intent,
    candidate,
    previous,
    policy,
    approval.startedAt,
  );
}
export function verifyVisualChangeIntent(
  intent: VisualChangeIntent | undefined,
  candidate: Baseline,
  previous: Baseline | undefined,
  policy: TechnicalAuthorityPolicy,
  startedAt: string,
) {
  if (
    !previous ||
    previous.id !== candidate.previousBaselineId ||
    !intent ||
    intent.kind !== "declared-visual-change" ||
    intent.policyHash !== hash(policy) ||
    intent.key !== candidate.key ||
    intent.previousBaselineId !== previous.id ||
    intent.previousImageSha256 !== previous.imageSha256 ||
    !intent.reason.trim() ||
    !/^[a-f0-9]{64}$/.test(intent.sourceHashBeforeChange) ||
    intent.sourceHashBeforeChange === candidate.sourceHash ||
    intent.sourceHashBeforeChange !== previous.sourceHash ||
    !Array.isArray(intent.allowedRegions) ||
    !intent.allowedRegions.length ||
    intent.allowedRegions.length > 64 ||
    intent.allowedRegions.some(
      (region) =>
        [region.x, region.y, region.width, region.height].some(
          (value) => !Number.isInteger(value),
        ) ||
        region.x < 0 ||
        region.y < 0 ||
        region.width < 1 ||
        region.height < 1,
    ) ||
    !Number.isFinite(Date.parse(intent.declaredAt)) ||
    // Wall-clock timestamps have millisecond precision. Equal timestamps do not
    // imply reversed ordering; declaration also binds the unchanged prior source.
    Date.parse(intent.declaredAt) > Date.parse(startedAt)
  )
    throw Error("Previously declared visual change intent required");
  const { signature, ...payload } = intent;
  const key = Object.hasOwn(policy.authorities, intent.authority)
    ? policy.authorities[intent.authority]
    : undefined;
  if (
    !key ||
    !verify(
      null,
      Buffer.from(canonical(payload)),
      createPublicKey(key),
      Buffer.from(signature, "base64"),
    )
  )
    throw Error("Invalid visual change intent authority");
}

/** Only the trusted promotion executor may have filesystem write access to this directory. */
async function promoteTechnicalBaselineUnlocked(
  root: string,
  dir: string,
  approval: TechnicalBaselineApproval,
  policy: TechnicalAuthorityPolicy,
) {
  const entries = await registry(root, dir);
  const candidate = entries.find((e) => e.id === approval.candidateId);
  if (!candidate || !["proposed", "under_review"].includes(candidate.state))
    throw Error("Candidate unavailable for technical promotion");
  const previous = entries.find(
    (e) => e.key === candidate.key && e.state === "approved",
  );
  verifyTechnicalBaselineApproval(approval, candidate, policy, previous);
  if (
    candidate.sourceHash !== (await reviewSourceHash(root)) ||
    candidate.sourceCommit !==
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim()
  )
    throw Error("Technical baseline candidate source changed");
  if (
    hash(await readFile(safePath(root, candidate.image))) !==
    candidate.imageSha256
  )
    throw Error("Candidate image changed");
  const { PNG } = createRequire(import.meta.url)("pngjs");
  const decode = async (path: string) => {
    const bytes = await readFile(safePath(root, path));
    if (
      bytes.length < 24 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 32 * 1024 * 1024
    )
      throw Error("Invalid or oversized baseline PNG");
    return PNG.sync.read(bytes);
  };
  const actual = await decode(candidate.image);
  if (previous) {
    const expected = await decode(previous.image);
    if (
      hash(await readFile(safePath(root, previous.image))) !==
      previous.imageSha256
    )
      throw Error("Previous reference bytes changed");
    if (actual.width !== expected.width || actual.height !== expected.height)
      throw Error("Technical promotion cannot change reference dimensions");
    const regions = approval.intent!.allowedRegions;
    if (
      regions.some(
        (region) =>
          region.x + region.width > actual.width ||
          region.y + region.height > actual.height,
      )
    )
      throw Error("Visual intent region exceeds reference dimensions");
    for (let y = 0; y < actual.height; y++)
      for (let x = 0; x < actual.width; x++) {
        if (
          regions.some(
            (region) =>
              x >= region.x &&
              x < region.x + region.width &&
              y >= region.y &&
              y < region.y + region.height,
          )
        )
          continue;
        const offset = (y * actual.width + x) * 4;
        if (
          !actual.data
            .subarray(offset, offset + 4)
            .equals(expected.data.subarray(offset, offset + 4))
        )
          throw Error(
            "Unexpected pixel difference outside prior visual intent",
          );
      }
  }
  for (const check of approval.checks)
    for (const output of check.evidence)
      if (hash(await readFile(safePath(root, output.path))) !== output.sha256)
        throw Error("Technical check output changed");
  if (previous) previous.state = "superseded";
  Object.assign(candidate, {
    state: "approved",
    approvedBy: "automatic:" + approval.authority,
    approvedAt: approval.finishedAt,
    approvalReason: "Automatic technical attestation; no human approval",
    approvalRef: approval.candidateHash,
  });
  await writeFile(
    safePath(root, dir + "/" + candidate.id + ".approval.json"),
    JSON.stringify(approval, null, 2),
    { flag: "wx" },
  );
  await writeBaselineRegistry(root, dir, entries);
  return candidate;
}
export async function promoteTechnicalBaseline(
  root: string,
  dir: string,
  approval: TechnicalBaselineApproval,
  policy: TechnicalAuthorityPolicy,
) {
  return withBaselineRegistryLock(root, dir, () =>
    promoteTechnicalBaselineUnlocked(root, dir, approval, policy),
  );
}
