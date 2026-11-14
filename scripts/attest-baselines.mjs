import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  resolveConfig,
  reviewSourceHash,
  safeRead,
  safePath,
  hash,
  canonical,
  governanceContractHash,
  validateSchema,
} from "../packages/contracts/src/index.ts";
import {
  verifyContext,
  taskContextGate,
} from "../packages/agent-core/src/index.ts";
import { lintProject } from "../packages/lint/src/index.ts";
import { visualTest, comparePng } from "../packages/visual/src/index.ts";
import {
  registry,
  baselineMetadataHash,
} from "../packages/visual/src/baseline.ts";
import {
  BASELINE_TECHNICAL_CHECKS,
  promoteTechnicalBaseline,
  verifyVisualChangeIntent,
  verifyTechnicalBaselineApproval,
} from "../packages/visual/src/technical-baseline.ts";

async function loadAuthority({ cwd = process.cwd(), keyFile, authority }) {
  if (typeof keyFile !== "string" || typeof authority !== "string")
    throw Error("Private key file and technical authority ID required");
  const { root: unresolved, config } = await resolveConfig(cwd),
    root = await realpath(unresolved);
  if (config.governance.mode !== "technical-autonomous")
    throw Error(
      "Automatic attestation requires technical-autonomous governance",
    );
  const keyPath = await realpath(resolve(keyFile));
  const keyRelative = relative(root, keyPath);
  if (
    keyRelative !== ".." &&
    !keyRelative.startsWith("../") &&
    !keyRelative.startsWith("..\\") &&
    !isAbsolute(keyRelative)
  )
    throw Error(
      "Private authority key must be outside the candidate filesystem",
    );
  const policy = JSON.parse(
    await safeRead(root, ".inteiro/technical-attestors.json"),
  );
  if (!validateSchema("technical-authority-policy", policy).valid)
    throw Error("Invalid protected technical authority policy");
  const key = createPrivateKey(await readFile(keyPath));
  if (
    key.asymmetricKeyType !== "ed25519" ||
    !Object.hasOwn(policy.authorities, authority) ||
    createPublicKey(key).export({ format: "pem", type: "spki" }).toString() !==
      createPublicKey(policy.authorities[authority])
        .export({ format: "pem", type: "spki" })
        .toString()
  )
    throw Error(
      "Independent technical authority does not match protected policy",
    );
  return { root, config, key, policy };
}
/** Replays use the same versioned image-equivalence policy as ordinary visual gates. */
export async function assessBaselineReplay(root, config, candidates, replay) {
  const comparisons = [],
    errors = [];
  const frames = new Map();
  for (const frame of replay.captures ?? []) {
    if (frames.has(frame.key))
      errors.push({ key: frame.key, reason: "duplicate-replay-key" });
    frames.set(frame.key, frame);
  }
  for (const candidate of candidates) {
    const frame = frames.get(candidate.key);
    if (
      !frame ||
      frame.environmentFingerprint !== candidate.environmentFingerprint ||
      frame.fixtureHash !== candidate.fixtureHash
    ) {
      errors.push({ key: candidate.key, reason: "replay-identity-mismatch" });
      continue;
    }
    const expected = await readFile(safePath(root, candidate.image)),
      actual = await readFile(safePath(root, frame.actual));
    if (
      hash(expected) !== candidate.imageSha256 ||
      hash(actual) !== frame.sha256
    ) {
      errors.push({ key: candidate.key, reason: "image-integrity-mismatch" });
      continue;
    }
    const comparison = comparePng(expected, actual, config);
    comparisons.push({
      key: candidate.key,
      bytesIdentical: candidate.imageSha256 === frame.sha256,
      passed: comparison.passed,
      ratio: comparison.ratio,
      reason: comparison.reason,
    });
  }
  return {
    passed:
      candidates.length > 0 &&
      !errors.length &&
      comparisons.length === candidates.length &&
      comparisons.every((result) => result.passed),
    policy: {
      maxDiffPixelRatio: config.visual.maxDiffPixelRatio,
      colorThreshold: config.visual.colorThreshold,
    },
    comparisons,
    errors,
  };
}

