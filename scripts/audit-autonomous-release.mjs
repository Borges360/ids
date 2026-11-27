import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  copyFile,
  realpath,
  stat,
} from "node:fs/promises";
import { relative, isAbsolute, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  randomUUID,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  hash,
  canonical,
  safePath,
  safeRead,
  resolveConfig,
  reviewSourceHash,
  readEvidence,
  assertGovernanceEvidence,
  governanceContractHash,
  GOVERNANCE_CONTRACT,
  verifyTechnicalAttestation,
  exportEvidenceArchive,
  extractEvidenceArchive,
} from "../packages/contracts/src/index.ts";
import {
  RELEASE_REQUIREMENTS,
  releaseGate,
} from "../packages/agent-core/src/release.ts";
import { RELEASE_QUALIFICATION_CHECKS } from "../packages/agent-core/src/release-qualification.ts";
import { buildRequirementIndex } from "../packages/agent-core/src/requirement-evidence.ts";

export async function auditAutonomousRelease(options) {
  const { root: unresolved, config } = await resolveConfig(
    options.cwd ?? process.cwd(),
  );
  const root = await realpath(unresolved),
    sourceHash = await reviewSourceHash(root);
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const checks = [],
    errors = [];
  const artifact = async (path) => ({
    path,
    sha256: hash(await readFile(safePath(root, path))),
  });
  const json = async (path) => JSON.parse(await safeRead(root, path));
  const requireProof = async (name, operation) => {
    try {
      await operation();
    } catch (error) {
      errors.push({ name, message: String(error) });
    }
  };
  let matrix, core;
  if (config.governance.mode !== "technical-autonomous")
    errors.push({
      name: "governance",
      message: "Technical autonomous mode required",
    });
  await requireProof("scope", async () => {
    matrix = await json("docs/P0_AUTONOMOUS_MATRIX.json");
    if (
      matrix.requirements.length !== 58 ||
      new Set(matrix.requirements.map((row) => row.id)).size !== 58 ||
      RELEASE_REQUIREMENTS.some(
        (id) => !matrix.requirements.some((row) => row.id === id),
      )
    )
      throw Error("Incomplete scope inventory");
    if (
      hash(
        await readFile(safePath(root, matrix.historicalSpecification.path)),
      ) !== matrix.historicalSpecification.sha256 ||
      matrix.historicalSpecification.sha256 !==
        "e73f1ff32e92e6cc412226e9afe56f18c7ba8768bbfa8f25230e13094b1dccd9"
    )
      throw Error("Historical specification changed");
    for (const row of matrix.requirements) {
      if (
        !["mandatory", "technical-substitution"].includes(row.applicability) ||
        !row.requiredEvidence ||
        !row.verification?.length ||
        !row.implementation?.length
      )
        throw Error("Incomplete requirement: " + row.id);
      for (const path of row.implementation) {
        const info = await stat(safePath(root, path));
        if (!info.isFile() && !info.isDirectory())
          throw Error("Invalid implementation reference: " + path);
      }
    }
  });
  for (const [platform, path] of [
    ["win32", options.windows],
    ["linux", options.linux],
  ])
    await requireProof(platform, async () => {
      if (!path) throw Error("Platform verification report required");
      const report = await json(path);
      if (
        report.platform !== platform ||
        report.status !== "passed" ||
        report.sourceHash !== sourceHash ||
        report.finishedSourceHash !== sourceHash ||
        !report.finishedAt ||
        report.finishedCommit !== report.sourceCommit
      )
        throw Error(
          "Platform proof is incomplete, stale or from another source",
        );
      const required = RELEASE_QUALIFICATION_CHECKS.filter(
        (name) => platform !== "linux" || name !== "worker-isolation",
      );
      if (
        (platform === "win32" &&
          (report.scope !== "full-source" ||
            report.sourceCommit !== sourceCommit)) ||
        (platform === "linux" &&
          (report.scope !== "linux-runtime" ||
            report.workingTreeDirty !== false ||
            hash(report.externalCoverageRequired) !==
              hash(["worker-isolation"])))
      )
        throw Error("Platform scope or clean-checkout proof mismatch");
      if (
        new Set(report.checks.map((check) => check.name)).size !==
          report.checks.length ||
        required.some(
          (name) => !report.checks.some((check) => check.name === name),
        )
      )
        throw Error("Missing platform checks");
      const evidence = [await artifact(path)];
      for (const check of report.checks) {
        if (
          check.status !== "passed" ||
          check.exitCode !== 0 ||
          !check.command ||
          (await artifact(check.log)).sha256 !== check.sha256
        )
          throw Error("Unproven platform command: " + check.name);
        evidence.push(await artifact(check.log));
      }
      checks.push({
        command: platform + " fixed source qualification",
        status: "passed",
        exitCode: 0,
        evidence,
      });
    });
  await requireProof("clean-snapshot", async () => {
    if (!options.snapshot) throw Error("Clean snapshot evidence required");
    const snapshot = await json(options.snapshot),
      linux = await json(options.linux);
    if (
      snapshot.status !== "passed" ||
      snapshot.kind !== "clean-source-snapshot" ||
      snapshot.sourceHash !== sourceHash ||
      snapshot.snapshotHash !== sourceHash ||
      snapshot.sourceCommit !== sourceCommit ||
      snapshot.snapshotCommit !== linux.sourceCommit
    )
      throw Error("Clean snapshot differs from the qualified source");
    checks.push({
      command: "clean source snapshot with equal hashes",
      status: "passed",
      exitCode: 0,
      evidence: [await artifact(options.snapshot)],
    });
  });
  await requireProof("core-gates", async () => {
    if (!options.core) throw Error("Current complete core evidence required");
    core = await readEvidence(root, options.core);
    assertGovernanceEvidence(core, "pr");
    if (
      core.sourceHash !== sourceHash ||
      core.finishedSourceHash !== sourceHash ||
      core.configHash !== hash(config) ||
      // Envelope written by writeReport; a bare "1.1" never matched real evidence.
      core.evidenceFormat !== "inteiro-evidence/v1.1"
    )
      throw Error("Core evidence differs from the source or envelope contract");
    checks.push({
      command: "current context, static, browser and automatic review gates",
      status: "passed",
      exitCode: 0,
      evidence: [
        await artifact(options.core),
        ...core.artifacts.map(({ path, sha256 }) => ({ path, sha256 })),
      ],
    });
  });
  // A common receipt may index many proofs, but every row must resolve to the
  // cases, checks and gates that actually executed for this source.
  let index;
  await requireProof("requirements", async () => {
    index = await buildRequirementIndex(root, {
      matrix: "docs/P0_AUTONOMOUS_MATRIX.json",
      windows: options.windows,
      linux: options.linux,
      core: options.core,
    });
    if (index.status !== "passed")
      throw Error(
        "Requirements without current executed proof: " +
          index.requirements
            .filter((row) => row.status !== "passed")
            .map((row) => row.id + " [" + row.errors.join("; ") + "]")
            .join(", "),
      );
  });
  const result = {
    schemaVersion: "1.0",
    kind: "autonomous-release-audit",
    status: errors.length ? "blocked" : "passed",
    sourceHash,
    sourceCommit,
    requirements: 58,
    requirementIndex: index
      ? {
          status: index.status,
          passed: index.requirements.filter((row) => row.status === "passed")
            .length,
          blocked: index.requirements
            .filter((row) => row.status !== "passed")
            .map((row) => ({ id: row.id, errors: row.errors })),
        }
      : null,
    errors,
    checks,
  };
  if (errors.length || !options.finalize)
    return { ...result, finalized: false };
  const keyPath = await realpath(resolve(options.keyFile)),
    keyRelative = relative(root, keyPath);
  if (
    keyRelative !== ".." &&
    !keyRelative.startsWith("../") &&
    !keyRelative.startsWith("..\\") &&
    !isAbsolute(keyRelative)
  )
    throw Error("Authority key must be outside the implementation filesystem");
  const policy = await json(".inteiro/technical-attestors.json"),
    key = createPrivateKey(await readFile(keyPath));
  if (
    key.asymmetricKeyType !== "ed25519" ||
    !policy.authorities?.[options.authority] ||
    createPublicKey(key).export({ format: "pem", type: "spki" }).toString() !==
      createPublicKey(policy.authorities[options.authority])
        .export({ format: "pem", type: "spki" })
        .toString()
  )
    throw Error("Authority does not match protected public policy");
  const directory = ".inteiro/reports/final-audit-" + randomUUID();
  await mkdir(safePath(root, directory), { recursive: true });
  const archive = directory + "/portable.json";
  await exportEvidenceArchive(root, options.core, archive);
  const outside = await mkdtemp(resolve(tmpdir(), "inteiro-final-portable-"));
  await copyFile(safePath(root, archive), safePath(outside, "portable.json"));
  const portable = await extractEvidenceArchive(
    outside,
    "portable.json",
    "extracted",
  );
  if (portable.sourceReportHash !== core.hash)
    throw Error("Portable verification refers to a different execution");
  const portablePath = directory + "/portability.json";
  await writeFile(
    safePath(root, portablePath),
    JSON.stringify(
      { ...portable, extractedRoot: outside, sourceHash },
      null,
      2,
    ),
  );
  checks.push({
    command: "export, extract and verify outside the original checkout",
    status: "passed",
    exitCode: 0,
    evidence: [await artifact(archive), await artifact(portablePath)],
  });
  const indexPath = directory + "/requirements-index.json";
  await writeFile(
    safePath(root, indexPath),
    JSON.stringify(index, null, 2) + "\n",
    { flag: "wx" },
  );
  const indexReference = await artifact(indexPath);
  if ((await reviewSourceHash(root)) !== sourceHash)
    throw Error("Source changed during final audit");
  const now = new Date().toISOString();
  const payload = {
    schemaVersion: "1.0",
    kind: "automatic-technical-verification",
    authority: options.authority,
    policyHash: hash(policy),
    governanceContractHash: governanceContractHash(),
    sourceHash,
    sourceCommit,
    configHash: hash(config),
    status: "passed",
    exitCode: 0,
    requirements: RELEASE_REQUIREMENTS,
    requirementIndex: indexReference,
    checks,
    startedAt: now,
    finishedAt: now,
    expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  };
  const receipt = {
    ...payload,
    signature: sign(null, Buffer.from(canonical(payload)), key).toString(
      "base64",
    ),
  };
  verifyTechnicalAttestation(receipt, policy, payload);
  const receiptPath = directory + "/technical-verification.json";
  await writeFile(
    safePath(root, receiptPath),
    JSON.stringify(receipt, null, 2),
    { flag: "wx" },
  );
  const reference = await artifact(receiptPath),
    previousLedger = await safeRead(root, "release-evidence.json"),
    previousMatrix = await safeRead(root, "docs/P0_AUTONOMOUS_MATRIX.json");
  try {
    for (const row of matrix.requirements) {
      const proven = index.requirements.find((entry) => entry.id === row.id);
      Object.assign(row, {
        status: "passed",
        evidence: [reference, indexReference],
        remaining: "Nenhum requisito técnico pendente na versão qualificada.",
        qualification: {
          status: "passed",
          sourceHash,
          receipt: reference,
          index: indexReference,
          proof: {
            tests: proven.tests.map(({ file, cases, passed }) => ({
              file,
              cases,
              passed,
            })),
            checks: proven.checks.map((check) => check.name),
            gates: proven.gates.map((gate) => gate.name),
            coverage: proven.coverage.map(
              ({ path, expected, passed, notApplicable }) => ({
                path,
                expected,
                passed,
                notApplicable,
              }),
            ),
            requirements: proven.requirements,
          },
          verifiedAt: now,
        },
      });
    }
    const ledger = {
      schemaVersion: "1.0",
      version: JSON.parse(await safeRead(root, "package.json")).version,
      sourceCommit,
      sourceHash,
      configHash: hash(config),
      policyHash: hash(policy),
      governanceContractHash: governanceContractHash(),
      scopeExclusions: [...GOVERNANCE_CONTRACT.scopeExclusions],
      approval: null,
      requirements: RELEASE_REQUIREMENTS.map((id) => ({
        id,
        status: "passed",
        reason:
          "Automatic technical qualification; human approval is not applicable.",
        evidence: [reference, indexReference],
      })),
    };
    await writeFile(
      safePath(root, "docs/P0_AUTONOMOUS_MATRIX.json"),
      JSON.stringify(matrix, null, 2) + "\n",
    );
    await writeFile(
      safePath(root, "release-evidence.json"),
      JSON.stringify(ledger, null, 2) + "\n",
    );
    const gate = await releaseGate(root, config);
    if (
      gate.status !== "passed" ||
      (await reviewSourceHash(root)) !== sourceHash
    )
      throw Error("Final release gate rejected the audited evidence");
    return {
      ...result,
      status: "passed",
      finalized: true,
      receipt: reference,
      gate,
      portability: portable,
    };
  } catch (error) {
    await writeFile(safePath(root, "release-evidence.json"), previousLedger);
    await writeFile(
      safePath(root, "docs/P0_AUTONOMOUS_MATRIX.json"),
      previousMatrix,
    );
    throw error;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const value = (name) => {
    const index = process.argv.indexOf("--" + name);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  try {
    const result = await auditAutonomousRelease({
      windows: value("windows"),
      linux: value("linux"),
      snapshot: value("snapshot"),
      core: value("core"),
      finalize: process.argv.includes("--finalize"),
      keyFile: value("key"),
      authority: value("authority"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "passed" ? 0 : 7;
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "error",
        kind: "autonomous-release-audit",
        message: String(error),
      }),
    );
    process.exitCode = 8;
  }
}
