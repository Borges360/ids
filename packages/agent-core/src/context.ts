import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { randomUUID } from "node:crypto";
import {
  hash,
  canonical,
  finding,
  safePath,
  safeRead,
  type Config,
  type GateResult,
  TASK_TYPES,
} from "@inteiro/contracts";
import { findPatterns, getPattern } from "@inteiro/composition";
import { cursorActivation } from "./cursor-activation.ts";
import { TERMINAL_COMPONENTS, TERMINAL_CONTEXT } from "@inteiro/terminal";
const paths: Record<string, string[]> = {
  pi: ["AGENTS.md", ".pi/skills/inteiro/SKILL.md"],
  codex: ["AGENTS.md", ".agents/skills/inteiro/SKILL.md"],
  cursor: ["AGENTS.md", ".cursor/rules/inteiro.mdc"],
  claude: [".claude/skills/inteiro/SKILL.md"],
  devin: [".agents/skills/inteiro/SKILL.md"],
  hermes: ["AGENTS.md", "HERMES.md"],
};
export interface ContextTask {
  type: string;
  description: string;
  patternIds?: string[];
  [key: string]: unknown;
}
export { TASK_TYPES } from "@inteiro/contracts";
export function contextTaskHash(task: ContextTask): string {
  const { contextBundleId: _, configHash: __, ...identity } = task;
  return hash(identity);
}
export async function verifyContext(
  root: string,
  config: Config,
  harness = config.context.harness,
): Promise<GateResult> {
  const start = performance.now(),
    findings = [],
    provenance = [];
  const contents = new Map<string, string>();
  const required = paths[harness];
  if (!required)
    return {
      name: "context",
      status: "blocked",
      findings: [
        finding(
          "IN-CTX-001",
          "Select a supported harness; auto cannot prove integration",
          { status: "blocked" },
        ),
      ],
      durationMs: performance.now() - start,
      discoverable: false,
      loaded: "unobserved",
      used: "unobserved",
      compliant: "not_run",
    };
  let integrity: Record<string, string> = {};
  try {
    const installation = JSON.parse(
      await safeRead(root, ".inteiro/" + harness + ".installed.json"),
    );
    if (
      !installation ||
      typeof installation !== "object" ||
      Array.isArray(installation) ||
      (installation.harness !== undefined &&
        installation.harness !== harness) ||
      (installation.schemaVersion !== undefined &&
        installation.schemaVersion !== "1.0") ||
      (installation.conflicts !== undefined &&
        (!Array.isArray(installation.conflicts) ||
          installation.conflicts.some(
            (path: unknown) => typeof path !== "string",
          )))
    )
      throw new Error("Invalid installation metadata");
    if (installation.conflicts?.length)
      findings.push(
        finding("IN-CTX-001", "Installation conflicts must be resolved", {
          status: "blocked",
        }),
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      findings.push(
        finding("IN-CTX-001", "Invalid installation metadata", {
          status: "blocked",
        }),
      );
  }
  try {
    const recorded = JSON.parse(
      await safeRead(root, ".inteiro/" + harness + ".integrity.json"),
    );
    if (
      !recorded ||
      typeof recorded !== "object" ||
      Array.isArray(recorded) ||
      Object.values(recorded).some(
        (value) => typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value),
      )
    )
      throw new Error("Invalid integrity metadata");
    integrity = recorded;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      findings.push(
        finding("IN-CTX-001", "Invalid integrity metadata", {
          status: "blocked",
        }),
      );
  }
  if (config.context.requireProof && !Object.keys(integrity).length)
    findings.push(
      finding(
        "IN-CTX-001",
        "Installation integrity proof missing; run agents install " + harness,
        { status: "blocked" },
      ),
    );
  for (const path of required) {
    try {
      const bytes = await readFile(safePath(root, path));
      const text = bytes.toString("utf8");
      const digest = hash(bytes);
      const stored = integrity[path];
      const legacy =
        stored !== undefined && stored !== digest && stored === hash(text);
      contents.set(path, text);
      provenance.push({
        path,
        sha256: digest,
        required: true,
        integrityFormat: legacy
          ? "legacy-canonical-json"
          : stored === digest
            ? "raw-bytes"
            : "unverified",
      });
      if (!Buffer.from(text, "utf8").equals(bytes))
        findings.push(
          finding(
            "IN-CTX-001",
            "Required context is not valid UTF-8: " + path,
            { file: path, status: "blocked" },
          ),
        );
      if (config.context.requireProof && !stored)
        findings.push(
          finding(
            "IN-CTX-001",
            "Installation integrity proof missing for: " + path,
            { file: path, status: "blocked" },
          ),
        );
      if (!/inteiro/i.test(text))
        findings.push(
          finding(
            "IN-CTX-001",
            "Required context has no INTEIRO contract: " + path,
            { file: path, status: "blocked" },
          ),
        );
      if (stored && stored !== digest && !legacy)
        findings.push(
          finding(
            "IN-CTX-001",
            "Installed context integrity changed: " + path,
            { file: path, status: "blocked" },
          ),
        );
    } catch {
      findings.push(
        finding("IN-CTX-001", "Required context missing: " + path, {
          file: path,
          status: "blocked",
        }),
      );
    }
  }
  let activation = "harness-discovery";
  let activationDetails: ReturnType<typeof cursorActivation> | undefined;
  if (harness === "cursor") {
    const text = contents.get(required.at(-1)!) ?? "";
    activationDetails = cursorActivation(text);
    activation = activationDetails.activation;
    if (activation === "unresolved")
      findings.push(
        finding(
          "IN-CTX-001",
          "Invalid or unsupported Cursor activation metadata",
          { status: "blocked" },
        ),
      );
  }
  return {
    name: "context",
    status: findings.length ? "blocked" : "passed",
    findings,
    durationMs: performance.now() - start,
    harness,
    discoverable: findings.length === 0,
    loaded: "unobserved",
    used: "unobserved",
    compliant: "not_run",
    activation,
    ...(activationDetails ? { activationDetails } : {}),
    provenance,
  };
}
export async function recordContextIntegrity(root: string, harness: string) {
  const integrity: Record<string, string> = {};
  for (const p of paths[harness] ?? []) {
    try {
      integrity[p] = hash(await readFile(safePath(root, p)));
    } catch {}
  }
  await mkdir(resolve(root, ".inteiro"), { recursive: true });
  await writeFile(
    resolve(root, ".inteiro", harness + ".integrity.json"),
    JSON.stringify(integrity, null, 2),
  );
}
export async function resolveContext(
  task: ContextTask,
  root: string,
  config: Config,
) {
  const verification = await verifyContext(root, config);
  const provenance = Array.isArray(verification.provenance)
    ? [...verification.provenance]
    : [];
  const resolutionErrors: string[] = [];
  if (task.contractRefs !== undefined) {
    if (!Array.isArray(task.contractRefs))
      resolutionErrors.push("Contract references must be an array");
    else
      for (const reference of task.contractRefs) {
        try {
          if (
            !reference ||
            typeof reference.path !== "string" ||
            typeof reference.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(reference.sha256)
          )
            throw new Error();
          const bytes = await readFile(safePath(root, reference.path));
          if (hash(bytes) !== reference.sha256) throw new Error();
          provenance.push({
            path: reference.path,
            sha256: hash(bytes),
            required: true,
          });
        } catch {
          resolutionErrors.push(
            "Contract reference missing, unsafe or checksum mismatch",
          );
        }
      }
  }
  const terminal = task.surface === "terminal" || /\b(terminal|tui)\b/i.test(task.description);
  const terminalPatterns = TERMINAL_COMPONENTS.map(c => ({ pattern: { id: c.id, states: c.states, requiredTokens: c.tokens, markup: c.example, examples: ["examples/terminal/standalone.ts", "examples/terminal/pi-extension.ts"] }, score: 1, reason: "Terminal surface contract" }));
  const explicit = (task.patternIds ?? []).flatMap((id) => {
    if (terminal) return terminalPatterns.filter(p => p.pattern.id === id);
    const pattern = getPattern(id);
    return pattern
      ? [{ pattern, score: 1, reason: "Explicit task selection" }]
      : [];
  });
  const selected = [
    ...new Map(
      [...explicit, ...(terminal ? terminalPatterns.filter(p => ["terminal.TerminalPanel", "terminal.SettingsList", "terminal.KeyHints", "terminal.Progress"].includes(p.pattern.id)) : findPatterns(task.description, 5))].map((p) => [
        p.pattern.id,
        p,
      ]),
    ).values(),
  ].filter(
    (p) =>
      !config.composition.allowed.length ||
      config.composition.allowed.includes(p.pattern.id),
  );
  const required = task.patternIds ?? [];
  const missing = required.filter(
    (id) => !selected.some((p) => p.pattern.id === id),
  );
  if (
    !selected.length &&
    !["fix", "refactor", "new-pattern"].includes(task.type) &&
    !missing.length
  )
    missing.push("pattern-unavailable");
  const payload = {
    schemaVersion: "1.0",
    inteiroVersion: "1.3.1",
    createdAt: new Date().toISOString(),
    configId: config.project.id,
    requestId: randomUUID(),
    configHash: hash(config),
    harness: config.context.harness,
    taskType: task.type,
    taskHash: contextTaskHash(task),
    identity: terminal ? TERMINAL_CONTEXT.identity : [
      "Use semantic tokens",
      "Set data-in-theme and data-in-density",
      "Commit indicates publication/business boundary",
      "No unapproved golden promotion",
    ],
    patterns: selected.map(({ pattern: p, reason }) => ({
      id: p.id,
      states: p.states,
      tokens: p.requiredTokens,
      markup: p.markup,
      examples: p.examples,
      reason,
    })),
    provenance,
    resolutionErrors,
    requiredChecks: terminal ? TERMINAL_CONTEXT.requiredChecks : [
      "inteiro lint . --format json",
      "inteiro visual test --json",
      "inteiro gate run --profile pr --json",
    ],
    acceptance: {
      ...(terminal ? { surface: "terminal", terminalMatrix: TERMINAL_CONTEXT.matrix, terminalContractVersion: "1.0.0", terminalEvidence: "docs/terminal/qualification.json" } : {}),
      viewports: config.browser.viewports,
      routesFile: config.browser.routesFile,
      fixturesDirectory: ".inteiro/fixtures",
      baselinePolicy: config.visual.policy,
      requiredReviewTypes: config.review.requiredFor,
    },
    constraints: {
      ...config.repair,
      prohibitedActions: [
        "approve-baseline",
        "relax-threshold",
        "disable-rule",
        "read-secrets",
      ],
    },
  };
  const bytes = Buffer.byteLength(canonical(payload));
  const budget = config.context.maxTokens * 4;
  return {
    status:
      verification.status === "passed" &&
      !resolutionErrors.length &&
      !missing.length &&
      bytes <= budget &&
      TASK_TYPES.includes(task.type as (typeof TASK_TYPES)[number]) &&
      typeof task.description === "string" &&
      task.description.trim().length > 0
        ? "passed"
        : "blocked",
    bundleId: "context:" + hash(payload),
    ...payload,
    estimatedTokens: Math.ceil(bytes / 4),
    budgetTokens: config.context.maxTokens,
    missingPatterns: missing,
    limits: ["Discovery does not prove internal model context access."],
  };
}
