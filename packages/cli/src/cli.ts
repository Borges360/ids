#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  auditSource,
  coreInfo,
  explainToken,
  getComponentRecipe,
  getGuidelines,
  getTheme,
  searchTokens,
  suggestTokens,
  validateUsage
} from "@inteiro/agent-core";
import {
  allTokens,
  buildTokens,
  catalogStats,
  emitCss,
  emitFlutter,
  emitJsonResolved,
  emitScss,
  emitSwift,
  emitTailwind,
  emitTypescript,
  validateCatalog
} from "@inteiro/tokens";
import { bool, EXIT, flag, parseArgs } from "./args.ts";
import { collectFiles, exists, writeManaged } from "./fsutil.ts";
import { HARNESSES, getHarness, type HarnessId } from "./harnesses.ts";
import { HELP } from "./help.ts";
import { installHarness, uninstallHarness } from "./install-agents.ts";
import { generateSkills, skillIndex, topLevelSkills } from "./skills-gen.ts";

export interface CliResult {
  exitCode: number;
  data?: unknown;
  text?: string;
}

function print(result: CliResult, json: boolean): number {
  if (json) console.log(JSON.stringify(result.data ?? { ok: result.exitCode === 0, text: result.text }, null, 2));
  else if (result.text) console.log(result.text);
  return result.exitCode;
}

async function cmdInit(cwd: string, flags: Record<string, string | boolean>): Promise<CliResult> {
  const dryRun = bool(flags, "dry-run");
  const yes = bool(flags, "yes") || bool(flags, "y");
  const pkgPath = join(cwd, "package.json");
  const hasPkg = await exists(pkgPath);
  const pkg = hasPkg ? JSON.parse(await readFile(pkgPath, "utf8")) as Record<string, unknown> : {};
  const deps = { ...(pkg.dependencies as object ?? {}), ...(pkg.devDependencies as object ?? {}) };
  const framework = flag(flags, "framework") ||
    ("next" in deps ? "next" : "react" in deps ? "react" : "vue" in deps ? "vue" : "svelte" in deps ? "svelte" : "html");
  const cssSnippet = `/* INTEIRO */\n@import "@inteiro/tokens/css";\n`;
  const actions: string[] = [];
  const cssPath = join(cwd, "inteiro.css");
  const status = await writeManaged(cssPath, cssSnippet, { dryRun, yes });
  actions.push(`${status} ${cssPath}`);
  const marker = "<!-- inteiro:start -->";
  const agentsPath = join(cwd, "AGENTS.md");
  const snippet = `${marker}\n# INTEIRO\n\nEste projeto usa o Identity Design System INTEIRO.\n- Prefira tokens semânticos (\`color.identity.primary\`, não hex).\n- Violeta = escolher. Laranja = tornar real.\n- Consulte \`npx inteiro tokens explain <nome>\` ou a skill \`inteiro\`.\n- Costura só em reflexão, conflito, mudança de interpretação ou transição de contexto.\n<!-- inteiro:end -->\n`;
  if (await exists(agentsPath)) {
    const current = await readFile(agentsPath, "utf8");
    if (!current.includes("inteiro:start")) {
      const next = current.trimEnd() + "\n\n" + snippet;
      const st = await writeManaged(agentsPath, next, { dryRun, yes: yes || true });
      actions.push(`${st} ${agentsPath} (append)`);
    } else actions.push(`skipped ${agentsPath} (já contém INTEIRO)`);
  } else {
    const st = await writeManaged(agentsPath, snippet, { dryRun, yes });
    actions.push(`${st} ${agentsPath}`);
  }
  return {
    exitCode: EXIT.ok,
    data: { framework, hasPkg, actions, dryRun },
    text: `init (${framework})\n${actions.join("\n")}\n\nInstale: npm install @inteiro/design-system\nImporte o CSS gerado e use var(--in-color-*).`
  };
}

