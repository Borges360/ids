import { hash, type GateResult, type EvidenceBundle } from "./index.ts";

export const GOVERNANCE_MODES = [
  "human-approval",
  "technical-autonomous",
] as const;
export const GATE_PROFILES = [
  "dev",
  "pr",
  "ci",
  "main",
  "nightly",
  "release",
] as const;
export type GateProfile = (typeof GATE_PROFILES)[number];
const core = Object.freeze([
  "context",
  "task-context",
  "static",
  "browser",
  "review",
]);
/** Published evaluator contract. Candidate configuration cannot replace these gates. */
export const GOVERNANCE_CONTRACT = Object.freeze({
  schemaVersion: "1.0",
  id: "inteiro-technical-autonomous-v1",
  modes: Object.freeze([...GOVERNANCE_MODES]),
  profiles: Object.freeze({
    dev: core,
    pr: core,
    ci: core,
    main: core,
    nightly: core,
    release: Object.freeze([...core, "qualification", "release"]),
  }),
  baseline: "separate-technical-attestor",
  coverage: Object.freeze({
    dev: "affected",
    pr: "affected",
    ci: "full",
    main: "full",
    nightly: "expanded",
    release: "full-and-distribution",
  }),
  qualitativeJudgment: "excluded",
  artifactPolicy: Object.freeze({
    traceRetention: "technical-failures-only",
    tracePrivacy: "bounded-local-inspection",
    portableArchiveMaxBytes: 64 * 1024 * 1024,
    versionedReferences: "preserved",
  }),
  humanCalibration: "excluded",
  scopeExclusions: Object.freeze([
    "jenkins-deploy",
    "real-model-comparison",
    "real-agent-smoke",
    "human-final-approval",
    "human-aesthetic-judgment",
    "human-calibration",
  ]),
  release: "complete-current-technical-evidence",
});
export function governanceContractHash(): string {
  return hash(GOVERNANCE_CONTRACT);
}
export function requiredGates(profile: string = "pr"): readonly string[] {
  if (!GATE_PROFILES.includes(profile as GateProfile))
    throw Error("Unknown gate profile");
  return GOVERNANCE_CONTRACT.profiles[profile as GateProfile];
}
export function assertRequiredGates(gates: GateResult[], profile = "pr"): void {
  if (
    new Set(gates.map((g) => g.name)).size !== gates.length ||
    requiredGates(profile).some(
      (name) => gates.filter((g) => g.name === name).length !== 1,
    )
  )
    throw Error("Incomplete mandatory gate contract");
  if (
    gates.some(
      (g) =>
        g.status !== "passed" || g.findings.some((f) => f.status !== "passed"),
    )
  )
    throw Error("Mandatory technical gate did not pass");
}
export function assertGovernanceEvidence(
  report: EvidenceBundle,
  profile = "pr",
): void {
  if (report.governanceContractHash !== governanceContractHash())
    throw Error("Governance contract missing or incompatible");
  assertRequiredGates(report.gates, profile);
}
