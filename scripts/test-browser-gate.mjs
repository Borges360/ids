import { spawnSync } from "node:child_process";
const child = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "tests/p0/browser-runner.test.ts"],
  { stdio: "inherit", env: { ...process.env, INTEIRO_BROWSER_UNIT: "1" } },
);
process.exitCode = child.status ?? 8;
