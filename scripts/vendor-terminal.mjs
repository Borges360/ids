#!/usr/bin/env node
// Copies the minimal import closure of @inteiro/terminal/pi (no prompts/linear) into a consumer
// directory, with provenance (VENDOR.json), the IDS LICENSE and a dependency-free verifier.
//
//   node scripts/vendor-terminal.mjs --out <dir> --format ts|js [--date <ISO>] [--allow-dirty]
//   node scripts/vendor-terminal.mjs --check <dir> [--upstream]
//
// Hashes are sha256 of the UTF-8 text with CRLF normalized to LF, so a Windows checkout with
// autocrlf verifies the same as Linux CI.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_REL = "packages/terminal/src";
const SRC = join(ROOT, SRC_REL);
const ENTRY = "pi.ts";
const ALLOWED_EXTERNAL = new Set(["@earendil-works/pi-tui"]);
const EXCLUDED = new Set(["prompts.ts", "linear.ts"]);
const VERIFIER = "verify-vendor.mjs";

const lf = (text) => text.replace(/\r\n/g, "\n");
export const sha256 = (text) =>
  createHash("sha256").update(lf(text), "utf8").digest("hex");
const gitRaw = (...args) =>
  execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
const git = (...args) => gitRaw(...args).trim();

/** Relative import specifiers of a module (static imports and re-exports). */
function specifiers(source) {
  return [
    ...source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s[^;]*?\sfrom\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']/g,
    ),
  ].map((m) => m[1] ?? m[2]);
}

/** Files reachable from pi.ts, in a stable order. Fails on unexpected externals. */
export function closure(entry = ENTRY, read = (f) => readFileSync(join(SRC, f), "utf8")) {
  const seen = new Set(),
    externals = new Set(),
    queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    if (EXCLUDED.has(file)) throw new Error(`${file} must not enter the Pi closure`);
    seen.add(file);
    for (const spec of specifiers(read(file))) {
      if (spec.startsWith("./")) queue.push(spec.slice(2));
      else if (spec.startsWith(".")) throw new Error(`Unsupported import ${spec} in ${file}`);
      else externals.add(spec);
    }
  }
  for (const e of externals)
    if (!ALLOWED_EXTERNAL.has(e))
      throw new Error(`External import "${e}" is not available in the Pi host`);
  return { files: [...seen].sort(), externals: [...externals].sort() };
}

