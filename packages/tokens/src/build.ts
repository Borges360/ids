import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allTokens, catalogStats } from "./catalog/index.ts";
import { contrastPairs } from "./contrast.ts";
import { buildDtcgDocument } from "./dtcg.ts";
import { emitCss, emitScss } from "./export/css.ts";
import { emitFlutter, emitSwift, emitTailwind } from "./export/platforms.ts";
import { emitJsonResolved, emitTypescript } from "./export/typescript.ts";
import { assertValid } from "./validate.ts";
import { VERSION } from "./types.ts";

function emitRuntimeJs(): string {
  return `import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, "../json/catalog.json"), "utf8"));
const resolved = JSON.parse(readFileSync(join(root, "../json/tokens.json"), "utf8"));
const contrast = JSON.parse(readFileSync(join(root, "../json/contrast.json"), "utf8"));

export const VERSION = catalog.version;
export const DTCG_SPEC = "2025.10";
export const PREFIX = "in";
export function allTokens() { return catalog.tokens; }
export function catalogStats() { return catalog.stats; }
export function tokensById() { return new Map(catalog.tokens.map((t) => [t.id, t])); }
export function contrastPairs() { return contrast; }
export function failingContrast() { return contrast.filter((p) => p.level === "fail"); }
export const resolvedTokens = resolved;
export default { VERSION, allTokens, catalogStats, resolvedTokens };
`;
}

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");

async function write(rel: string, contents: string): Promise<void> {
  const path = join(pkg, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

export async function buildTokens(): Promise<{ stats: ReturnType<typeof catalogStats>; files: string[] }> {
  assertValid();
  const tokens = allTokens();
  const stats = catalogStats(tokens);
  const files: string[] = [];

  const primitives = tokens.filter((t) => t.layer === "primitive");
  const semantic = tokens.filter((t) => t.layer === "semantic");
  const components = tokens.filter((t) => t.layer === "component");
  const themed = tokens.filter((t) => t.themes);

  const themesDoc = {
    $description: "INTEIRO temas — dark, light e extensão contrast",
    theme: {
      dark: buildDtcgDocument(themed, "dark"),
      light: buildDtcgDocument(themed, "light"),
      "contrast-dark": buildDtcgDocument(themed, "contrast-dark"),
      "contrast-light": buildDtcgDocument(themed, "contrast-light")
    }
  };

  const writes: Array<[string, string]> = [
    ["source/primitives.tokens.json", JSON.stringify(buildDtcgDocument(primitives), null, 2) + "\n"],
    ["source/semantic.tokens.json", JSON.stringify(buildDtcgDocument(semantic, "dark"), null, 2) + "\n"],
    ["source/components.tokens.json", JSON.stringify(buildDtcgDocument(components), null, 2) + "\n"],
    ["source/themes.tokens.json", JSON.stringify(themesDoc, null, 2) + "\n"],
    ["dist/json/tokens.json", JSON.stringify(emitJsonResolved(), null, 2) + "\n"],
    ["dist/json/catalog.json", JSON.stringify({ version: VERSION, stats, tokens }, null, 2) + "\n"],
    ["dist/json/contrast.json", JSON.stringify(contrastPairs(), null, 2) + "\n"],
    ["dist/css/inteiro.css", emitCss()],
    ["dist/css/dark.css", emitCss("dark")],
    ["dist/css/light.css", emitCss("light")],
    ["dist/css/contrast.css", emitCss("contrast-dark") + "\n" + emitCss("contrast-light")],
    ["dist/scss/_inteiro.scss", emitScss()],
    ["dist/ts/tokens.generated.ts", emitTypescript()],
    ["dist/tailwind/theme.js", emitTailwind()],
    ["dist/flutter/inteiro.dart", emitFlutter()],
    ["dist/swift/Inteiro.swift", emitSwift()],
    ["dist/js/index.js", emitRuntimeJs()]
  ];

  for (const [rel, contents] of writes) {
    await write(rel, contents);
    files.push(rel);
  }

  await write(
    "dist/json/stats.json",
    JSON.stringify({ version: VERSION, generatedAt: new Date().toISOString(), ...stats }, null, 2) + "\n"
  );
  files.push("dist/json/stats.json");
  return { stats, files };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = await buildTokens();
  console.log(`INTEIRO tokens build ok — ${result.stats.total} tokens, ${result.files.length} arquivos.`);
}
