import { readFile, writeFile, readdir, lstat, mkdir } from "node:fs/promises";
import { relative, extname, dirname } from "node:path";
import postcss from "postcss";
import { allTokens } from "@inteiro/tokens";
import {
  hash,
  redact,
  safePath,
  validateSchema,
  type GateStatus,
} from "@inteiro/contracts";

export interface MigrationMapping {
  from: string;
  tokenId: string;
  files: string[];
  selectors: string[];
  properties: string[];
  owner: string;
  reason: string;
  approvalRef: string;
}
export interface MigrationPolicy {
  schemaVersion: "1.0";
  mappings: MigrationMapping[];
}
export interface MigrationPatch {
  file: string;
  beforeHash: string;
  afterHash: string;
  diff: string;
  edits: { start: number; end: number; value: string; tokenId: string }[];
}
export interface MigrationPlan {
  schemaVersion: "1.0";
  status: GateStatus;
  target: string;
  policyHash: string;
  planHash: string;
  files: { file: string; sha256: string }[];
  patches: MigrationPatch[];
  diagnostics: { file: string; line: number; kind: string; message: string }[];
  ignored: string[];
  nextAction: string;
}
const tokens = new Map(allTokens().map((token) => [token.id, token]));
const colorProperties =
  /^(?:color|background(?:-color)?|border(?:-(?:top|bottom|left|right|inline|block))?-color|outline-color|fill|stroke)$/;
const dimensionProperties =
  /^(?:font-size|(?:min-|max-)?(?:width|height|inline-size|block-size)|(?:margin|padding)(?:-(?:top|bottom|left|right|inline|block)(?:-(?:start|end))?)?|(?:row-|column-)?gap|border-radius)$/;
