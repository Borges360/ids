import ts from "typescript";
import postcss from "postcss";
import { parse as parseHtml } from "parse5";
import { parse as parseVue } from "@vue/compiler-sfc";
import { parse as parseSvelte } from "svelte/compiler";
import { readFile, readdir, lstat } from "node:fs/promises";
import { relative, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { allTokens } from "@inteiro/tokens";
import { patterns } from "@inteiro/composition";
import {
  finding,
  safePath,
  aggregate,
  type Finding,
  type GateResult,
  type Config,
} from "@inteiro/contracts";
const require = createRequire(import.meta.url);
const picomatch = require("picomatch") as (
  globs: string[],
) => (path: string) => boolean;
const color =
  /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color)\(|^(?:red|blue|green|yellow|black|white|gray|grey|orange|purple|pink|navy|teal|maroon|silver|lime|aqua|fuchsia|olive)$/i;
const styleProps =
  /^(?:color|background(?:-color)?|border(?:-(?:top|left|right|bottom))?(?:-color)?|fill|stroke|box-shadow|text-shadow|outline(?:-color)?)$/i;
const tokens = allTokens();
const vars = new Set(
  tokens.map((t) => t.cssVar.replace(/^var\((.+)\)$/, "$1")),
);
const primitives = new Set(
  tokens
    .filter((t) => t.layer === "primitive" && t.type === "color")
    .map((t) => t.cssVar.replace(/^var\((.+)\)$/, "$1")),
);
const publicCss = [
  "../../design-system/src/components.css",
  "../../design-system/src/inteiro.css",
  "../../composition/src/composition.css",
].map((p) => readFile(new URL(p, import.meta.url), "utf8"));
let classes: Set<string>;
export interface LintOptions {
  forbiddenImports?: string[];
  forbiddenTokens?: string[];
  strict?: boolean;
  exceptions?: Exception[];
}
export interface Exception {
  ruleId: string;
  reason: string;
  owner: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
  approvalRef?: string;
}
export async function lintSource(
  file: string,
  source: string,
  options: LintOptions = {},
): Promise<GateResult> {
  const start = performance.now(),
    findings: Finding[] = [];
  classes ??= new Set(
    (await Promise.all(publicCss)).join("\n").match(/\bin-[\w-]+/g) ?? [],
  );
  const push = (
    ruleId: string,
    message: string,
    offset = 0,
    severity: Finding["severity"] = "error",
  ) =>
    findings.push(
      finding(ruleId, message, {
        file,
        range: {
          startLine: source.slice(0, offset).split("\n").length,
          startColumn: offset - (source.lastIndexOf("\n", offset - 1) + 1) + 1,
        },
        severity,
        status: severity === "warning" ? "needs_review" : "failed",
      }),
    );
  const checkValue = (value: string, offset: number, visual = true) => {
    if (visual && color.test(value))
      push(
        "IN-TOKEN-001",
        "Use a semantic color token instead of " + value,
        offset,
      );
    for (const match of value.matchAll(/var\((--in-[\w-]+)/g)) {
      if (!vars.has(match[1]!))
        push(
          "IN-TOKEN-003",
          "Unknown CSS variable " + match[1],
          offset + match.index!,
        );
      else if (primitives.has(match[1]!))
        push(
          "IN-TOKEN-002",
          "Use a semantic token instead of primitive " + match[1],
          offset + match.index!,
        );
    }
    for (const token of options.forbiddenTokens ?? [])
      if (value.includes(token))
        push(
          "IN-STRUCT-001",
          "Layout token prohibited by profile: " + token,
          offset,
          "warning",
        );
  };
  const checkCss = (css: string, base = 0) => {
    const ast = postcss.parse(css, { from: file });
    ast.walkDecls((d) =>
      checkValue(
        d.value,
        base + (d.source?.start?.offset ?? 0),
        styleProps.test(d.prop),
      ),
    );
    ast.walkComments((c) => {
      if (/inteiro-disable/.test(c.text))
        push(
          "IN-EXC-001",
          "Unscoped suppression is not authorized",
          base + (c.source?.start?.offset ?? 0),
        );
    });
  };
  type HtmlNode = {
    nodeName: string;
    tagName?: string;
    value?: string;
    attrs?: { name: string; value: string }[];
    childNodes?: HtmlNode[];
    sourceCodeLocation?: { startOffset: number; endOffset: number };
  };
  const checkHtml = (html: string, base = 0) => {
    const ast = parseHtml(html, {
      sourceCodeLocationInfo: true,
    }) as unknown as HtmlNode;
    const nodes: HtmlNode[] = [];
    const visit = (n: HtmlNode) => {
      nodes.push(n);
      n.childNodes?.forEach(visit);
    };
    visit(ast);
    const labels = new Set(
      nodes
        .filter((n) => n.tagName === "label")
        .map((n) => n.attrs?.find((a) => a.name === "for")?.value)
        .filter(Boolean),
    );
    let mains = 0;
    const walk = (n: HtmlNode, parentLabel = false) => {
      const attrs = Object.fromEntries(
        (n.attrs ?? []).map((a) => [a.name, a.value]),
      );
      const off = base + (n.sourceCodeLocation?.startOffset ?? 0);
      if (n.tagName === "main" && ++mains > 1)
        push(
          "IN-STRUCT-002",
          "Multiple main landmarks in page scope",
          off,
          "warning",
        );
      if (attrs.style) checkCss("x{" + attrs.style + "}", off);
      if (n.tagName === "style" && n.childNodes)
        checkCss(n.childNodes.map((c) => c.value ?? "").join(""), off);
      for (const cl of (attrs.class ?? "").split(/\s+/))
        if (cl.startsWith("in-") && !classes.has(cl))
          push("IN-COMP-002", "Unknown official class " + cl, off);
      if (
        ["input", "select", "textarea"].includes(n.tagName ?? "") &&
        attrs.type !== "hidden" &&
        !parentLabel &&
        !attrs["aria-label"] &&
        !attrs["aria-labelledby"] &&
        !labels.has(attrs.id)
      )
        push("IN-A11Y-002", "Field has no accessible label", off);
      if (
        (attrs.onclick || attrs["@click"] || attrs["on:click"]) &&
        !["button", "a", "input", "summary", "select", "option"].includes(
          n.tagName ?? "",
        ) &&
        (!attrs.role ||
          attrs.tabindex === undefined ||
          !(attrs.onkeydown || attrs["@keydown"] || attrs["on:keydown"]))
      )
        push(
          "IN-A11Y-001",
          "Clickable generic element needs keyboard and semantics",
          off,
        );
      if (
        attrs["data-variant"] === "commit" &&
        !attrs["aria-describedby"] &&
        !attrs["data-in-commit-reason"]
      )
        push(
          "IN-ACTION-002",
          "Commit business intent requires review",
          off,
          "warning",
        );
      if (n.tagName === "form" || attrs["data-in-exclusive"] !== undefined) {
        let primary = 0;
        const count = (x: HtmlNode) => {
          if (x !== n && x.tagName === "form") return;
          const a = Object.fromEntries(
            (x.attrs ?? []).map((a) => [a.name, a.value]),
          );
          if (a["data-variant"] === "primary") primary++;
          x.childNodes?.forEach(count);
        };
        count(n);
        if (primary > 1)
          push(
            "IN-ACTION-001",
            "Multiple primary actions in exclusive region; review intent",
            off,
            "warning",
          );
      }
      if (
        attrs["data-in-fork-of"] &&
        patterns.some((p) => p.id === attrs["data-in-fork-of"]) &&
        !attrs["data-in-fork-reason"]
      )
        push(
          "IN-COMP-001",
          "Declared local fork requires justification",
          off,
          "warning",
        );
      if (attrs["data-in-pattern"]) {
        const p = patterns.find((p) => p.id === attrs["data-in-pattern"]);
        if (!p)
          push(
            "IN-COMP-002",
            "Unknown pattern " + attrs["data-in-pattern"],
            off,
          );
        else if (attrs["data-in-states"])
          for (const s of p.states)
            if (!attrs["data-in-states"].split(/\s+/).includes(s))
              push("IN-STATE-001", "Missing declared state " + s, off);
      }
      n.childNodes?.forEach((c) =>
        walk(c, parentLabel || n.tagName === "label"),
      );
    };
    walk(ast);
  };
  const checkTs = (text: string, base = 0, kind = ts.ScriptKind.TSX) => {
    const ast = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      kind,
    );
    const diagnostics = (
      ast as unknown as { parseDiagnostics: ts.Diagnostic[] }
    ).parseDiagnostics;
    if (diagnostics.length)
      throw new Error(
        ts.flattenDiagnosticMessageText(diagnostics[0]!.messageText, " "),
      );
    let mains = 0;
    const visit = (n: ts.Node) => {
      if (
        ts.isImportDeclaration(n) &&
        ts.isStringLiteral(n.moduleSpecifier) &&
        (options.forbiddenImports ?? []).some(
          (x) => n.moduleSpecifier.getText(ast).slice(1, -1) === x,
        )
      )
        push(
          "IN-COMP-003",
          "Forbidden import " + n.moduleSpecifier.text,
          base + n.getStart(ast),
        );
      if (
        ts.isFunctionDeclaration(n) &&
        n.name &&
        patterns.some(
          (p) =>
            p.id
              .split("-")
              .map((w) => w[0]!.toUpperCase() + w.slice(1))
              .join("") === n.name!.text,
        ) &&
        !text
          .slice(Math.max(0, n.pos - 150), n.pos)
          .includes("inteiro-fork-reason")
      )
        push(
          "IN-COMP-001",
          "Possible local official pattern duplication; review fingerprint " +
            n.name.text,
          base + n.getStart(ast),
          "warning",
        );
      if (
        ts.isPropertyAssignment(n) &&
        styleProps.test(
          n.name
            .getText(ast)
            .replaceAll(/['"]/g, "")
            .replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
        )
      )
        checkValue(
          n.initializer.getText(ast).replaceAll(/['"]/g, ""),
          base + n.getStart(ast),
        );
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName.getText(ast),
          attrs = Object.fromEntries(
            n.attributes.properties
              .filter(ts.isJsxAttribute)
              .map((a) => [
                a.name.getText(ast),
                a.initializer?.getText(ast).replace(/^['"]|['"]$/g, "") ?? "",
              ]),
          );
        if (tag === "main" && ++mains > 1)
          push(
            "IN-STRUCT-002",
            "Multiple main landmarks in JSX",
            base + n.getStart(ast),
            "warning",
          );
        for (const c of (attrs.className ?? "").split(/\s+/))
          if (c.startsWith("in-") && !classes.has(c))
            push(
              "IN-COMP-002",
              "Unknown official class " + c,
              base + n.getStart(ast),
            );
        if (
          attrs.variant === "commit" &&
          !attrs["aria-describedby"] &&
          !attrs["data-in-commit-reason"]
        )
          push(
            "IN-ACTION-002",
            "Commit business intent requires review",
            base + n.getStart(ast),
            "warning",
          );
        if (tag === "form" && ts.isJsxElement(n.parent)) {
          let count = 0;
          const scan = (x: ts.Node) => {
            if (
              ts.isJsxAttribute(x) &&
              x.name.getText(ast) === "variant" &&
              x.initializer?.getText(ast) === '"primary"'
            )
              count++;
            ts.forEachChild(x, scan);
          };
          scan(n.parent);
          if (count > 1)
            push(
              "IN-ACTION-001",
              "Multiple primary actions in exclusive form; review intent",
              base + n.getStart(ast),
              "warning",
            );
        }
        if (
          attrs.onClick &&
          !["button", "a", "input", "summary"].includes(tag) &&
          (!attrs.role || !("tabIndex" in attrs) || !attrs.onKeyDown)
        )
          push(
            "IN-A11Y-001",
            "Clickable generic element needs keyboard and semantics",
            base + n.getStart(ast),
          );
        if (
          ["input", "select", "textarea"].includes(tag) &&
          attrs.type !== "hidden" &&
          !attrs["aria-label"] &&
          !attrs["aria-labelledby"]
        ) {
          const labelled =
            attrs.id && text.includes('htmlFor="' + attrs.id + '"');
          let parent = n.parent,
            wrapped = false;
          while (parent) {
            if (
              ts.isJsxElement(parent) &&
              parent.openingElement.tagName.getText(ast) === "label"
            )
              wrapped = true;
            parent = parent.parent;
          }
          if (!labelled && !wrapped)
            push(
              "IN-A11Y-002",
              "Field has no accessible label",
              base + n.getStart(ast),
            );
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(ast);
  };
  try {
    const ext = extname(file);
    if (ext === ".css") checkCss(source);
    else if ([".ts", ".tsx", ".js", ".jsx"].includes(ext))
      checkTs(
        source,
        0,
        ext.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
    else if (ext === ".html") checkHtml(source);
    else if (ext === ".vue") {
      const result = parseVue(source, { filename: file });
      if (result.errors.length) throw new Error(String(result.errors[0]));
      if (result.descriptor.template)
        checkHtml(
          result.descriptor.template.content,
          result.descriptor.template.loc.start.offset,
        );
      for (const s of [result.descriptor.script, result.descriptor.scriptSetup])
        if (s) checkTs(s.content, s.loc.start.offset);
      for (const s of result.descriptor.styles)
        checkCss(s.content, s.loc.start.offset);
    } else if (ext === ".svelte") {
      const ast = parseSvelte(source);
      checkHtml(source);
      for (const script of [ast.instance, ast.module])
        if (script) {
          const block = script as unknown as {
            content: { start: number; end: number };
          };
          checkTs(
            source.slice(block.content.start, block.content.end),
            block.content.start,
          );
        }
    } else {
      push("IN-PARSE-001", "unsupported-syntax: " + ext);
      findings.at(-1)!.status = "blocked";
    }
  } catch (e) {
    push("IN-PARSE-001", "Parser error: " + String(e));
    findings.at(-1)!.status = "error";
  }
  if (
    /inteiro-disable/.test(source) &&
    !findings.some((f) => f.ruleId === "IN-EXC-001")
  )
    push("IN-EXC-001", "Suppression requires scoped policy approval");
  const suppressed: Exception[] = [];
  const active = findings.filter((f) => {
    const ex = options.exceptions?.find(
      (e) => e.ruleId === f.ruleId && picomatch([e.scope])(file),
    );
    if (!ex) return true;
    if (
      !ex.owner ||
      !ex.reason ||
      !ex.createdAt ||
      Date.parse(ex.expiresAt) <= Date.now() ||
      !Number.isFinite(Date.parse(ex.expiresAt)) ||
      !ex.approvalRef
    ) {
      return true;
    }
    suppressed.push(ex);
    return false;
  });
  for (const ex of options.exceptions ?? [])
    if (
      !ex.owner ||
      !ex.reason ||
      !ex.scope ||
      !ex.approvalRef ||
      !Number.isFinite(Date.parse(ex.createdAt)) ||
      !Number.isFinite(Date.parse(ex.expiresAt)) ||
      Date.parse(ex.expiresAt) <= Date.now()
    )
      active.push(
        finding("IN-EXC-001", "Invalid or expired exception", { file }),
      );
  const statuses = active.map((f) => ({
    name: f.ruleId,
    status: f.status,
    findings: [],
    durationMs: 0,
  }));
  return {
    name: "static",
    status: active.length ? aggregate(statuses) : "passed",
    findings: active,
    durationMs: performance.now() - start,
    suppressed,
  };
}
export async function lintProject(
  root: string,
  config: Config,
  options: { changed?: boolean; target?: string; baseline?: string } = {},
) {
  const started = performance.now(),
    files: string[] = [],
    ignored: string[] = [];
  const include = picomatch(config.static.include),
    exclude = picomatch(config.static.exclude);
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = resolve(dir, entry.name),
        rel = relative(root, p).replaceAll("\\", "/");
      if (
        entry.isSymbolicLink() ||
        [
          ".git",
          "node_modules",
          "dist",
          "storybook-static",
          "coverage",
          ".inteiro",
        ].includes(entry.name) ||
        exclude(rel) ||
        exclude(rel + "/")
      ) {
        ignored.push(rel);
        continue;
      }
      if (entry.isDirectory()) await walk(p);
      else if (include(rel)) files.push(p);
    }
  };
  const target = safePath(root, options.target ?? ".");
  if ((await lstat(target)).isDirectory()) await walk(target);
  else files.push(target);
  let selected = files;
  if (options.changed) {
    try {
      const tracked = execFileSync("git", ["diff", "--name-only", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }),
        untracked = execFileSync(
          "git",
          ["ls-files", "--others", "--exclude-standard"],
          { cwd: root, encoding: "utf8" },
        );
      const changed = new Set((tracked + "\n" + untracked).trim().split("\n"));
      selected = files.filter((f) =>
        changed.has(relative(root, f).replaceAll("\\", "/")),
      );
      if (!selected.length) selected = files;
    } catch {
      /* Conservative full scope when git is unavailable. */
    }
  }
  let exceptions: Exception[] = [];
  try {
    exceptions = JSON.parse(
      await readFile(safePath(root, ".inteiro/exceptions.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const results = [];
  for (const f of selected)
    results.push(
      await lintSource(
        relative(root, f).replaceAll("\\", "/"),
        await readFile(f, "utf8"),
        {
          forbiddenImports: config.static.forbiddenImports,
          forbiddenTokens: config.static.forbiddenTokens,
          exceptions,
        },
      ),
    );
  let allFindings = results.flatMap((r) => r.findings),
    status = results.length
      ? aggregate(results)
      : ("blocked" as GateResult["status"]);
  const baselinePath = options.baseline || config.static.baseline;
  if (config.static.adoption === "enforce-new" || options.baseline) {
    if (!baselinePath)
      throw new Error("enforce-new requires approved diagnostics baseline");
    const baseline = JSON.parse(
      await readFile(safePath(root, baselinePath), "utf8"),
    ) as {
      owner: string;
      approvalRef: string;
      reason: string;
      expiresAt: string;
      fingerprints: string[];
    };
    if (
      !baseline.owner ||
      !baseline.approvalRef ||
      !baseline.reason ||
      !Number.isFinite(Date.parse(baseline.expiresAt)) ||
      Date.parse(baseline.expiresAt) <= Date.now() ||
      !Array.isArray(baseline.fingerprints)
    )
      throw new Error("Invalid diagnostics baseline authorization");
    allFindings = allFindings.map((f) =>
      baseline.fingerprints.includes(f.fingerprint) &&
      ["failed", "needs_review"].includes(f.status) &&
      !["IN-EXC-001", "IN-TOKEN-003", "IN-CTX-001"].includes(f.ruleId) &&
      !f.ruleId.startsWith("SEC-")
        ? { ...f, status: "waived" as const }
        : f,
    );
    const active = allFindings.filter((f) => f.status !== "waived");
    status = active.length
      ? aggregate(
          active.map((f) => ({
            name: f.ruleId,
            status: f.status,
            findings: [],
            durationMs: 0,
          })),
        )
      : results.length
        ? "passed"
        : "blocked";
  }
  return {
    name: "static",
    status,
    findings: allFindings,
    adoption: config.static.adoption,
    durationMs: performance.now() - started,
    files: selected.length,
    ignored,
    coverage: files.length ? selected.length / files.length : 0,
  } satisfies GateResult;
}
