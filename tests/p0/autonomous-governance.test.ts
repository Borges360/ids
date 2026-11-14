import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  DEFAULTS,
  hash,
  resolveConfig,
  bundle,
  requiredGates,
  governanceContractHash,
  assertGovernanceEvidence,
  type GateResult,
  verifyTechnicalAttestation,
  canonical,
  type TechnicalAttestation,
} from "@inteiro/contracts";
import { reviewGate } from "../../packages/agent-core/src/review.ts";
import { repairContext } from "../../packages/agent-core/src/repair.ts";

it("keeps exhausted autonomous repairs technically blocked without requesting human approval", () => {
  const config = structuredClone(DEFAULTS);
  config.governance.mode = "technical-autonomous";
  config.repair.maxAttempts = 0;
  const report = bundle(config, [
    { name: "static", status: "failed", durationMs: 0, findings: [] },
  ]);
  expect(repairContext(report, config)).toMatchObject({
    status: "blocked",
    reason: "attempt-limit",
  });
});

it("keeps human governance by default and organization mode cannot be bypassed by flags", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-autonomous-policy-"));
  try {
    expect(DEFAULTS.governance.mode).toBe("human-approval");
    await mkdir(join(root, ".inteiro"));
    await writeFile(
      join(root, ".inteiro/organization-policy.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        governance: { mode: "technical-autonomous" },
      }),
    );
    const resolved = await resolveConfig(root, {
      governance: { mode: "human-approval" },
    });
    expect(resolved.config.governance.mode).toBe("technical-autonomous");
    expect(resolved.origins["governance.mode"]).toBe("organization-policy");
    await expect(
      resolveConfig(root, {}, { governance: { mode: "human-approval" } }),
    ).rejects.toThrow("Conflicting");
    await expect(
      resolveConfig(root, { governance: { mode: "skip-all" } }),
    ).rejects.toThrow("Invalid configuration");
    await expect(
      resolveConfig(root, {
        governance: { mode: "technical-autonomous", gates: [] },
      }),
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("requires an independent machine identity and binds execution outputs, policy, source and validity", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const policy = {
    schemaVersion: "1.0" as const,
    authorities: {
      fixture: publicKey.export({ format: "pem", type: "spki" }).toString(),
    },
  };
  const binding = {
    sourceHash: "a".repeat(64),
    configHash: "b".repeat(64),
    sourceCommit: "c".repeat(40),
  };
  const receipt: TechnicalAttestation = {
    schemaVersion: "1.0",
    kind: "automatic-technical-verification",
    authority: "fixture",
    policyHash: hash(policy),
    governanceContractHash: governanceContractHash(),
    ...binding,
    status: "passed",
    exitCode: 0,
    requirements: ["SCN-01"],
    checks: [
      {
        command: "synthetic-check",
        status: "passed",
        exitCode: 0,
        evidence: [{ path: "output.json", sha256: "d".repeat(64) }],
      },
    ],
    startedAt: new Date(Date.now() - 2000).toISOString(),
    finishedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    signature: "",
  };
  const seal = () => {
    const { signature: _, ...payload } = receipt;
    receipt.signature = sign(
      null,
      Buffer.from(canonical(payload)),
      privateKey,
    ).toString("base64");
  };
  seal();
  expect(() =>
    verifyTechnicalAttestation(receipt, policy, binding),
  ).not.toThrow();
  const original = structuredClone(receipt);
  receipt.checks[0]!.evidence[0]!.sha256 = "e".repeat(64);
  expect(() => verifyTechnicalAttestation(receipt, policy, binding)).toThrow(
    "signature",
  );
  Object.assign(receipt, structuredClone(original));
  expect(() =>
    verifyTechnicalAttestation(
      receipt,
      { ...policy, authorities: {} },
      binding,
    ),
  ).toThrow();
  expect(() =>
    verifyTechnicalAttestation(receipt, policy, {
      ...binding,
      sourceHash: "f".repeat(64),
    }),
  ).toThrow("incompatible");
  receipt.checks = [];
  seal();
  expect(() => verifyTechnicalAttestation(receipt, policy, binding)).toThrow(
    "Incomplete",
  );
  Object.assign(receipt, structuredClone(original));
  receipt.expiresAt = new Date(Date.now() - 100).toISOString();
  seal();
  expect(() => verifyTechnicalAttestation(receipt, policy, binding)).toThrow(
    "validity",
  );
});

it("binds autonomous evidence to mandatory gates and rejects tampering, waivers and missing stages", () => {
  const config = structuredClone(DEFAULTS);
  config.governance.mode = "technical-autonomous";
  const gates: GateResult[] = requiredGates("pr").map((name) => ({
    name,
    status: "passed",
    durationMs: 0,
    findings: [],
  }));
  const report = bundle(config, gates);
  expect(report.governanceContractHash).toBe(governanceContractHash());
  expect(() => assertGovernanceEvidence(report)).not.toThrow();
  expect(() =>
    assertGovernanceEvidence({
      ...report,
      governanceContractHash: "0".repeat(64),
    }),
  ).toThrow("incompatible");
  expect(() =>
    assertGovernanceEvidence({ ...report, gates: gates.slice(1) }),
  ).toThrow("Incomplete");
  expect(() =>
    assertGovernanceEvidence({ ...report, gates: [...gates, gates[0]!] }),
  ).toThrow("Incomplete");
  expect(() => assertGovernanceEvidence(report, "release")).toThrow(
    "Incomplete",
  );
  for (const status of [
    "blocked",
    "error",
    "not_run",
    "needs_review",
    "waived",
  ] as const) {
    const changed = structuredClone(report);
    changed.gates[0]!.status = status;
    expect(() => assertGovernanceEvidence(changed)).toThrow("did not pass");
  }
});

it("attests objective checks without a human signature, rejects failed gates and changed image bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-autonomous-review-"));
  try {
    await mkdir(join(root, ".inteiro"));
    await writeFile(
      join(root, ".inteiro/task.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        id: "autonomous-fixture",
        type: "new-page",
        description: "Synthetic technical review",
        patternIds: ["app-shell"],
        scope: { allowedFiles: ["ui.html"] },
        acceptanceCriteria: ["Semantic main"],
      }),
    );
    await writeFile(
      join(root, "capture.png"),
      "synthetic-bytes-for-integrity-test",
    );
    const config = structuredClone(DEFAULTS);
    config.governance.mode = "technical-autonomous";
    const gates: GateResult[] = requiredGates("pr")
      .filter((name) => name !== "review")
      .map((name) => ({ name, status: "passed", durationMs: 0, findings: [] }));
    const browser = gates.find((g) => g.name === "browser")!;
    browser.captures = [
      {
        actual: "capture.png",
        sha256: hash(Buffer.from("synthetic-bytes-for-integrity-test")),
      },
    ];
    expect(await reviewGate(root, config, gates)).toMatchObject({
      status: "passed",
      kind: "automatic-technical-attestation",
      qualitativeJudgment: "excluded",
      humanApproval: "not-applicable",
    });
    gates[0]!.status = "failed";
    expect((await reviewGate(root, config, gates)).status).toBe("blocked");
    gates[0]!.status = "passed";
    await writeFile(join(root, "capture.png"), "tampered");
    expect((await reviewGate(root, config, gates)).status).toBe("blocked");
    expect(
      (
        await reviewGate(
          root,
          config,
          gates.filter((g) => g.name !== "static"),
        )
      ).status,
    ).toBe("blocked");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
