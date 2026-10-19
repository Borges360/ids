import { readFile, writeFile } from "node:fs/promises";
import {
  hash,
  safePath,
  redact,
  type Config,
  type EvidenceBundle,
  type GateStatus,
} from "@inteiro/contracts";
import { repairContext } from "./repair.ts";
import { parseGateOutput } from "./gate-protocol.ts";
import { exitCode, isRunId } from "@inteiro/contracts";
import { safeRead } from "@inteiro/contracts";
import { verifyStoredContext, type TaskManifest } from "./task-context.ts";

export interface RepairEdit {
  path: string;
  baseHash: string;
  content: string;
}
export interface RepairProposal {
  edits: RepairEdit[];
}
export interface RepairTask {
  contextBundleId: string;
  allowedFiles: string[];
}
export interface RepairStep {
  state: "planning" | "coding" | "validating" | "repairable" | GateStatus;
  attempt: number;
  reason?: string;
  runId?: string;
}
export interface RepairConsumer {
  /** Returns data only. The consumer must not modify the project or run commands. */
  propose(
    envelope: ReturnType<typeof repairContext> & {
      contextBundleId: string;
      files: { path: string; sha256: string; content: string }[];
    },
  ): Promise<RepairProposal>;
  /** Trusted harness callback: affected subset first, full gate before acceptance. */
  validate(
    scope: "affected" | "full",
    files: string[],
  ): Promise<EvidenceBundle>;
}
const forbiddenPath =
  /(?:^|\/)(?:\.env(?:\..*)?|\.git|\.github|\.inteiro|\.harness|node_modules|Jenkinsfile|.*(?:baseline|snapshot|policy|threshold|inteiro\.config|reviewers).*)($|\/)/i;
