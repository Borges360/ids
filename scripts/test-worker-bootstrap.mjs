import { spawnSync } from "node:child_process";
const child = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/p0/worker-bootstrap.test.ts",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, INTEIRO_BOOTSTRAP_NPM: "1" },
  },
);
process.exitCode = child.status ?? 8;
