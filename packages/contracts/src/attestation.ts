import { verify, createPublicKey } from "node:crypto";
import { canonical, hash, validateSchema } from "./index.ts";
import { governanceContractHash } from "./governance.ts";

export interface TechnicalAuthorityPolicy {
  schemaVersion: "1.0";
  authorities: Record<string, string>;
}
export interface TechnicalAttestation {
  schemaVersion: "1.0";
  kind: "automatic-technical-verification";
  authority: string;
  policyHash: string;
  governanceContractHash: string;
  sourceHash: string;
  sourceCommit: string;
  configHash: string;
  status: "passed";
  exitCode: 0;
  requirements: string[];
  checks: {
    command: string;
    status: "passed";
    exitCode: 0;
    evidence: { path: string; sha256: string }[];
  }[];
  startedAt: string;
  finishedAt: string;
  expiresAt: string;
  signature: string;
}

/** Trust comes from the protected evaluator policy, never from keys in a receipt. */
export function verifyTechnicalAttestation(
  receipt: TechnicalAttestation,
  policy: TechnicalAuthorityPolicy,
  binding: { sourceHash: string; sourceCommit: string; configHash: string },
  now = Date.now(),
): void {
  if (
    !validateSchema("technical-attestation", receipt).valid ||
    !validateSchema("technical-authority-policy", policy).valid ||
    policy.schemaVersion !== "1.0" ||
    receipt.schemaVersion !== "1.0" ||
    !policy.authorities ||
    receipt.kind !== "automatic-technical-verification" ||
    receipt.status !== "passed" ||
    receipt.exitCode !== 0 ||
    receipt.policyHash !== hash(policy) ||
    receipt.governanceContractHash !== governanceContractHash() ||
    (["sourceHash", "sourceCommit", "configHash"] as const).some(
      (key) => receipt[key] !== binding[key],
    ) ||
    !Array.isArray(receipt.requirements) ||
    !receipt.requirements.length ||
    !Array.isArray(receipt.checks) ||
    !receipt.checks.length ||
    receipt.checks.some(
      (check) =>
        check.status !== "passed" ||
        check.exitCode !== 0 ||
        typeof check.command !== "string" ||
        !check.command.trim() ||
        !Array.isArray(check.evidence) ||
        !check.evidence.length ||
        check.evidence.some(
          (artifact) =>
            typeof artifact.path !== "string" ||
            !artifact.path ||
            !/^[a-f0-9]{64}$/.test(artifact.sha256),
        ),
    )
  )
    throw Error("Incomplete or incompatible automatic verification receipt");
  const start = Date.parse(receipt.startedAt),
    finish = Date.parse(receipt.finishedAt),
    expires = Date.parse(receipt.expiresAt);
  if (
    ![start, finish, expires].every(Number.isFinite) ||
    start > finish ||
    finish > now ||
    expires <= now ||
    expires <= finish
  )
    throw Error("Invalid automatic verification validity");
  const key = Object.hasOwn(policy.authorities, receipt.authority)
    ? policy.authorities[receipt.authority]
    : undefined;
  for (const value of Object.values(policy.authorities))
    if (
      typeof value !== "string" ||
      !value.startsWith("-----BEGIN PUBLIC KEY-----") ||
      createPublicKey(value).asymmetricKeyType !== "ed25519"
    )
      throw Error(
        "Technical authority policy requires Ed25519 public keys only",
      );
  const { signature, ...payload } = receipt;
  if (
    !key ||
    !signature ||
    !verify(
      null,
      Buffer.from(canonical(payload)),
      createPublicKey(key),
      Buffer.from(signature, "base64"),
    )
  )
    throw Error("Invalid automatic verification authority/signature");
}
