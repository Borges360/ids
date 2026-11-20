import { it, expect } from "vitest";
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  prepareBenchmarkWorker,
  auditBenchmarkWorker,
  runBenchmarkWorkerNode,
} from "@inteiro/evaluation/workspace";
import { hash } from "@inteiro/contracts";
import { generateKeyPairSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { bootstrapFixture } from "../helpers/bootstrap-fixture.ts";
it("transports bootstrap dry-run through the CLI without creating a worker", async () => {
  const fixture = await bootstrapFixture();
  try {
    let output = "";
    try {
      execFileSync(
        process.execPath,
        [
          resolve("packages/cli/src/cli.ts"),
          "benchmark",
          "prepare",
          "--case",
          "task-01",
          "--target",
          fixture.target,
          "--cwd",
          fixture.dataset,
          "--bootstrap",
          "--packages-manifest",
          fixture.options.distributionManifest,
          "--dependency-lock",
          fixture.options.dependencyLock,
          "--harness",
          "codex",
          "--dry-run",
          "--json",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      throw Error("Expected not_run exit code");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(7);
      output = String((error as { stdout?: string }).stdout);
    }
    expect(JSON.parse(output)).toMatchObject({
      status: "not_run",
      bootstrapPlanned: true,
      readyForValidation: false,
    });
    await expect(stat(fixture.target)).rejects.toThrow();
  } finally {
    await fixture.cleanup();
  }
});
it("refuses private signing keys in a public validation policy", async () => {
  const fixture = await bootstrapFixture();
  try {
    const path = join(
      fixture.dataset,
      "benchmarks/validation/task-01/reviewer-policy.json",
    );
    await writeFile(
      path,
      JSON.stringify({
        reviewers: {
          bad: generateKeyPairSync("ed25519").privateKey.export({
            type: "pkcs8",
            format: "pem",
          }),
        },
      }),
    );
    const metaPath = join(fixture.dataset, fixture.validation.path),
      meta = JSON.parse(await readFile(metaPath, "utf8"));
    meta.reviewPolicy.sha256 = hash(await readFile(path));
    await writeFile(metaPath, JSON.stringify(meta));
    const catalogPath = join(fixture.dataset, "benchmarks/tasks.public.json"),
      catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.tasks[0].validation.sha256 = hash(await readFile(metaPath));
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(
      prepareBenchmarkWorker(fixture.dataset, fixture.target, "task-01", {
        dryRun: true,
        bootstrap: fixture.options,
      }),
    ).rejects.toThrow("public keys only");
    await expect(stat(fixture.target)).rejects.toThrow();
  } finally {
    await fixture.cleanup();
  }
});
it("removes a newly created worker after an offline installer failure", async () => {
  const fixture = await bootstrapFixture();
  try {
    const npmCli = join(fixture.dataset, "fail-npm.mjs");
    await writeFile(npmCli, "process.exit(2);");
    await expect(
      prepareBenchmarkWorker(fixture.dataset, fixture.target, "task-01", {
        bootstrap: { ...fixture.options, npmCli },
      }),
    ).rejects.toThrow("Trusted bootstrap command failed");
    await expect(stat(fixture.target)).rejects.toThrow();
    await expect(
      stat(join(fixture.dataset, ".inteiro/reports/workers")),
    ).rejects.toThrow();
  } finally {
    await fixture.cleanup();
  }
});
it("plans an offline bootstrap without writing a target, receipt or running npm", async () => {
  const fixture = await bootstrapFixture();
  try {
    const result = await prepareBenchmarkWorker(
      fixture.dataset,
      fixture.target,
      "task-01",
      { dryRun: true, bootstrap: fixture.options },
    );
    expect(result).toMatchObject({
      status: "not_run",
      readyForValidation: false,
      bootstrapPlanned: true,
    });
    await expect(stat(fixture.target)).rejects.toThrow();
    await expect(
      stat(join(fixture.dataset, ".inteiro/reports/workers")),
    ).rejects.toThrow();
  } finally {
    await fixture.cleanup();
  }
});
for (const mutation of [
  "archive",
  "lock",
  "private-path",
  "routes-hash",
  "missing-validation",
  "invalid-seed",
] as const)
  it("refuses " + mutation + " before creating a worker", async () => {
    const fixture = await bootstrapFixture();
    try {
      if (mutation === "archive")
        await writeFile(
          join(fixture.dataset, "artifacts/tarballs/inteiro-cli-1.3.1.tgz"),
          "changed",
        );
      if (mutation === "invalid-seed") {
        const metaPath = join(fixture.dataset, fixture.validation.path),
          meta = JSON.parse(await readFile(metaPath, "utf8"));
        const fixturePath = join(fixture.dataset, meta.fixtures[0].path),
          data = JSON.parse(await readFile(fixturePath, "utf8"));
        data.seed = -1;
        await writeFile(fixturePath, JSON.stringify(data));
        meta.fixtures[0].sha256 = hash(await readFile(fixturePath));
        await writeFile(metaPath, JSON.stringify(meta));
        const path = join(fixture.dataset, "benchmarks/tasks.public.json"),
          catalog = JSON.parse(await readFile(path, "utf8"));
        catalog.tasks[0].validation.sha256 = hash(await readFile(metaPath));
        await writeFile(path, JSON.stringify(catalog));
      }
      if (mutation === "lock") {
        const path = join(fixture.dataset, "artifacts/dependency-lock.json"),
          lock = JSON.parse(await readFile(path, "utf8"));
        lock.packages["node_modules/@inteiro/cli"].integrity =
          "sha512-different";
        await writeFile(path, JSON.stringify(lock));
      }
      if (mutation === "private-path" || mutation === "routes-hash") {
        const path = join(fixture.dataset, fixture.validation.path),
          meta = JSON.parse(await readFile(path, "utf8"));
        if (mutation === "private-path")
          meta.routes.path =
            "benchmarks/validation/../evaluator/criteria/task-01.json";
        else meta.routes.sha256 = "f".repeat(64);
        await writeFile(path, JSON.stringify(meta));
        const catalogPath = join(
            fixture.dataset,
            "benchmarks/tasks.public.json",
          ),
          catalog = JSON.parse(await readFile(catalogPath, "utf8"));
        catalog.tasks[0].validation.sha256 = hash(await readFile(path));
        await writeFile(catalogPath, JSON.stringify(catalog));
      }
      if (mutation === "missing-validation") {
        const path = join(fixture.dataset, "benchmarks/tasks.public.json"),
          catalog = JSON.parse(await readFile(path, "utf8"));
        delete catalog.tasks[0].validation;
        await writeFile(path, JSON.stringify(catalog));
      }
      await expect(
        prepareBenchmarkWorker(fixture.dataset, fixture.target, "task-01", {
          dryRun: true,
          bootstrap: fixture.options,
        }),
      ).rejects.toThrow();
      await expect(stat(fixture.target)).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });
for (const harness of ["pi", "codex"] as const)
  it.skipIf(process.env.INTEIRO_BOOTSTRAP_NPM !== "1")(
    "installs the pinned distribution offline and seals real prerequisites for " +
      harness,
    async () => {
      const fixture = await bootstrapFixture(true);
      try {
        const result = await prepareBenchmarkWorker(
          fixture.dataset,
          fixture.target,
          "task-01",
          { bootstrap: { ...fixture.options, harness } },
        );
        if (result.status !== "passed") throw Error("Unexpected plan");
        expect(result.readyForValidation).toBe(true);
        expect(result.bootstrap).toMatchObject({
          kind: "offline-worker-bootstrap",
          offline: true,
          lifecycleScripts: false,
          routes: 1,
          states: 3,
          harness,
          approval: "not-created",
        });
        expect(
          await auditBenchmarkWorker(fixture.dataset, result.id),
        ).toMatchObject({ status: "passed", readyForValidation: true });
        expect(await readFile(join(fixture.target, "src/app.js"), "utf8")).toBe(
          await readFile(
            join(fixture.dataset, "benchmarks/workers/task-01/src/app.js"),
            "utf8",
          ),
        );
        const task = JSON.parse(
          await readFile(join(fixture.target, ".inteiro/task.json"), "utf8"),
        );
        expect(task.reviewRequired).toBe(true);
        expect(task.scope.allowedFiles).toEqual([
          "src/index.html",
          "src/app.js",
        ]);
        await expect(
          stat(join(fixture.target, "benchmarks/evaluator")),
        ).rejects.toThrow();
        if (harness === "pi" && process.env.INTEIRO_WORKER_DOCKER === "1") {
          const tool = await runBenchmarkWorkerNode(
            fixture.dataset,
            result.id,
            [
              "-e",
              `const fs=require('fs');const denied=p=>{try{fs.writeFileSync(p,'bad');return false}catch(e){return ['EROFS','EACCES'].includes(e.code)}};const controls=['.inteiro/reviewers.json','.inteiro/task.json','inteiro.config.json','package-lock.json','node_modules/@inteiro/contracts/package.json'].every(denied);fs.writeFileSync('src/app.js','// permitted isolated source edit\\n');console.log(JSON.stringify({controls,privateAbsent:!fs.existsSync('benchmarks/evaluator'),networkIsolated:fs.readdirSync('/sys/class/net').join(',')==='lo'}));`,
            ],
          );
          expect(tool.status, JSON.stringify(tool)).toBe("passed");
          if (!("stdout" in tool)) throw Error("Missing isolated result");
          expect(JSON.parse(tool.stdout)).toEqual({
            controls: true,
            privateAbsent: true,
            networkIsolated: true,
          });
        }
        await mkdir(join(fixture.target, ".inteiro/reviews"), {
          recursive: true,
        });
        await writeFile(
          join(fixture.target, ".inteiro/reviews/unapproved.json"),
          "{}",
        );
        expect(
          (await auditBenchmarkWorker(fixture.dataset, result.id)).status,
        ).toBe("passed");
        await writeFile(join(fixture.target, ".inteiro/reviewers.json"), "{}");
        expect(
          (await auditBenchmarkWorker(fixture.dataset, result.id)).findings,
        ).toContain("protected-file-changed:.inteiro/reviewers.json");
      } finally {
        await fixture.cleanup();
      }
    },
    180000,
  );
