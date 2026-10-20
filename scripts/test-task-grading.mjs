import { spawnSync } from "node:child_process";
const child = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "tests/p0/task-grading.test.ts"],
  { stdio: "inherit", env: { ...process.env, INTEIRO_GRADE_BROWSER: "1" } },
);
process.exitCode = child.status ?? 8;
