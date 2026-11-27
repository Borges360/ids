import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";
import {
  canonical,
  hash,
  safePath,
  safeRead,
  readEvidence,
  reviewSourceHash,
} from "@inteiro/contracts";
import { RELEASE_QUALIFICATION_CHECKS } from "./release-qualification.ts";
import {
  verifyPatternCoverage,
  type CoverageMatrix,
  type PatternCoverageEvidence,
  type StoryInventory,
} from "./coverage-evidence.ts";

const STORY_INVENTORY = "packages/composition/story-matrix.json";

/**
 * Per-requirement acceptance index. A shared receipt may sign many proofs, but
 * each requirement row must resolve to the concrete cases, qualification
 * checks and core gates that executed for the same source. Checks and gates
 * add scope to a row; only an executed, passed case of its own accepts it.
 */
export interface RequirementProof {
  tests?: string[];
  checks?: string[];
  gates?: string[];
  requirements?: string[];
  /** Coverage maps whose every declared dimension must resolve to an executed case. */
  coverage?: string[];
}
interface MatrixRow {
  id: string;
  applicability: string;
  proof?: RequirementProof;
}
interface Artifact {
  path: string;
  sha256: string;
}
interface CaseResult {
  key: string;
  file: string;
  status: "passed" | "failed" | "skipped";
  platform: string;
  check: string;
  result: Artifact;
}
export interface RequirementIndexInputs {
  matrix: string;
  windows: string;
  linux: string;
  core: string;
}
export interface RequirementIndexRow {
  id: string;
  applicability: string;
  status: "passed" | "blocked";
  tests: {
    file: string;
    cases: number;
    passed: number;
    results: (Artifact & { platform: string; check: string })[];
  }[];
  checks: {
    name: string;
    platforms: {
      platform: string;
      coverage: "executed" | "external";
      log: Artifact;
    }[];
  }[];
  gates: { name: string; runId: string; durationMs: number }[];
  coverage: (Artifact & Omit<PatternCoverageEvidence, "missing" | "errors">)[];
  requirements: string[];
  errors: string[];
}
export interface RequirementIndex {
  schemaVersion: "1.0";
  kind: "requirement-evidence-index";
  sourceHash: string;
  matrix: { path: string; contractHash: string };
  inputs: Record<"windows" | "linux" | "core", Artifact>;
  status: "passed" | "blocked";
  requirements: RequirementIndexRow[];
}

const ACCEPTED = new Set(["mandatory", "technical-substitution"]);
const portable = (path: string) => path.replace(/\\/g, "/");
const below = (root: string, path: string) => {
  const base = portable(root).replace(/\/+$/, "") + "/",
    normalized = portable(path);
  return normalized.startsWith(base)
    ? posix.normalize(normalized.slice(base.length))
    : undefined;
};

/** Progress fields are excluded so the result can be recorded without circularity. */
export function matrixContractHash(matrix: {
  requirements: Record<string, unknown>[];
}): string {
  return hash({
    ...matrix,
    requirements: matrix.requirements.map(
      ({
        status: _,
        evidence: __,
        qualification: ___,
        remaining: ____,
        ...row
      }) => row,
    ),
  });
}

async function artifact(root: string, path: string): Promise<Artifact> {
  return { path, sha256: hash(await readFile(safePath(root, path))) };
}

/** Structured runner output only; text logs never decide a case result. */
function parseResults(
  bytes: Buffer,
  format: string,
  runRoot: string,
): { file: string; key: string; status: CaseResult["status"] }[] {
  const report = JSON.parse(bytes.toString("utf8"));
  const cases: { file: string; key: string; status: CaseResult["status"] }[] =
    [];
  if (format === "vitest-json") {
    for (const file of report.testResults ?? []) {
      const relative = below(runRoot, String(file.name ?? ""));
      if (!relative) continue;
      for (const result of file.assertionResults ?? [])
        cases.push({
          file: relative,
          key: relative + "::" + String(result.fullName),
          status:
            result.status === "passed"
              ? "passed"
              : result.status === "failed"
                ? "failed"
                : "skipped",
        });
      // A file that failed to load has no assertions but must not look absent.
      if (file.status === "failed" && !(file.assertionResults ?? []).length)
        cases.push({
          file: relative,
          key: relative + "::<suite>",
          status: "failed",
        });
    }
    return cases;
  }
  if (format === "playwright-json") {
    const testRoot = String(report.config?.rootDir ?? "");
    const visit = (suite: any, titles: string[]) => {
      for (const spec of suite.specs ?? []) {
        const relative = below(
          runRoot,
          posix.join(portable(testRoot), portable(String(spec.file ?? ""))),
        );
        if (!relative) continue;
        for (const test of spec.tests ?? [])
          cases.push({
            file: relative,
            key: [relative, ...titles, spec.title, test.projectName ?? ""].join(
              "::",
            ),
            // Flaky passes are not stable evidence; unexpected results fail.
            status:
              test.status === "expected"
                ? "passed"
                : test.status === "skipped"
                  ? "skipped"
                  : "failed",
          });
      }
      for (const child of suite.suites ?? [])
        visit(child, [...titles, child.title]);
    };
    for (const suite of report.suites ?? []) visit(suite, []);
    return cases;
  }
  throw Error("Unsupported structured test result format: " + format);
}