/** Trusted harness entry point. Never install the private key or this capability in a candidate. */
export async function attestBaselines({
  cwd = process.cwd(),
  keyFile,
  authority,
  all = false,
  authorizeStart = false,
  routeIds = [],
}) {
  const startedAt = new Date().toISOString();
  const { root, config, key, policy } = await loadAuthority({
    cwd,
    keyFile,
    authority,
  });
  const sourceHash = await reviewSourceHash(root);
  const prerequisite = await Promise.all([
    verifyContext(root, config),
    taskContextGate(root, config),
    lintProject(root, config),
  ]);
  if (prerequisite.some((gate) => gate.status !== "passed"))
    return {
      status: "blocked",
      kind: "automatic-baseline-evaluation",
      sourceHash,
      prerequisite,
      promoted: [],
    };
  const capture = await visualTest(root, config, {
    all,
    authorizeStart,
    routeIds,
    propose: true,
  });
  const entries = await registry(root, config.visual.baselineDir);
  const candidates = [...entries]
    .sort((a, b) => b.baselineVersion - a.baselineVersion)
    .filter(
      (entry) =>
        entry.state === "proposed" &&
        !entries.some(
          (approved) =>
            approved.key === entry.key &&
            approved.state === "approved" &&
            approved.imageSha256 === entry.imageSha256,
        ) &&
        entry.sourceHash === sourceHash &&
        capture.captures?.some(
          (frame) =>
            frame.key === entry.key && frame.sha256 === entry.imageSha256,
        ),
    );
  const seen = new Set();
  const selected = candidates.filter((candidate) => {
    if (seen.has(candidate.key)) return false;
    seen.add(candidate.key);
    return true;
  });
  candidates.splice(0, candidates.length, ...selected);
  if (
    !candidates.length &&
    capture.status === "passed" &&
    (await reviewSourceHash(root)) === sourceHash
  )
    return {
      status: "passed",
      kind: "automatic-baseline-noop",
      sourceHash,
      promoted: [],
      reason: "Current references already match the verified captures",
    };
  const intents = new Map();
  for (const candidate of candidates) {
    if (!candidate.previousBaselineId) continue;
    const path =
      config.reporting.outDir +
      "/visual-intents/" +
      candidate.key +
      "-" +
      candidate.previousBaselineId +
      ".json";
    const intent = JSON.parse(await safeRead(root, path));
    verifyVisualChangeIntent(
      intent,
      candidate,
      entries.find((entry) => entry.id === candidate.previousBaselineId),
      policy,
      startedAt,
    );
    intents.set(candidate.key, intent);
  }
  const permissible = (finding) => {
    if (
      finding.ruleId === "VIS-BASE-001" &&
      finding.message === "Approved baseline missing"
    )
      return true;
    if (finding.ruleId !== "VIS-DIFF-001") return false;
    const frame = capture.captures?.find((frame) =>
      ["route", "state", "viewport", "theme", "density"].every(
        (field) => frame[field] === finding[field],
      ),
    );
    return frame && intents.has(frame.key);
  };
  if (
    !capture.executed ||
    !candidates.length ||
    capture.findings.some((finding) => !permissible(finding))
  )
    return {
      status: "blocked",
      kind: "automatic-baseline-evaluation",
      sourceHash,
      prerequisite,
      capture,
      promoted: [],
      reason:
        "Unexpected findings or no eligible initial candidates; deliberate replacements require a prior visual intent",
    };
  // Independent replay checks every proposed image before any attestation is issued.
  const replay = await visualTest(root, config, {
    all,
    authorizeStart,
    routeIds,
  });
  const replayEquivalence = await assessBaselineReplay(
    root,
    config,
    candidates,
    replay,
  );
  if (
    replay.findings.some((finding) => !permissible(finding)) ||
    replay.executed !== capture.executed ||
    !replayEquivalence.passed ||
    (await reviewSourceHash(root)) !== sourceHash
  )
    return {
      status: "blocked",
      kind: "automatic-baseline-evaluation",
      sourceHash,
      prerequisite,
      capture,
      replay,
      replayEquivalence,
      promoted: [],
      reason: "Replay, source, environment or image stability check failed",
    };
  const directory =
    config.reporting.outDir + "/technical-attestation-" + Date.now();
  await mkdir(safePath(root, directory), { recursive: true });
  const evaluationPath = directory + "/evaluation.json";
  const evaluation = {
    schemaVersion: "1.0",
    kind: "automatic-baseline-evaluation",
    eligibility: "eligible-initial-baselines",
    sourceHash,
    startedAt,
    finishedAt: new Date().toISOString(),
    prerequisite,
    capture,
    replay,
    replayEquivalence,
    notes: [
      "Browser gates retain their original missing-baseline status. Only technical subchecks are attested; this is not human or aesthetic approval.",
    ],
  };
  const evaluationBytes = Buffer.from(JSON.stringify(evaluation, null, 2));
  await writeFile(safePath(root, evaluationPath), evaluationBytes, {
    flag: "wx",
  });
  const promoted = [];
  for (const candidate of candidates) {
    const payload = {
      schemaVersion: "1.0",
      kind: "automatic-technical-verification",
      purpose: "baseline-promotion",
      authority,
      policyHash: hash(policy),
      governanceContractHash: governanceContractHash(),
      sourceHash,
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
      configHash: hash(config),
      status: "passed",
      exitCode: 0,
      requirements: ["E05", "WP-15", "DoD-06"],
      checks: BASELINE_TECHNICAL_CHECKS.map((command) => ({
        command,
        status: "passed",
        exitCode: 0,
        evidence: [{ path: evaluationPath, sha256: hash(evaluationBytes) }],
      })),
      startedAt,
      finishedAt: evaluation.finishedAt,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      candidateId: candidate.id,
      candidateHash: baselineMetadataHash(candidate),
      imageSha256: candidate.imageSha256,
      ...(intents.has(candidate.key)
        ? { intent: intents.get(candidate.key) }
        : {}),
    };
    const approval = {
      ...payload,
      signature: sign(null, Buffer.from(canonical(payload)), key).toString(
        "base64",
      ),
    };
    const result = await promoteTechnicalBaseline(
      root,
      config.visual.baselineDir,
      approval,
      policy,
    );
    promoted.push(result.id);
  }
  return {
    status: "passed",
    kind: "automatic-baseline-promotion",
    sourceHash,
    evaluation: evaluationPath,
    promoted,
    humanApproval: "not-applicable",
  };
}

