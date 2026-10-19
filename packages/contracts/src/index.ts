import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, isAbsolute, dirname } from "node:path";
export { validateSchema } from "./validate.ts";
import { validateSchema } from "./validate.ts";

export const STATES = [
  "not_run",
  "running",
  "passed",
  "failed",
  "blocked",
  "needs_review",
  "waived",
  "error",
] as const;
export type GateStatus = (typeof STATES)[number];
export interface Finding {
  id: string;
  fingerprint: string;
  ruleId: string;
  category: string;
  severity: "info" | "warning" | "error" | "blocker";
  status: GateStatus;
  message: string;
  file?: string;
  range?: { startLine: number; startColumn: number };
  route?: string;
  viewport?: string;
  componentId?: string;
  evidenceRefs: string[];
  suggestedFix?: string;
  state?: string;
  theme?: string;
  density?: string;
}
export interface GateResult {
  name: string;
  status: GateStatus;
  findings: Finding[];
  durationMs: number;
  waiver?: { owner: string; approvalRef: string; expiresAt: string };
  [key: string]: unknown;
}
export interface EvidenceBundle {
  sourceHash?: string;
  gitSha?: string;
  schemaVersion: string;
  inteiroVersion: string;
  configId: string;
  configHash: string;
  hash: string;
  createdAt: string;
  runId: string;
  status: GateStatus;
  gates: GateResult[];
  findings: Finding[];
  artifacts: { path: string; sha256: string }[];
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function hash(value: unknown): string {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : canonical(value))
    .digest("hex");
}
export function finding(
  ruleId: string,
  message: string,
  extra: Partial<Finding> = {},
): Finding {
  const fingerprint = hash({
    ruleId,
    message,
    file: extra.file,
    range: extra.range,
    route: extra.route,
    viewport: extra.viewport,
    state: extra.state,
    theme: extra.theme,
    density: extra.density,
  });
  return {
    id: "finding-" + fingerprint.slice(0, 16),
    fingerprint,
    ruleId,
    category: ruleId.split("-")[1]!.toLowerCase(),
    severity: "error",
    status: "failed",
    message,
    evidenceRefs: [],
    ...extra,
  };
}
export function aggregate(gates: GateResult[], now = Date.now()): GateStatus {
  if (!gates.length) return "blocked";
  const states = gates.map((g) =>
    g.status === "waived" &&
    g.waiver?.owner &&
    g.waiver.approvalRef &&
    Date.parse(g.waiver.expiresAt) > now
      ? "passed"
      : g.status === "waived"
        ? "blocked"
        : g.status,
  );
  for (const s of [
    "error",
    "failed",
    "blocked",
    "needs_review",
    "not_run",
    "running",
  ] as const)
    if (states.includes(s)) return s;
  return "passed";
}
export function exitCode(status: GateStatus): number {
  return status === "passed"
    ? 0
    : status === "failed"
      ? 6
      : status === "error"
        ? 8
        : 7;
}
export function safePath(root: string, path: string): string {
  const result = resolve(root, path),
    rel = relative(resolve(root), result);
  if (
    rel === ".." ||
    rel.startsWith("..\\") ||
    rel.startsWith("../") ||
    isAbsolute(rel)
  )
    throw new Error("Path escapes project root");
  let ancestor = result;
  while (!existsSync(ancestor) && dirname(ancestor) !== ancestor)
    ancestor = dirname(ancestor);
  if (existsSync(root)) {
    const realRoot = realpathSync(root),
      realAncestor = realpathSync(ancestor),
      actual = relative(realRoot, realAncestor);
    if (
      actual === ".." ||
      actual.startsWith("..\\") ||
      actual.startsWith("../") ||
      isAbsolute(actual)
    )
      throw new Error("Symlink escapes project root");
  }
  return result;
}
export async function safeRead(root: string, path: string): Promise<string> {
  const target = await realpath(safePath(root, path));
  safePath(await realpath(root), target);
  return readFile(target, "utf8");
}
export function redact(value: string): string {
  return value
    .replace(
      /\b(?:gh[pousr]_[\w]{20,}|github_pat_[\w]+|sk-[\w-]{16,}|AKIA[A-Z0-9]{16})\b/g,
      "[REDACTED]",
    )
    .replace(/(Bearer\s+)[\w.\-]+/gi, "$1[REDACTED]")
    .replace(
      /((?:password|secret|api[_-]?key|access[_-]?token)\s*[=:]\s*["']?)[^\s"',}]+/gi,
      "$1[REDACTED]",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
}
export const DEFAULTS = {
  schemaVersion: "1.0",
  project: { id: "app", root: ".", framework: "auto" },
  design: {
    theme: ["dark", "light"],
    density: ["calm", "focus"],
    strictTokens: true,
  },
  context: {
    mode: "enforced",
    harness: "auto",
    requireProof: true,
    maxTokens: 4000,
  },
  composition: { allowed: [] as string[], customPatterns: "review-required" },
  static: {
    profile: "strict",
    adoption: "enforce-all",
    baseline: "",
    include: ["src/**/*.{ts,tsx,js,jsx,vue,svelte,css,html}"],
    exclude: ["**/dist/**", "**/node_modules/**", "**/vendor/**"],
    forbiddenImports: [] as string[],
    forbiddenTokens: [] as string[],
    suppressionPolicy: "approved-only",
  },
  browser: {
    baseURL: "http://127.0.0.1:4173",
    startCommand: "",
    readyPath: "/",
    timeoutMs: 60000,
    environment: "pinned-chromium",
    routesFile: "inteiro.routes.json",
    routeRoots: ["src/app", "app", "src/routes", "src/pages", "pages"],
    criticalRoutes: [] as string[],
    requiredFonts: [] as string[],
    fontAssets: [] as { path: string; sha256: string }[],
    allowedOrigins: [] as string[],
    viewports: [
      { id: "small", width: 320, height: 812 },
      { id: "mobile", width: 375, height: 812 },
      { id: "tablet", width: 768, height: 1024 },
      { id: "wide", width: 1024, height: 900 },
      { id: "desktop", width: 1440, height: 900 },
    ],
  },
  visual: {
    baselineDir: "tests/visual/__snapshots__",
    policy: "approved-only",
    maxDiffPixelRatio: 0.002,
    colorThreshold: 0.1,
    fullPage: true,
    missingBaseline: "block",
  },
  review: {
    requiredFor: ["new-pattern", "new-page", "significant-layout-change"],
    method: "human-or-multimodal-plus-approval",
    allowExternalProvider: false,
  },
  repair: { maxAttempts: 2, maxChangedFiles: 8, maxDiffLines: 450 },
  benchmark: { suite: "p0-smoke", dataset: "benchmarks/p0-smoke.json" },
  reporting: {
    outDir: ".inteiro/reports",
    formats: ["json", "html", "sarif", "junit"],
  },
};
export type Config = typeof DEFAULTS;
export function merge<T>(base: T, overrides: unknown): T {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides))
    return structuredClone(base);
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw new Error("Unsafe configuration key");
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? merge(out[key] ?? {}, value)
        : value;
  }
  return out as T;
}
export function validateConfig(config: Config): void {
  if (
    !["observe", "enforce-new", "enforce-all"].includes(config.static.adoption)
  )
    throw new Error("Invalid adoption mode");
  if (config.schemaVersion !== "1.0")
    throw new Error("Unsupported schemaVersion");
  if (!config.project?.id || !config.project.root)
    throw new Error("project.id/root required");
  if (!["http:", "https:"].includes(new URL(config.browser.baseURL).protocol))
    throw new Error("Invalid browser baseURL");
  const base = new URL(config.browser.baseURL);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) &&
    !config.browser.allowedOrigins.includes(base.origin)
  )
    throw new Error("Nonlocal baseURL requires explicit origin allowlist");
  if (
    !Number.isFinite(config.visual.maxDiffPixelRatio) ||
    config.visual.maxDiffPixelRatio < 0 ||
    config.visual.maxDiffPixelRatio > 1
  )
    throw new Error("Invalid pixel ratio");
  if (
    !Number.isFinite(config.visual.colorThreshold) ||
    config.visual.colorThreshold < 0 ||
    config.visual.colorThreshold > 1
  )
    throw new Error("Invalid color threshold");
  for (const key of ["maxAttempts", "maxChangedFiles", "maxDiffLines"] as const)
    if (!Number.isInteger(config.repair[key]) || config.repair[key] < 0)
      throw new Error("Invalid repair limits");
  if (
    !config.browser.viewports.length ||
    config.browser.viewports.some(
      (v) =>
        !v.id ||
        !Number.isInteger(v.width) ||
        v.width < 1 ||
        !Number.isInteger(v.height) ||
        v.height < 1,
    )
  )
    throw new Error("Invalid viewports");
}
export async function resolveConfig(
  cwd: string,
  flags: unknown = {},
  organization: Partial<Config> = {},
) {
  let project: unknown = {};
  try {
    project = JSON.parse(
      await readFile(resolve(cwd, "inteiro.config.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const config = merge(merge(DEFAULTS, project), flags);
  const beforePolicy = structuredClone(config);
  try {
    organization = merge(
      organization,
      JSON.parse(
        await readFile(
          resolve(cwd, ".inteiro/organization-policy.json"),
          "utf8",
        ),
      ),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const validation = validateSchema("config", config);
  if (!validation.valid)
    throw new Error(
      "Invalid configuration: " + JSON.stringify(validation.errors),
    );
  // Organization constraints can tighten, never loosen security through flags.
  if (organization.review?.allowExternalProvider === false)
    config.review.allowExternalProvider = false;
  if (organization.review?.requiredFor)
    config.review.requiredFor = [
      ...new Set([
        ...config.review.requiredFor,
        ...organization.review.requiredFor,
      ]),
    ];
  if (organization.design?.strictTokens === true)
    config.design.strictTokens = true;
  if (organization.context?.requireProof === true)
    config.context.requireProof = true;
  if (organization.visual?.maxDiffPixelRatio !== undefined)
    config.visual.maxDiffPixelRatio = Math.min(
      config.visual.maxDiffPixelRatio,
      organization.visual.maxDiffPixelRatio,
    );
  if (organization.static?.forbiddenImports)
    config.static.forbiddenImports = [
      ...new Set([
        ...config.static.forbiddenImports,
        ...organization.static.forbiddenImports,
      ]),
    ];
  if (organization.static?.forbiddenTokens)
    config.static.forbiddenTokens = [
      ...new Set([
        ...config.static.forbiddenTokens,
        ...organization.static.forbiddenTokens,
      ]),
    ];
  if (organization.static?.adoption === "enforce-all")
    config.static.adoption = "enforce-all";
  validateConfig(config);
  const root = safePath(cwd, config.project.root);
  const frameworkWasAuto = config.project.framework === "auto";
  if (config.project.framework === "auto") {
    try {
      const pkg = JSON.parse(await safeRead(root, "package.json"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      config.project.framework =
        "next" in deps
          ? "next"
          : "react" in deps
            ? "react"
            : "vue" in deps
              ? "vue"
              : "svelte" in deps
                ? "svelte"
                : "html";
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        config.project.framework = "html";
      else throw e;
    }
  }
  for (const path of [
    config.visual.baselineDir,
    config.reporting.outDir,
    config.browser.routesFile,
  ])
    safePath(root, path);
  const origins: Record<string, string> = {};
  const at = (object: unknown, path: string) =>
    path
      .split(".")
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined,
        object,
      );
  const walk = (v: unknown, prefix = "") => {
    if (v && typeof v === "object" && !Array.isArray(v))
      for (const [k, x] of Object.entries(v))
        walk(x, prefix ? prefix + "." + k : k);
    else
      origins[prefix] =
        prefix === "project.framework" && frameworkWasAuto
          ? "detected:package.json"
          : at(config, prefix) !== at(beforePolicy, prefix) &&
              at(organization, prefix) !== undefined
            ? "organization-policy"
            : at(flags, prefix) !== undefined
              ? "cli-flag"
              : at(project, prefix) !== undefined
                ? "inteiro.config.json"
                : "published-default";
  };
  walk(config);
  return { config, root, configHash: hash(config), origins };
}
export function bundle(config: Config, gates: GateResult[]): EvidenceBundle {
  const findings = [
    ...new Map(
      gates.flatMap((g) => g.findings).map((f) => [f.fingerprint, f]),
    ).values(),
  ];
  const data = {
    schemaVersion: "1.0",
    inteiroVersion: "1.2.0",
    configId: config.project.id,
    configHash: hash(config),
    createdAt: new Date().toISOString(),
    runId: "run-" + randomUUID(),
    status: aggregate(gates),
    gates,
    findings,
    artifacts: [] as { path: string; sha256: string }[],
  };
  const clean = JSON.parse(redact(JSON.stringify(data))) as typeof data;
  return { ...clean, hash: hash(clean) };
}
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function reportFormats(report: EvidenceBundle) {
  const r = JSON.parse(redact(JSON.stringify(report))) as EvidenceBundle;
  return {
    json: JSON.stringify(r, null, 2),
    sarif: JSON.stringify({
      version: "2.1.0",
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "INTEIRO",
              rules: [...new Set(r.findings.map((f) => f.ruleId))].map(
                (id) => ({ id }),
              ),
            },
          },
          results: r.findings.map((f) => ({
            ruleId: f.ruleId,
            level:
              f.severity === "warning"
                ? "warning"
                : f.severity === "info"
                  ? "note"
                  : "error",
            message: { text: f.message },
            partialFingerprints: { inteiro: f.fingerprint },
            ...(f.file
              ? {
                  locations: [
                    {
                      physicalLocation: {
                        artifactLocation: { uri: f.file.replaceAll("\\", "/") },
                        region: {
                          startLine: f.range?.startLine ?? 1,
                          startColumn: f.range?.startColumn ?? 1,
                        },
                      },
                    },
                  ],
                }
              : {}),
          })),
        },
      ],
    }),
    junit:
      '<?xml version="1.0"?><testsuites><testsuite name="INTEIRO" tests="' +
      r.gates.length +
      '" failures="' +
      r.gates.filter((g) => g.status === "failed").length +
      '" errors="' +
      r.gates.filter((g) => g.status === "error").length +
      '">' +
      r.gates
        .map(
          (g) =>
            '<testcase name="' +
            escape(g.name) +
            '" time="' +
            g.durationMs / 1000 +
            '">' +
            (g.status === "passed"
              ? ""
              : g.status === "failed"
                ? '<failure message="' +
                  escape(g.findings.map((f) => f.message).join("; ")) +
                  '"/>'
                : g.status === "error"
                  ? '<error message="Infrastructure failure"/>'
                  : '<skipped message="' + g.status + '"/>') +
            "</testcase>",
        )
        .join("") +
      "</testsuite></testsuites>",
    html:
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>INTEIRO evidence</title><h1>' +
      escape(r.status) +
      "</h1><p>" +
      escape(r.runId) +
      "</p><pre>" +
      escape(JSON.stringify(r, null, 2)) +
      "</pre></html>",
  };
}
export async function writeReport(
  root: string,
  config: Config,
  report: EvidenceBundle,
) {
  const dir = safePath(root, config.reporting.outDir + "/" + report.runId);
  await mkdir(dir, { recursive: true });
  let gitSha = "unknown";
  try {
    gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {}
  const captures = report.gates
    .flatMap((g) =>
      [...(Array.isArray(g.captures) ? (g.captures as { actual: string }[]) : []), ...(Array.isArray(g.actionCaptures) ? (g.actionCaptures as { actual: string }[]) : [])],
    )
    .map((c) => c.actual);
  const related = captures.flatMap((p) => [
    p,
    p.replace("-actual.png", "-expected.png"),
    p.replace("-actual.png", "-diff.png"),
    p.replace("-actual.png", "-trace.zip"),
  ]);
  for (const path of [
    ...new Set([...related, ...report.findings.flatMap((f) => f.evidenceRefs)]),
  ]) {
    try {
      report.artifacts.push({
        path,
        sha256: hash(await readFile(safePath(root, path))),
      });
    } catch {}
  }
  let sourceHash = "unknown";
  try {
    sourceHash = await reviewSourceHash(root);
  } catch {}
  Object.assign(report, {
    sourceHash,
    projectId: config.project.id,
    gitSha,
    contractHash: hash(config),
    startedAt: report.createdAt,
    finishedAt: new Date().toISOString(),
    approval: [],
    exitCode: exitCode(report.status),
  });
  const { hash: _, ...payload } = report;
  report.hash = hash(payload);
  const formats = reportFormats(report);
  const gallery = report.artifacts
    .filter((a) => a.path.endsWith(".png"))
    .map(
      (a) =>
        "<figure><figcaption>" +
        escape(a.path) +
        '</figcaption><a href="' +
        escape(
          encodeURI(
            relative(dir, safePath(root, a.path)).replaceAll("\\", "/"),
          ),
        ) +
        '"><img loading="lazy" alt="' +
        escape(a.path) +
        '" src="' +
        escape(
          encodeURI(
            relative(dir, safePath(root, a.path)).replaceAll("\\", "/"),
          ),
        ) +
        '"></a><p>SHA256 ' +
        escape(a.sha256) +
        "</p></figure>",
    )
    .join("");
  formats.html =
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INTEIRO evidence</title><style>body{font:16px system-ui;margin:2rem}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));gap:1rem}img{max-width:100%;height:auto}figure{margin:0;border:1px solid;padding:1rem;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>INTEIRO: ' +
    escape(report.status) +
    "</h1><p>" +
    escape(report.runId) +
    "</p><p>Capturas são evidências; aprovação estética e promoção de baseline exigem revisão autenticada.</p><section>" +
    gallery +
    "</section><details><summary>Relatório JSON</summary><pre>" +
    escape(formats.json) +
    "</pre></details></html>";
  const names = {
    json: "summary.json",
    sarif: "diagnostics.sarif",
    junit: "junit.xml",
    html: "report.html",
  };
  for (const format of config.reporting.formats) {
    if (!(format in formats)) throw new Error("Unknown report format");
    await writeFile(
      resolve(dir, names[format as keyof typeof names]),
      formats[format as keyof typeof formats],
    );
  }
  await writeFile(
    resolve(dir, "coverage.json"),
    JSON.stringify(
      report.gates.map((g) => ({
        name: g.name,
        executed: g.executed ?? null,
        coverage: g.coverage ?? null,
        captures: g.captures ?? [],
      })),
      null,
      2,
    ),
  );
  await writeFile(
    resolve(dir, "environment.json"),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        gitSha,
      },
      null,
      2,
    ),
  );
  const latest = safePath(root, config.reporting.outDir + "/latest.json");
  await mkdir(dirname(latest), { recursive: true });
  await writeFile(latest, formats.json);
  return { dir, runId: report.runId };
}
export async function readEvidence(
  root: string,
  path: string,
): Promise<EvidenceBundle> {
  const report = JSON.parse(await safeRead(root, path)) as EvidenceBundle;
  const validation = validateSchema("evidence-bundle", report);
  if (!validation.valid) throw new Error("Invalid evidence schema");
  const { hash: expected, ...payload } = report;
  if (hash(payload) !== expected) throw new Error("Evidence hash mismatch");
  for (const artifact of report.artifacts) {
    if (hash(await readFile(safePath(root, artifact.path))) !== artifact.sha256)
      throw new Error("Evidence artifact hash mismatch");
  }
  return report;
}
export async function reviewSourceHash(root: string): Promise<string> {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(
      (path) =>
        /^(packages|tests|scripts|stories|examples|apps|docs)\//.test(path) ||
        [
          "package.json",
          "package-lock.json",
          "inteiro.config.json",
          "inteiro.routes.json",
        ].includes(path),
    );
  const files = [...new Set([...tracked, ...untracked])]
    .filter(
      (path) =>
        !path.startsWith(".inteiro/reviews/") &&
        !path.startsWith("tests/visual/__snapshots__/") &&
        path !== "release-evidence.json",
    )
    .sort();
  const entries = [];
  for (const path of files)
    entries.push({ path, sha256: hash(await readFile(safePath(root, path))) });
  return hash(entries);
}
