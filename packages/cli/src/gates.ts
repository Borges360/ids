import { writeFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  resolveConfig,
  hash,
  bundle,
  writeReport,
  exitCode,
  safePath,
  safeRead,
  readEvidence,
  finding,
  reportFormats,
  isRunId,
  type GateResult,
  requiredGates,
  governanceContractHash,
  assertRequiredGates,
  reviewSourceHash,
  exportEvidenceArchive,
  extractEvidenceArchive,
  verifyExtractedEvidence,
  pruneReports,
} from "@inteiro/contracts";
import {
  patterns,
  getPattern,
  validateComposition,
  findPatterns,
  suggestPatterns,
  validatePattern,
} from "@inteiro/composition";
import {
  lintProject,
  planMigration,
  applyMigration,
  validateMigrationPolicy,
  type MigrationPolicy,
} from "@inteiro/lint";
import {
  verifyContext,
  resolveContext,
  resolvedRepairContext,
  reviewGate,
  resolvedReviewRequest,
  releaseGate,
  releaseQualification,
  recordTaskContext,
  taskContextGate,
  taskManifestErrors,
  type TaskManifest,
} from "@inteiro/agent-core";
import { baselineContractHash } from "@inteiro/visual/baseline";
import { runBenchmark } from "@inteiro/evaluation";
import { projectContracts } from "@inteiro/agent-core";
import { bool, flag } from "./args.ts";
import type { CliResult } from "./cli.ts";
export async function gateCommand(
  cmd: string[],
  flags: Record<string, string | boolean>,
  cwd: string,
): Promise<CliResult | undefined> {
  const commandStartedAt = new Date().toISOString();
  if (
    ![
      "contract",
      "context",
      "compose",
      "lint",
      "visual",
      "gate",
      "review",
      "repair",
      "benchmark",
      "report",
    ].includes(cmd[0] ?? "") &&
    !(cmd[0] === "doctor" && bool(flags, "deep"))
  )
    return;
  const overrides: Record<string, unknown> = {};
  if (flag(flags, "harness"))
    overrides.context = { harness: flag(flags, "harness") };
  if (flag(flags, "base-url"))
    overrides.browser = { baseURL: flag(flags, "base-url") };
  const loaded = await resolveConfig(cwd, overrides),
    { config, root } = loaded;
  const initialSourceHash =
    cmd[0] === "gate"
      ? await reviewSourceHash(root).catch(() => undefined)
      : undefined;
  const done = (data: unknown, status = "passed"): CliResult => ({
    exitCode: exitCode(status as GateResult["status"]),
    data,
    text: JSON.stringify(data, null, 2),
  });
  const save = async (gates: GateResult[], dryRun = false) => {
    if (
      cmd[0] === "gate" &&
      config.governance.mode === "technical-autonomous" &&
      gates.every((gate) => gate.status === "passed")
    ) {
      try {
        assertRequiredGates(gates, flag(flags, "profile") || "pr");
      } catch (error) {
        gates.push({
          name: "governance",
          status: "blocked",
          durationMs: 0,
          findings: [
            finding("GOV-CONTRACT-001", String(error), { status: "blocked" }),
          ],
        });
      }
    }
    const report = bundle(config, gates);
    report.startedAt = commandStartedAt;
    if (initialSourceHash) report.sourceHash = initialSourceHash;
    if (cmd[0] === "gate") {
      report.profile = flag(flags, "profile") || "pr";
    }
    const { hash: _, ...payload } = report;
    report.hash = hash(payload);
    if (!bool(flags, "dry-run") && !dryRun)
      await writeReport(root, config, report);
    if (flag(flags, "format") === "sarif") {
      const sarif = JSON.parse(reportFormats(report).sarif);
      return done(sarif, report.status);
    }
    if (flag(flags, "format") === "stylish")
      return {
        exitCode: exitCode(report.status),
        text:
          report.status +
          "\n" +
          report.findings
            .map(
              (f) =>
                (f.file ?? f.route ?? "project") +
                ":" +
                (f.range?.startLine ?? 1) +
                " " +
                f.ruleId +
                " " +
                f.message,
            )
            .join("\n"),
      };
    return done(report, report.status);
  };
  if (cmd[0] === "report") {
    if (cmd[1] === "prune")
      return done(
        await pruneReports(
          root,
          config,
          bool(flags, "apply") && !bool(flags, "dry-run"),
        ),
      );
    if (bool(flags, "dry-run"))
      return done(
        {
          status: "not_run",
          action: cmd[1],
          message: "No portable evidence output written",
        },
        "not_run",
      );
    if (cmd[1] === "export" && flag(flags, "out"))
      return done(
        await exportEvidenceArchive(
          root,
          flag(flags, "summary") || config.reporting.outDir + "/latest.json",
          flag(flags, "out"),
        ),
      );
    if (cmd[1] === "extract" && flag(flags, "archive") && flag(flags, "out"))
      return done(
        await extractEvidenceArchive(
          root,
          flag(flags, "archive"),
          flag(flags, "out"),
        ),
      );
    if (cmd[1] === "verify" && flag(flags, "directory"))
      return done(
        await verifyExtractedEvidence(safePath(root, flag(flags, "directory"))),
      );
    return {
      exitCode: 2,
      data: {
        status: "error",
        message:
          "Use report export --out, extract --archive --out, or verify --directory",
      },
    };
  }
  if (cmd[0] === "contract")
    return done({
      ...loaded,
      ...projectContracts(config),
      schemaVersion: "1.0",
      inteiroVersion: "1.2.0",
      createdAt: new Date().toISOString(),
      hash: hash(config),
      patterns: patterns.map((p) => p.id),
    });
  if (cmd[0] === "context") {
    if (cmd[1] === "plan") {
      const description = flag(flags, "task") || cmd.slice(2).join(" ");
      const list = (value: string) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      const fields = {
        type: flag(flags, "type") || "change-page",
        description,
        patternIds: list(flag(flags, "patterns")),
        scope: { allowedFiles: list(flag(flags, "files")) },
        acceptanceCriteria: [flag(flags, "acceptance")].filter(Boolean),
      };
      const manifest: TaskManifest = {
        schemaVersion: "1.0",
        id: flag(flags, "id") || "task-" + hash(fields).slice(0, 16),
        ...fields,
      };
      const errors = taskManifestErrors(manifest, root);
      if (errors.length)
        return done(
          {
            status: "blocked",
            errors,
            nextAction:
              "Provide --task, --files and --acceptance; select patterns with --patterns",
          },
          "blocked",
        );
      try {
        await safeRead(root, ".inteiro/task.json");
        return done(
          {
            status: "blocked",
            nextAction:
              "Task manifest already exists; preserve or edit it, then run context resolve --record",
          },
          "blocked",
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (bool(flags, "record")) {
        const result = await recordTaskContext(
          root,
          config,
          manifest,
          bool(flags, "dry-run"),
        );
        return done(result, result.status);
      }
      if (!bool(flags, "dry-run")) {
        await mkdir(safePath(root, ".inteiro"), { recursive: true });
        await writeFile(
          safePath(root, ".inteiro/task.json"),
          JSON.stringify(manifest, null, 2) + "\n",
        );
      }
      return done(
        {
          status: bool(flags, "dry-run") ? "not_run" : "passed",
          manifest,
          nextAction: "Run context resolve --record before implementation",
        },
        bool(flags, "dry-run") ? "not_run" : "passed",
      );
    }
    if (cmd[1] === "resolve") {
      if (bool(flags, "record")) {
        let task: TaskManifest;
        try {
          task = JSON.parse(
            await safeRead(root, ".inteiro/task.json"),
          ) as TaskManifest;
        } catch {
          return done(
            {
              status: "blocked",
              nextAction:
                "Create .inteiro/task.json with classification, description, pattern IDs, explicit allowed files and acceptance criteria",
            },
            "blocked",
          );
        }
        if (flag(flags, "task")) task.description = flag(flags, "task");
        if (flag(flags, "type")) task.type = flag(flags, "type");
        const result = await recordTaskContext(
          root,
          config,
          task,
          bool(flags, "dry-run"),
        );
        return done(result, result.status);
      }
      const result = await resolveContext(
        {
          type: flag(flags, "type") || "change-page",
          description: flag(flags, "task") || cmd.slice(2).join(" "),
        },
        root,
        config,
      );
      return done(result, result.status);
    }
    const result = bool(flags, "task-context")
      ? await taskContextGate(root, config)
      : await verifyContext(root, config);
    return done(result, result.status);
  }
  if (cmd[0] === "compose") {
    if (cmd[1] === "list") return done(patterns.map(({ markup, ...p }) => p));
    if (cmd[1] === "find") return done(findPatterns(cmd.slice(2).join(" ")));
    if (cmd[1] === "show") {
      const p = getPattern(cmd[2] ?? "");
      return p
        ? done(p)
        : {
            exitCode: 3,
            data: {
              status: "blocked",
              message: "Pattern not found",
              suggestions: suggestPatterns(cmd[2] ?? "").map(
                (p) => p.pattern.id,
              ),
              suggestionDetails: suggestPatterns(cmd[2] ?? "").map(
                ({ pattern, reason }) => ({ id: pattern.id, reason }),
              ),
            },
          };
    }
    if (cmd[1] === "validate") {
      const input = JSON.parse(
        await safeRead(root, cmd[2] ?? ".inteiro/composition.json"),
      );
      const result = validateComposition(input);
      return done(result, result.status);
    }
    if (cmd[1] === "propose") {
      const id = cmd[2];
      if (!id || !/^[a-z][a-z0-9-]*$/.test(id))
        return {
          exitCode: 2,
          data: { status: "error", message: "Valid pattern id required" },
        };
      const draft = {
        schemaVersion: "1.0",
        id,
        status: "needs_review",
        rationale: flag(flags, "reason"),
        alternatives: [],
        states: ["default"],
        tokens: [],
        acceptanceCriteria: [],
      };
      if (!bool(flags, "dry-run")) {
        await mkdir(safePath(root, ".inteiro/proposals"), { recursive: true });
        await writeFile(
          safePath(root, ".inteiro/proposals/" + id + ".json"),
          JSON.stringify(draft, null, 2),
        );
      }
      return done(draft, "needs_review");
    }
  }
  if (cmd[0] === "lint") {
    const fix = bool(flags, "fix"),
      preview = bool(flags, "fix-dry-run"),
      dryRun = preview || bool(flags, "dry-run");
    if (
      (flag(flags, "mapping") || flag(flags, "plan-hash")) &&
      !fix &&
      !preview
    )
      throw Error("Lint mapping options require --fix or --fix-dry-run");
    if (bool(flags, "changed") && flag(flags, "mapping"))
      throw Error(
        "Scoped autofix requires an explicit path without --changed; use --fix-dry-run to inspect the scope",
      );
    if (flag(flags, "plan-hash") && !flag(flags, "mapping"))
      throw Error("Lint --plan-hash requires --mapping");
    let autofix: unknown;
    if (fix || preview) {
      const policy: MigrationPolicy = flag(flags, "mapping")
        ? JSON.parse(await safeRead(root, flag(flags, "mapping")))
        : { schemaVersion: "1.0", mappings: [] };
      validateMigrationPolicy(root, policy);
      if (policy.mappings.length) {
        const plan = await planMigration(root, cmd[1] ?? ".", policy);
        if (plan.status === "blocked")
          return save(
            [
              {
                name: "autofix",
                status: "blocked",
                findings: [
                  finding(
                    "IN-FIX-002",
                    "Scoped autofix plan is blocked; source unchanged",
                  ),
                ],
                durationMs: 0,
                autofix: { ...plan, applied: false },
              },
            ],
            dryRun,
          );
        if (fix && !dryRun && plan.patches.length && !flag(flags, "plan-hash"))
          return save([
            {
              name: "autofix",
              status: "blocked",
              findings: [
                finding(
                  "IN-FIX-001",
                  "Inspect --fix-dry-run, then apply with --fix --plan-hash " +
                    plan.planHash,
                ),
              ],
              durationMs: 0,
              autofix: { ...plan, applied: false },
            },
          ]);
        autofix =
          fix && !dryRun && plan.patches.length
            ? await applyMigration(
                root,
                cmd[1] ?? ".",
                policy,
                flag(flags, "plan-hash") || plan.planHash,
              )
            : { ...plan, applied: false };
      } else
        autofix = {
          applied: false,
          patches: [],
          message: "No scoped safe fixes configured; source unchanged",
        };
    }
    const result: GateResult = await lintProject(root, config, {
      target: cmd[1] ?? ".",
      changed: bool(flags, "changed"),
      strict: bool(flags, "strict"),
      ...(flag(flags, "baseline") ? { baseline: flag(flags, "baseline") } : {}),
    });
    if (autofix !== undefined) result.autofix = autofix;
    const output = await save([result], dryRun);
    if (config.static.adoption === "observe" && !bool(flags, "strict"))
      output.exitCode = 0;
    return output;
  }
  if (cmd[0] === "visual") {
    if (bool(flags, "dry-run"))
      return done(
        {
          status: "not_run",
          action: cmd.slice(1),
          configHash: hash(config),
          message: "Dry run: no browser, image or registry mutation",
        },
        "not_run",
      );
    const visual = await import("@inteiro/visual");
    if (cmd[1] === "baseline" && cmd[2] === "promote-technical") {
      if (
        config.governance.mode !== "technical-autonomous" ||
        !flag(flags, "attestation")
      )
        return done(
          {
            status: "blocked",
            message:
              "Autonomous mode and independent technical attestation required",
          },
          "blocked",
        );
      const { promoteTechnicalBaseline } =
        await import("@inteiro/visual/technical-baseline");
      const attestation = JSON.parse(
        await safeRead(root, flag(flags, "attestation")),
      );
      if (attestation.configHash !== baselineContractHash(config))
        throw Error("Technical attestation configuration changed");
      const policy = JSON.parse(
        await safeRead(root, ".inteiro/technical-attestors.json"),
      );
      return done(
        await promoteTechnicalBaseline(
          root,
          config.visual.baselineDir,
          attestation,
          policy,
        ),
      );
    }
    if (cmd[1] === "test" || cmd[2] === "propose")
      return save([
        await visual.visualTest(root, config, {
          authorizeStart: bool(flags, "start"),
          all: bool(flags, "all"),
          routeIds: flag(flags, "route").split(",").filter(Boolean),
          propose: cmd[2] === "propose",
        }),
      ]);
    if (cmd[1] === "baseline" && cmd[2] === "approve") {
      if (config.governance.mode === "technical-autonomous")
        return done(
          {
            status: "blocked",
            message:
              "Use promote-technical with an independent automatic attestation",
          },
          "blocked",
        );
      if (!flag(flags, "review-id") || !flag(flags, "approval"))
        return done(
          {
            status: "needs_review",
            message: "Signed approval file and review-id required",
          },
          "needs_review",
        );
      const { approveBaseline } = await import("@inteiro/visual/baseline");
      const approval = JSON.parse(
        await safeRead(root, flag(flags, "approval")),
      );
      if (approval.reviewId !== flag(flags, "review-id"))
        throw new Error("Review ID mismatch");
      if (approval.contractHash !== baselineContractHash(config))
        throw new Error("Approval references a stale configuration");
      const policy = JSON.parse(
        await safeRead(root, ".inteiro/reviewers.json"),
      );
      if (bool(flags, "dry-run"))
        return done(
          { status: "needs_review", message: "Dry run: no golden promoted" },
          "needs_review",
        );
      return done(
        await approveBaseline(
          root,
          config.visual.baselineDir,
          approval,
          policy,
        ),
      );
    }
  }
  if (cmd[0] === "gate") {
    const profile = flag(flags, "profile") || "pr";
    if (!["dev", "ci", "pr", "main", "nightly", "release"].includes(profile))
      return {
        exitCode: 2,
        data: { status: "error", message: "Unknown gate profile" },
      };
    if (
      ["main", "nightly", "release"].includes(profile) &&
      config.static.adoption !== "enforce-all"
    )
      return done(
        {
          status: "blocked",
          message: "Protected profiles require enforce-all adoption",
        },
        "blocked",
      );
    if (bool(flags, "dry-run"))
      return done(
        {
          status: "not_run",
          profile,
          required: requiredGates(profile),
          governanceContractHash: governanceContractHash(),
          configHash: hash(config),
        },
        "not_run",
      );
    const gates = [
      await verifyContext(root, config),
      await taskContextGate(root, config),
      await lintProject(root, config),
    ];
    try {
      const { visualTest, selectRouteImpact, changedSourceFiles } =
        await import("@inteiro/visual");
      const routes = JSON.parse(
        await safeRead(root, config.browser.routesFile),
      ).routes;
      const impact = selectRouteImpact(
        routes,
        bool(flags, "changed") ? changedSourceFiles(root) : undefined,
        profile,
      );
      const result = await visualTest(root, config, {
        authorizeStart: bool(flags, "start"),
        all: ["ci", "main", "nightly", "release"].includes(profile),
        ...(impact.scope === "affected" ? { routeIds: impact.routeIds } : {}),
      });
      result.impact = impact;
      gates.push(result);
    } catch (e) {
      gates.push({
        name: "browser",
        status: "error",
        durationMs: 0,
        findings: [finding("VIS-ENV-001", String(e), { status: "error" })],
      });
    }
    gates.push(await reviewGate(root, config, gates));
    if (profile === "release") {
      gates.push(
        gates.every((gate) => gate.status === "passed")
          ? await releaseQualification(root)
          : {
              name: "qualification",
              status: "not_run",
              durationMs: 0,
              findings: [
                finding(
                  "REL-QUALIFICATION-001",
                  "Source qualification awaits passing prerequisite gates",
                  { status: "not_run" },
                ),
              ],
            },
      );
      gates.push(await releaseGate(root, config));
    }
    return save(gates);
  }
  if (cmd[0] === "review" || cmd[0] === "repair") {
    if (flag(flags, "run-id") && !isRunId(flag(flags, "run-id")))
      return {
        exitCode: 2,
        data: {
          status: "blocked",
          nextAction: "Use a run ID returned by a gate execution",
        },
      };
    const report = await readEvidence(
      root,
      config.reporting.outDir +
        (flag(flags, "run-id")
          ? "/" + flag(flags, "run-id") + "/summary.json"
          : "/latest.json"),
    );
    if (
      cmd[0] === "review" &&
      config.governance.mode === "technical-autonomous"
    ) {
      const result = await reviewGate(root, config, report.gates);
      return done(result, result.status);
    }
    const data =
      cmd[0] === "repair"
        ? await resolvedRepairContext(root, config, report)
        : await resolvedReviewRequest(root, config, report);
    if (!bool(flags, "dry-run")) {
      const requestDirectory = config.reporting.outDir + "/" + report.runId;
      await mkdir(safePath(root, requestDirectory), { recursive: true });
      await writeFile(
        safePath(root, requestDirectory + "/" + cmd[0] + ".json"),
        JSON.stringify(data, null, 2),
      );
    }
    return done(data, data.status);
  }
  if (cmd[0] === "benchmark") {
    if (cmd[1] === "prepare") {
      if (!flag(flags, "case") || !flag(flags, "target"))
        throw Error("benchmark prepare requires --case and --target");
      if (
        bool(flags, "bootstrap") &&
        (!flag(flags, "packages-manifest") || !flag(flags, "dependency-lock"))
      )
        throw Error(
          "Offline bootstrap requires --packages-manifest and --dependency-lock",
        );
      if (
        !bool(flags, "bootstrap") &&
        ["packages-manifest", "dependency-lock", "npm-cache", "npm-cli"].some(
          (key) => flag(flags, key),
        )
      )
        throw Error("Bootstrap options require --bootstrap");
      const { prepareBenchmarkWorker } =
        await import("@inteiro/evaluation/workspace");
      const result = await prepareBenchmarkWorker(
        root,
        flag(flags, "target"),
        flag(flags, "case"),
        {
          dryRun: bool(flags, "dry-run"),
          ...(bool(flags, "bootstrap")
            ? {
                bootstrap: {
                  distributionManifest: flag(flags, "packages-manifest"),
                  dependencyLock: flag(flags, "dependency-lock"),
                  harness: (flag(flags, "harness") || "pi") as "pi" | "codex",
                  ...(flag(flags, "npm-cli")
                    ? { npmCli: flag(flags, "npm-cli") }
                    : {}),
                  ...(flag(flags, "npm-cache")
                    ? { npmCache: flag(flags, "npm-cache") }
                    : {}),
                },
              }
            : {}),
        },
      );
      return done(result, result.status);
    }
    if (cmd[1] === "worker-audit") {
      const { auditBenchmarkWorker } =
        await import("@inteiro/evaluation/workspace");
      const result = await auditBenchmarkWorker(root, flag(flags, "worker"));
      return done(result, result.status);
    }
    if (flag(flags, "grading")) {
      if (
        !flag(flags, "candidate") ||
        ["calibration", "observations", "protocol", "suite"].some((key) =>
          flag(flags, key),
        )
      )
        throw new Error(
          "--grading requires --candidate and cannot combine benchmark input modes",
        );
      const { gradeBenchmarkTask } =
        await import("@inteiro/evaluation/grading");
      const result = await gradeBenchmarkTask(
        root,
        resolve(root, flag(flags, "candidate")),
        flag(flags, "grading"),
        { dryRun: bool(flags, "dry-run") },
      );
      return done(result, result.status);
    }
    if (cmd[1] === "grade" || flag(flags, "candidate"))
      throw new Error("benchmark grade requires --grading and --candidate");
    if (flag(flags, "calibration")) {
      if (
        flag(flags, "observations") ||
        flag(flags, "protocol") ||
        flag(flags, "suite")
      )
        throw new Error(
          "--calibration cannot be combined with observation/protocol/suite inputs",
        );
      const { calibrateReviews } =
        await import("@inteiro/evaluation/calibration");
      const result = await calibrateReviews(
        root,
        flag(flags, "calibration"),
        config.reporting.outDir + "/calibration",
        { dryRun: bool(flags, "dry-run") },
      );
      return done(result, result.status);
    }
    if (flag(flags, "protocol") && !flag(flags, "observations"))
      throw new Error("--protocol requires --observations");
    if (flag(flags, "observations")) {
      const { importExperiment } =
        await import("@inteiro/evaluation/experiments");
      const result = await importExperiment(
        root,
        flag(flags, "observations"),
        config.reporting.outDir + "/benchmark",
        {
          dryRun: bool(flags, "dry-run"),
          ...(flag(flags, "protocol")
            ? { protocolPath: flag(flags, "protocol") }
            : {}),
        },
      );
      return done(result, result.status);
    }
    if (flag(flags, "suite") && flag(flags, "suite") !== config.benchmark.suite)
      throw new Error("Unknown benchmark suite");
    const report = await runBenchmark(root, config);
    return done(report, report.status);
  }
  if (cmd[0] === "doctor") {
    const context = await verifyContext(root, config);
    let browser: GateResult;
    try {
      const { chromium } = await import("@playwright/test");
      await access(chromium.executablePath());
      browser = {
        name: "browser-environment",
        status: "passed",
        findings: [],
        durationMs: 0,
      };
    } catch (e) {
      browser = {
        name: "browser-environment",
        status: "error",
        findings: [finding("VIS-ENV-001", String(e), { status: "error" })],
        durationMs: 0,
      };
    }
    const catalogFindings = patterns.flatMap(validatePattern);
    const catalog: GateResult = {
      name: "catalog",
      status: catalogFindings.length ? "failed" : "passed",
      findings: catalogFindings,
      durationMs: 0,
    };
    const preconditions: GateResult = {
      name: "fixtures-and-baselines",
      status: "passed",
      findings: [],
      durationMs: 0,
    };
    try {
      const routes = JSON.parse(
        await safeRead(root, config.browser.routesFile),
      );
      for (const route of routes.routes) {
        for (const state of route.states) {
          const fixture = JSON.parse(
            await safeRead(
              root,
              ".inteiro/fixtures/" + (state.fixture ?? route.fixture) + ".json",
            ),
          );
          if (!fixture.classification || !fixture.clock)
            throw new Error("Fixture classification/clock absent");
        }
      }
      const { registry } = await import("@inteiro/visual/baseline");
      const entries = await registry(root, config.visual.baselineDir);
      if (!entries.some((b) => b.state === "approved")) {
        preconditions.status = "blocked";
        preconditions.findings.push(
          finding("VIS-BASE-001", "No approved baseline available", {
            status: "blocked",
          }),
        );
      }
    } catch (e) {
      preconditions.status = "blocked";
      preconditions.findings.push(
        finding("VIS-DATA-001", String(e), { status: "blocked" }),
      );
    }
    return save([context, browser, catalog, preconditions]);
  }
  return {
    exitCode: 2,
    data: { status: "error", message: "Unknown command " + cmd.join(" ") },
  };
}