async function loadPlatform(
  root: string,
  path: string,
  platform: "win32" | "linux",
  sourceHash: string,
) {
  const report = JSON.parse(await safeRead(root, path));
  if (
    report.platform !== platform ||
    report.status !== "passed" ||
    report.sourceHash !== sourceHash ||
    report.finishedSourceHash !== sourceHash ||
    typeof report.root !== "string" ||
    !Array.isArray(report.checks)
  )
    throw Error(platform + " qualification report is not current and passed");
  const cases: CaseResult[] = [];
  const checks = new Map<string, Artifact>();
  for (const check of report.checks) {
    const log = await artifact(root, check.log);
    if (
      check.status !== "passed" ||
      check.exitCode !== 0 ||
      log.sha256 !== check.sha256
    )
      throw Error(platform + " check output changed or failed: " + check.name);
    checks.set(check.name, log);
    for (const entry of check.results ?? []) {
      const bytes = await readFile(safePath(root, entry.path));
      if (hash(bytes) !== entry.sha256)
        throw Error(platform + " structured result changed: " + entry.path);
      for (const value of parseResults(bytes, entry.format, report.root))
        cases.push({
          ...value,
          platform,
          check: check.name,
          result: { path: entry.path, sha256: entry.sha256 },
        });
    }
  }
  return {
    cases,
    checks,
    external: new Set<string>(report.externalCoverageRequired ?? []),
  };
}

