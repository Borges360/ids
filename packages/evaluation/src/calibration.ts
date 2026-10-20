import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createPublicKey, verify } from "node:crypto";
import {
  REVIEW_AXES,
  canonical,
  hash,
  safePath,
  safeRead,
  validateSchema,
} from "@inteiro/contracts";
import { percentile, median } from "./experiments.ts";

export interface CalibrationAxis {
  axis: (typeof REVIEW_AXES)[number];
  score: number;
  evidenceId: string;
  element: string;
  reason: string;
  action: string;
}
export interface CalibrationCase {
  id: string;
  density: "calm" | "focus";
  scenarios: ("long-text" | "overlay" | "default")[];
  captures: { id: string; path: string; sha256: string }[];
  axes: CalibrationAxis[];
  verdict: "accept" | "block";
  severe: boolean;
  rank: number | null;
}
export interface CalibrationReference {
  schemaVersion: "1.0";
  kind: "review-calibration-reference";
  purpose: "human-reference" | "synthetic";
  idsCommit: string;
  configHash: string;
  rubricVersion: "1.0";
  reviewer: string;
  approvalRef: string;
  reason: string;
  signedAt: string;
  expiresAt: string;
  signature: string;
  cases: CalibrationCase[];
}
export interface CalibrationObservation {
  caseId: string;
  reviewer: string;
  version: string;
  promptHash: string;
  artifactHashes: string[];
  axes: CalibrationAxis[] | null;
  verdict: "accept" | "block" | "insufficient";
  rank: number | null;
  cost: number | null;
  durationMs: number;
  tokensIn: number | null;
  tokensOut: number | null;
}
export interface ReviewCalibrationInput {
  schemaVersion: "1.0";
  kind: "recorded-review-calibration";
  reference: { path: string; sha256: string };
  configHash: string;
  currency: string;
  observations: CalibrationObservation[];
}
/** Average ranks preserve ties; no probability calibration is inferred. */
export function spearman(left: number[], right: number[]): number | null {
  if (
    left.length !== right.length ||
    [...left, ...right].some((n) => !Number.isFinite(n))
  )
    throw Error("Invalid paired ranking inputs");
  if (left.length < 2) return null;
  const ranks = (values: number[]) => {
    const sorted = values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value);
    const result = new Array<number>(values.length);
    for (let start = 0; start < sorted.length;) {
      let end = start + 1;
      while (end < sorted.length && sorted[end]!.value === sorted[start]!.value)
        end++;
      for (let i = start; i < end; i++)
        result[sorted[i]!.index] = (start + end + 1) / 2;
      start = end;
    }
    return result;
  };
  const a = ranks(left),
    b = ranks(right),
    mean = (left.length + 1) / 2;
  const covariance = a.reduce(
    (sum, value, i) => sum + (value - mean) * (b[i]! - mean),
    0,
  );
  const variance = (values: number[]) =>
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const denominator = Math.sqrt(variance(a) * variance(b));
  return denominator
    ? Math.max(-1, Math.min(1, covariance / denominator))
    : null;
}
function assertAxes(
  axes: CalibrationAxis[],
  captures: CalibrationCase["captures"],
) {
  if (
    new Set(axes.map((item) => item.axis)).size !== REVIEW_AXES.length ||
    axes.some(
      (item) => !captures.some((capture) => capture.id === item.evidenceId),
    )
  )
    throw Error("Calibration rubric duplicates axes or cites unseen evidence");
}
const ratio = (n: number, d: number) => (d ? n / d : null);
function total(values: number[], integer = false) {
  const result = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(result) || (integer && !Number.isSafeInteger(result)))
    throw Error("Calibration accounting total exceeds safe numeric bounds");
  return result;
}
export async function calibrateReviews(
  root: string,
  path: string,
  outDir: string,
  options: { dryRun?: boolean } = {},
) {
  const input: ReviewCalibrationInput = JSON.parse(await safeRead(root, path));
  if (!validateSchema("review-calibration-input", input).valid)
    throw Error("Invalid review calibration input schema");
  await safeRead(root, input.reference.path);
  const bytes = await readFile(safePath(root, input.reference.path));
  if (hash(bytes) !== input.reference.sha256)
    throw Error("Calibration reference snapshot hash mismatch");
  const reference: CalibrationReference = JSON.parse(bytes.toString("utf8"));
  if (
    !validateSchema("review-calibration-reference", reference).valid ||
    reference.configHash !== input.configHash
  )
    throw Error("Invalid calibration reference/configuration");
  const policy = JSON.parse(
    await safeRead(root, ".inteiro/calibration-reviewers.json"),
  ) as {
    schemaVersion: string;
    reviewers: Record<
      string,
      { kind: "human" | "synthetic"; publicKey: string }
    >;
  };
  if (!validateSchema("review-calibration-reviewers", policy).valid)
    throw Error("Invalid calibration reviewer trust policy");
  const identity = policy.reviewers[reference.reviewer];
  if (
    !identity ||
    identity.kind !==
      (reference.purpose === "synthetic" ? "synthetic" : "human")
  )
    throw Error("Reference signer is not authorized for this dataset purpose");
  const { signature, ...payload } = reference;
  const publicKey = createPublicKey(identity.publicKey);
  if (
    publicKey.asymmetricKeyType !== "ed25519" ||
    !verify(
      null,
      Buffer.from(canonical(payload)),
      publicKey,
      Buffer.from(signature, "base64"),
    )
  )
    throw Error("Invalid signed calibration reference");
  const signedAt = Date.parse(reference.signedAt),
    expiresAt = Date.parse(reference.expiresAt);
  const canonicalDate = (text: string, timestamp: number) => {
    if (!Number.isFinite(timestamp)) return false;
    const iso = new Date(timestamp).toISOString();
    return text === iso || text === iso.replace(".000Z", "Z");
  };
  if (
    !Number.isFinite(signedAt) ||
    !Number.isFinite(expiresAt) ||
    !canonicalDate(reference.signedAt, signedAt) ||
    !canonicalDate(reference.expiresAt, expiresAt) ||
    signedAt > Date.now() + 1000 ||
    expiresAt <= Date.now() ||
    expiresAt <= signedAt
  )
    throw Error("Expired or invalid calibration reference dates");
  const cases = new Map<string, CalibrationCase>();
  for (const item of reference.cases) {
    if (
      cases.has(item.id) ||
      new Set(item.captures.map((capture) => capture.id)).size !==
        item.captures.length ||
      (item.severe && item.verdict !== "block") ||
      (item.rank !== null && item.rank > reference.cases.length)
    )
      throw Error("Invalid reference case identity, ranking or severity");
    assertAxes(item.axes, item.captures);
    for (const capture of item.captures) {
      await safeRead(root, capture.path);
      if (hash(await readFile(safePath(root, capture.path))) !== capture.sha256)
        throw Error("Calibration capture bytes changed");
    }
    cases.set(item.id, item);
  }
  if (
    !["calm", "focus"].every((density) =>
      reference.cases.some((item) => item.density === density),
    ) ||
    !["long-text", "overlay"].every((scenario) =>
      reference.cases.some((item) =>
        item.scenarios.includes(scenario as "long-text" | "overlay"),
      ),
    )
  )
    throw Error(
      "Calibration reference must cover long text, overlays and both densities",
    );
  const groups = new Map<string, CalibrationObservation[]>(),
    seen = new Set<string>();
  for (const observation of input.observations) {
    if (
      !Number.isFinite(observation.durationMs) ||
      (observation.cost !== null && !Number.isFinite(observation.cost))
    )
      throw Error("Calibration accounting must be finite");
    const item = cases.get(observation.caseId);
    const group = JSON.stringify([
      observation.reviewer,
      observation.version,
      observation.promptHash,
    ]);
    const key = JSON.stringify([group, observation.caseId]);
    if (
      !item ||
      seen.has(key) ||
      (observation.rank !== null && observation.rank > cases.size)
    )
      throw Error("Unknown/duplicate calibration case or invalid ranking");
    seen.add(key);
    if (observation.axes !== null) assertAxes(observation.axes, item.captures);
    if (
      hash([...observation.artifactHashes].sort()) !==
      hash(item.captures.map((capture) => capture.sha256).sort())
    )
      throw Error("Reviewer observation is bound to different captures");
    const rows = groups.get(group) ?? [];
    rows.push(observation);
    groups.set(group, rows);
  }
  const summaries = [...groups.values()].map((rows) => {
    if (rows.length !== cases.size)
      throw Error(
        "Incomplete calibration coverage for reviewer/version/prompt",
      );
    const pairs = rows.map((row) => ({
      row,
      reference: cases.get(row.caseId)!,
    }));
    const accepts = pairs.filter((pair) => pair.reference.verdict === "accept"),
      severe = pairs.filter((pair) => pair.reference.severe);
    const falseBlocks = accepts.filter(
        (pair) => pair.row.verdict === "block",
      ).length,
      severeMisses = severe.filter(
        (pair) => pair.row.verdict === "accept",
      ).length;
    const ranked = pairs.filter(
      (pair) => pair.row.rank !== null && pair.reference.rank !== null,
    );
    const knownCost = rows.filter((row) => row.cost !== null);
    const knownSubtotal = total(knownCost.map((row) => row.cost!));
    return {
      reviewer: rows[0]!.reviewer,
      version: rows[0]!.version,
      promptHash: rows[0]!.promptHash,
      cases: rows.length,
      decisionAgreement: ratio(
        pairs.filter((pair) => pair.row.verdict === pair.reference.verdict)
          .length,
        rows.length,
      ),
      falseBlocks: {
        count: falseBlocks,
        denominator: accepts.length,
        rate: ratio(falseBlocks, accepts.length),
        caseIds: accepts
          .filter((pair) => pair.row.verdict === "block")
          .map((pair) => pair.row.caseId),
      },
      severeMisses: {
        count: severeMisses,
        denominator: severe.length,
        rate: ratio(severeMisses, severe.length),
        caseIds: severe
          .filter((pair) => pair.row.verdict === "accept")
          .map((pair) => pair.row.caseId),
      },
      deferrals: pairs.filter((pair) => pair.row.verdict === "insufficient")
        .length,
      severeDeferrals: severe.filter(
        (pair) => pair.row.verdict === "insufficient",
      ).length,
      axes: REVIEW_AXES.map((axis) => {
        const scored = pairs.filter((pair) => pair.row.axes !== null);
        const observed = scored.map(
            (pair) =>
              pair.row.axes!.find((score) => score.axis === axis)!.score,
          ),
          expected = scored.map(
            (pair) =>
              pair.reference.axes.find((score) => score.axis === axis)!.score,
          );
        return {
          axis,
          evaluatedCases: scored.length,
          unscoredCases: rows.length - scored.length,
          exactAgreement: ratio(
            observed.filter((value, i) => value === expected[i]).length,
            scored.length,
          ),
          meanAbsoluteError: scored.length
            ? observed.reduce(
                (sum, value, i) => sum + Math.abs(value - expected[i]!),
                0,
              ) / scored.length
            : null,
          rankCorrelation: spearman(observed, expected),
        };
      }),
      ranking: {
        pairs: ranked.length,
        correlation: spearman(
          ranked.map((pair) => pair.row.rank!),
          ranked.map((pair) => pair.reference.rank!),
        ),
      },
      cost: {
        currency: input.currency,
        knownReviews: knownCost.length,
        unknownReviews: rows.length - knownCost.length,
        knownSubtotal,
        total: knownCost.length === rows.length ? knownSubtotal : null,
        perReview:
          knownCost.length === rows.length ? knownSubtotal / rows.length : null,
      },
      durationMs: {
        median: median(rows.map((row) => row.durationMs)),
        p90: percentile(
          rows.map((row) => row.durationMs),
          0.9,
        ),
      },
      tokensIn: rows.every((row) => row.tokensIn !== null)
        ? total(
            rows.map((row) => row.tokensIn!),
            true,
          )
        : null,
      tokensOut: rows.every((row) => row.tokensOut !== null)
        ? total(
            rows.map((row) => row.tokensOut!),
            true,
          )
        : null,
      tokenCoverage: {
        knownInputReviews: rows.filter((row) => row.tokensIn !== null).length,
        knownOutputReviews: rows.filter((row) => row.tokensOut !== null).length,
      },
    };
  });
  const result = {
    schemaVersion: "1.0",
    kind: "review-calibration-measurement",
    algorithm: "review-calibration-v1",
    status: options.dryRun ? ("not_run" as const) : ("passed" as const),
    dryRun: options.dryRun === true,
    inputHash: hash(input),
    referenceHash: input.reference.sha256,
    trustPolicyHash: hash(policy),
    configHash: input.configHash,
    idsCommit: reference.idsCommit,
    referencePurpose: reference.purpose,
    humanReferencesAvailable: reference.purpose === "human-reference",
    certified: false,
    groups: summaries,
    reference: {
      path: input.reference.path,
      sha256: input.reference.sha256,
      reviewer: reference.reviewer,
      approvalRef: reference.approvalRef,
      signedAt: reference.signedAt,
      expiresAt: reference.expiresAt,
      rubricVersion: reference.rubricVersion,
    },
    limitations: [
      "Measurements describe only this signed dataset. No reviewer, baseline or release is automatically approved. Confidence is not treated as a calibrated probability. Null correlations indicate insufficient paired ranks or zero variance. Scenario coverage is declared by the reference signer; image semantics are not inferred.",
    ],
  };
  const directory = safePath(root, outDir);
  if (!options.dryRun) {
    await mkdir(directory, { recursive: true });
    await writeFile(
      safePath(root, outDir + "/calibration.json"),
      JSON.stringify(result, null, 2),
    );
  }
  return result;
}
