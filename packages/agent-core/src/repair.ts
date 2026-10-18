import { hash, type Config, type EvidenceBundle } from "@inteiro/contracts";
export function repairContext(
  report: EvidenceBundle,
  config: Config,
  history: {
    signature: string;
    changedFiles: string[];
    diffLines: number;
  }[] = [],
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
  const allowedFiles = [
    ...new Set(findings.flatMap((f) => (f.file ? [f.file] : []))),
  ];
  const forbidden = history.some(
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
  const status =
    report.status === "passed"
      ? "passed"
      : report.status !== "failed"
        ? report.status
        : forbidden || repeated || attempt >= config.repair.maxAttempts
          ? "needs_review"
          : "repairable";
  return {
    schemaVersion: "1.0",
    runId: report.runId,
    configHash: report.configHash,
    status,
    signature,
    attempt,
    maxAttempts: config.repair.maxAttempts,
    reason: forbidden
      ? "scope-or-policy-violation"
      : repeated
        ? "repeated-failure"
        : attempt >= config.repair.maxAttempts
          ? "attempt-limit"
          : report.status,
    scope: {
      allowedFiles: [
        ...new Set(findings.flatMap((f) => (f.file ? [f.file] : []))),
      ],
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
