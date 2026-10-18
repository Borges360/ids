import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  cp,
  chmod,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { transform } from "esbuild";
import { spawnSync } from "node:child_process";
const names = [
  "tokens",
  "contracts",
  "composition",
  "agent-core",
  "lint",
  "evaluation",
  "visual",
  "cli",
  "mcp",
  "design-system",
  "react",
];
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script through npm run pack:p0");
const stage = resolve("artifacts/npm-stage"),
  dest = resolve("artifacts/tarballs");
await mkdir(stage, { recursive: true });
await mkdir(dest, { recursive: true });
const rewrite = (value) =>
  typeof value === "string"
    ? value.replace(/^\.\/src\/(.+)\.ts$/, "./runtime/$1.js")
    : Array.isArray(value)
      ? value.map(rewrite)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([k, v]) => [
              k,
              k === "types" ? v : rewrite(v),
            ]),
          )
        : value;
for (const name of names) {
  const dir = join(stage, name),
    original = "packages/" + name;
  await mkdir(dir, { recursive: true });
  const pkg = JSON.parse(await readFile(original + "/package.json", "utf8"));
  for (const file of pkg.files ?? ["src", "dist", "README.md", "LICENSE"]) {
    try {
      await cp(original + "/" + file, join(dir, file), { recursive: true });
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  const compile = async (rel = "") => {
    for (const entry of await readdir(original + "/src/" + rel, {
      withFileTypes: true,
    })) {
      const next = join(rel, entry.name),
        target = join(dir, "runtime", next.replace(/\.tsx?$/, ".js"));
      if (entry.isDirectory()) {
        await mkdir(join(dir, "runtime", next), { recursive: true });
        await compile(next);
      } else if (!/\.test\.ts$/.test(next)) {
        await mkdir(join(target, ".."), { recursive: true });
        if (/\.tsx?$/.test(next)) {
          const source = await readFile(original + "/src/" + next, "utf8");
          const output = await transform(source, {
            loader: next.endsWith(".tsx") ? "tsx" : "ts",
            format: "esm",
            target: "node22",
            sourcefile: next,
          });
          await writeFile(
            target,
            output.code.replace(
              /(from\s+["']|import\(["'])([^"']+)\.ts(["'])/g,
              "$1$2.js$3",
            ),
          );
        } else await cp(original + "/src/" + next, target);
      }
    }
  };
  if (name !== "react") await compile();
  pkg.exports = rewrite(pkg.exports);
  if (pkg.bin) pkg.bin = rewrite(pkg.bin);
  pkg.files = [...new Set([...(pkg.files ?? ["src", "dist"]), "runtime"])];
  delete pkg.scripts;
  if (name === "design-system") {
    pkg.bin = { inteiro: "./runtime/inteiro.js" };
    await writeFile(
      join(dir, "runtime/inteiro.js"),
      '#!/usr/bin/env node\nimport {run} from "@inteiro/cli";process.exitCode=await run(process.argv.slice(2));\n',
    );
  }
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
  );
  const result = spawnSync(
    process.execPath,
    [
      npmCli,
      "pack",
      dir,
      "--pack-destination",
      dest,
      "--ignore-scripts",
      "--json",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  const packed = JSON.parse(result.stdout);
  console.log(packed[0].filename + " " + packed[0].integrity);
}
