import type { GateResult } from "./index.ts";

/** Observed execution counts only. Unavailable harness measurements remain explicit nulls. */
export function executionMetrics(gates: GateResult[]) {
  const findings = [
    ...new Map(
      gates.flatMap((g) => g.findings).map((f) => [f.fingerprint, f]),
    ).values(),
  ];
  const byCategory: Record<string, number> = {},
    bySeverity: Record<string, number> = {};
  for (const finding of findings) {
    byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1;
    bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
  }
  const browser = gates.find((g) => g.name === "browser");
  const observed = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    kind: "observed-technical-execution",
    stages: gates.map((g) => ({
      name: g.name,
      status: g.status,
      durationMs: observed(g.durationMs),
      executed: observed(g.executed),
      planned: observed(g.planned),
      omitted: observed(g.omitted),
    })),
    findings: { total: findings.length, byCategory, bySeverity },
    browser: {
      executed: observed(browser?.executed),
      planned: observed(browser?.planned),
      omitted: observed(browser?.omitted),
      caseCoverage: observed(browser?.coverage),
      routeCoverage: browser?.routeCoverage ?? null,
      baselineComparisons: browser?.baselineStats ?? null,
    },
    infrastructureFailures: findings
      .filter((f) => f.ruleId === "VIS-ENV-001")
      .map((f) => ({
        ruleId: f.ruleId,
        message: f.message,
        route: f.route ?? null,
      })),
    unavailable: {
      flakiness: {
        value: null,
        reason:
          "requires repeated observations; see the measured canary report",
      },
      bundleBytes: {
        value: null,
        reason: "requires built distribution measurement",
      },
      repairTimeMs: { value: null, reason: "no repair event in this gate" },
      inferenceCost: { value: null, reason: "not received from the harness" },
      escalationRate: {
        value: null,
        reason: "no harness routing observations",
      },
      contextCacheHitRate: {
        value: null,
        reason: "context resolver does not implement a result cache",
      },
    },
  };
}