export async function buildRequirementIndex(
  root: string,
  inputs: RequirementIndexInputs,
): Promise<RequirementIndex> {
  const sourceHash = await reviewSourceHash(root);
  const matrix = JSON.parse(await safeRead(root, inputs.matrix));
  const platforms = {
    win32: await loadPlatform(root, inputs.windows, "win32", sourceHash),
    linux: await loadPlatform(root, inputs.linux, "linux", sourceHash),
  };
  const core = await readEvidence(root, inputs.core);
  if (core.sourceHash !== sourceHash)
    throw Error("Core evidence is not from the current source");
  const allCases = [...platforms.win32.cases, ...platforms.linux.cases];
  let stories: StoryInventory[] | undefined;
  const coverageReport = async (path: string, errors: string[]) => {
    stories ??= JSON.parse(
      await safeRead(root, STORY_INVENTORY),
    ) as StoryInventory[];
    const evidence = verifyPatternCoverage(
      JSON.parse(await safeRead(root, path)) as CoverageMatrix,
      stories,
      allCases,
      (file) => existsSync(safePath(root, file)),
    );
    errors.push(...evidence.errors);
    const { missing: _, errors: __, ...summary } = evidence;
    return { ...(await artifact(root, path)), ...summary };
  };
  const coverageRows = new Map<
    string,
    Awaited<ReturnType<typeof coverageReport>>[]
  >();
  const coverageErrors = new Map<string, string[]>();
  for (const row of matrix.requirements as MatrixRow[]) {
    const errors: string[] = [];
    coverageErrors.set(row.id, errors);
    coverageRows.set(
      row.id,
      await Promise.all(
        (row.proof?.coverage ?? []).map((path) => coverageReport(path, errors)),
      ),
    );
  }
  const rows: RequirementIndexRow[] = (matrix.requirements as MatrixRow[]).map(
    (row) => {
      const errors: string[] = [...(coverageErrors.get(row.id) ?? [])];
      const proof = row.proof ?? {};
      if (!ACCEPTED.has(row.applicability))
        errors.push("Excluded or unknown applicability cannot be accepted");
      if (
        ![proof.tests, proof.checks, proof.gates].some(
          (list) => Array.isArray(list) && list.length,
        )
      )
        errors.push("No executable proof declared");
      const tests = (proof.tests ?? []).map((file) => {
        const cases = allCases.filter((value) => value.file === file);
        const keys = [...new Set(cases.map((value) => value.key))];
        if (!keys.length) errors.push("Test file was not executed: " + file);
        let passed = 0;
        for (const key of keys) {
          const results = cases.filter((value) => value.key === key);
          if (results.some((value) => value.status === "failed"))
            errors.push("Failed case: " + key);
          else if (!results.some((value) => value.status === "passed"))
            errors.push("Case was only skipped: " + key);
          else passed++;
        }
        const results = new Map<
          string,
          Artifact & { platform: string; check: string }
        >();
        for (const value of cases)
          results.set(value.platform + value.result.path, {
            ...value.result,
            platform: value.platform,
            check: value.check,
          });
        return {
          file,
          cases: keys.length,
          passed,
          results: [...results.values()].sort((a, b) =>
            (a.platform + a.path).localeCompare(b.platform + b.path),
          ),
        };
      });
      // A passing check or gate is an aggregate: without a case of its own the
      // row would be accepted on an exit code shared with every other row.
      if (!tests.some((test) => test.passed > 0))
        errors.push("No executed case bound to the requirement");
      const checks = (proof.checks ?? []).map((name) => {
        if (!RELEASE_QUALIFICATION_CHECKS.includes(name))
          errors.push("Unknown qualification check: " + name);
        const entries: RequirementIndexRow["checks"][number]["platforms"] = [];
        for (const platform of ["win32", "linux"] as const) {
          const own = platforms[platform].checks.get(name);
          if (own) entries.push({ platform, coverage: "executed", log: own });
          else if (
            platform === "linux" &&
            platforms.linux.external.has(name) &&
            platforms.win32.checks.has(name)
          )
            entries.push({
              platform,
              coverage: "external",
              log: platforms.win32.checks.get(name)!,
            });
          else errors.push(platform + " check not executed: " + name);
        }
        return { name, platforms: entries };
      });
      const gates = (proof.gates ?? []).map((name) => {
        const gate = core.gates.filter((value) => value.name === name);
        const [only] = gate;
        if (
          gate.length !== 1 ||
          !only ||
          only.status !== "passed" ||
          only.findings.some((value) => value.status !== "passed")
        )
          errors.push("Core gate did not pass: " + name);
        return {
          name,
          runId: core.runId,
          durationMs: only?.durationMs ?? 0,
        };
      });
      return {
        id: row.id,
        applicability: row.applicability,
        status: errors.length ? "blocked" : "passed",
        tests,
        checks,
        gates,
        coverage: coverageRows.get(row.id) ?? [],
        requirements: [...(proof.requirements ?? [])],
        errors,
      };
    },
  );
  // Aggregate requirements (for example DoD-01) pass only with their parts.
  for (const row of rows)
    for (const id of row.requirements) {
      const dependency = rows.find((value) => value.id === id);
      if (!dependency || dependency.status !== "passed" || dependency === row) {
        row.errors.push("Required requirement is not proven: " + id);
        row.status = "blocked";
      }
    }
  return {
    schemaVersion: "1.0",
    kind: "requirement-evidence-index",
    sourceHash,
    matrix: { path: inputs.matrix, contractHash: matrixContractHash(matrix) },
    inputs: {
      windows: await artifact(root, inputs.windows),
      linux: await artifact(root, inputs.linux),
      core: await artifact(root, inputs.core),
    },
    status: rows.every((row) => row.status === "passed") ? "passed" : "blocked",
    requirements: rows,
  };
}

/** Re-derives the signed index from its inputs; any divergence rejects it. */
export async function verifyRequirementIndex(
  root: string,
  reference: Artifact,
): Promise<RequirementIndex> {
  const bytes = await readFile(safePath(root, reference.path));
  if (hash(bytes) !== reference.sha256)
    throw Error("Requirement index changed");
  const index = JSON.parse(bytes.toString("utf8")) as RequirementIndex;
  if (index.kind !== "requirement-evidence-index" || index.status !== "passed")
    throw Error("Requirement index is not a passed acceptance index");
  for (const input of Object.values(index.inputs))
    if ((await artifact(root, input.path)).sha256 !== input.sha256)
      throw Error("Requirement index input changed: " + input.path);
  const rebuilt = await buildRequirementIndex(root, {
    matrix: index.matrix.path,
    windows: index.inputs.windows.path,
    linux: index.inputs.linux.path,
    core: index.inputs.core.path,
  });
  if (canonical(rebuilt) !== canonical(index))
    throw Error("Requirement index does not match its executed evidence");
  return index;
}
