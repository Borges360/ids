import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  DEFAULTS,
  bundle,
  hash,
  canonical,
  writeReport,
  reviewSourceHash,
} from "@inteiro/contracts";
import {
  reviewGate,
  REVIEW_AXES,
} from "../../packages/agent-core/src/review.ts";
it("accepts a signed review across its metadata commit and invalidates changed source", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-review-"));
  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  try {
    git(["init"]);
    await mkdir(join(root, ".inteiro/reviews"), { recursive: true });
    await writeFile(join(root, "ui.html"), "<main><h1>Fixture</h1></main>");
    await writeFile(
      join(root, "fixture.png"),
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    await writeFile(
      join(root, ".inteiro/reviewers.json"),
      JSON.stringify({
        reviewers: {
          fixture: publicKey.export({ type: "spki", format: "pem" }).toString(),
        },
      }),
    );
    const task = {
      schemaVersion: "1.0",
      id: "synthetic-review-task",
      type: "new-page",
      description: "Synthetic app shell",
      patternIds: ["app-shell"],
      scope: { allowedFiles: ["ui.html"] },
      acceptanceCriteria: ["Semantic layout passes review"],
    };
    await writeFile(join(root, ".inteiro/task.json"), JSON.stringify(task));
    git([
      "add",
      "ui.html",
      "fixture.png",
      ".inteiro/task.json",
      ".inteiro/reviewers.json",
    ]);
    git([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Synthetic fixture",
    ]);
    const config = structuredClone(DEFAULTS),
      imageHash = hash(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=",
          "base64",
        ),
      );
    const gates = [
      {
        name: "browser",
        status: "passed" as const,
        findings: [],
        durationMs: 0,
        captures: [{ actual: "fixture.png", sha256: imageHash }],
      },
    ];
    const report = bundle(config, gates);
    await writeReport(root, config, report);
    const sourceHash = await reviewSourceHash(root);
    const payload = {
      runId: report.runId,
      evidenceHash: report.hash,
      reviewer: "fixture",
      approvalRef: "synthetic-review",
      reason: "Synthetic test only",
      configHash: hash(config),
      sourceCommit: git(["rev-parse", "HEAD"]),
      sourceHash,
      taskHash: hash(task),
      artifactHashes: [imageHash],
      expiresAt: "2099-01-01",
      axes: REVIEW_AXES.map((axis) => ({
        axis,
        score: 3,
        evidenceId: "fixture.png",
        element: "fixture",
        reason: "Synthetic fixture",
        action: "Keep",
      })),
    };
    const decision = {
      ...payload,
      signature: sign(
        null,
        Buffer.from(canonical(payload)),
        privateKey,
      ).toString("base64"),
    };
    await writeFile(
      join(root, ".inteiro/reviews/decision.json"),
      JSON.stringify(decision),
    );
    git(["add", ".inteiro/reviews/decision.json"]);
    git([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Synthetic review metadata",
    ]);
    expect(await reviewSourceHash(root)).toBe(sourceHash);
    expect((await reviewGate(root, config, gates)).status).toBe("passed");
    await writeFile(
      join(root, ".inteiro/task.json"),
      JSON.stringify({
        ...task,
        contextBundleId: "context:" + "a".repeat(64),
        configHash: hash(config),
      }),
    );
    expect(await reviewSourceHash(root)).toBe(sourceHash);
    expect((await reviewGate(root, config, gates)).status).toBe("passed");
    await writeFile(join(root, "ui.html"), "<main><h1>Changed</h1></main>");
    expect((await reviewGate(root, config, gates)).status).toBe("needs_review");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
