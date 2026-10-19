import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  DEFAULTS,
  hash,
  canonical,
  reviewSourceHash,
} from "@inteiro/contracts";
import {
  releaseGate,
  RELEASE_REQUIREMENTS,
  type ReleaseEvidence,
} from "@inteiro/agent-core";

it("requires a complete signed release matrix and rejects stale evidence and signatures", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-release-"));
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    git("init");
    git("config", "user.email", "synthetic@example.invalid");
    git("config", "user.name", "Synthetic fixture");
    await writeFile(join(root, "source.txt"), "synthetic source");
    git("add", "source.txt");
    git("commit", "-m", "synthetic fixture");
    expect((await releaseGate(root, DEFAULTS)).status).toBe("blocked");
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const policy = {
      reviewers: {
        maintainer: publicKey
          .export({ format: "pem", type: "spki" })
          .toString(),
      },
    };
    await mkdir(join(root, ".inteiro"));
    await writeFile(
      join(root, ".inteiro/reviewers.json"),
      JSON.stringify(policy),
    );
    const ledger: ReleaseEvidence = {
      schemaVersion: "1.0",
      version: "1.2.0",
      sourceCommit: git("rev-parse", "HEAD"),
      sourceHash: await reviewSourceHash(root),
      configHash: hash(DEFAULTS),
      policyHash: hash(policy),
      scopeExclusions: [],
      requirements: RELEASE_REQUIREMENTS.map((id) => ({
        id,
        status: "passed",
        reason: "Synthetic authorization test only",
        evidence: [
          { path: "source.txt", sha256: hash(Buffer.from("synthetic source")) },
        ],
      })),
      approval: null,
    };
    const save = () =>
      writeFile(join(root, "release-evidence.json"), JSON.stringify(ledger));
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("needs_review");
    const approval = {
      reviewer: "maintainer",
      approvalRef: "synthetic-only",
      approvedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: "2099-01-01",
    };
    const { approval: _, ...payload } = ledger;
    ledger.approval = {
      ...approval,
      signature: sign(
        null,
        Buffer.from(canonical({ ledger: payload, approval })),
        privateKey,
      ).toString("base64"),
    };
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("passed");
    ledger.scopeExclusions = ["unauthorized change"];
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("needs_review");
    ledger.scopeExclusions = [];
    ledger.requirements[0]!.status = "not_run";
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("blocked");
    ledger.requirements[0]!.status = "passed";
    ledger.requirements.pop();
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("blocked");
    ledger.requirements.push({ ...ledger.requirements[0]! });
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("blocked");
    ledger.requirements = RELEASE_REQUIREMENTS.map((id) => ({
      id,
      status: "passed",
      reason: "Synthetic fixture",
      evidence: [{ path: "source.txt", sha256: hash(Buffer.from("stale")) }],
    }));
    await save();
    expect((await releaseGate(root, DEFAULTS)).status).toBe("blocked");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
