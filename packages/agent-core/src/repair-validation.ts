import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  aggregate,
  hash,
  safePath,
  safeRead,
  reviewSourceHash,
  type Config,
  type EvidenceBundle,
  requiredGates,
  assertGovernanceEvidence,
} from "@inteiro/contracts";
import { verifyStoredContext, type TaskManifest } from "./task-context.ts";
import { reviewGate } from "./review.ts";

/** A successful subset is not proof that a repair passed its final acceptance gate. */
export async function assertRepairAcceptance(
  root: string,
  config: Config,
  report: EvidenceBundle,
  contextBundleId: string,
) {
  const required = requiredGates("pr");
  if (config.governance.mode === "technical-autonomous")
    assertGovernanceEvidence(report);
  if (
    report.status !== "passed" ||
    aggregate(report.gates) !== "passed" ||
    new Set(report.gates.map((g) => g.name)).size !== report.gates.length ||
    required.some(
      (name) => report.gates.filter((g) => g.name === name).length !== 1,
    ) ||
    report.gates.some((g) => aggregate([g]) !== "passed") ||
    [...report.findings, ...report.gates.flatMap((g) => g.findings)].some(
      (f) => !["passed", "waived"].includes(f.status),
    )
  )
    throw Error("Incomplete or contradictory full gate");
  if (
    !report.sourceHash ||
    report.sourceHash !== (await reviewSourceHash(root)) ||
    report.configHash !== hash(config) ||
    report.gitSha !==
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim()
  )
    throw Error(
      "Full gate is not bound to current source/configuration/commit",
    );
  const manifest = JSON.parse(
    await safeRead(root, ".inteiro/task.json"),
  ) as TaskManifest;
  const stored = await verifyStoredContext(root, config, manifest);
  const task = report.gates.find((g) => g.name === "task-context")!;
  const context = report.gates.find((g) => g.name === "context")!;
  const lint = report.gates.find((g) => g.name === "static")!;
  const browser = report.gates.find((g) => g.name === "browser")!;
  if (
    stored.bundleId !== contextBundleId ||
    task.contextBundleId !== stored.bundleId ||
    task.taskId !== manifest.id ||
    task.taskHash !== stored.taskHash ||
    context.discoverable !== true ||
    !Array.isArray(context.provenance) ||
    !context.provenance.length
  )
    throw Error("Full gate task/context binding missing");
  if (
    config.static.adoption !== "enforce-all" ||
    lint.adoption !== "enforce-all" ||
    lint.coverage !== 1 ||
    !Number.isSafeInteger(lint.files) ||
    (lint.files as number) < 1
  )
    throw Error("Full static coverage required");
  if (
    !Number.isSafeInteger(browser.executed) ||
    (browser.executed as number) < 1 ||
    !Array.isArray(browser.captures) ||
    browser.captures.length !== browser.executed ||
    typeof browser.environmentFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(browser.environmentFingerprint)
  )
    throw Error("Full browser execution required");
  for (const artifact of report.artifacts)
    if (hash(await readFile(safePath(root, artifact.path))) !== artifact.sha256)
      throw Error("Full gate artifact bytes changed");
  for (const capture of browser.captures) {
    if (
      !capture ||
      typeof capture !== "object" ||
      typeof capture.actual !== "string" ||
      typeof capture.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(capture.sha256) ||
      capture.environmentFingerprint !== browser.environmentFingerprint ||
      ["route", "state", "viewport", "theme", "density"].some(
        (field) => typeof capture[field] !== "string" || !capture[field].trim(),
      ) ||
      !report.artifacts.some(
        (artifact) =>
          artifact.path === capture.actual &&
          artifact.sha256 === capture.sha256,
      )
    )
      throw Error("Full gate capture provenance missing");
  }
  const manifestRoutes = JSON.parse(
    await safeRead(root, config.browser.routesFile),
  );
  if (
    manifestRoutes.schemaVersion !== "1.0" ||
    !Array.isArray(manifestRoutes.routes) ||
    !manifestRoutes.routes.length
  )
    throw Error("Full browser route manifest required");
  const identity = (capture: Record<string, unknown>) =>
    JSON.stringify([
      capture.route,
      capture.state,
      capture.viewport,
      capture.theme,
      capture.density,
    ]);
  const captured = new Set(browser.captures.map(identity));
  const planned = new Set<string>();
  if (captured.size !== browser.captures.length)
    throw Error("Duplicate full browser capture identity");
  for (const route of manifestRoutes.routes) {
    if (
      !route ||
      typeof route.path !== "string" ||
      !Array.isArray(route.states) ||
      !route.states.length ||
      !Array.isArray(route.viewports) ||
      !route.viewports.length ||
      !Array.isArray(route.modes) ||
      !route.modes.length
    )
      throw Error("Incomplete full browser route matrix");
    for (const state of route.states)
      for (const viewport of route.viewports)
        for (const mode of route.modes) {
          if (state.viewports && !state.viewports.includes(viewport)) continue;
          if (
            !state ||
            typeof state.id !== "string" ||
            !Array.isArray(state.actions) ||
            typeof mode !== "string" ||
            !mode.includes("-")
          )
            throw Error("Invalid full browser state/mode");
          const density = mode.slice(mode.lastIndexOf("-") + 1),
            theme = mode.slice(0, mode.lastIndexOf("-"));
          const tuple = {
            route: route.path,
            state: state.id,
            viewport,
            theme,
            density,
          };
          if (planned.has(identity(tuple)))
            throw Error("Duplicate declared browser matrix identity");
          planned.add(identity(tuple));
          if (!captured.has(identity(tuple)))
            throw Error(
              "Full browser report omits a declared route/state/matrix entry",
            );
          for (const [actionIndex, action] of state.actions.entries())
            if (action?.type === "screenshot") {
              if (
                !Array.isArray(browser.actionCaptures) ||
                browser.actionCaptures.filter(
                  (capture) =>
                    capture &&
                    typeof capture === "object" &&
                    identity(capture) === identity(tuple) &&
                    capture.actionIndex === actionIndex &&
                    typeof capture.actual === "string" &&
                    report.artifacts.some(
                      (artifact) =>
                        artifact.path === capture.actual &&
                        artifact.sha256 === capture.sha256,
                    ),
                ).length !== 1
              )
                throw Error(
                  "Full browser report omits an intermediate screenshot action",
                );
            }
        }
  }
  if (aggregate([await reviewGate(root, config, report.gates)]) !== "passed")
    throw Error("Qualitative review is not currently authorized");
}
