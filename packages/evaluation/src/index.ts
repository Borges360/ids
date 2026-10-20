import { safeRead, hash, type Config } from "@inteiro/contracts";
import { lintSource } from "@inteiro/lint";
export interface Observation {
  caseId: string;
  model: string;
  ablation: string;
  seed: number;
  accepted: boolean;
  initialAccepted: boolean;
  attempts: number;
  durationMs: number;
  cost: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  humanMinutes: number | null;
  evidencePath?: string;
  evidenceHash?: string;
  gradingPath?: string;
  gradingHash?: string;
  workerId?: string;
  outcome?: "accepted" | "model_failure" | "environment_error" | "incomplete";
}
export function metrics(rows: Observation[]) {
  const evaluated = rows.filter(
      (r) => r.accepted || r.outcome === "model_failure",
    ),
    accepted = evaluated.filter((r) => r.accepted),
    costKnown = rows.every((r) => r.cost !== null);
  return {
    tasks: rows.length,
    evaluatedTasks: evaluated.length,
    environmentErrors: rows.filter((r) => r.outcome === "environment_error")
      .length,
    incompleteObservations: rows.filter((r) => r.outcome === "incomplete")
      .length,
    unclassifiedFailures: rows.filter(
      (r) => !r.accepted && r.outcome === undefined,
    ).length,
    accepted: accepted.length,
    acceptanceRate: evaluated.length
      ? accepted.length / evaluated.length
      : null,
    firstPassRate: evaluated.length
      ? evaluated.filter((r) => r.initialAccepted).length / evaluated.length
      : null,
    totalCost: costKnown ? rows.reduce((s, r) => s + r.cost!, 0) : null,
    costPerAcceptedTask:
      costKnown && accepted.length
        ? rows.reduce((s, r) => s + r.cost!, 0) / accepted.length
        : null,
    meanAttempts: rows.length
      ? rows.reduce((s, r) => s + r.attempts, 0) / rows.length
      : 0,
    unknownCost: rows.filter((r) => r.cost === null).length,
  };
}
export async function runBenchmark(root: string, config: Config) {
  const dataset = JSON.parse(
    await safeRead(root, config.benchmark.dataset),
  ) as {
    schemaVersion: string;
    suite: string;
    cases: {
      id: string;
      file: string;
      source: string;
      expectedRules: string[];
    }[];
  };
  if (dataset.schemaVersion !== "1.0" || !dataset.cases.length)
    throw new Error("Invalid benchmark dataset");
  const results = [];
  for (const c of dataset.cases) {
    const start = performance.now(),
      report = await lintSource(c.file, c.source);
    const actual = [...new Set(report.findings.map((f) => f.ruleId))].sort();
    results.push({
      caseId: c.id,
      passed:
        JSON.stringify(actual) === JSON.stringify([...c.expectedRules].sort()),
      expected: c.expectedRules,
      actual,
      durationMs: performance.now() - start,
    });
  }
  return {
    schemaVersion: "1.0",
    suite: dataset.suite,
    datasetHash: hash(dataset),
    kind: "deterministic-rule-benchmark",
    modelEvaluation: "not_run",
    status: results.every((r) => r.passed) ? "passed" : "failed",
    results,
    metrics: {
      cases: results.length,
      passed: results.filter((r) => r.passed).length,
      costPerAcceptedTask: null,
    },
    reason:
      "No model cost is fabricated. Harness observations are required for model comparison.",
  };
}