async function cmdDoctor(cwd: string): Promise<CliResult> {
  const issues = validateCatalog();
  const errors = issues.filter((i) => i.severity === "error");
  const stats = catalogStats();
  const info = coreInfo();
  const checks = [
    { name: "Tokens DTCG válidos", ok: errors.length === 0 },
    { name: "Catálogo carregado", ok: stats.total > 0 },
    { name: "Temas dark/light", ok: info.themes.includes("dark") && info.themes.includes("light") },
    { name: "AGENTS.md", ok: await exists(join(cwd, "AGENTS.md")) },
    { name: ".agents/skills", ok: await exists(join(cwd, ".agents/skills")) }
  ];
  const text = checks.map((c) => `${c.ok ? "✓" : "○"} ${c.name}`).join("\n") + `\n\n${stats.total} tokens`;
  return { exitCode: errors.length ? EXIT.invalid : EXIT.ok, data: { checks, stats, errors }, text };
}

function cmdTokensList(flags: Record<string, string | boolean>): CliResult {
  let tokens = allTokens();
  const layer = flag(flags, "layer");
  const category = flag(flags, "category");
  if (layer) tokens = tokens.filter((t) => t.layer === layer);
  if (category) tokens = tokens.filter((t) => t.category === category);
  const lines = tokens.map((t) => `${t.id}\t${t.layer}\t${t.cssVar}`);
  return { exitCode: EXIT.ok, data: { count: tokens.length, tokens: tokens.map((t) => t.id) }, text: `${tokens.length} tokens\n${lines.join("\n")}` };
}

function cmdTokensSearch(query: string): CliResult {
  if (!query) return { exitCode: EXIT.usage, text: "Uso: inteiro tokens search <query>" };
  const tokens = searchTokens(query);
  return { exitCode: EXIT.ok, data: tokens.map((t) => t.id), text: tokens.map((t) => `${t.id} — ${t.description}`).join("\n") || "(nenhum)" };
}

function cmdTokensExplain(name: string): CliResult {
  if (!name) return { exitCode: EXIT.usage, text: "Uso: inteiro tokens explain <name>" };
  try {
    const exp = explainToken(name);
    const text = [
      exp.id,
      exp.description,
      `css: ${exp.cssVar}`,
      `camada: ${exp.layer}  tipo: ${exp.type}  status: ${exp.status}`,
      `intenção: ${exp.intent}`,
      `usar: ${exp.usage.join("; ")}`,
      `evitar: ${exp.avoid.join("; ")}`,
      `a11y: ${exp.a11y}`,
      `valores: ${JSON.stringify(exp.values)}`,
      `fonte: ${exp.sourceSection}`,
      `bom: ${exp.examples.good}`,
      `ruim: ${exp.examples.bad}`
    ].join("\n");
    return { exitCode: EXIT.ok, data: exp, text };
  } catch (error) {
    return { exitCode: EXIT.notFound, text: error instanceof Error ? error.message : String(error) };
  }
}

async function cmdExport(flags: Record<string, string | boolean>): Promise<CliResult> {
  const format = flag(flags, "format") || "css";
  const out = flag(flags, "out");
  const map: Record<string, string> = {
    css: emitCss(),
    json: JSON.stringify(emitJsonResolved(), null, 2),
    ts: emitTypescript(),
    scss: emitScss(),
    tailwind: emitTailwind(),
    flutter: emitFlutter(),
    swift: emitSwift()
  };
  const contents = map[format];
  if (!contents) return { exitCode: EXIT.usage, text: `Formato inválido: ${format}` };
  if (out && !bool(flags, "dry-run")) {
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(resolve(out), contents, "utf8");
  }
  return { exitCode: EXIT.ok, data: { format, bytes: contents.length, out: out || null }, text: out ? `exportado ${format} → ${out}` : contents };
}

async function cmdAudit(target: string): Promise<CliResult> {
  const files = await collectFiles(target);
  const findings = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    findings.push(...auditSource(file, source));
  }
  const text = findings.length
    ? findings.map((f) => `${f.file}:${f.line} [${f.kind}] ${f.message}${f.suggestion ? " → " + f.suggestion : ""}`).join("\n")
    : "Nenhum achado.";
  return { exitCode: findings.length ? EXIT.invalid : EXIT.ok, data: { findings, files: files.length }, text };
}