const hex = /^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i;
const ignoredNames = new Set([
  ".git",
  ".inteiro",
  ".agents",
  ".pi",
  ".cursor",
  ".codex",
  ".harness",
  ".cache",
  ".turbo",
  "node_modules",
  "dist",
  "build",
  "vendor",
  "artifacts",
  "storybook-static",
  "coverage",
  "test-results",
  "playwright-report",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "out",
]);
function pathKey(root: string, path: string) {
  if (
    typeof path !== "string" ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Invalid migration file scope");
  safePath(root, path);
  return path;
}
function compatible(property: string, mapping: MigrationMapping) {
  const token = tokens.get(mapping.tokenId);
  if (!token) return false;
  if (token.type === "color")
    return (
      token.layer !== "primitive" &&
      colorProperties.test(property) &&
      hex.test(mapping.from)
    );
  if (token.type === "fontFamily")
    return (
      property === "font-family" &&
      mapping.from.length > 0 &&
      !/[;{}]/.test(mapping.from)
    );
  if (token.type === "dimension")
    return (
      dimensionProperties.test(property) &&
      /^-?\d+(?:\.\d+)?(?:px|rem|em|pt|%|ch|vw|vh)$/.test(mapping.from)
    );
  if (token.type === "fontWeight")
    return property === "font-weight" && /^\d{3}$/.test(mapping.from);
  return false;
}
export function validateMigrationPolicy(root: string, policy: MigrationPolicy) {
  if (policy?.schemaVersion !== "1.0" || !Array.isArray(policy.mappings))
    throw new Error("Invalid migration policy");
  if (!validateSchema("migration-policy", policy).valid)
    throw new Error("Migration policy does not satisfy published schema");
  const keys = new Set<string>();
  for (const mapping of policy.mappings) {
    if (
      !mapping ||
      typeof mapping.from !== "string" ||
      typeof mapping.tokenId !== "string" ||
      ![mapping.owner, mapping.reason, mapping.approvalRef].every(
        (value) => typeof value === "string" && value.trim(),
      ) ||
      ![mapping.files, mapping.selectors, mapping.properties].every(
        (value) =>
          Array.isArray(value) &&
          value.length &&
          value.every((item) => typeof item === "string" && item.trim()),
      )
    )
      throw new Error(
        "Migration mappings require file, selector, property, token, owner and rationale",
      );
    for (const file of mapping.files)
      for (const selector of mapping.selectors)
        for (const property of mapping.properties) {
          pathKey(root, file);
          if (!compatible(property, mapping))
            throw new Error(
              "Mapping is not a compatible published token replacement",
            );
          const key = JSON.stringify([
            file,
            selector,
            property,
            mapping.from.toLowerCase(),
          ]);
          if (keys.has(key)) throw new Error("Ambiguous migration mapping");
          keys.add(key);
        }
  }
}
function applyEdits(content: string, edits: MigrationPatch["edits"]) {
  let result = content;
  for (const edit of [...edits].sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  return result;
}
function fullDiff(file: string, before: string, after: string) {
  const old = before.split("\n"),
    next = after.split("\n");
  return redact(
    "--- a/" +
      file +
      "\n+++ b/" +
      file +
      "\n@@ -1," +
      old.length +
      " +1," +
      next.length +
      " @@\n" +
      old.map((line) => "-" + line).join("\n") +
      "\n" +
      next.map((line) => "+" + line).join("\n") +
      "\n",
  );
}

/** Every replacement is an exact AST declaration match in an explicitly scoped policy. */
export async function planMigration(
  root: string,
  target: string = ".",
  policy: MigrationPolicy = { schemaVersion: "1.0", mappings: [] },
): Promise<MigrationPlan> {
  validateMigrationPolicy(root, policy);
  const paths: string[] = [],
    ignored: string[] = [],
    diagnostics: MigrationPlan["diagnostics"] = [],
    patches: MigrationPatch[] = [],
    files: MigrationPlan["files"] = [];
  const base = safePath(root, target);
  const visit = async (path: string) => {
    const info = await lstat(path),
      file = relative(root, path).replaceAll("\\", "/");
    if (info.isSymbolicLink())
      throw new Error("Migration does not follow symbolic links");
    if (info.isDirectory()) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const child = file ? file + "/" + entry.name : entry.name;
        if (ignoredNames.has(entry.name) || entry.isSymbolicLink()) {
          ignored.push(child);
          continue;
        }
        await visit(safePath(root, child));
      }
    } else if (/\.(?:css|scss|sass|less|[jt]sx?|html|vue|svelte)$/.test(file))
      paths.push(file);
  };
  await visit(base);
  for (const file of paths.sort()) {
    const bytes = await readFile(safePath(root, file));
    files.push({ file, sha256: hash(bytes) });
    if (bytes.length > 1024 * 1024) {
      diagnostics.push({
        file,
        line: 1,
        kind: "manual-review",
        message: "File exceeds safe migration size; no edits proposed",
      });
      continue;
    }
    const content = bytes.toString("utf8");
    if (!Buffer.from(content, "utf8").equals(bytes)) {
      diagnostics.push({
        file,
        line: 1,
        kind: "encoding-error",
        message:
          "Source is not lossless UTF-8; preserve it for manual migration",
      });
      continue;
    }
    if (extname(file) !== ".css") {
      diagnostics.push({
        file,
        line: 1,
        kind: "unsupported-syntax",
        message:
          "Automatic migration supports CSS declarations; keep framework syntax and migrate it manually using lint diagnostics",
      });
      continue;
    }
    let ast;
    try {
      ast = postcss.parse(content, { from: file });
    } catch {
      diagnostics.push({
        file,
        line: 1,
        kind: "parse-error",
        message: "CSS parser failed; no migration is applied",
      });
      continue;
    }
    const edits: MigrationPatch["edits"] = [];
    ast.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase(),
        selector =
          declaration.parent?.type === "rule"
            ? (declaration.parent as postcss.Rule).selector
            : "";
      const matches = policy.mappings.filter(
        (mapping) =>
          mapping.files.includes(file) &&
          mapping.selectors.includes(selector) &&
          mapping.properties.includes(property) &&
          (hex.test(mapping.from)
            ? mapping.from.toLowerCase() === declaration.value.toLowerCase()
            : mapping.from === declaration.value),
      );
      if (matches.length > 1) throw new Error("Ambiguous migration mapping");
      const mapping = matches[0];
      if (mapping) {
        const start = declaration.source?.start?.offset;
        if (start === undefined)
          throw new Error("Parser did not provide source offsets");
        const colon = content.indexOf(":", start),
          rawBefore = declaration.raws.between ?? ":";
        const valueStart =
          colon + 1 + rawBefore.slice(rawBefore.indexOf(":") + 1).length;
        const original = content.slice(
          valueStart,
          valueStart + declaration.value.length,
        );
        if (original !== declaration.value)
          throw new Error("Ambiguous CSS source range; migrate manually");
        edits.push({
          start: valueStart,
          end: valueStart + original.length,
          value: "var(" + tokens.get(mapping.tokenId)!.cssVar + ")",
          tokenId: mapping.tokenId,
        });
      } else if (
        (colorProperties.test(property) && hex.test(declaration.value)) ||
        (property === "font-family" && !declaration.value.startsWith("var("))
      )
        diagnostics.push({
          file,
          line: declaration.source?.start?.line ?? 1,
          kind: property === "font-family" ? "type" : "hardcoded-hex",
          message:
            "Select an intentional token mapping for " +
            redact(selector) +
            " / " +
            property,
        });
    });
    const after = applyEdits(content, edits);
    const { lintSource } = await import("./index.ts");
    const checked = await lintSource(file, after);
    for (const item of checked.findings) {
      const line = item.range?.startLine ?? 1,
        kind =
          item.ruleId === "IN-TOKEN-001" ? "hardcoded-hex" : "contract-review";
      if (
        !diagnostics.some(
          (diagnostic) =>
            diagnostic.file === file &&
            diagnostic.line === line &&
            diagnostic.kind === kind,
        )
      )
        diagnostics.push({ file, line, kind, message: item.message });
    }
    if (edits.length) {
      patches.push({
        file,
        beforeHash: hash(bytes),
        afterHash: hash(Buffer.from(after)),
        diff: fullDiff(file, content, after),
        edits,
      });
    }
  }
  if (!paths.length)
    diagnostics.push({
      file: relative(root, base) || ".",
      line: 1,
      kind: "unsupported-syntax",
      message: "No supported source files were selected",
    });
  const status =
    !paths.length ||
    diagnostics.some((item) =>
      ["parse-error", "encoding-error"].includes(item.kind),
    )
      ? "blocked"
      : diagnostics.length
        ? "needs_review"
        : "passed";
  const payload = {
    schemaVersion: "1.0" as const,
    status: status as GateStatus,
    target,
    policyHash: hash(policy),
    files,
    patches,
    diagnostics,
    ignored: ignored.sort(),
    nextAction: diagnostics.length
      ? "Review unmapped declarations or unsupported syntax; applied CSS changes do not certify the whole frontend"
      : "Inspect the preview before applying with --yes",
  };
  return { ...payload, planHash: hash(payload) };
}

