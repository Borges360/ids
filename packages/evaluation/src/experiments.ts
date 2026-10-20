import { writeFile, mkdir } from "node:fs/promises";
import {
  hash,
  safePath,
  safeRead,
  readEvidence,
  validateSchema,
  type EvidenceBundle,
} from "@inteiro/contracts";
import { metrics, type Observation } from "./index.ts";
import { validateExperimentProtocol } from "./protocol.ts";
export {
  validateExperimentProtocol,
  type BenchmarkProtocol,
} from "./protocol.ts";
export const ABLATIONS = [
  "unassisted",
  "context",
  "composition-lint",
  "visual-repair",
] as const;
export function percentile(values: number[], q: number) {
  if (
    !Number.isFinite(q) ||
    q < 0 ||
    q > 1 ||
    values.some((value) => !Number.isFinite(value))
  )
    throw new Error("Invalid percentile input");
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  ]!;
}
export function wilson(successes: number, n: number) {
  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(successes) ||
    n < 0 ||
    successes < 0 ||
    successes > n
  )
    throw new Error("Invalid proportion counts");
  if (!n) return { low: 0, high: 1 };
  const z = 1.96,
    p = successes / n,
    den = 1 + (z * z) / n;
  const mid = (p + (z * z) / (2 * n)) / den,
    delta = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { low: Math.max(0, mid - delta), high: Math.min(1, mid + delta) };
}
export function summarizeExperiments(rows: Observation[]) {
  const groupKey = (r: Observation) => JSON.stringify([r.model, r.ablation]);
  const groups = [...new Set(rows.map(groupKey))];
  return groups.map((key) => {
    const group = rows.filter((r) => groupKey(r) === key);
    const summary = metrics(group);
    return {
      model: group[0]!.model,
      ablation: group[0]!.ablation,
      ...summary,
      acceptanceInterval95: wilson(summary.accepted, summary.evaluatedTasks),
      durationMedian: percentile(
        group.map((r) => r.durationMs),
        0.5,
      ),
      durationP90: percentile(
        group.map((r) => r.durationMs),
        0.9,
      ),
      costMedian: percentile(
        group.flatMap((r) => (r.cost === null ? [] : [r.cost])),
        0.5,
      ),
      costP90: percentile(
        group.flatMap((r) => (r.cost === null ? [] : [r.cost])),
        0.9,
      ),
      sampleCounts: Object.fromEntries(
        [...new Set(group.map((r) => r.caseId))].map((id) => [
          id,
          group.filter((r) => r.caseId === id).length,
        ]),
      ),
      limitations: [
        "Descriptive estimates on a task-specific dataset; not universal model rankings.",
      ],
    };
  });
}
export interface RecordedExperimentInput {
  schemaVersion: "1.0";
  idsCommit: string;
  datasetHash: string;
  configHash: string;
  environmentHash: string;
  observations: Observation[];
}
function completeAcceptance(evidence: EvidenceBundle, row: Observation) {
  const required = ["context", "task-context", "static", "browser", "review"];
  if (
    required.some(
      (name) =>
        evidence.gates.filter(
          (gate) => gate.name === name && gate.status === "passed",
        ).length !== 1,
    ) ||
    new Set(evidence.gates.map((gate) => gate.name)).size !==
      evidence.gates.length ||
    evidence.gates.some(
      (gate) =>
        gate.status !== "passed" ||
        gate.findings.some(
          (finding) => !["passed", "waived"].includes(finding.status),
        ),
    ) ||
    evidence.findings.some(
      (finding) => !["passed", "waived"].includes(finding.status),
    ) ||
    !/^[a-f0-9]{40}$/.test(evidence.gitSha ?? "") ||
    !/^[a-f0-9]{64}$/.test(evidence.sourceHash ?? "")
  )
    throw new Error(
      "Accepted observations require complete passing gate evidence",
    );
  const context = evidence.gates.find((gate) => gate.name === "context")!;
  const task = evidence.gates.find((gate) => gate.name === "task-context")!;
  const lint = evidence.gates.find((gate) => gate.name === "static")!;
  const browser = evidence.gates.find((gate) => gate.name === "browser")!;
  if (
    context.discoverable !== true ||
    !Array.isArray(context.provenance) ||
    !context.provenance.length ||
    task.taskId !== row.caseId ||
    typeof task.taskHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(task.taskHash) ||
    lint.adoption !== "enforce-all" ||
    lint.coverage !== 1 ||
    !Number.isSafeInteger(lint.files) ||
    (lint.files as number) < 1 ||
    !Number.isSafeInteger(browser.executed) ||
    (browser.executed as number) < 1 ||
    !Array.isArray(browser.captures) ||
    browser.captures.length !== browser.executed ||
    typeof browser.environmentFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(browser.environmentFingerprint)
  )
    throw new Error(
      "Incomplete task, source coverage or browser execution evidence",
    );
  for (const capture of browser.captures) {
    if (
      !capture ||
      typeof capture !== "object" ||
      typeof capture.actual !== "string" ||
      typeof capture.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(capture.sha256) ||
      capture.environmentFingerprint !== browser.environmentFingerprint ||
      ["route", "state", "viewport", "theme", "density"].some(
        (field) => typeof capture[field] !== "string" || !capture[field].trim(),
      ) ||
      !evidence.artifacts.some(
        (artifact) =>
          artifact.path === capture.actual &&
          artifact.sha256 === capture.sha256,
      )
    )
      throw new Error(
        "Browser capture is not bound to complete acceptance evidence",
      );
  }
}
export async function importExperiment(
  root: string,
  path: string,
  outDir: string,
  options: { dryRun?: boolean; protocolPath?: string } = {},
) {
  const input: RecordedExperimentInput = JSON.parse(await safeRead(root, path));
  if (!validateSchema("experiment-input", input).valid)
    throw new Error("Invalid experiment provenance or observation schema");
  const keys = new Set<string>();
  for (const row of input.observations) {
    const key = JSON.stringify([row.model, row.ablation, row.caseId, row.seed]);
    if (keys.has(key)) throw new Error("Duplicate model/task/sample");
    keys.add(key);
    if (row.evidencePath) {
      const evidence = await readEvidence(root, row.evidencePath);
      if (
        (row.accepted && evidence.status !== "passed") ||
        evidence.hash !== row.evidenceHash ||
        evidence.configHash !== input.configHash
      )
        throw new Error("Observation does not match validated gate evidence");
      if (row.accepted) completeAcceptance(evidence, row);
    }
  }
  const protocol = options.protocolPath
    ? await validateExperimentProtocol(root, options.protocolPath, input)
    : {
        status: "not_verified" as const,
        publicationReady: false as const,
        limitations: ["No frozen protocol supplied; descriptive import only."],
      };
  const result = {
    schemaVersion: "1.0",
    kind: "recorded-harness-observations",
    inputHash: hash(input),
    idsCommit: input.idsCommit,
    datasetHash: input.datasetHash,
    configHash: input.configHash,
    environmentHash: input.environmentHash,
    status: options.dryRun ? ("not_run" as const) : ("passed" as const),
    dryRun: options.dryRun === true,
    protocol,
    groups: summarizeExperiments(input.observations),
    observations: input.observations,
  };
  const dir = safePath(root, outDir);
  if (options.dryRun) return result;
  await mkdir(dir, { recursive: true });
  await writeFile(
    safePath(root, outDir + "/results.json"),
    JSON.stringify(result, null, 2),
  );
  const cols = [
    "caseId",
    "model",
    "ablation",
    "seed",
    "accepted",
    "initialAccepted",
    "attempts",
    "durationMs",
    "cost",
    "tokensIn",
    "tokensOut",
    "humanMinutes",
    "outcome",
  ] as const;
  const csv = [
    cols.join(","),
    ...input.observations.map((row) =>
      cols
        .map((k) => '"' + String(row[k] ?? "").replaceAll('"', '""') + '"')
        .join(","),
    ),
  ].join("\n");
  await writeFile(safePath(root, outDir + "/results.csv"), csv);
  await writeFile(
    safePath(root, outDir + "/report.html"),
    '<!doctype html><meta charset="utf-8"><title>INTEIRO experiment</title><h1>Recorded experiment</h1><pre>' +
      JSON.stringify(result.groups, null, 2)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;") +
      "</pre>",
  );
  return result;
}
