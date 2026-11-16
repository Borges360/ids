import { readFile, access } from "node:fs/promises";
import {
  patterns,
  validatePattern,
} from "../packages/composition/src/index.ts";
import {
  validateSchema,
  DEFAULTS,
  resolveConfig,
} from "../packages/contracts/src/index.ts";
import { runBenchmark } from "../packages/evaluation/src/index.ts";
import { VERSION } from "../packages/tokens/src/index.ts";
const errors = [];
const packageVersion = JSON.parse(
  await readFile("packages/tokens/package.json", "utf8"),
).version;
if (VERSION !== packageVersion) errors.push("token-version-metadata");
for (const p of patterns) {
  if (!validateSchema("pattern", p).valid || validatePattern(p).length)
    errors.push(p.id);
  for (const path of p.examples) await access("packages/composition/" + path);
}
const matrix = JSON.parse(
  await readFile("packages/composition/story-matrix.json", "utf8"),
);
for (const p of patterns)
  for (const state of p.states)
    if (!matrix.some((s) => s.patternId === p.id && s.state === state))
      errors.push(p.id + ":" + state);
await resolveConfig(process.cwd());
const benchmark = await runBenchmark(process.cwd(), DEFAULTS);
if (benchmark.status !== "passed") errors.push("benchmark");
const publicTasks = JSON.parse(
  await readFile("benchmarks/tasks.public.json", "utf8"),
);
const heldout = JSON.parse(
  await readFile("benchmarks/tasks.heldout.json", "utf8"),
);
if (publicTasks.tasks.length !== 30 || heldout.tasks.length !== 10)
  errors.push("benchmark-task-count");
if (errors.length)
  throw new Error("P0 contract check failed: " + errors.join(","));
console.log(
  `P0: ${patterns.length} manifests, ${matrix.length} states, 30 public + 10 heldout tasks, smoke benchmark passed`,
);
