import {
  hash,
  validateSchema,
  exitCode,
  aggregate,
  type EvidenceBundle,
  governanceContractHash,
} from "@inteiro/contracts";

/** Validate the single JSON document returned by a deterministic CLI validator. */
export function parseGateOutput(
  stdout: string,
  code: number | null,
): EvidenceBundle {
  if (Buffer.byteLength(stdout) > 16 * 1024 * 1024)
    throw new Error("Gate output exceeds protocol limit");
  const report = JSON.parse(stdout) as EvidenceBundle;
  if (!validateSchema("evidence-bundle", report).valid)
    throw new Error("Invalid gate evidence schema");
  if (
    report.governanceContractHash !== undefined &&
    report.governanceContractHash !== governanceContractHash()
  )
    throw new Error("Gate governance contract mismatch");
  const { hash: expected, ...payload } = report;
  if (hash(payload) !== expected)
    throw new Error("Gate evidence hash mismatch");
  const indexed = new Map(
    report.gates
      .flatMap((gate) => gate.findings)
      .map((item) => [item.fingerprint, item]),
  );
  if (
    indexed.size !== report.findings.length ||
    new Set(report.findings.map((item) => item.fingerprint)).size !==
      report.findings.length ||
    report.gates
      .flatMap((gate) => gate.findings)
      .some((item) => hash(indexed.get(item.fingerprint)) !== hash(item)) ||
    report.findings.some(
      (item) => hash(indexed.get(item.fingerprint)) !== hash(item),
    ) ||
    report.gates.some(
      (gate) =>
        gate.status === "passed" &&
        gate.findings.some(
          (item) =>
            ["error", "blocker"].includes(item.severity) &&
            !["passed", "waived"].includes(item.status),
        ),
    )
  )
    throw new Error(
      "Gate findings contradict the reported status or finding index",
    );
  if (aggregate(report.gates) !== report.status)
    throw new Error("Gate aggregate status mismatch");
  if (code !== exitCode(report.status))
    throw new Error("Gate status/exit code mismatch");
  return report;
}
