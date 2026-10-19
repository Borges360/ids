import {
  hash,
  validateSchema,
  exitCode,
  aggregate,
  type EvidenceBundle,
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
  const { hash: expected, ...payload } = report;
  if (hash(payload) !== expected)
    throw new Error("Gate evidence hash mismatch");
  if (aggregate(report.gates) !== report.status)
    throw new Error("Gate aggregate status mismatch");
  if (code !== exitCode(report.status))
    throw new Error("Gate status/exit code mismatch");
  return report;
}
