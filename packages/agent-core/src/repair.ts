import {
  hash,
  safeRead,
  reviewSourceHash,
  type Config,
  type EvidenceBundle,
} from "@inteiro/contracts";
import { verifyStoredContext, type TaskManifest } from "./task-context.ts";
export function repairContext(
  report: EvidenceBundle,
  config: Config,
  history: {
    signature: string;
    changedFiles: string[];
    diffLines: number;
  }[] = [],
  task: { allowedFiles?: string[]; contextBundleId?: string } = {},
) {
  const findings = report.findings
    .filter((f) => ["error", "blocker"].includes(f.severity))
    .sort(
      (a, b) =>
        (a.severity === "blocker" ? -1 : 1) -
        (b.severity === "blocker" ? -1 : 1),
    )
    .slice(0, 12);
  const signature = hash(findings.map((f) => f.fingerprint).sort());
  const attempt = history.length;
  const allowedFiles = task.allowedFiles ?? [
    ...new Set(findings.flatMap((f) => (f.file ? [f.file] : []))),
  ];
  const forbidden =
    history.reduce((sum, h) => sum + h.diffLines, 0) >
      config.repair.maxDiffLines ||
    new Set(history.flatMap((h) => h.changedFiles)).size >
      config.repair.maxChangedFiles ||
    history.some(
      (h) =>
        h.diffLines > config.repair.maxDiffLines ||
        h.changedFiles.length > config.repair.maxChangedFiles ||
        h.changedFiles.some((f) =>
          /(?:baseline|snapshot|inteiro\.config|policy|Jenkinsfile|\.env)/i.test(
            f,
          ),
        ) ||
        h.changedFiles.some((f) => !allowedFiles.includes(f)),
    );
  const repeated = history.some((h) => h.signature === signature);
  const rawStatus = forbidden
    ? "needs_review"
    : report.status === "passed"
      ? "passed"
      : report.status !== "failed"
        ? report.status
        : repeated || attempt >= config.repair.maxAttempts
          ? "needs_review"
          : "repairable";
  const status =
    rawStatus === "needs_review" &&
    config.governance.mode === "technical-autonomous"
      ? "blocked"
      : rawStatus;
  return {
    schemaVersion: "1.0",
    kind: "repair-context" as const,
    runId: report.runId,
    contextBundleId: task.contextBundleId,
    configHash: report.configHash,
    status,
    signature,
    attempt,
    maxAttempts: config.repair.maxAttempts,
    reason: forbidden
      ? "scope-or-policy-violation"
      : report.status !== "failed"
        ? report.status
        : repeated
          ? "repeated-failure"
          : attempt >= config.repair.maxAttempts
            ? "attempt-limit"
            : report.status,
    scope: {
      allowedFiles,
      maxChangedFiles: config.repair.maxChangedFiles,
      maxDiffLines: config.repair.maxDiffLines,
    },
    findings,
    requiredChecks: [
      "inteiro lint . --format json",
      "inteiro visual test --changed --json",
      "inteiro gate run --profile pr --json",
    ],
    prohibitedActions: ["approve-baseline", "relax-threshold", "disable-rule"],
    routing: {
      taskRisk: forbidden || repeated ? "high" : "normal",
      reasonCodes: [status],
    },
  };
}

/** CLI/MCP entry point: diagnostics cannot authorize repair from an unbound or stale report. */
export async function resolvedRepairContext(
  root: string,
  config: Config,
  report: EvidenceBundle,
): Promise<
  Omit<ReturnType<typeof repairContext>, "reason"> & {
    reason: string;
    nextAction?: string;
  }
> {
  const base = repairContext(report, config);
  try {
    if (
      report.configHash !== hash(config) ||
      !report.sourceHash ||
      report.sourceHash !== (await reviewSourceHash(root))
    )
      throw new Error("Stale evidence");
    const manifest = JSON.parse(
      await safeRead(root, ".inteiro/task.json"),
    ) as TaskManifest;
    const context = await verifyStoredContext(root, config, manifest);
    const mapped = [
      ...new Set(
        base.findings.flatMap((item) =>
          item.file && manifest.scope.allowedFiles.includes(item.file)
            ? [item.file]
            : [],
        ),
      ),
    ];
    const allowedFiles = mapped.length
      ? mapped
      : manifest.scope.allowedFiles.length <= config.repair.maxChangedFiles
        ? manifest.scope.allowedFiles
        : [];
    const result = repairContext(report, config, [], {
      allowedFiles,
      contextBundleId: context.bundleId,
    });
    if (result.status === "repairable" && !allowedFiles.length)
      return {
        ...result,
        status:
          config.governance.mode === "technical-autonomous"
            ? "blocked"
            : "needs_review",
        reason: "affected-file-mapping-required",
      };
    return result;
  } catch {
    return {
      ...base,
      status: report.status === "error" ? "error" : "blocked",
      reason: "task-context-or-evidence-unverified",
      scope: { ...base.scope, allowedFiles: [] },
      nextAction:
        "Run a current gate with a recorded task context before requesting repair",
    };
  }
}
