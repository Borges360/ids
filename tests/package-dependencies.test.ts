import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Um pacote publicado só pode importar outro @inteiro/* que esteja declarado nas
// suas dependências: o consumidor instala os tarballs e não tem o monorepo.
const root = join(import.meta.dirname, "..", "packages");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|mts|js|mjs)$/.test(name) && !/\.(test|spec)\.|\.d\.ts$/.test(name) ? [path] : [];
  });

const packageName = (specifier: string) => specifier.split("/").slice(0, 2).join("/");

describe("dependências declaradas dos pacotes", () => {
  for (const dir of readdirSync(root)) {
    const manifestPath = join(root, dir, "package.json");
    const src = join(root, dir, "src");
    try {
      statSync(manifestPath);
      statSync(src);
    } catch {
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    it(`${manifest.name} declara todo @inteiro/* que importa`, () => {
      const declared = new Set(
        Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies }),
      );
      const missing = new Set<string>();
      for (const file of sourceFiles(src)) {
        const { importedFiles } = ts.preProcessFile(readFileSync(file, "utf8"), true, true);
        for (const { fileName } of importedFiles) {
          if (!fileName.startsWith("@inteiro/")) continue;
          const name = packageName(fileName);
          if (name !== manifest.name && !declared.has(name)) missing.add(`${name} (${file.slice(root.length + 1)})`);
        }
      }
      expect([...missing]).toEqual([]);
    });
  }
});
