import { it, expect } from "vitest";
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rm,
  mkdir,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULTS,
  hash,
  validateSchema,
  reviewSourceHash,
  bundle,
  finding,
  type Config,
} from "@inteiro/contracts";
import {
  recordTaskContext,
  taskContextGate,
  verifyStoredContext,
  taskManifestErrors,
  resolvedRepairContext,
  type TaskManifest,
  type ResolvedContext,
} from "@inteiro/agent-core";
import { installHarness } from "../../packages/cli/src/install-agents.ts";
const config = structuredClone(DEFAULTS);
config.context.harness = "pi";
const task: TaskManifest = {
  schemaVersion: "1.0",
  id: "synthetic-context-test",
  type: "component",
  description: "Formulário com validação",
  patternIds: ["form-layout"],
  scope: { allowedFiles: ["src/form.html"] },
  acceptanceCriteria: ["Field errors are associated and keyboard-accessible"],
};
it("emits repair authorization only for current evidence and verified task context", async () =>
  fixture(async (root) => {
    const recorded = await record(root);
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/form.html"), "<button>Fixture</button>");
    const git = (args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    git(["init"]);
    git(["add", "src/form.html", "AGENTS.md", ".inteiro/task.json"]);
    git([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Synthetic repair fixture",
    ]);
    const report = bundle(config, [
      {
        name: "static",
        status: "failed",
        findings: [
          finding("IN-TOKEN-001", "Synthetic issue", { file: "src/form.html" }),
        ],
        durationMs: 0,
      },
    ]);
    report.sourceHash = await reviewSourceHash(root);
    const { hash: _, ...payload } = report;
    report.hash = hash(payload);
    const repair = await resolvedRepairContext(root, config, report);
    expect(repair.status).toBe("repairable");
    expect(repair.contextBundleId).toBe(recorded.context.bundleId);
    expect(repair.scope.allowedFiles).toEqual(["src/form.html"]);
    await writeFile(join(root, "src/form.html"), "<button>Changed</button>");
    expect((await resolvedRepairContext(root, config, report)).status).toBe(
      "blocked",
    );
  }));
async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-task-context-"));
  try {
    await installHarness(root, "pi", { dryRun: false, yes: true });
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function record(root: string, settings: Config = config) {
  const result = await recordTaskContext(root, settings, task);
  if (result.status !== "passed" || !result.manifest || !result.context)
    throw new Error("Fixture context unavailable");
  return result;
}

it("records a task-bound bundle and keeps model access unobserved", async () =>
  fixture(async (root) => {
    const result = await record(root);
    expect(validateSchema("task-manifest", result.manifest).valid).toBe(true);
    expect(validateSchema("context-bundle", result.context).valid).toBe(true);
    const gate = await taskContextGate(root, config);
    expect(gate.status).toBe("passed");
    expect(gate.used).toBe("declared");
    expect(gate.loaded).toBe("unobserved");
    expect(
      (await verifyStoredContext(root, config, result.manifest)).bundleId,
    ).toBe(result.context.bundleId);
    const again = await recordTaskContext(root, config, result.manifest);
    expect(again.context?.taskHash).toBe(result.context.taskHash);
    expect(again.context?.bundleId).not.toBe(result.context.bundleId);
  }));
it("does not accept installed skills alone as task context", async () =>
  fixture(async (root) => {
    expect((await taskContextGate(root, config)).status).toBe("blocked");
    await writeFile(
      join(root, ".inteiro/task.json"),
      JSON.stringify({
        ...task,
        configHash: hash(config),
        contextBundleId: "context:" + "a".repeat(64),
      }),
    );
    expect((await taskContextGate(root, config)).status).toBe("blocked");
  }));
it("keeps recorded dry run free from manifest and receipt writes", async () =>
  fixture(async (root) => {
    await writeFile(join(root, ".inteiro/task.json"), JSON.stringify(task));
    const before = await readdir(join(root, ".inteiro"));
    const original = await readFile(join(root, ".inteiro/task.json"), "utf8");
    expect((await recordTaskContext(root, config, task, true)).status).toBe(
      "not_run",
    );
    expect(await readdir(join(root, ".inteiro"))).toEqual(before);
    expect(await readFile(join(root, ".inteiro/task.json"), "utf8")).toBe(
      original,
    );
  }));
for (const change of [
  "description",
  "scope",
  "review",
  "configuration",
  "instructions",
])
  it("invalidates context after changing " + change, async () =>
    fixture(async (root) => {
      const result = await record(root);
      const changed = structuredClone(result.manifest);
      let settings = config;
      if (change === "description")
        changed.description = "Different business requirement";
      if (change === "scope")
        changed.scope.allowedFiles.push("src/elsewhere.html");
      if (change === "review") changed.reviewRequired = false;
      if (change === "configuration") {
        settings = structuredClone(config);
        settings.repair.maxAttempts = 1;
      }
      if (change === "instructions")
        await writeFile(join(root, "AGENTS.md"), "Altered instructions");
      await expect(
        verifyStoredContext(root, settings, changed),
      ).rejects.toThrow();
    }),
  );
it("rejects a self-consistent forged receipt that changes authoritative pattern markup", async () =>
  fixture(async (root) => {
    const result = await record(root);
    const forged = structuredClone(result.context);
    forged.patterns[0]!.markup = "<button>Invented official pattern</button>";
    const {
      status: _,
      bundleId: __,
      estimatedTokens: ___,
      budgetTokens: ____,
      missingPatterns: _____,
      limits: ______,
      ...payload
    } = forged;
    forged.bundleId = "context:" + hash(payload);
    await writeFile(
      join(root, ".inteiro/contexts", forged.bundleId.slice(8) + ".json"),
      JSON.stringify(forged),
    );
    await expect(
      verifyStoredContext(root, config, {
        ...result.manifest,
        contextBundleId: forged.bundleId,
      }),
    ).rejects.toThrow("differs");
  }));
it("rejects modified metadata and missing requested patterns", async () =>
  fixture(async (root) => {
    const result = await record(root);
    const path = join(
      root,
      ".inteiro/contexts",
      result.context.bundleId.slice(8) + ".json",
    );
    const context = JSON.parse(await readFile(path, "utf8")) as ResolvedContext;
    context.estimatedTokens = 0;
    await writeFile(path, JSON.stringify(context));
    await expect(
      verifyStoredContext(root, config, result.manifest),
    ).rejects.toThrow("differs");
    const unavailable = await recordTaskContext(root, config, {
      ...task,
      patternIds: ["nonexistent"],
    });
    expect(unavailable.status).toBe("blocked");
    expect(unavailable.context?.missingPatterns).toEqual(["nonexistent"]);
  }));
it("rejects malformed plans and escaped file scopes", async () =>
  fixture(async (root) => {
    expect(taskManifestErrors(null as never, root)).not.toEqual([]);
    for (const path of [
      "../escape.html",
      "/absolute.html",
      "src/../escape.html",
      "C:\\outside.html",
    ])
      expect(
        taskManifestErrors({ ...task, scope: { allowedFiles: [path] } }, root),
      ).not.toEqual([]);
    expect(
      (
        await recordTaskContext(root, config, {
          ...task,
          acceptanceCriteria: [],
        })
      ).status,
    ).toBe("blocked");
    expect(
      (await recordTaskContext(root, config, { ...task, type: "unknown" }))
        .status,
    ).toBe("blocked");
  }));
it("resolves referenced contracts and rejects stale document checksums", async () =>
  fixture(async (root) => {
    const path = "contract.md",
      content = Buffer.from("Synthetic contract");
    await writeFile(join(root, path), content);
    const withContract = {
      ...task,
      contractRefs: [{ path, sha256: hash(content) }],
    };
    const result = await recordTaskContext(root, config, withContract);
    expect(result.status).toBe("passed");
    expect(result.context?.provenance).toContainEqual({
      path,
      sha256: hash(content),
      required: true,
    });
    await writeFile(join(root, path), "Changed contract");
    if (!result.manifest) throw new Error("Missing receipt");
    await expect(
      verifyStoredContext(root, config, result.manifest),
    ).rejects.toThrow();
    const stale = await recordTaskContext(root, config, withContract);
    expect(stale.status).toBe("blocked");
    expect(stale.context?.resolutionErrors.length).toBe(1);
  }));
