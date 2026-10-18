import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
await build({
  absWorkingDir: process.cwd(),
  entryPoints: ["packages/react/src/index.ts"],
  outfile: "packages/react/dist/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["react", "react-dom"],
  sourcemap: true,
  banner: { js: '"use client";' },
});
execFileSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "-p",
    "packages/react/tsconfig.build.json",
  ],
  { stdio: "inherit" },
);
