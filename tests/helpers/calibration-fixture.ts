import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { generateKeyPairSync, sign } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { canonical, hash, REVIEW_AXES } from "@inteiro/contracts";
import type {
  CalibrationReference,
  ReviewCalibrationInput,
} from "@inteiro/evaluation/calibration";
export async function calibrationFixture() {
  const root = await mkdtemp(join(tmpdir(), "inteiro-calibration-synthetic-"));
  const keys = generateKeyPairSync("ed25519");
  const policy = {
    schemaVersion: "1.0",
    reviewers: {
      "synthetic-reference-only": {
        kind: "synthetic",
        publicKey: keys.publicKey
          .export({ type: "spki", format: "pem" })
          .toString(),
      },
    },
  };
  await mkdir(join(root, ".inteiro"));
  await writeFile(
    join(root, ".inteiro/calibration-reviewers.json"),
    JSON.stringify(policy),
  );
  const reference: CalibrationReference = {
    schemaVersion: "1.0",
    kind: "review-calibration-reference",
    purpose: "synthetic",
    idsCommit: "a".repeat(40),
    configHash: "c".repeat(64),
    rubricVersion: "1.0",
    reviewer: "synthetic-reference-only",
    approvalRef: "Synthetic test fixture only",
    reason: "Not a human reference corpus",
    signedAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    signature: "",
    cases: [],
  };
  for (let index = 0; index < 4; index++) {
    const captures = [];
    for (const id of ["expected", "actual"]) {
      const path = `case-${index}-${id}.png`,
        bytes = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
          "base64",
        );
      await writeFile(join(root, path), bytes);
      captures.push({ id, path, sha256: hash(bytes) });
    }
    reference.cases.push({
      id: "synthetic-" + index,
      density: index % 2 ? "focus" : "calm",
      scenarios: [index % 2 ? "overlay" : "long-text"],
      captures,
      axes: REVIEW_AXES.map((axis) => ({
        axis,
        score: [4, 3, 1, 0][index]!,
        evidenceId: "actual",
        element: "Synthetic element",
        reason: "Synthetic score for mathematics test",
        action: "No product approval",
      })),
      verdict: index < 2 ? "accept" : "block",
      severe: index >= 2,
      rank: index + 1,
    });
  }
  const input: ReviewCalibrationInput = {
    schemaVersion: "1.0",
    kind: "recorded-review-calibration",
    configHash: reference.configHash,
    currency: "USD",
    reference: { path: "reference.json", sha256: "0".repeat(64) },
    observations: reference.cases.map((item, index) => ({
      caseId: item.id,
      reviewer: "synthetic-model-no-agent",
      version: "fixture-1",
      promptHash: "b".repeat(64),
      artifactHashes: item.captures.map((capture) => capture.sha256),
      axes: item.axes.map((axis) => ({ ...axis, score: [3, 2, 2, 0][index]! })),
      verdict: (["block", "insufficient", "accept", "insufficient"] as const)[
        index
      ]!,
      rank: [2, null, 1, 4][index]!,
      cost: [0.1, null, 0.2, 0.3][index]!,
      durationMs: (index + 1) * 10,
      tokensIn: 100,
      tokensOut: 20,
    })),
  };
  const save = async (resign = true) => {
    if (resign) {
      const { signature: discarded, ...payload } = reference;
      void discarded;
      reference.signature = sign(
        null,
        Buffer.from(canonical(payload)),
        keys.privateKey,
      ).toString("base64");
    }
    await writeFile(join(root, "reference.json"), JSON.stringify(reference));
    input.reference.sha256 = hash(await readFile(join(root, "reference.json")));
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    await writeFile(
      join(root, ".inteiro/calibration-reviewers.json"),
      JSON.stringify(policy),
    );
  };
  await save();
  return {
    root,
    reference,
    input,
    policy,
    save,
    async cleanup() {
      const target = await realpath(root);
      if (
        dirname(target) !== (await realpath(tmpdir())) ||
        !basename(target).startsWith("inteiro-calibration-synthetic-")
      )
        throw Error("Unsafe cleanup");
      await rm(target, { recursive: true, force: true });
    },
  };
}
