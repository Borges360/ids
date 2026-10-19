import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs");
import {
  DEFAULTS,
  bundle,
  hash,
  canonical,
  writeReport,
  reviewSourceHash,
  validateSchema,
} from "@inteiro/contracts";
import {
  reviewGate,
  REVIEW_AXES,
  validateReview,
  resolvedReviewRequest,
  reviewRequest,
} from "../../packages/agent-core/src/review.ts";
it("does not offer lint-only evidence as a visual review request", () => {
  const report = bundle(DEFAULTS, [
    { name: "static", status: "passed", durationMs: 0, findings: [] },
  ]);
  const request = reviewRequest(report, DEFAULTS);
  expect(request.status).toBe("blocked");
  expect(request.captures).toEqual([]);
  expect(validateSchema("review-request", request).valid).toBe(true);
});
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
    const secondPixel = new PNG({ width: 1, height: 1 });
    secondPixel.data.fill(255);
    const secondCapture = PNG.sync.write(secondPixel) as Buffer;
    const gates = [
      {
        name: "browser",
        status: "passed" as const,
        findings: [],
        durationMs: 0,
        captures: [{ actual: "fixture.png", sha256: imageHash }],
        actionCaptures: [
          {
            actual: ".inteiro/reports/action-one.png",
            sha256: imageHash,
            route: "/fixture",
            actionIndex: 0,
          },
          {
            actual: ".inteiro/reports/action-two.png",
            sha256: hash(secondCapture),
            route: "/fixture",
            actionIndex: 1,
          },
        ],
      },
    ];
    await mkdir(join(root, ".inteiro/reports"), { recursive: true });
    await writeFile(
      join(root, ".inteiro/reports/action-one.png"),
      await readFile(join(root, "fixture.png")),
    );
    await writeFile(
      join(root, ".inteiro/reports/action-two.png"),
      secondCapture,
    );
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
      artifactHashes: [
        imageHash,
        ...gates[0]!.actionCaptures.map((capture) => capture.sha256),
      ].sort(),
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
    const request = await resolvedReviewRequest(root, config, report);
    expect(request.status).toBe("needs_review");
    expect(validateSchema("review-request", request).valid).toBe(true);
    expect(request.taskHash).toBe(hash(task));
    expect(request.configHash).toBe(hash(config));
    expect(request.artifactHashes).toEqual(payload.artifactHashes);
    expect(request.captures).toHaveLength(3);
    const changedConfig = structuredClone(config);
    changedConfig.repair.maxAttempts = 1;
    const mixedPayload = { ...payload, configHash: hash(changedConfig) };
    await writeFile(
      join(root, ".inteiro/reviews/decision.json"),
      JSON.stringify({
        ...mixedPayload,
        signature: sign(
          null,
          Buffer.from(canonical(mixedPayload)),
          privateKey,
        ).toString("base64"),
      }),
    );
    expect((await reviewGate(root, changedConfig, gates)).status).toBe(
      "needs_review",
    );
    await writeFile(
      join(root, ".inteiro/reviews/decision.json"),
      JSON.stringify(decision),
    );
    expect(
      validateReview({ ...payload, reason: " \t " }, report),
    ).not.toHaveLength(0);
    expect(
      validateReview(
        {
          ...payload,
          axes: payload.axes.map((axis) => ({ ...axis, element: "   " })),
        },
        report,
      ),
    ).not.toHaveLength(0);
    const alteredActions = gates.map((gate) => ({
      ...gate,
      actionCaptures: gate.actionCaptures.map((capture) => ({
        ...capture,
        route: "/different",
      })),
    }));
    expect((await reviewGate(root, config, alteredActions)).status).toBe(
      "needs_review",
    );
    const lostAction = gates.map((gate) => ({
      ...gate,
      actionCaptures: gate.actionCaptures.slice(1),
    }));
    expect((await reviewGate(root, config, lostAction)).status).toBe(
      "needs_review",
    );
    const swappedActions = gates.map((gate) => ({
      ...gate,
      actionCaptures: gate.actionCaptures.map((capture, index) => ({
        ...capture,
        actual: gate.actionCaptures[1 - index]!.actual,
        sha256: gate.actionCaptures[1 - index]!.sha256,
      })),
    }));
    expect((await reviewGate(root, config, swappedActions)).status).toBe(
      "needs_review",
    );
    await writeFile(
      join(root, ".inteiro/reports/action-rerun.png"),
      await readFile(join(root, "fixture.png")),
    );
    const sameImages = gates.map((gate) => ({
      ...gate,
      actionCaptures: gate.actionCaptures.map((capture, index) =>
        index === 0
          ? { ...capture, actual: ".inteiro/reports/action-rerun.png" }
          : capture,
      ),
    }));
    expect((await reviewGate(root, config, sameImages)).status).toBe("passed");
    await writeFile(
      join(root, ".inteiro/reports/action-rerun.png"),
      "changed bytes",
    );
    expect((await reviewGate(root, config, sameImages)).status).toBe(
      "needs_review",
    );
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
    expect((await resolvedReviewRequest(root, config, report)).status).toBe(
      "blocked",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
