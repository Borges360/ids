import { writeFile, mkdir, access } from "node:fs/promises";
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
  type GateResult,
} from "@inteiro/contracts";
import {
  patterns,
  getPattern,
  validateComposition,
  findPatterns,
  validatePattern,
} from "@inteiro/composition";
import { lintProject } from "@inteiro/lint";
import {
  verifyContext,
  resolveContext,
  repairContext,
  reviewGate,
  reviewRequest,
  releaseGate,
} from "@inteiro/agent-core";
import { runBenchmark } from "@inteiro/evaluation";
import { projectContracts } from "@inteiro/agent-core";
import { bool, flag } from "./args.ts";
import type { CliResult } from "./cli.ts";
export async function gateCommand(
  cmd: string[],
  flags: Record<string, string | boolean>,
  cwd: string,
): Promise<CliResult | undefined> {
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
  const done = (data: unknown, status = "passed"): CliResult => ({
    exitCode: exitCode(status as GateResult["status"]),
    data,
    text: JSON.stringify(data, null, 2),
  });
  const save = async (gates: GateResult[]) => {
    const report = bundle(config, gates);
    if (!bool(flags, "dry-run")) await writeReport(root, config, report);
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
    if (cmd[1] === "resolve") {
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
    const result = await verifyContext(root, config);
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
              suggestions: findPatterns(cmd[2] ?? "").map((p) => p.pattern.id),
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
    if (bool(flags, "fix"))
      return {
        exitCode: 2,
        data: {
          status: "blocked",
          message:
            "No unambiguous safe autofix applies. Inspect findings before changing source.",
        },
      };
    const result = await lintProject(root, config, {
      target: cmd[1] ?? ".",
      changed: bool(flags, "changed"),
      ...(flag(flags, "baseline") ? { baseline: flag(flags, "baseline") } : {}),
    });
    const output = await save([result]);
    if (config.static.adoption === "observe") output.exitCode = 0;
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
      if (approval.contractHash !== hash(config))
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
          required: [
            "context",
            "static",
            "browser",
            "review",
            ...(profile === "release" ? ["release"] : []),
          ],
          configHash: hash(config),
        },
        "not_run",
      );
    const gates = [
      await verifyContext(root, config),
      await lintProject(root, config),
    ];
    try {
      const { visualTest } = await import("@inteiro/visual");
      gates.push(
        await visualTest(root, config, {
          authorizeStart: bool(flags, "start"),
          all: ["main", "nightly", "release"].includes(profile),
        }),
      );
    } catch (e) {
      gates.push({
        name: "browser",
        status: "error",
        durationMs: 0,
        findings: [finding("VIS-ENV-001", String(e), { status: "error" })],
      });
    }
    gates.push(await reviewGate(root, config, gates));
    if (profile === "release") gates.push(await releaseGate(root, config));
    return save(gates);
  }
  if (cmd[0] === "review" || cmd[0] === "repair") {
    const report = await readEvidence(
      root,
      config.reporting.outDir +
        (flag(flags, "run-id")
          ? "/" + flag(flags, "run-id") + "/summary.json"
          : "/latest.json"),
    );
    const data =
      cmd[0] === "repair"
        ? repairContext(report, config)
        : reviewRequest(report, config);
    if (!bool(flags, "dry-run")) {
      await mkdir(safePath(root, ".inteiro/reviews"), { recursive: true });
      await writeFile(
        safePath(root, ".inteiro/reviews/" + report.runId + ".json"),
        JSON.stringify(data, null, 2),
      );
    }
    return done(data, data.status);
  }
  if (cmd[0] === "benchmark") {
    if (flag(flags, "observations")) {
      const { importExperiment } =
        await import("@inteiro/evaluation/experiments");
      return done(
        await importExperiment(
          root,
          flag(flags, "observations"),
          config.reporting.outDir + "/benchmark",
        ),
      );
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
