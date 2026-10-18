import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { DEFAULTS, bundle, finding, hash, canonical } from "@inteiro/contracts";
import {
  verifyApproval,
  baselineMetadataHash,
  type Baseline,
  type Approval,
} from "@inteiro/visual/baseline";
import { repairContext } from "../../packages/agent-core/src/repair.ts";
import { metrics } from "@inteiro/evaluation";
import { validateReview } from "../../packages/agent-core/src/review.ts";
describe("P0 baseline and repair governance", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const policy = {
    reviewers: {
      maintainer: publicKey.export({ type: "spki", format: "pem" }).toString(),
    },
  };
  const candidate = {
    id: "candidate",
    imageSha256: hash("image"),
    sourceCommit: "abc",
    contractHash: hash(DEFAULTS),
  } as Baseline;
  const payload = {
    reviewId: "PR#1",
    candidateId: candidate.id,
    candidateHash: baselineMetadataHash(candidate),
    imageSha256: candidate.imageSha256,
    sourceCommit: "abc",
    contractHash: candidate.contractHash,
    policyHash: hash(policy),
    reviewer: "maintainer",
    reason: "Reviewed screenshot",
    approvedAt: "2026-01-01",
    expiresAt: "2099-01-01",
  };
  const approval = {
    ...payload,
    signature: sign(null, Buffer.from(canonical(payload)), privateKey).toString(
      "base64",
    ),
  };
  it("accepts authenticated artifact-bound approval", () =>
    expect(() => verifyApproval(approval, candidate, policy)).not.toThrow());
  it("rejects rerouting an approved image to another environment or fixture", () => {
    expect(() =>
      verifyApproval(
        approval,
        { ...candidate, fixtureHash: "tampered" },
        policy,
      ),
    ).toThrow();
    expect(() =>
      verifyApproval(approval, { ...candidate, key: "another-route" }, policy),
    ).toThrow();
  });
  for (const field of [
    "signature",
    "reviewer",
    "imageSha256",
    "sourceCommit",
    "policyHash",
    "contractHash",
    "expiresAt",
  ] as const)
    it("rejects modified approval " + field, () =>
      expect(() =>
        verifyApproval({ ...approval, [field]: "tampered" }, candidate, policy),
      ).toThrow(),
    );
  it("never repairs infra failures", () => {
    const r = bundle(DEFAULTS, [
      { name: "browser", status: "error", findings: [], durationMs: 0 },
    ]);
    expect(repairContext(r, DEFAULTS).status).toBe("error");
  });
  it("stops at two repair attempts and repeated signature", () => {
    const r = bundle(DEFAULTS, [
      {
        name: "static",
        status: "failed",
        findings: [
          finding("IN-TOKEN-001", "bad color", { file: "src/app.tsx" }),
        ],
        durationMs: 0,
      },
    ]);
    const first = repairContext(r, DEFAULTS);
    expect(first.status).toBe("repairable");
    expect(
      repairContext(r, DEFAULTS, [
        { signature: first.signature, changedFiles: [], diffLines: 0 },
      ]).reason,
    ).toBe("repeated-failure");
    expect(
      repairContext(r, DEFAULTS, [
        { signature: "1", changedFiles: [], diffLines: 0 },
        { signature: "2", changedFiles: [], diffLines: 0 },
      ]).reason,
    ).toBe("attempt-limit");
  });
  it("rejects policy changes in repair history", () => {
    const r = bundle(DEFAULTS, [
      { name: "static", status: "failed", findings: [], durationMs: 0 },
    ]);
    expect(
      repairContext(r, DEFAULTS, [
        {
          signature: "other",
          changedFiles: ["inteiro.config.json"],
          diffLines: 1,
        },
      ]).reason,
    ).toBe("scope-or-policy-violation");
  });
  it("does not invent missing model cost", () =>
    expect(
      metrics([
        {
          caseId: "one",
          model: "unknown",
          ablation: "full",
          seed: 1,
          accepted: true,
          initialAccepted: true,
          attempts: 1,
          durationMs: 10,
          cost: null,
          tokensIn: null,
          tokensOut: null,
          humanMinutes: null,
        },
      ]).costPerAcceptedTask,
    ).toBeNull());
  it("rejects qualitative scores without evidence", () => {
    const r = bundle(DEFAULTS, [
      { name: "browser", status: "passed", findings: [], durationMs: 0 },
    ]);
    expect(
      validateReview(
        {
          runId: r.runId,
          evidenceHash: r.hash,
          reviewer: "x",
          approvalRef: "x",
          reason: "x",
          axes: [],
        },
        r,
      ),
    ).toHaveLength(7);
  });
});
