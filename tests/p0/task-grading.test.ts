import { it, expect } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { hash, validateSchema } from "@inteiro/contracts";
import {
  gradeBenchmarkTask,
  createBenchmarkServer,
} from "@inteiro/evaluation/grading";
import { gradingCandidate } from "../helpers/grading-candidate.ts";
const ids = [
  ...Array.from(
    { length: 30 },
    (_, index) => "task-" + String(index + 1).padStart(2, "0"),
  ),
  ...Array.from({ length: 10 }, (_, index) => "heldout-" + (index + 1)),
];
it("binds each migrated task to independent criteria, fixture and matching domain starter", async () => {
  const dataset = JSON.parse(
    await readFile("benchmarks/tasks.public.json", "utf8"),
  );
  const heldout = JSON.parse(
    await readFile("benchmarks/tasks.heldout.json", "utf8"),
  );
  expect(dataset.tasks).toHaveLength(30);
  expect(heldout.tasks).toHaveLength(10);
  for (const task of [...dataset.tasks, ...heldout.tasks]) {
    const bytes = await readFile(task.grading.path);
    expect(hash(bytes)).toBe(task.grading.sha256);
    const plan = JSON.parse(bytes.toString());
    expect(validateSchema("task-grading", plan).valid).toBe(true);
    expect(plan.caseId).toBe(task.id);
    const fixtureBytes = await readFile(plan.fixture.path);
    expect(hash(fixtureBytes)).toBe(plan.fixture.sha256);
    expect(
      validateSchema("task-fixture", JSON.parse(fixtureBytes.toString())).valid,
    ).toBe(true);
    expect(task.initialImplementation).toContain(task.id);
    expect(task.initialFiles).toContain(task.initialImplementation);
    expect(task.fixtures).toContain(plan.fixture.path);
  }
});
it("plans without launching Chromium or writing a candidate report", async () => {
  const candidate = await gradingCandidate("task-01");
  try {
    const before = await readdir(candidate.root);
    const report = await gradeBenchmarkTask(
      process.cwd(),
      candidate.root,
      "benchmarks/evaluator/criteria/task-01.json",
      { dryRun: true },
    );
    expect(report).toMatchObject({
      status: "not_run",
      executed: 0,
      plannedScenarios: 1,
      caseId: "task-01",
    });
    expect(report.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await readdir(candidate.root)).toEqual(before);
    await expect(
      gradeBenchmarkTask(
        process.cwd(),
        join(candidate.root, "src"),
        "benchmarks/evaluator/criteria/task-01.json",
        { dryRun: true },
      ),
    ).rejects.toThrow("isolated Git root");
  } finally {
    await candidate.cleanup();
  }
});
it("serves only candidate public files and public INTEIRO assets", async () => {
  const candidate = await gradingCandidate("task-01"),
    server = await createBenchmarkServer(candidate.root);
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const base =
      "http://127.0.0.1:" + (server.address() as { port: number }).port;
    expect((await fetch(base + "/src/index.html")).status).toBe(200);
    expect((await fetch(base + "/__inteiro__/composition.css")).status).toBe(
      200,
    );
    for (const path of [
      "/.git/config",
      "/inteiro.config.json",
      "/benchmarks/evaluator/reference.js",
      "/src/..%2f..%2f.env",
      "/__inteiro__/..%2f..%2fpackage.json",
    ])
      expect((await fetch(base + path)).status).toBe(404);
    expect(
      (
        await fetch(base + "/src/index.html", {
          method: "POST",
          body: "untrusted",
        })
      ).status,
    ).toBe(405);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await candidate.cleanup();
  }
});
it("resolves a CLI candidate relative to the dataset root and rejects incomplete grade invocations", async () => {
  const datasetRoot = process.cwd(),
    cli = resolve("packages/cli/src/cli.ts"),
    candidate = await gradingCandidate("task-01");
  try {
    const cases = [
      {
        args: [
          "--grading",
          "benchmarks/evaluator/criteria/task-01.json",
          "--candidate",
          relative(datasetRoot, candidate.root),
          "--dry-run",
        ],
        code: 7,
      },
      { args: ["--candidate", candidate.root], code: 8 },
    ];
    for (const item of cases) {
      try {
        execFileSync(
          process.execPath,
          [
            cli,
            "benchmark",
            "grade",
            "--cwd",
            datasetRoot,
            "--json",
            ...item.args,
          ],
          {
            cwd: candidate.root,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        throw Error("Expected typed nonzero status");
      } catch (error) {
        const child = error as { status: number; stdout: string };
        expect(child.status).toBe(item.code);
        if (child.status === 7)
          expect(JSON.parse(child.stdout)).toMatchObject({
            status: "not_run",
            caseId: "task-01",
            executed: 0,
          });
        else expect(child.stdout).toContain("requires --grading");
      }
    }
  } finally {
    await candidate.cleanup();
  }
});
it.skipIf(process.env.INTEIRO_GRADE_BROWSER !== "1")(
  "exact text rejects an extra digit in a total",
  async () => {
    const candidate = await gradingCandidate("task-12", "reference");
    try {
      const path = join(candidate.root, "src/app.js");
      const source = await readFile(path, "utf8");
      expect(source).toContain(".total);");
      await writeFile(path, source.replace(".total);", ".total+'0');"));
      const report = await gradeBenchmarkTask(
        process.cwd(),
        candidate.root,
        "benchmarks/evaluator/criteria/task-12.json",
        { assertionTimeoutMs: 1000 },
      );
      expect(report.status).toBe("failed");
      expect(
        report.results.every((result) => result.completedSteps === 4),
      ).toBe(true);
    } finally {
      await candidate.cleanup();
    }
  },
  30000,
);
it.skipIf(process.env.INTEIRO_GRADE_BROWSER !== "1")(
  "rejects a non-JSON form submission even if the UI announces success",
  async () => {
    const candidate = await gradingCandidate("task-01", "reference");
    try {
      const file = join(candidate.root, "src/app.js"),
        body = await readFile(file, "utf8");
      await writeFile(file, body.replaceAll("application/json", "text/plain"));
      const report = await gradeBenchmarkTask(
        process.cwd(),
        candidate.root,
        "benchmarks/evaluator/criteria/task-01.json",
      );
      expect(report.status).toBe("failed");
    } finally {
      await candidate.cleanup();
    }
  },
  30000,
);
for (const id of ids)
  for (const mode of ["starter", "reference", "mutation"] as const)
    it.skipIf(process.env.INTEIRO_GRADE_BROWSER !== "1")(
      `${id}: ${mode}`,
      async () => {
        const candidate = await gradingCandidate(id, mode);
        try {
          const report = await gradeBenchmarkTask(
            process.cwd(),
            candidate.root,
            `benchmarks/evaluator/criteria/${id}.json`,
            mode === "reference" ? {} : { assertionTimeoutMs: 1000 },
          );
          expect(report.status, JSON.stringify(report.results)).toBe(
            mode === "reference" ? "passed" : "failed",
          );
          expect(report.executed).toBe(report.plannedScenarios);
          expect(report.agentExecution).toBe("not_run");
          expect(report.sourceHash).toMatch(/^[a-f0-9]{64}$/);
          if (mode === "reference" && ["task-27", "heldout-7"].includes(id)) {
            expect(report.results.map((result) => result.zoom?.factor)).toEqual(
              [1, 2],
            );
            expect(report.results[1]!.zoom!.after.cssWidth).toBeCloseTo(
              report.results[1]!.zoom!.before.cssWidth / 2,
              0,
            );
          }
        } finally {
          await candidate.cleanup();
        }
      },
      60000,
    );
