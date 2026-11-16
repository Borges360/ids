import { it, expect } from "vitest";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareBenchmarkWorker } from "@inteiro/evaluation/workspace";
import {
  importExperiment,
  type RecordedExperimentInput,
} from "@inteiro/evaluation/experiments";
import {
  hash,
  bundle,
  writeReport,
  resolveConfig,
  finding,
} from "@inteiro/contracts";
import { workerFixture } from "../helpers/worker-fixture.ts";
it("resolves artifacts relative to the evaluator-owned candidate root, detects tampering, reuse and incomplete bootstrap", async () => {
  const fixture = await workerFixture();
  try {
    const worker = await prepareBenchmarkWorker(
      fixture.dataset,
      fixture.target,
      "task-01",
    );
    if (worker.status !== "passed") throw Error("Unexpected plan");
    const { config } = await resolveConfig(fixture.target);
    await mkdir(join(fixture.target, ".inteiro/reports"), { recursive: true });
    const capture = ".inteiro/reports/synthetic-actual.png",
      bytes = Buffer.from("synthetic artifact integrity fixture");
    await writeFile(join(fixture.target, capture), bytes);
    const evidence = bundle(config, [
      {
        name: "browser",
        status: "failed",
        durationMs: 0,
        findings: [
          finding(
            "IN-TEST-001",
            "Synthetic failure; no browser or model execution",
          ),
        ],
        captures: [{ actual: capture, sha256: hash(bytes) }],
        executed: 1,
      },
    ]);
    await writeReport(fixture.target, config, evidence);
    const input: RecordedExperimentInput = {
      schemaVersion: "1.0",
      idsCommit: "a".repeat(40),
      datasetHash: "b".repeat(64),
      configHash: hash(config),
      environmentHash: "c".repeat(64),
      observations: [
        {
          caseId: "task-01",
          model: "synthetic-no-agent",
          ablation: "context",
          seed: 1,
          accepted: false,
          initialAccepted: false,
          outcome: "model_failure",
          attempts: 1,
          durationMs: 1,
          cost: null,
          tokensIn: null,
          tokensOut: null,
          humanMinutes: null,
          workerId: worker.id,
          evidencePath: `.inteiro/reports/${evidence.runId}/summary.json`,
          evidenceHash: evidence.hash,
        },
      ],
    };
    const save = () =>
      writeFile(join(fixture.dataset, "input.json"), JSON.stringify(input));
    await save();
    expect(
      (
        await importExperiment(fixture.dataset, "input.json", "out", {
          dryRun: true,
        })
      ).groups[0]!.accepted,
    ).toBe(0);
    await writeFile(join(fixture.target, capture), "changed");
    await expect(
      importExperiment(fixture.dataset, "input.json", "out", { dryRun: true }),
    ).rejects.toThrow("artifact hash");
    await writeFile(join(fixture.target, capture), bytes);
    input.observations.push({
      ...input.observations[0]!,
      model: "another-synthetic-profile",
    });
    await save();
    await expect(
      importExperiment(fixture.dataset, "input.json", "out", { dryRun: true }),
    ).rejects.toThrow("reused");
    input.observations.pop();
    Object.assign(input.observations[0]!, {
      accepted: true,
      outcome: "accepted",
      gradingPath: ".inteiro/reports/missing.json",
      gradingHash: "d".repeat(64),
    });
    await save();
    await expect(
      importExperiment(fixture.dataset, "input.json", "out", { dryRun: true }),
    ).rejects.toThrow("bootstrap is incomplete");
    const authority = join(
      fixture.dataset,
      ".inteiro/reports/workers",
      worker.id + ".json",
    );
    const receipt = JSON.parse(await readFile(authority, "utf8"));
    receipt.readyForValidation = "false";
    const { hash: discarded, ...payload } = receipt;
    void discarded;
    receipt.hash = hash(payload);
    await writeFile(authority, JSON.stringify(receipt));
    await expect(
      importExperiment(fixture.dataset, "input.json", "out", { dryRun: true }),
    ).rejects.toThrow("Invalid evaluator-owned");
  } finally {
    await fixture.cleanup();
  }
});