export async function applyMigration(
  root: string,
  target: string,
  policy: MigrationPolicy,
  expectedPlanHash: string,
) {
  const plan = await planMigration(root, target, policy);
  if (plan.planHash !== expectedPlanHash)
    throw new Error("Migration plan changed; inspect a fresh preview");
  if (plan.status === "blocked")
    return { ...plan, applied: false, backups: [] };
  const backups: { file: string; path: string; sha256: string }[] = [],
    originals = new Map<string, Buffer>(),
    written: MigrationPatch[] = [];
  if (!plan.patches.length) return { ...plan, applied: false, backups };
  const directory = ".inteiro/migration-backups/" + plan.planHash;
  for (const patch of plan.patches) {
    const bytes = await readFile(safePath(root, patch.file));
    if (hash(bytes) !== patch.beforeHash)
      throw new Error("Migration source changed before backup");
    originals.set(patch.file, bytes);
    const path = directory + "/" + patch.file;
    await mkdir(dirname(safePath(root, path)), { recursive: true });
    try {
      await writeFile(safePath(root, path), bytes, { flag: "wx" });
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EEXIST" ||
        hash(await readFile(safePath(root, path))) !== hash(bytes)
      )
        throw error;
    }
    backups.push({ file: patch.file, path, sha256: hash(bytes) });
  }
  try {
    for (const patch of plan.patches) {
      const path = safePath(root, patch.file);
      if (hash(await readFile(path)) !== patch.beforeHash)
        throw new Error("Migration source changed before apply");
      const after = applyEdits(
        originals.get(patch.file)!.toString("utf8"),
        patch.edits,
      );
      if (hash(Buffer.from(after)) !== patch.afterHash)
        throw new Error("Migration output checksum mismatch");
      await writeFile(path, after);
      written.push(patch);
      if (hash(await readFile(path)) !== patch.afterHash)
        throw new Error("Migration output changed during write");
    }
    const manifest = {
      schemaVersion: "1.0",
      planHash: plan.planHash,
      policyHash: plan.policyHash,
      createdAt: new Date().toISOString(),
      files: plan.patches.map((patch) => ({
        ...backups.find((item) => item.file === patch.file)!,
        afterHash: patch.afterHash,
      })),
    };
    await writeFile(
      safePath(root, directory + "/manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      { flag: "wx" },
    );
    return {
      ...plan,
      applied: true,
      backups,
      backupManifest: directory + "/manifest.json",
    };
  } catch (error) {
    for (const patch of written) {
      const path = safePath(root, patch.file);
      if (hash(await readFile(path)) === patch.afterHash)
        await writeFile(path, originals.get(patch.file)!);
    }
    throw error;
  }
}