function normalized(path: string): string {
  if (
    typeof path !== "string" ||
    path.includes("\\") ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Invalid repair path");
  return path;
}
function changedLines(before: string, after: string): number {
  const a = before.split("\n"),
    b = after.split("\n");
  let start = 0,
    endA = a.length,
    endB = b.length;
  while (start < endA && start < endB && a[start] === b[start]) start++;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return endA - start + endB - start;
}
function unsafeReport(report: EvidenceBundle): boolean {
  return report.findings.some(
    (f) =>
      f.ruleId.startsWith("SEC-") || /non-allowlisted origin/i.test(f.message),
  );
}

/** Provider-neutral controller. It applies bounded text edits, never model-supplied shell commands. */
export async function runRepairController(
  root: string,
  config: Config,
  initial: EvidenceBundle,
  task: RepairTask,
  consumer: RepairConsumer,
) {
  const steps: RepairStep[] = [
      { state: "planning", attempt: 0, runId: initial.runId },
    ],
    history: {
      signature: string;
      changedFiles: string[];
      diffLines: number;
    }[] = [];
  const validations: {
    scope: "initial" | "affected" | "full";
    attempt: number;
    report: EvidenceBundle;
  }[] = [{ scope: "initial", attempt: 0, report: initial }];
  let report = initial;
  const finish = (status: GateStatus, reason: string) => {
    steps.push({
      state: status,
      attempt: history.length,
      reason,
      runId: report.runId,
    });
    return {
      schemaVersion: "1.0",
      status,
      reason,
      contextBundleId: task.contextBundleId,
      attempts: history.length,
      steps,
      history,
      validations,
      report,
    };
  };
  try {
    parseGateOutput(JSON.stringify(initial), exitCode(initial.status));
  } catch {
    return finish("blocked", "invalid-evidence");
  }
  if (
    !/^context:[a-f0-9]{64}$/.test(task.contextBundleId) ||
    initial.configHash !== hash(config) ||
    !isRunId(initial.runId)
  )
    return finish("blocked", "invalid-context-or-report-binding");
  try {
    const manifest = JSON.parse(
      await safeRead(root, ".inteiro/task.json"),
    ) as TaskManifest;
    const context = await verifyStoredContext(root, config, manifest);
    if (
      context.bundleId !== task.contextBundleId ||
      task.allowedFiles.some(
        (path) => !manifest.scope.allowedFiles.includes(path),
      )
    )
      return finish("blocked", "task-context-or-scope-mismatch");
  } catch {
    return finish("blocked", "unverified-task-context");
  }
  let allowed: Set<string>;
  try {
    allowed = new Set(task.allowedFiles.map(normalized));
    if ([...allowed].some((p) => forbiddenPath.test(p)))
      throw new Error("Protected scope");
  } catch {
    return finish("blocked", "invalid-or-protected-scope");
  }
  const previouslyPassed = new Set(
    initial.gates.filter((g) => g.status === "passed").map((g) => g.name),
  );
  while (true) {
    if (unsafeReport(report)) return finish("blocked", "security-stop");
    const envelope = repairContext(report, config, history, {
      allowedFiles: [...allowed],
      contextBundleId: task.contextBundleId,
    });
    if (envelope.status !== "repairable")
      return finish(envelope.status as GateStatus, envelope.reason);
    if (!allowed.size)
      return finish("needs_review", "missing-explicit-file-scope");
    steps.push({
      state: "repairable",
      attempt: history.length,
      runId: report.runId,
    });
    const originals = new Map<string, string>();
    try {
      const files = await Promise.all(
        [...allowed].map(async (path) => {
          const content = await readFile(safePath(root, path), "utf8");
          originals.set(path, content);
          return { path, sha256: hash(Buffer.from(content)), content };
        }),
      );
      if (files.some((file) => redact(file.content) !== file.content))
        return finish("blocked", "sensitive-source-requires-review");
      if (
        files.reduce(
          (bytes, file) => bytes + Buffer.byteLength(file.content),
          0,
        ) >
        128 * 1024
      )
        return finish("needs_review", "source-context-budget");
      steps.push({ state: "coding", attempt: history.length + 1 });
      const proposal = await consumer.propose({
        ...envelope,
        contextBundleId: task.contextBundleId,
        scope: { ...envelope.scope, allowedFiles: [...allowed] },
        files,
      });
      if (
        !Array.isArray(proposal?.edits) ||
        !proposal.edits.length ||
        proposal.edits.length > config.repair.maxChangedFiles
      )
        return finish("needs_review", "invalid-or-oversized-patch");
      const seen = new Set<string>();
      let lines = 0;
      for (const edit of proposal.edits) {
        let path: string;
        try {
          path = normalized(edit.path);
        } catch {
          return finish("needs_review", "scope-or-policy-violation");
        }
        if (
          !allowed.has(path) ||
          forbiddenPath.test(path) ||
          seen.has(path) ||
          typeof edit.content !== "string"
        )
          return finish("needs_review", "scope-or-policy-violation");
        if (redact(edit.content) !== edit.content)
          return finish("blocked", "sensitive-patch-requires-review");
        seen.add(path);
        const before = originals.get(path)!;
        if (
          edit.baseHash !== hash(Buffer.from(before)) ||
          (await readFile(safePath(root, path), "utf8")) !== before
        )
          return finish("blocked", "stale-patch");
        lines += changedLines(before, edit.content);
      }
      const totalFiles = new Set([
        ...history.flatMap((entry) => entry.changedFiles),
        ...seen,
      ]);
      if (totalFiles.size > config.repair.maxChangedFiles)
        return finish("needs_review", "cumulative-file-limit");
      if (
        !lines ||
        lines + history.reduce((sum, entry) => sum + entry.diffLines, 0) >
          config.repair.maxDiffLines
      )
        return finish("needs_review", "diff-limit-or-no-change");
      // All edits are checked before the first write. Roll back if validation fails or regresses.
      const rollback = async () => {
        for (const path of seen)
          await writeFile(safePath(root, path), originals.get(path)!);
      };
      try {
        for (const edit of proposal.edits)
          await writeFile(safePath(root, edit.path), edit.content);
        history.push({
          signature: envelope.signature,
          changedFiles: [...seen],
          diffLines: lines,
        });
        steps.push({ state: "validating", attempt: history.length });
        const affected = await consumer.validate("affected", [...seen]);
        parseGateOutput(JSON.stringify(affected), exitCode(affected.status));
        validations.push({
          scope: "affected",
          attempt: history.length,
          report: affected,
        });
        if (
          affected.configHash !== initial.configHash ||
          unsafeReport(affected) ||
          ["blocked", "error"].includes(affected.status)
        ) {
          await rollback();
          report = affected;
          return finish(
            affected.configHash !== initial.configHash || unsafeReport(affected)
              ? "blocked"
              : affected.status,
            "affected-validation-stopped",
          );
        }
        report = await consumer.validate("full", [...seen]);
        parseGateOutput(JSON.stringify(report), exitCode(report.status));
        validations.push({ scope: "full", attempt: history.length, report });
        const lost = [...previouslyPassed].filter(
          (name) =>
            !report.gates.some((g) => g.name === name && g.status === "passed"),
        );
        if (
          report.configHash !== initial.configHash ||
          unsafeReport(report) ||
          lost.length
        ) {
          await rollback();
          return finish(
            "needs_review",
            lost.length
              ? "previously-passed-check-regressed"
              : "validation-binding-or-security-stop",
          );
        }
        if (["blocked", "error"].includes(report.status)) {
          await rollback();
          return finish(report.status, "full-validation-stopped");
        }
        for (const gate of report.gates)
          if (gate.status === "passed") previouslyPassed.add(gate.name);
      } catch (error) {
        await rollback();
        throw error;
      }
    } catch {
      return finish("error", "repair-consumer-or-filesystem-error");
    }
  }
}
