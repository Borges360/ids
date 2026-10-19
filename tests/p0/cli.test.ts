import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  readdir,
  rm,
  mkdir,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULTS,
  bundle,
  hash,
  resolveConfig,
  writeReport,
  validateSchema,
} from "@inteiro/contracts";
const cli = resolve("packages/cli/src/cli.ts");
function invoke(args: string[]) {
  try {
    return {
      code: 0,
      stdout: execFileSync(process.execPath, [cli, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (e) {
    const r = e as { status: number; stdout: string };
    return { code: r.status, stdout: String(r.stdout) };
  }
}
describe("P0 command transport", () => {
  it("does not publish benchmark reports during a dry-run import", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-benchmark-dry-"));
    try {
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify({
          ...DEFAULTS,
          project: { ...DEFAULTS.project, framework: "html" },
        }),
      );
      const input = {
        schemaVersion: "1.0",
        idsCommit: "a".repeat(40),
        datasetHash: "b".repeat(64),
        configHash: "c".repeat(64),
        environmentHash: "d".repeat(64),
        observations: [
          {
            caseId: "synthetic",
            model: "synthetic-no-agent",
            ablation: "context",
            seed: 1,
            accepted: false,
            initialAccepted: false,
            attempts: 1,
            durationMs: 10,
            cost: null,
            tokensIn: null,
            tokensOut: null,
            humanMinutes: null,
            outcome: "model_failure",
          },
        ],
      };
      await writeFile(join(root, "experiment.json"), JSON.stringify(input));
      const before = await readdir(root, { recursive: true });
      const result = invoke([
        "benchmark",
        "run",
        "--observations",
        "experiment.json",
        "--dry-run",
        "--cwd",
        root,
        "--json",
      ]);
      expect(result.code).toBe(7);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "not_run",
        dryRun: true,
      });
      expect(await readdir(root, { recursive: true })).toEqual(before);
    } finally {
      const target = await realpath(root);
      if (
        dirname(target) !== (await realpath(tmpdir())) ||
        !basename(target).startsWith("inteiro-benchmark-dry-")
      )
        throw Error("Unsafe cleanup");
      await rm(target, { recursive: true, force: true });
    }
  });
  it("preserves separate review and repair requests for the same evidence run", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-request-files-"));
    try {
      await mkdir(join(root, ".inteiro"));
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify({
          ...DEFAULTS,
          project: { ...DEFAULTS.project, framework: "html" },
        }),
      );
      await writeFile(
        join(root, ".inteiro/task.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          id: "synthetic-transport",
          type: "component",
          description: "Synthetic app shell",
          patternIds: ["app-shell"],
          scope: { allowedFiles: ["ui.html"] },
          acceptanceCriteria: ["Request transport preserves both artifacts"],
        }),
      );
      await writeFile(
        join(root, "ui.html"),
        "<main><h1>Synthetic fixture</h1></main>",
      );
      const image = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=",
        "base64",
      );
      await writeFile(join(root, "fixture.png"), image);
      const git = (...args: string[]) =>
        execFileSync(
          "git",
          ["-c", "core.hooksPath=" + join(root, "unused-hooks"), ...args],
          { cwd: root, stdio: "ignore" },
        );
      git("init", "--initial-branch=codex/synthetic-transport");
      git("add", ".");
      git(
        "-c",
        "user.name=Synthetic fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-m",
        "Synthetic transport",
      );
      const { config } = await resolveConfig(root);
      const report = bundle(config, [
        {
          name: "browser",
          status: "passed",
          findings: [],
          durationMs: 0,
          captures: [{ actual: "fixture.png", sha256: hash(image) }],
        },
      ]);
      await writeReport(root, config, report);
      const args = [
        "request",
        "--run-id",
        report.runId,
        "--cwd",
        root,
        "--json",
      ];
      const dry = invoke(["review", ...args, "--dry-run"]);
      expect(JSON.parse(dry.stdout).kind).toBe("review-request");
      const directory = join(root, config.reporting.outDir, report.runId);
      expect(await readdir(directory)).not.toContain("review.json");
      const review = invoke(["review", ...args]);
      expect(JSON.parse(review.stdout).status).toBe("needs_review");
      expect(
        validateSchema("review-request", JSON.parse(review.stdout)).valid,
      ).toBe(true);
      const before = await readFile(join(directory, "review.json"), "utf8");
      const repair = invoke(["repair", ...args]);
      expect(JSON.parse(repair.stdout).kind).toBe("repair-context");
      expect(
        validateSchema("repair-context", JSON.parse(repair.stdout)).valid,
      ).toBe(true);
      expect(await readFile(join(directory, "review.json"), "utf8")).toBe(
        before,
      );
      expect(
        JSON.parse(await readFile(join(directory, "repair.json"), "utf8"))
          .runId,
      ).toBe(report.runId);
    } finally {
      const target = await realpath(root);
      if (
        dirname(target) !== (await realpath(tmpdir())) ||
        !basename(target).startsWith("inteiro-request-files-")
      )
        throw Error("Unsafe cleanup");
      await rm(target, { recursive: true, force: true });
    }
  });
  it("requires the reviewed migration hash, backs up applied changes and preserves a second run", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-migration-cli-"));
    try {
      await mkdir(join(root, "src"));
      const path = join(root, "src/legacy.css"),
        original = ".choose { color: #6D5DC7; }\n";
      await writeFile(path, original);
      const policy = {
        schemaVersion: "1.0",
        mappings: [
          {
            from: "#6D5DC7",
            tokenId: "color.identity.primary",
            files: ["src/legacy.css"],
            selectors: [".choose"],
            properties: ["color"],
            owner: "fixture",
            reason: "Choice action",
            approvalRef: "synthetic-only",
          },
        ],
      };
      await writeFile(join(root, "migration.json"), JSON.stringify(policy));
      const args = [
        "migrate",
        "src",
        "--mapping",
        "migration.json",
        "--cwd",
        root,
        "--json",
      ];
      const preview = invoke([...args, "--dry-run"]);
      expect(preview.code, preview.stdout).toBe(0);
      const plan = JSON.parse(preview.stdout);
      expect(plan.patches).toHaveLength(1);
      expect(await readFile(path, "utf8")).toBe(original);
      expect(invoke([...args, "--yes"]).code).toBe(7);
      expect(await readFile(path, "utf8")).toBe(original);
      const applied = invoke([...args, "--yes", "--plan-hash", plan.planHash]);
      expect(applied.code, applied.stdout).toBe(0);
      const data = JSON.parse(applied.stdout);
      expect(data.applied).toBe(true);
      expect(await readFile(join(root, data.backups[0].path), "utf8")).toBe(
        original,
      );
      expect(await readFile(path, "utf8")).toContain(
        "var(--in-color-identity-primary)",
      );
      const next = invoke([...args, "--yes"]);
      expect(next.code, next.stdout).toBe(0);
      expect(JSON.parse(next.stdout).applied).toBe(false);
      expect(JSON.parse(next.stdout).patches).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20000);
  it("plans and records task context without overwriting plans or mutating dry runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-task-cli-"));
    try {
      const config = structuredClone(DEFAULTS);
      config.context.harness = "pi";
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify(config),
      );
      expect(
        invoke(["agents", "install", "pi", "--cwd", root, "--yes", "--json"])
          .code,
      ).toBe(0);
      const plan = [
        "context",
        "plan",
        "--cwd",
        root,
        "--task",
        "Formulário com validação",
        "--type",
        "component",
        "--files",
        "src/form.html",
        "--patterns",
        "form-layout",
        "--acceptance",
        "Errors identify their field",
        "--record",
        "--json",
      ];
      const before = await readdir(join(root, ".inteiro"));
      expect(invoke([...plan, "--dry-run"]).code).toBe(7);
      expect(await readdir(join(root, ".inteiro"))).toEqual(before);
      const result = invoke(plan);
      expect(result.code, result.stdout).toBe(0);
      expect(JSON.parse(result.stdout).manifest.contextBundleId).toMatch(
        /^context:[a-f0-9]{64}$/,
      );
      const path = join(root, ".inteiro/task.json"),
        original = await readFile(path, "utf8");
      expect(invoke(plan).code).toBe(7);
      expect(await readFile(path, "utf8")).toBe(original);
      const receiptNames = await readdir(join(root, ".inteiro/contexts"));
      expect(
        invoke([
          "context",
          "resolve",
          "--record",
          "--dry-run",
          "--cwd",
          root,
          "--json",
        ]).code,
      ).toBe(7);
      expect(await readFile(path, "utf8")).toBe(original);
      expect(await readdir(join(root, ".inteiro/contexts"))).toEqual(
        receiptNames,
      );
      expect(
        invoke(["context", "verify", "--task-context", "--cwd", root, "--json"])
          .code,
      ).toBe(0);
      const dryGate = invoke([
        "gate",
        "run",
        "--dry-run",
        "--cwd",
        root,
        "--json",
      ]);
      expect(JSON.parse(dryGate.stdout).required).toContain("task-context");
      const changed = JSON.parse(original);
      changed.description = "Changed requirement";
      await writeFile(path, JSON.stringify(changed));
      expect(
        invoke(["context", "verify", "--task-context", "--cwd", root, "--json"])
          .code,
      ).toBe(7);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20000);
  it("preserves existing integration styles and custom instructions with init --yes", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-legacy-init-"));
    try {
      const css =
        "/* consumer 1.1.0 customization */\n.legacy { color: var(--in-color-text-primary); }\n";
      const instructions =
        "# Consumer instructions\nKeep the business rules.\n";
      const configuration = JSON.stringify({
        ...DEFAULTS,
        project: { ...DEFAULTS.project, id: "legacy-consumer" },
      });
      await writeFile(join(root, "inteiro.css"), css);
      await writeFile(join(root, "AGENTS.md"), instructions);
      await writeFile(join(root, "inteiro.config.json"), configuration);
      expect(invoke(["init", "--cwd", root, "--yes", "--json"]).code).toBe(0);
      expect(await readFile(join(root, "inteiro.css"), "utf8")).toBe(css);
      expect(await readFile(join(root, "inteiro.config.json"), "utf8")).toBe(
        configuration,
      );
      const after = await readFile(join(root, "AGENTS.md"), "utf8");
      expect(after).toContain(instructions.trim());
      expect(after.match(/<!-- inteiro:start -->/g)).toHaveLength(1);
      expect(invoke(["init", "--cwd", root, "--yes", "--json"]).code).toBe(0);
      expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe(after);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not execute when imported by a similarly named consumer script", () => {
    const script =
      "process.argv[1]='consumer-cli.js';await import(" +
      JSON.stringify(pathToFileURL(cli).href) +
      ");console.log('imported');";
    const result = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("imported");
  });
  it("emits a single JSON document without banners", () => {
    const r = invoke(["contract", "inspect", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).designContract.hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("does not fabricate unknown patterns", () => {
    const r = invoke(["compose", "show", "nonexistent", "--json"]);
    expect(r.code).toBe(3);
    expect(JSON.parse(r.stdout).status).toBe("blocked");
    const result = JSON.parse(r.stdout);
    const catalog = JSON.parse(invoke(["compose", "list", "--json"]).stdout);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestionDetails).toHaveLength(result.suggestions.length);
    for (const id of result.suggestions)
      expect(catalog.some((pattern: { id: string }) => pattern.id === id)).toBe(
        true,
      );
  });
  it("keeps dry-run visual execution mutation free", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-dry-"));
    try {
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify(DEFAULTS),
      );
      const before = await readdir(root);
      const r = invoke([
        "visual",
        "test",
        "--cwd",
        root,
        "--dry-run",
        "--json",
      ]);
      expect(r.code).toBe(7);
      expect(JSON.parse(r.stdout).status).toBe("not_run");
      expect(await readdir(root)).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("returns quality exit code and valid SARIF", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-sarif-"));
    try {
      await mkdir(join(root, "src"));
      await writeFile(join(root, "src/bad.css"), ".x{color:#6D5DC7}");
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify(DEFAULTS),
      );
      const r = invoke(["lint", ".", "--cwd", root, "--format", "sarif"]);
      expect(r.code).toBe(6);
      expect(JSON.parse(r.stdout).runs[0].results[0].ruleId).toBe(
        "IN-TOKEN-001",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not accept self-approval without signed artifact decision", () => {
    const r = invoke([
      "visual",
      "baseline",
      "approve",
      "--review-id",
      "agent-said-yes",
      "--json",
    ]);
    expect(r.code).toBe(7);
    expect(JSON.parse(r.stdout).status).toBe("needs_review");
  });
  it("returns typed infrastructure failure for bad config", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-config-"));
    try {
      await writeFile(join(root, "inteiro.config.json"), "{broken");
      const r = invoke(["contract", "inspect", "--cwd", root, "--json"]);
      expect(r.code).toBe(8);
      expect(JSON.parse(r.stdout).status).toBe("error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
