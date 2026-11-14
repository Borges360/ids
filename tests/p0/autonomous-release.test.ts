import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  DEFAULTS,
  hash,
  canonical,
  governanceContractHash,
  GOVERNANCE_CONTRACT,
  reviewSourceHash,
  type TechnicalAttestation,
} from "@inteiro/contracts";
import {
  releaseGate,
  RELEASE_REQUIREMENTS,
  type ReleaseEvidence,
} from "../../packages/agent-core/src/release.ts";
import { qualificationFixture } from "../helpers/requirement-fixture.ts";

it("replaces the maintainer signature with current machine execution receipts, never with a waived technical requirement", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-automatic-release-"));
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    git("init");
    await mkdir(join(root, ".inteiro"));
    await mkdir(join(root, "outputs"));
    await writeFile(join(root, ".gitignore"), "outputs/\n.inteiro/reports/\n");
    await writeFile(
      join(root, "source.txt"),
      "synthetic-release-authorization-test-only",
    );
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const policy = {
      schemaVersion: "1.0",
      authorities: {
        machine: publicKey.export({ format: "pem", type: "spki" }).toString(),
      },
    };
    await writeFile(
      join(root, ".inteiro/technical-attestors.json"),
      JSON.stringify(policy),
    );
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Synthetic release fixture",
    );
    const config = structuredClone(DEFAULTS);
    config.governance.mode = "technical-autonomous";
    // Each requirement resolves to its own (synthetic) executed case and check.
    const { index } = await qualificationFixture(root, "outputs/run")(
      RELEASE_REQUIREMENTS.map((id) => ({
        id,
        applicability: "mandatory",
        proof: { tests: ["tests/browser/page.spec.ts"], checks: ["ci"] },
      })),
      {},
    );
    expect(index.status).toBe("passed");
    const indexBytes = Buffer.from(JSON.stringify(index));
    await writeFile(join(root, "outputs/index.json"), indexBytes);
    const requirementIndex = {
      path: "outputs/index.json",
      sha256: hash(indexBytes),
    };
    const binding = {
      sourceHash: await reviewSourceHash(root),
      sourceCommit: git("rev-parse", "HEAD"),
      configHash: hash(config),
    };
    const receipt: TechnicalAttestation & {
      requirementIndex?: typeof requirementIndex;
    } = {
      schemaVersion: "1.0",
      kind: "automatic-technical-verification",
      authority: "machine",
      ...binding,
      governanceContractHash: governanceContractHash(),
      policyHash: hash(policy),
      status: "passed",
      exitCode: 0,
      requirements: RELEASE_REQUIREMENTS,
      requirementIndex,
      checks: [
        {
          command: "synthetic-authorization-test-only",
          status: "passed",
          exitCode: 0,
          evidence: [
            {
              path: "outputs/check.json",
              sha256: hash(Buffer.from("synthetic-check")),
            },
          ],
        },
      ],
      startedAt: new Date(Date.now() - 2000).toISOString(),
      finishedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      signature: "",
    };
    await writeFile(join(root, "outputs/check.json"), "synthetic-check");
    const seal = () => {
      const { signature: _, ...payload } = receipt;
      receipt.signature = sign(
        null,
        Buffer.from(canonical(payload)),
        privateKey,
      ).toString("base64");
    };
    const ledger: ReleaseEvidence = {
      schemaVersion: "1.0",
      version: "1.2.0",
      ...binding,
      policyHash: hash(policy),
      governanceContractHash: governanceContractHash(),
      scopeExclusions: [...GOVERNANCE_CONTRACT.scopeExclusions],
      approval: null,
      requirements: RELEASE_REQUIREMENTS.map((id) => ({
        id,
        status: "passed",
        reason: "Synthetic authorization fixture only",
        evidence: [],
      })),
    };
    const save = async (withIndex = true) => {
      const bytes = Buffer.from(JSON.stringify(receipt));
      await writeFile(join(root, "outputs/receipt.json"), bytes);
      for (const row of ledger.requirements)
        row.evidence = [
          { path: "outputs/receipt.json", sha256: hash(bytes) },
          ...(withIndex ? [requirementIndex] : []),
        ];
      await writeFile(
        join(root, "release-evidence.json"),
        JSON.stringify(ledger),
      );
    };
    await save();
    expect((await releaseGate(root, config)).status).toBe("blocked");
    seal();
    await save();
    expect(await releaseGate(root, config)).toMatchObject({
      status: "passed",
      kind: "automatic-technical-attestation",
      humanApproval: "not-applicable",
    });
    // A shared receipt alone no longer proves each row.
    await save(false);
    expect((await releaseGate(root, config)).status).toBe("blocked");
    delete receipt.requirementIndex;
    seal();
    await save();
    expect(await releaseGate(root, config)).toMatchObject({
      status: "blocked",
      findings: [
        expect.objectContaining({
          message: expect.stringContaining("executed proof required"),
        }),
      ],
    });
    receipt.requirementIndex = requirementIndex;
    seal();
    await save();
    expect((await releaseGate(root, config)).status).toBe("passed");
    ledger.scopeExclusions.push("all-technical-checks");
    await save();
    expect((await releaseGate(root, config)).status).toBe("blocked");
    ledger.scopeExclusions.pop();
    receipt.requirements = receipt.requirements.slice(1);
    seal();
    await save();
    expect((await releaseGate(root, config)).status).toBe("blocked");
    receipt.requirements = RELEASE_REQUIREMENTS;
    seal();
    await save();
    await writeFile(join(root, "outputs/check.json"), "tampered-output");
    expect((await releaseGate(root, config)).status).toBe("blocked");
    await writeFile(join(root, "outputs/check.json"), "synthetic-check");
    await writeFile(join(root, "source.txt"), "changed-source");
    expect((await releaseGate(root, config)).status).toBe("blocked");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