let typescript;
function transpile(source, fileName) {
  typescript ??= createRequire(join(ROOT, "package.json"))("typescript");
  const ts = typescript;
  const out = ts.transpileModule(lf(source), {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
      useDefineForClassFields: true,
      removeComments: false,
      sourceMap: false,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  const errors = (out.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length)
    throw new Error(
      `${fileName}: ${ts.flattenDiagnosticMessageText(errors[0].messageText, "\n")}`,
    );
  const js = out.outputText.replace(
    /((?:from|import)\s*\(?\s*)(["'])(\.\/[^"']+)\.ts\2/g,
    "$1$2$3.js$2",
  );
  if (/["']\.\/[^"']+\.ts["']/.test(js))
    throw new Error(`${fileName}: relative .ts import left after rewrite`);
  return js;
}
const header = (pkg, file) =>
  `// Vendored from ${pkg.name} ${pkg.version} (${SRC_REL}/${file}). Do not edit; see VENDOR.json.\n`;
function emit(format, pkg, file, source) {
  return format === "ts"
    ? { path: file, text: lf(source) }
    : {
        path: file.replace(/\.ts$/, ".js"),
        text: header(pkg, file) + transpile(source, file),
      };
}

function repository() {
  try {
    const url = git("config", "--get", "remote.origin.url");
    return url.replace(/\/\/[^/@]+@/, "//");
  } catch {
    return "";
  }
}

export function vendor({ out, format, date, allowDirty = false }) {
  if (!["ts", "js"].includes(format)) throw new Error("--format must be ts or js");
  const pkg = JSON.parse(readFileSync(join(ROOT, "packages/terminal/package.json"), "utf8"));
  const contract =
    /TERMINAL_CONTRACT_VERSION\s*=\s*"([^"]+)"/.exec(
      readFileSync(join(SRC, "contracts.ts"), "utf8"),
    )?.[1] ?? "";
  const dirty = git("status", "--porcelain", "--", SRC_REL, "LICENSE", "packages/terminal/package.json");
  if (dirty && !allowDirty)
    throw new Error(
      "packages/terminal has uncommitted changes; commit first (or pass --allow-dirty for a throwaway copy)",
    );
  const commit = git("rev-parse", "HEAD");
  const when = date ?? git("log", "-1", "--format=%cI", "HEAD");
  if (Number.isNaN(Date.parse(when))) throw new Error(`Invalid --date: ${when}`);
  const target = resolve(out);
  if (existsSync(target)) {
    const entries = readdirSync(target);
    if (entries.length && !entries.includes("VENDOR.json"))
      throw new Error(`${target} is not empty and has no VENDOR.json; refusing to overwrite`);
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
  const { files, externals } = closure();
  const records = files.map((file) => {
    const source = readFileSync(join(SRC, file), "utf8");
    const emitted = emit(format, pkg, file, source);
    writeFileSync(join(target, emitted.path), emitted.text);
    return {
      path: emitted.path,
      upstream: `${SRC_REL}/${file}`,
      upstreamSha256: sha256(source),
      sha256: sha256(emitted.text),
    };
  });
  const license = lf(readFileSync(join(ROOT, "LICENSE"), "utf8"));
  writeFileSync(join(target, "LICENSE"), license);
  const verifier = VERIFIER_SOURCE;
  writeFileSync(join(target, VERIFIER), verifier);
  const manifest = {
    schemaVersion: 1,
    package: pkg.name,
    version: pkg.version,
    contract,
    format,
    entry: format === "ts" ? ENTRY : ENTRY.replace(/\.ts$/, ".js"),
    source: {
      repository: repository(),
      path: SRC_REL,
      commit,
      packageCommit: git("log", "-1", "--format=%H", "--", "packages/terminal"),
      date: new Date(when).toISOString(),
      dirty: !!dirty,
    },
    externals,
    peerDependencies: pkg.peerDependencies ?? {},
    hash: "sha256 of UTF-8 text with CRLF normalized to LF",
    ...(format === "js"
      ? {
          transpiler: `typescript ${createRequire(join(ROOT, "package.json"))("typescript").version}`,
          target: "ES2022 ESM (Node 20+), relative imports rewritten to .js",
        }
      : {
          requires:
            "TypeScript consumers: allowImportingTsExtensions or rewriteRelativeImportExtensions",
        }),
    files: records,
    license: { path: "LICENSE", upstream: "LICENSE", sha256: sha256(license) },
    verifier: { path: VERIFIER, sha256: sha256(verifier) },
    patches: [],
    verify: `node ${VERIFIER}`,
    update: `node scripts/vendor-terminal.mjs --out <dir> --format ${format}  (in the IDS repository)`,
  };
  writeFileSync(join(target, "VENDOR.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** Integrity (always) + provenance against the IDS git history (+ freshness with `upstream`). */
export async function check(dir, { upstream = false } = {}) {
  const target = resolve(dir);
  const { verifyVendor } = await import(pathToFileURL(join(target, VERIFIER)).href);
  const result = verifyVendor(target);
  const problems = [...result.problems],
    notes = [];
  const manifest = result.manifest;
  if (manifest) {
    if (sha256(VERIFIER_SOURCE) !== manifest.verifier?.sha256)
      notes.push("verifier generated by another vendor-terminal.mjs version");
    let known = true;
    try {
      git("cat-file", "-e", `${manifest.source.commit}^{commit}`);
    } catch {
      known = false;
      notes.push(`commit ${manifest.source.commit} not found here; provenance not re-derived`);
    }
    const pkg = { name: manifest.package, version: manifest.version };
    for (const f of manifest.files) {
      const file = f.upstream.slice(SRC_REL.length + 1);
      if (known && !manifest.source.dirty) {
        const original = gitRaw("show", `${manifest.source.commit}:${f.upstream}`);
        if (sha256(original) !== f.upstreamSha256)
          problems.push(`upstream hash does not match ${f.upstream} at ${manifest.source.commit}`);
        else if (existsSync(join(target, f.path))) {
          const expected = emit(manifest.format, pkg, file, original).text;
          if (sha256(expected) !== f.sha256)
            problems.push(`${f.path} is not reproducible from ${f.upstream}`);
        }
      }
      const current = join(SRC, file);
      if (!existsSync(current) || sha256(readFileSync(current, "utf8")) !== f.upstreamSha256)
        (upstream ? problems : notes).push(`IDS working tree differs from vendored ${f.upstream}`);
    }
    try {
      const now = closure().files.map((f) =>
        manifest.format === "ts" ? f : f.replace(/\.ts$/, ".js"),
      );
      const had = manifest.files.map((f) => f.path).sort();
      if (now.join() !== had.join())
        (upstream ? problems : notes).push("Pi closure changed in the IDS working tree");
    } catch (e) {
      notes.push(`closure not computed: ${e.message}`);
    }
  }
  return { ok: problems.length === 0, problems, notes, manifest };
}

const VERIFIER_SOURCE = `#!/usr/bin/env node
// Integrity check for a vendored copy described by VENDOR.json (no dependencies, Node 20+).
// Usage: node verify-vendor.mjs [dir]   or   import { verifyVendor } from "./verify-vendor.mjs"
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const sha256 = (text) =>
  createHash("sha256").update(text.replace(/\\r\\n/g, "\\n"), "utf8").digest("hex");
const walk = (root, dir = root) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(root, join(dir, e.name))
      : [relative(root, join(dir, e.name)).split("\\\\").join("/")],
  );

export function verifyVendor(dir = dirname(fileURLToPath(import.meta.url))) {
  const problems = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "VENDOR.json"), "utf8"));
  } catch {
    return { ok: false, problems: ["VENDOR.json missing or invalid"], manifest: undefined };
  }
  const expected = new Map();
  for (const f of manifest.files ?? []) expected.set(f.path, f.sha256);
  if (manifest.license) expected.set(manifest.license.path, manifest.license.sha256);
  if (manifest.verifier) expected.set(manifest.verifier.path, manifest.verifier.sha256);
  if (!expected.size) problems.push("VENDOR.json lists no files");
  for (const [path, hash] of expected) {
    let text;
    try {
      text = readFileSync(join(dir, path), "utf8");
    } catch {
      problems.push("missing: " + path);
      continue;
    }
    if (sha256(text) !== hash) problems.push("modified: " + path);
  }
  const patched = new Set((manifest.patches ?? []).map((p) => p.path));
  if (manifest.format === "ts")
    for (const f of manifest.files ?? [])
      if (f.sha256 !== f.upstreamSha256 && !patched.has(f.path))
        problems.push("differs from upstream without a recorded patch: " + f.path);
  for (const file of walk(dir))
    if (file !== "VENDOR.json" && !expected.has(file)) problems.push("unexpected: " + file);
  return { ok: problems.length === 0, problems, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = verifyVendor(process.argv[2]);
  const m = result.manifest;
  if (result.ok)
    console.log(
      "vendor ok: " + m.package + " " + m.version + " (" + m.format + ", " + m.files.length +
        " files, " + m.source.commit.slice(0, 12) + ")",
    );
  else for (const p of result.problems) console.error("vendor drift: " + p);
  process.exitCode = result.ok ? 0 : 1;
}
`;

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allow-dirty" || a === "--upstream") out[a.slice(2)] = true;
    else if (["--out", "--format", "--date", "--check"].includes(a)) {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} needs a value`);
      out[a.slice(2)] = v;
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const a = args(process.argv.slice(2));
    if (a.check) {
      const r = await check(a.check, { upstream: !!a.upstream });
      for (const n of r.notes) console.log(`note: ${n}`);
      for (const p of r.problems) console.error(`drift: ${p}`);
      if (r.ok)
        console.log(
          `vendor check ok: ${r.manifest.package} ${r.manifest.version} ${r.manifest.format} @ ${r.manifest.source.commit.slice(0, 12)} (${relative(process.cwd(), resolve(a.check)) || "."})`,
        );
      process.exitCode = r.ok ? 0 : 1;
    } else {
      if (!a.out || !a.format)
        throw new Error("usage: --out <dir> --format ts|js [--date <ISO>] [--allow-dirty] | --check <dir> [--upstream]");
      const m = vendor({
        out: a.out,
        format: a.format,
        date: a.date,
        allowDirty: !!a["allow-dirty"],
      });
      console.log(
        `vendored ${m.package} ${m.version} (contract ${m.contract}) as ${m.format}: ${m.files.length} files from ${m.source.commit.slice(0, 12)} into ${resolve(a.out)}`,
      );
    }
  } catch (e) {
    console.error(`vendor-terminal: ${e.message}`);
    process.exitCode = 1;
  }
}
