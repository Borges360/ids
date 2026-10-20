import { writeFile, mkdir } from "node:fs/promises";
import { hash, safePath, safeRead, validateSchema } from "@inteiro/contracts";
import { metrics, type Observation } from "./index.ts";
import { validateExperimentProtocol } from "./protocol.ts";
import { observationEvidence, catalogGrading } from "./observation-evidence.ts";
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
export function median(values: number[]) {
  if (values.some((value) => !Number.isFinite(value)))
    throw Error("Invalid median input");
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : sorted[middle - 1]! / 2 + sorted[middle]! / 2;
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
      durationMedian: median(group.map((r) => r.durationMs)),
      durationP90: percentile(
        group.map((r) => r.durationMs),
        0.9,
      ),
      costMedian: median(
        group.flatMap((r) => (r.cost === null ? [] : [r.cost])),
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
  const workers = new Set<string>();
  let cataloguePaths: string[] | undefined;
  if (options.protocolPath && input.observations.some((row) => row.accepted)) {
    const declaration = JSON.parse(await safeRead(root, options.protocolPath));
    if (!validateSchema("benchmark-protocol", declaration).valid)
      throw Error("Invalid frozen benchmark protocol schema");
    cataloguePaths = [
      declaration.dataset.public.path,
      declaration.dataset.heldout.path,
    ];
  }
  const snapshots = new Map<
    string,
    Awaited<ReturnType<typeof catalogGrading>>
  >();
  for (const row of input.observations) {
    const key = JSON.stringify([row.model, row.ablation, row.caseId, row.seed]);
    if (keys.has(key)) throw new Error("Duplicate model/task/sample");
    keys.add(key);
    if (row.workerId) {
      if (workers.has(row.workerId))
        throw Error("Worker reused by multiple experiment samples");
      workers.add(row.workerId);
    }
    if (row.accepted && !snapshots.has(row.caseId))
      snapshots.set(
        row.caseId,
        await catalogGrading(root, row.caseId, cataloguePaths),
      );
    await observationEvidence(
      root,
      row,
      input.configHash,
      snapshots.get(row.caseId),
    );
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
