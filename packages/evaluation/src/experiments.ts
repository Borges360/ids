import { readFile, writeFile, mkdir } from "node:fs/promises";
import { hash, safePath, safeRead, readEvidence } from "@inteiro/contracts";
import { metrics, type Observation } from "./index.ts";
export const ABLATIONS = [
  "unassisted",
  "context",
  "composition-lint",
  "visual-repair",
] as const;
export function percentile(values: number[], q: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  ]!;
}
export function wilson(successes: number, n: number) {
  if (!n) return { low: 0, high: 1 };
  const z = 1.96,
    p = successes / n,
    den = 1 + (z * z) / n;
  const mid = (p + (z * z) / (2 * n)) / den,
    delta = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { low: Math.max(0, mid - delta), high: Math.min(1, mid + delta) };
}
export function summarizeExperiments(rows: Observation[]) {
  const groups = [...new Set(rows.map((r) => r.model + "|" + r.ablation))];
  return groups.map((key) => {
    const group = rows.filter((r) => r.model + "|" + r.ablation === key);
    return {
      model: group[0]!.model,
      ablation: group[0]!.ablation,
      ...metrics(group),
      acceptanceInterval95: wilson(
        group.filter((r) => r.accepted).length,
        group.length,
      ),
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
export async function importExperiment(
  root: string,
  path: string,
  outDir: string,
) {
  const input = JSON.parse(await safeRead(root, path)) as {
    schemaVersion: string;
    idsCommit: string;
    datasetHash: string;
    configHash: string;
    environmentHash: string;
    observations: Observation[];
  };
  if (
    input.schemaVersion !== "1.0" ||
    !input.idsCommit ||
    ![input.datasetHash, input.configHash, input.environmentHash].every((h) =>
      /^[a-f0-9]{64}$/.test(h),
    ) ||
    !input.observations.length
  )
    throw new Error("Invalid experiment provenance");
  const keys = new Set<string>();
  for (const row of input.observations) {
    const key = [row.model, row.ablation, row.caseId, row.seed].join("|");
    if (keys.has(key)) throw new Error("Duplicate model/task/sample");
    keys.add(key);
    if (
      !row.model ||
      !row.caseId ||
      !ABLATIONS.includes(row.ablation as (typeof ABLATIONS)[number]) ||
      !Number.isInteger(row.seed) ||
      !Number.isInteger(row.attempts) ||
      row.attempts < 1 ||
      row.attempts > 3 ||
      !Number.isFinite(row.durationMs) ||
      row.durationMs < 0 ||
      (row.cost !== null && (!Number.isFinite(row.cost) || row.cost < 0))
    )
      throw new Error("Invalid observation");
    if (row.accepted) {
      if (!row.evidencePath || !row.evidenceHash)
        throw new Error(
          "Accepted observations require independent gate evidence",
        );
      const evidence = await readEvidence(root, row.evidencePath);
      if (
        evidence.status !== "passed" ||
        evidence.hash !== row.evidenceHash ||
        evidence.configHash !== input.configHash
      )
        throw new Error(
          "Observation acceptance does not match validated gate evidence",
        );
    }
  }
  const result = {
    schemaVersion: "1.0",
    kind: "recorded-harness-observations",
    inputHash: hash(input),
    idsCommit: input.idsCommit,
    datasetHash: input.datasetHash,
    configHash: input.configHash,
    environmentHash: input.environmentHash,
    status: "passed",
    groups: summarizeExperiments(input.observations),
    observations: input.observations,
  };
  const dir = safePath(root, outDir);
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