async function cmdMigrate(target: string): Promise<CliResult> {
  const audit = await cmdAudit(target);
  const findings = (audit.data as { findings: ReturnType<typeof auditSource> }).findings.filter((f) => f.kind === "hardcoded-hex" || f.kind === "type");
  return {
    exitCode: EXIT.ok,
    data: { replacements: findings },
    text: findings.length
      ? "Migração sugerida (não é search-and-replace cego):\n" + findings.map((f) => `${f.file}:${f.line} ${f.message} → ${f.suggestion}`).join("\n")
      : "Nada a migrar nos arquivos varridos."
  };
}

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const flags = parsed.flags;
  if (bool(flags, "help") || bool(flags, "h") || parsed.command[0] === "help") {
    return print({ exitCode: 0, text: HELP, data: { help: true } }, bool(flags, "json"));
  }
  const cwd = resolve(flag(flags, "cwd") || process.cwd());
  const cmd = parsed.command;
  const json = bool(flags, "json");

  try {
    if (cmd.length === 0) return print({ exitCode: EXIT.usage, text: HELP }, json);

    if (cmd[0] === "init") return print(await cmdInit(cwd, flags), json);
    if (cmd[0] === "doctor") return print(await cmdDoctor(cwd), json);
    if (cmd[0] === "audit") return print(await cmdAudit(resolve(cwd, cmd[1] || ".")), json);
    if (cmd[0] === "migrate") return print(await cmdMigrate(resolve(cwd, cmd[1] || ".")), json);

    if (cmd[0] === "tokens" && cmd[1] === "list") return print(cmdTokensList(flags), json);
    if (cmd[0] === "tokens" && cmd[1] === "search") return print(cmdTokensSearch(cmd.slice(2).join(" ")), json);
    if (cmd[0] === "tokens" && cmd[1] === "explain") return print(cmdTokensExplain(cmd.slice(2).join(" ")), json);
    if (cmd[0] === "tokens" && cmd[1] === "validate") {
      const issues = validateCatalog();
      const errors = issues.filter((i) => i.severity === "error");
      return print({
        exitCode: errors.length ? EXIT.invalid : EXIT.ok,
        data: { issues, stats: catalogStats() },
        text: errors.length ? errors.map((e) => `${e.code} ${e.token} ${e.message}`).join("\n") : `ok — ${catalogStats().total} tokens`
      }, json);
    }
    if (cmd[0] === "tokens" && cmd[1] === "build") {
      if (bool(flags, "dry-run")) return print({ exitCode: 0, text: "dry-run: tokens build", data: { dryRun: true } }, json);
      const result = await buildTokens();
      return print({ exitCode: 0, data: result, text: `build ${result.stats.total} tokens, ${result.files.length} arquivos` }, json);
    }
    if (cmd[0] === "tokens" && cmd[1] === "export") return print(await cmdExport(flags), json);

    if (cmd[0] === "themes" && cmd[1] === "list") {
      return print({ exitCode: 0, data: coreInfo().themes, text: coreInfo().themes.join("\n") }, json);
    }
    if (cmd[0] === "themes" && cmd[1] === "inspect") {
      const name = cmd[2];
      if (!name) return print({ exitCode: EXIT.usage, text: "Uso: inteiro themes inspect <name>" }, json);
      const theme = getTheme(name);
      return print({ exitCode: 0, data: theme, text: `${theme.name}\n${Object.keys(theme.tokens).length} tokens temáticos` }, json);
    }

    if (cmd[0] === "skills" && cmd[1] === "list") {
      const top = topLevelSkills();
      const generated = skillIndex();
      return print({
        exitCode: 0,
        data: { top: top.map((s) => s.name), generated: generated.length },
        text: `canônicas:\n${top.map((s) => s.name).join("\n")}\n\ngeradas: ${generated.length}`
      }, json);
    }
    if (cmd[0] === "skills" && cmd[1] === "generate") {
      const outDir = flag(flags, "out") || join(cwd, "packages", "skills", "generated");
      const result = await generateSkills(outDir, { dryRun: bool(flags, "dry-run") });
      return print({ exitCode: 0, data: result, text: `skills generate: ${result.count} em ${outDir}` }, json);
    }
    if (cmd[0] === "skills" && cmd[1] === "explain") {
      const name = cmd[2];
      if (!name) return print({ exitCode: EXIT.usage, text: "Uso: inteiro skills explain <name>" }, json);
      const top = topLevelSkills().find((s) => s.name === name);
      if (top) return print({ exitCode: 0, data: top, text: `${top.name}\n${top.description}\n\n${top.body}` }, json);
      try {
        const exp = explainToken(name.replaceAll("-", "."));
        return print({ exitCode: 0, data: exp, text: `skill de token ${exp.id}\n${exp.intent}` }, json);
      } catch {
        return print({ exitCode: EXIT.notFound, text: `Skill não encontrada: ${name}` }, json);
      }
    }

    if (cmd[0] === "agents" && cmd[1] === "list") {
      const text = HARNESSES.map((h) => `${h.id}\t${h.mechanism}\t${h.verified}`).join("\n");
      return print({ exitCode: 0, data: HARNESSES, text }, json);
    }
    if (cmd[0] === "agents" && cmd[1] === "install") {
      const target = cmd[2];
      if (!target) return print({ exitCode: EXIT.usage, text: "Uso: inteiro agents install <harness|all>" }, json);
      const ids = target === "all" ? HARNESSES.map((h) => h.id) : [target as HarnessId];
      const reports = [];
      for (const id of ids) {
        getHarness(id);
        reports.push(await installHarness(cwd, id, { dryRun: bool(flags, "dry-run"), yes: bool(flags, "yes") || bool(flags, "y") }));
      }
      return print({ exitCode: 0, data: reports, text: reports.map((r) => `${r.harness}: ${r.actions.join(", ")}`).join("\n") }, json);
    }
    if (cmd[0] === "agents" && cmd[1] === "uninstall") {
      const target = cmd[2];
      if (!target) return print({ exitCode: EXIT.usage, text: "Uso: inteiro agents uninstall <harness>" }, json);
      const report = await uninstallHarness(cwd, target as HarnessId, { dryRun: bool(flags, "dry-run"), yes: bool(flags, "yes") });
      return print({ exitCode: 0, data: report, text: `uninstall ${target}: ${report.actions.join(", ")}` }, json);
    }
    if (cmd[0] === "agents" && cmd[1] === "doctor") {
      const rows = [];
      for (const h of HARNESSES) {
        const present = [];
        for (const t of h.installTargets) {
          if (await exists(join(cwd, t))) present.push(t);
        }
        rows.push({ id: h.id, present, verified: h.verified });
      }
      return print({
        exitCode: 0,
        data: rows,
        text: rows.map((r) => `${r.id}: ${r.present.length ? r.present.join(", ") : "não instalado"} (${r.verified})`).join("\n")
      }, json);
    }

    if (cmd[0] === "suggest") {
      const tokens = suggestTokens(cmd.slice(1).join(" "));
      return print({ exitCode: 0, data: tokens.map((t) => t.id), text: tokens.map((t) => t.id).join("\n") }, json);
    }
    if (cmd[0] === "guidelines") {
      const g = getGuidelines(cmd.slice(1).join(" "));
      return print({ exitCode: 0, data: g, text: g.map((x) => `# ${x.title}\n${x.body}`).join("\n\n") }, json);
    }
    if (cmd[0] === "recipe") {
      const r = getComponentRecipe(cmd.slice(1).join(" "));
      return print({ exitCode: 0, data: r, text: r.map((x) => `# ${x.title}\n${x.good}`).join("\n\n") }, json);
    }
    if (cmd[0] === "validate-usage") {
      const result = validateUsage({ code: cmd.slice(1).join(" ") });
      return print({ exitCode: result.ok ? 0 : EXIT.invalid, data: result, text: result.ok ? "ok" : result.issues.join("\n") }, json);
    }

    return print({ exitCode: EXIT.usage, text: `Comando desconhecido: ${cmd.join(" ")}\n\n${HELP}` }, json);
  } catch (error) {
    return print({ exitCode: EXIT.io, text: error instanceof Error ? error.message : String(error) }, json);
  }
}

const isMain = process.argv[1] && (fileURLToPath(import.meta.url) === process.argv[1] || pathToFileURL(process.argv[1]).href === pathToFileURL(fileURLToPath(import.meta.url)).href);
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href || process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("inteiro")) {
  const code = await run(process.argv.slice(2));
  process.exitCode = code;
}

void exists;
void readdir;
void stat;
