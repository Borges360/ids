import { it, expect } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hash, validateSchema } from "@inteiro/contracts";
import { gradeBenchmarkTask } from "@inteiro/evaluation/grading";
import { gradingCandidate } from "../helpers/grading-candidate.ts";
it.each(["expect-request", "respond"])(
  "rejects an unknown %s identity before browser startup, even when zero requests were expected",
  async (op) => {
    const candidate = await gradingCandidate("task-01");
    try {
      const plan = JSON.parse(
        await readFile("benchmarks/evaluator/criteria/task-01.json", "utf8"),
      );
      const fixture = await readFile(plan.fixture.path);
      const directory = join(candidate.root, ".inteiro/reports/contracts");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "fixture.json"), fixture);
      plan.fixture = {
        path: ".inteiro/reports/contracts/fixture.json",
        sha256: hash(fixture),
      };
      plan.scenarios[0].steps = [
        op === "respond"
          ? { op, id: "unknown" }
          : { op, id: "unknown", count: 0, body: null },
      ];
      await writeFile(join(directory, "plan.json"), JSON.stringify(plan));
      await expect(
        gradeBenchmarkTask(
          candidate.root,
          candidate.root,
          ".inteiro/reports/contracts/plan.json",
          { dryRun: true },
        ),
      ).rejects.toThrow("Unknown grading");
    } finally {
      await candidate.cleanup();
    }
  },
);
it("allows clearing a field and asserting an empty value without allowing an empty keyboard action", async () => {
  const plan = JSON.parse(
    await readFile("benchmarks/evaluator/criteria/task-01.json", "utf8"),
  );
  for (const op of ["fill", "expect-value", "expect-exact-text"]) {
    plan.scenarios[0].steps = [{ op, locator: { label: "Nome" }, value: "" }];
    expect(validateSchema("task-grading", plan).valid).toBe(true);
  }
  plan.scenarios[0].steps = [
    { op: "press", locator: { label: "Nome" }, value: "" },
  ];
  expect(validateSchema("task-grading", plan).valid).toBe(false);
});
