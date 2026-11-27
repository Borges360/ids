import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  DEFAULTS,
  bundle,
  hash,
  reviewSourceHash,
  writeReport,
} from "@inteiro/contracts";
import { buildRequirementIndex } from "../../packages/agent-core/src/requirement-evidence.ts";

type Row = Record<string, unknown>;
export const MATRIX = "docs/P0_AUTONOMOUS_MATRIX.json";

/**
 * Synthetic qualification outputs only; no real execution is claimed. The
 * caller's root must be a Git repository that ignores the output directory.
 */
export function qualificationFixture(root: string, outputs = "artifacts/run") {
  const posixRoot = root.replace(/\\/g, "/");
  const vitest = (cases: Record<string, string>) => {
    const files = new Map<string, { fullName: string; status: string }[]>();
    for (const [key, status] of Object.entries(cases)) {
      const [file = "", fullName = ""] = key.split("::");
      files.set(file, [...(files.get(file) ?? []), { fullName, status }]);
    }
    return {
      testResults: [...files].map(([file, assertionResults]) => ({
        name: posixRoot + "/" + file,
        status: "passed",
        assertionResults,
      })),
    };
  };
  return async function prepare(
    rows: Row[],
    cases: Partial<Record<"win32" | "linux", Record<string, string>>>,
    options: { linuxChecks?: string[]; gates?: string[] } = {},
  ) {
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, outputs, "results"), { recursive: true });
    await writeFile(
      join(root, MATRIX),
      JSON.stringify({ schemaVersion: "1.0", requirements: rows }, null, 2),
    );
    const sourceHash = await reviewSourceHash(root);
    const reports: Record<string, string> = {};
    for (const platform of ["win32", "linux"] as const) {
      const checks = [];
      const names =
        platform === "linux"
          ? (options.linuxChecks ?? ["ci"])
          : ["ci", "worker-isolation"];
      for (const name of names) {
        const log = `${outputs}/${platform}-${name}.log`;
        await writeFile(join(root, log), name + " output");
        const results = [];
        if (name === "ci") {
          const path = `${outputs}/results/${platform}-vitest.json`;
          const bytes = Buffer.from(
            JSON.stringify(vitest(cases[platform] ?? {})),
          );
          await writeFile(join(root, path), bytes);
          results.push({ path, sha256: hash(bytes), format: "vitest-json" });
          const playwright = `${outputs}/results/${platform}-playwright.json`;
          const report = Buffer.from(
            JSON.stringify({
              config: { rootDir: join(root, "tests/browser") },
              suites: [
                {
                  title: "page.spec.ts",
                  file: "page.spec.ts",
                  specs: [
                    {
                      title: "renders",
                      file: "page.spec.ts",
                      tests: [{ projectName: "", status: "expected" }],
                    },
                  ],
                },
              ],
            }),
          );
          await writeFile(join(root, playwright), report);
          results.push({
            path: playwright,
            sha256: hash(report),
            format: "playwright-json",
          });
        }
        checks.push({
          name,
          command: "npm run " + name,
          status: "passed",
          exitCode: 0,
          log,
          sha256: hash(Buffer.from(name + " output")),
          results,
        });
      }
      const path = `${outputs}/${platform}.json`;
      await writeFile(
        join(root, path),
        JSON.stringify({
          platform,
          status: "passed",
          root,
          sourceHash,
          finishedSourceHash: sourceHash,
          externalCoverageRequired:
            platform === "linux" ? ["worker-isolation"] : [],
          checks,
        }),
      );
      reports[platform] = path;
    }
    const config = structuredClone(DEFAULTS);
    config.governance.mode = "technical-autonomous";
    const report = bundle(
      config,
      (options.gates ?? ["context", "task-context", "static", "browser"]).map(
        (name) => ({ name, status: "passed", findings: [], durationMs: 1 }),
      ),
    );
    report.sourceHash = sourceHash;
    await writeReport(root, config, report);
    const inputs = {
      matrix: MATRIX,
      windows: reports.win32 ?? "",
      linux: reports.linux ?? "",
      core: config.reporting.outDir + "/" + report.runId + "/summary.json",
    };
    return { inputs, index: await buildRequirementIndex(root, inputs) };
  };
}

export async function requirementFixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "inteiro-requirement-index-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  await writeFile(join(root, ".gitignore"), "artifacts/\n.inteiro/reports/\n");
  return root;
}
