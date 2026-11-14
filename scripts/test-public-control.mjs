import { spawnSync } from "node:child_process";
import { structuredResultFile } from "./structured-results.mjs";
// The CLI reporter replaces configured reporters, so bind JSON results here.
const results = structuredResultFile("vitest-public-control");
for (const script of [
  "packages/tokens/src/build.ts",
  "scripts/build-composition.mjs",
]) {
  const build = spawnSync(process.execPath, [script], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (build.status !== 0) process.exit(build.status ?? 8);
}
const child = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/p0/public-control.test.ts",
    "--maxWorkers=1",
    "--reporter=verbose",
    ...(results ? ["--reporter=json", "--outputFile.json=" + results] : []),
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      INTEIRO_PUBLIC_CONTROL: "1",
      INTEIRO_PUBLIC_FULL_MATRIX: process.argv.includes("--full") ? "1" : "0",
    },
  },
);
process.exitCode = child.status ?? 8;
