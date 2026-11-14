import { it, expect } from "vitest";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  prepareBenchmarkWorker,
  auditBenchmarkWorker,
  runBenchmarkWorkerNode,
  WORKER_IMAGE,
  WORKER_SOURCE_BYTES,
} from "@inteiro/evaluation/workspace";
import { workerFixture } from "../helpers/worker-fixture.ts";
async function fixture(
  run: (value: Awaited<ReturnType<typeof workerFixture>>) => Promise<void>,
) {
  const value = await workerFixture();
  try {
    await run(value);
  } finally {
    await value.cleanup();
  }
}
it("exposes prepare/audit through CLI without silently accepting dry-run or unknown IDs", () =>
  fixture(async ({ dataset, target }) => {
    const invoke = (...args: string[]) => {
      try {
        return {
          code: 0,
          stdout: execFileSync(
            process.execPath,
            [
              resolve("packages/cli/src/cli.ts"),
              "benchmark",
              ...args,
              "--cwd",
              dataset,
              "--json",
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          ),
        };
      } catch (error) {
        const result = error as { status: number; stdout: string };
        return { code: result.status, stdout: String(result.stdout) };
      }
    };
    const planned = invoke(
      "prepare",
      "--case",
      "task-01",
      "--target",
      target,
      "--dry-run",
    );
    expect(planned.code).toBe(7);
    expect(JSON.parse(planned.stdout).readyForValidation).toBe(false);
    await expect(stat(target)).rejects.toThrow();
    const prepared = invoke("prepare", "--case", "task-01", "--target", target);
    expect(prepared.code).toBe(0);
    const id = JSON.parse(prepared.stdout).id;
    expect(invoke("worker-audit", "--worker", id).code).toBe(0);
    expect(invoke("worker-audit", "--worker", "unknown").code).toBe(8);
  }));
it("materializes only selected task inputs and stores the seal outside the worker", () =>
  fixture(async ({ dataset, target, task }) => {
    const result = await prepareBenchmarkWorker(dataset, target, "task-01");
    if (result.status !== "passed") throw Error("Unexpected plan");
    expect(result.readyForValidation).toBe(false);
    expect(result.image).toBe(WORKER_IMAGE);
    expect(result.editableFiles).toEqual(["src/index.html", "src/app.js"]);
    expect(await auditBenchmarkWorker(dataset, result.id)).toMatchObject({
      status: "passed",
      findings: [],
      diffLines: 0,
    });
    expect(await readFile(join(target, "src/index.html"), "utf8")).toBe(
      await readFile(join(dataset, task.initialImplementation), "utf8"),
    );
    expect(await readdir(target)).not.toContain("benchmarks");
    expect(await readdir(target)).not.toContain("evaluator");
    expect(await readdir(join(target, ".inteiro"))).not.toContain("reports");
    const authority = JSON.parse(
      await readFile(
        join(dataset, ".inteiro/reports/workers", result.id + ".json"),
        "utf8",
      ),
    );
    expect(authority.root).toBe(target);
    expect(
      result.protectedFiles.some((file) => file.path === "inteiro.config.json"),
    ).toBe(true);
  }));
it("dry-run does not create directories and preparation never overwrites an existing workspace", () =>
  fixture(async ({ dataset, target }) => {
    expect(
      await prepareBenchmarkWorker(dataset, target, "task-01", {
        dryRun: true,
      }),
    ).toMatchObject({ status: "not_run", readyForValidation: false });
    await expect(stat(target)).rejects.toThrow();
    await prepareBenchmarkWorker(dataset, target, "task-01");
    const before = await readFile(join(target, "TASK.md"), "utf8");
    await expect(
      prepareBenchmarkWorker(dataset, target, "task-01"),
    ).rejects.toThrow("already exists");
    expect(await readFile(join(target, "TASK.md"), "utf8")).toBe(before);
  }));
it("refuses unbound criteria before writing", () =>
  fixture(async ({ dataset, target }) => {
    const path = join(dataset, "benchmarks/tasks.public.json"),
      data = JSON.parse(await readFile(path, "utf8"));
    data.tasks[0].grading.sha256 = "a".repeat(64);
    await writeFile(path, JSON.stringify(data));
    await expect(
      prepareBenchmarkWorker(dataset, target, "task-01"),
    ).rejects.toThrow("snapshot");
    await expect(stat(target)).rejects.toThrow();
  }));
it("rejects source escapes and evaluator targets before writing", () =>
  fixture(async ({ dataset, target, task }) => {
    await expect(
      prepareBenchmarkWorker(
        dataset,
        join(dataset, "benchmarks/candidate"),
        "task-01",
      ),
    ).rejects.toThrow("outside evaluator");
    const path = join(dataset, "benchmarks/tasks.public.json");
    const data = JSON.parse(await readFile(path, "utf8"));
    data.tasks[0].initialFiles.push(
      "benchmarks/workers/task-01/src/../secret.js",
    );
    await writeFile(path, JSON.stringify(data));
    await expect(
      prepareBenchmarkWorker(dataset, target, "task-01"),
    ).rejects.toThrow("escapes");
    await expect(stat(target)).rejects.toThrow();
    data.tasks[0].initialFiles = task.initialFiles;
    await writeFile(path, JSON.stringify(data));
    await writeFile(
      join(dataset, task.initialImplementation),
      "x".repeat(WORKER_SOURCE_BYTES + 1),
    );
    await expect(
      prepareBenchmarkWorker(dataset, target, "task-01"),
    ).rejects.toThrow("byte budget");
  }));
it("blocks oversized source before calculating a Git diff", () =>
  fixture(async ({ dataset, target }) => {
    const result = await prepareBenchmarkWorker(dataset, target, "task-01");
    if (result.status !== "passed") throw Error("Unexpected plan");
    await writeFile(
      join(target, "src/app.js"),
      "x".repeat(WORKER_SOURCE_BYTES + 1),
    );
    expect(await auditBenchmarkWorker(dataset, result.id)).toMatchObject({
      status: "blocked",
      diffLines: 0,
      findings: ["source-byte-budget-exceeded"],
    });
  }));
it("detects protected changes, unexpected files and cumulative source budget violations", () =>
  fixture(async ({ dataset, target }) => {
    const result = await prepareBenchmarkWorker(dataset, target, "task-01");
    if (result.status !== "passed") throw Error("Unexpected plan");
    await writeFile(join(target, "src/app.js"), "// allowed source edit\n");
    expect((await auditBenchmarkWorker(dataset, result.id)).status).toBe(
      "passed",
    );
    await writeFile(join(target, "src/app.js"), "// changed\n".repeat(500));
    expect((await auditBenchmarkWorker(dataset, result.id)).findings).toContain(
      "source-diff-budget-exceeded",
    );
    await writeFile(join(target, "inteiro.config.json"), "{}");
    expect((await auditBenchmarkWorker(dataset, result.id)).findings).toContain(
      "protected-file-changed:inteiro.config.json",
    );
    await writeFile(join(target, "src/unlisted.js"), "unlisted");
    expect((await auditBenchmarkWorker(dataset, result.id)).findings).toContain(
      "unexpected-file:src/unlisted.js",
    );
    expect(
      (
        await runBenchmarkWorkerNode(dataset, result.id, [
          "-e",
          "process.exit(99)",
        ])
      ).status,
    ).toBe("blocked");
  }));
it("refuses forged receipt hashes and invalid isolated tool limits", () =>
  fixture(async ({ dataset, target }) => {
    const result = await prepareBenchmarkWorker(dataset, target, "task-01");
    if (result.status !== "passed") throw Error("Unexpected plan");
    await expect(
      runBenchmarkWorkerNode(dataset, result.id, [], { timeoutMs: 100000 }),
    ).rejects.toThrow("budget");
    const path = join(dataset, ".inteiro/reports/workers", result.id + ".json"),
      receipt = JSON.parse(await readFile(path, "utf8"));
    receipt.root = dataset;
    await writeFile(path, JSON.stringify(receipt));
    await expect(auditBenchmarkWorker(dataset, result.id)).rejects.toThrow(
      "receipt",
    );
  }));
it.skipIf(process.env.INTEIRO_WORKER_DOCKER !== "1")(
  "enforces physical read-only controls and references, hidden evaluator files and keys, and network denial",
  () =>
    fixture(async ({ dataset, target }) => {
      const result = await prepareBenchmarkWorker(dataset, target, "task-01");
      if (result.status !== "passed") throw Error("Unexpected plan");
      const before = await readFile(join(target, "package.json"), "utf8");
      const program = `const fs=require('fs');fs.writeFileSync('src/app.js','// isolated edit\\n');const denied=(path)=>{try{fs.writeFileSync(path,'bad');return false}catch(e){return ['EROFS','EACCES'].includes(e.code)}};const controls=denied('package.json');const extraFileDenied=denied('src/unlisted.js');const privateAbsent=['/workspace/benchmarks/evaluator/criteria/task-01.json','/repo/benchmarks/evaluator/criteria/task-01.json'].every(p=>!fs.existsSync(p));const loopbackOnly=fs.readdirSync('/sys/class/net').join(',')==='lo';const createDenied=(path)=>{try{fs.mkdirSync(require('path').dirname(path),{recursive:true});fs.writeFileSync(path,'bad');return false}catch(e){return ['EROFS','EACCES'].includes(e.code)||(e.code==='ENOENT'&&!fs.existsSync(path))}};const referencesDenied=denied('.inteiro/worker.json')&&denied('inteiro.routes.json')&&createDenied('tests/visual/__snapshots__/registry.json')&&createDenied('.inteiro/technical-attestors.json');const attestorKeyAbsent=[process.env.HOME,'/root','/home/node'].filter(Boolean).every(h=>!fs.existsSync(require('path').join(h,'.codex')))&&!Object.values(process.env).some(v=>String(v).includes('PRIVATE KEY'));fetch('https://example.com',{signal:AbortSignal.timeout(1000)}).then(()=>process.exit(7)).catch(()=>console.log(JSON.stringify({controls,extraFileDenied,privateAbsent,referencesDenied,attestorKeyAbsent,loopbackOnly,networkDenied:true,noDockerSocket:!fs.existsSync('/var/run/docker.sock')})));`;
      const tool = await runBenchmarkWorkerNode(dataset, result.id, [
        "-e",
        program,
      ]);
      expect(tool.status, JSON.stringify(tool)).toBe("passed");
      if (!("stdout" in tool)) throw Error("Missing tool result");
      expect(JSON.parse(tool.stdout)).toEqual({
        controls: true,
        extraFileDenied: true,
        privateAbsent: true,
        // E05: the implementation executor cannot write protected references
        // or reach the technical attestor's key material.
        referencesDenied: true,
        attestorKeyAbsent: true,
        loopbackOnly: true,
        networkDenied: true,
        noDockerSocket: true,
      });
      expect(await readFile(join(target, "package.json"), "utf8")).toBe(before);
      expect(await readFile(join(target, "src/app.js"), "utf8")).toContain(
        "isolated edit",
      );
    }),
  30000,
);
it.skipIf(process.env.INTEIRO_WORKER_DOCKER !== "1")(
  "limits physical file growth and blocks the oversized result",
  () =>
    fixture(async ({ dataset, target }) => {
      const result = await prepareBenchmarkWorker(dataset, target, "task-01");
      if (result.status !== "passed") throw Error("Unexpected plan");
      const tool = await runBenchmarkWorkerNode(dataset, result.id, [
        "-e",
        `require('fs').writeFileSync('src/app.js',Buffer.alloc(${WORKER_SOURCE_BYTES * 8}))`,
      ]);
      expect(tool.status).toBe("blocked");
      expect((await stat(join(target, "src/app.js"))).size).toBeLessThanOrEqual(
        WORKER_SOURCE_BYTES,
      );
      expect(tool.findings).toContain("source-byte-budget-exceeded");
    }),
  30000,
);
it.skipIf(process.env.INTEIRO_WORKER_DOCKER !== "1")(
  "removes its named container after a timeout",
  () =>
    fixture(async ({ dataset, target }) => {
      const result = await prepareBenchmarkWorker(dataset, target, "task-01");
      if (result.status !== "passed") throw Error("Unexpected plan");
      const tool = await runBenchmarkWorkerNode(
        dataset,
        result.id,
        ["-e", "setInterval(()=>{},1000)"],
        { timeoutMs: 1000 },
      );
      expect(tool.status).toBe("error");
      if (!("containerName" in tool)) throw Error("Missing tool result");
      expect(tool.cleanupVerified).toBe(true);
      expect(() =>
        execFileSync("docker", ["inspect", tool.containerName], {
          stdio: "pipe",
        }),
      ).toThrow();
    }),
  30000,
);
