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
} from "@inteiro/contracts";
import { findPatterns, getPattern } from "@inteiro/composition";
const paths: Record<string, string[]> = {
  pi: ["AGENTS.md", ".pi/skills/inteiro/SKILL.md"],
  codex: ["AGENTS.md", ".agents/skills/inteiro/SKILL.md"],
  cursor: ["AGENTS.md", ".cursor/rules/inteiro.mdc"],
  claude: [".claude/skills/inteiro/SKILL.md"],
  devin: [".agents/skills/inteiro/SKILL.md"],
  hermes: ["AGENTS.md", "HERMES.md"],
};
export async function verifyContext(
  root: string,
  config: Config,
  harness = config.context.harness,
): Promise<GateResult> {
  const start = performance.now(),
    findings = [],
    provenance = [];
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
    if (installation.conflicts?.length)
      findings.push(
        finding("IN-CTX-001", "Installation conflicts must be resolved", {
          status: "blocked",
        }),
      );
  } catch {}
  try {
    integrity = JSON.parse(
      await safeRead(root, ".inteiro/" + harness + ".integrity.json"),
    );
  } catch {}
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
      const text = await safeRead(root, path);
      provenance.push({ path, sha256: hash(text), required: true });
      if (!/inteiro/i.test(text))
        findings.push(
          finding(
            "IN-CTX-001",
            "Required context has no INTEIRO contract: " + path,
            { file: path, status: "blocked" },
          ),
        );
      if (integrity[path] && integrity[path] !== hash(text))
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
  if (harness === "cursor") {
    const text = await readFile(resolve(root, required.at(-1)!), "utf8").catch(
      () => "",
    );
    activation = /alwaysApply:\s*true/.test(text)
      ? "automatic"
      : /globs:\s*\S/.test(text)
        ? "scoped"
        : "manual";
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
    provenance,
  };
}
export async function recordContextIntegrity(root: string, harness: string) {
  const integrity: Record<string, string> = {};
  for (const p of paths[harness] ?? []) {
    try {
      integrity[p] = hash(await safeRead(root, p));
    } catch {}
  }
  await mkdir(resolve(root, ".inteiro"), { recursive: true });
  await writeFile(
    resolve(root, ".inteiro", harness + ".integrity.json"),
    JSON.stringify(integrity, null, 2),
  );
}
export async function resolveContext(
  task: { type: string; description: string; patternIds?: string[] },
  root: string,
  config: Config,
) {
  const verification = await verifyContext(root, config);
  const explicit = (task.patternIds ?? []).flatMap((id) => {
    const pattern = getPattern(id);
    return pattern
      ? [{ pattern, score: 1, reason: "Explicit task selection" }]
      : [];
  });
  const selected = [
    ...new Map(
      [...explicit, ...findPatterns(task.description, 5)].map((p) => [
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
  const payload = {
    schemaVersion: "1.0",
    inteiroVersion: "1.2.0",
    createdAt: new Date().toISOString(),
    configId: config.project.id,
    requestId: randomUUID(),
    configHash: hash(config),
    harness: config.context.harness,
    taskType: task.type,
    identity: [
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
    provenance: verification.provenance,
    requiredChecks: [
      "inteiro lint . --format json",
      "inteiro visual test --json",
      "inteiro gate run --profile pr --json",
    ],
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
      verification.status === "passed" && !missing.length && bytes <= budget
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