/** Issues an immutable contract only while the source still matches the prior reference. */
export async function declareVisualIntent({
  cwd = process.cwd(),
  keyFile,
  authority,
  baselineKey,
  allowedRegions,
  reason,
}) {
  const { root, config, key, policy } = await loadAuthority({
    cwd,
    keyFile,
    authority,
  });
  if (
    typeof baselineKey !== "string" ||
    !/^[a-f0-9]{64}$/.test(baselineKey) ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.length > 2000 ||
    !Array.isArray(allowedRegions) ||
    !allowedRegions.length ||
    allowedRegions.length > 64 ||
    allowedRegions.some(
      (region) =>
        [region.x, region.y, region.width, region.height].some(
          (value) => !Number.isInteger(value),
        ) ||
        region.x < 0 ||
        region.y < 0 ||
        region.width < 1 ||
        region.height < 1,
    )
  )
    throw Error(
      "An exact reference key, bounded regions and a reason are required",
    );
  const entries = await registry(root, config.visual.baselineDir);
  const previous = entries.find(
    (entry) => entry.key === baselineKey && entry.state === "approved",
  );
  if (!previous || previous.sourceHash !== (await reviewSourceHash(root)))
    throw Error(
      "Visual intent must be declared before source changes, against the current reference",
    );
  const previousApproval = JSON.parse(
    await safeRead(
      root,
      config.visual.baselineDir + "/" + previous.id + ".approval.json",
    ),
  );
  verifyTechnicalBaselineApproval(
    previousApproval,
    previous,
    policy,
    entries.find((entry) => entry.id === previous.previousBaselineId),
  );
  if (
    hash(await readFile(safePath(root, previous.image))) !==
    previous.imageSha256
  )
    throw Error("Prior reference image changed");
  const payload = {
    kind: "declared-visual-change",
    authority,
    policyHash: hash(policy),
    key: baselineKey,
    previousBaselineId: previous.id,
    previousImageSha256: previous.imageSha256,
    sourceHashBeforeChange: previous.sourceHash,
    reason: reason.trim(),
    allowedRegions,
    declaredAt: new Date().toISOString(),
  };
  const intent = {
    ...payload,
    signature: sign(null, Buffer.from(canonical(payload)), key).toString(
      "base64",
    ),
  };
  const directory = config.reporting.outDir + "/visual-intents";
  await mkdir(safePath(root, directory), { recursive: true });
  const path = directory + "/" + baselineKey + "-" + previous.id + ".json";
  await writeFile(safePath(root, path), JSON.stringify(intent, null, 2), {
    flag: "wx",
  });
  return {
    status: "passed",
    kind: "declared-visual-change",
    path,
    sha256: hash(Buffer.from(JSON.stringify(intent, null, 2))),
    sourceHash: previous.sourceHash,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const value = (name) => {
    const index = process.argv.indexOf("--" + name);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  try {
    const result =
      process.argv[2] === "intent"
        ? await declareVisualIntent({
            cwd: value("cwd") ?? process.cwd(),
            keyFile: value("key"),
            authority: value("authority"),
            baselineKey: value("reference"),
            allowedRegions: JSON.parse(value("regions") ?? "null"),
            reason: value("reason"),
          })
        : await attestBaselines({
            cwd: value("cwd") ?? process.cwd(),
            keyFile: value("key"),
            authority: value("authority"),
            all: process.argv.includes("--all"),
            authorizeStart: process.argv.includes("--start"),
            routeIds: (value("routes") ?? "").split(",").filter(Boolean),
          });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "passed" ? 0 : 7;
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "error",
        kind: "automatic-baseline-promotion",
        message: String(error),
      }),
    );
    process.exitCode = 8;
  }
}
