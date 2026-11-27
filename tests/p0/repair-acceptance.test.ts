import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import {
  bundle,
  DEFAULTS,
  finding,
  type EvidenceBundle,
} from "@inteiro/contracts";
import {
  runRepairController,
  recordTaskContext,
  parseGateOutput,
} from "@inteiro/agent-core";
import { installHarness } from "../../packages/cli/src/install-agents.ts";
import {
  initializeRepairGit,
  passingRepairEvidence,
  rehashRepairEvidence,
} from "../helpers/repair-evidence.ts";
const config = structuredClone(DEFAULTS);
config.context.harness = "pi";
async function fixture(
  run: (
    root: string,
    task: { contextBundleId: string; allowedFiles: string[] },
  ) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-repair-acceptance-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/ui.css"), "a { color: red; }");
    initializeRepairGit(root);
    await installHarness(root, "pi", { dryRun: false, yes: true });
    const receipt = await recordTaskContext(root, config, {
      schemaVersion: "1.0",
      id: "synthetic-repair",
      type: "fix",
      description: "Synthetic repair test",
      patternIds: ["form-layout"],
      scope: { allowedFiles: ["src/ui.css"] },
      acceptanceCriteria: ["Static and browser checks pass"],
    });
    if (!receipt.context) throw Error("Missing fixture context");
    await run(root, {
      contextBundleId: receipt.context.bundleId,
      allowedFiles: ["src/ui.css"],
    });
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-repair-acceptance-")
    )
      throw Error("Unsafe cleanup");
    await rm(target, { recursive: true, force: true });
  }
}
const initial = () =>
  bundle(config, [
    {
      name: "static",
      status: "failed",
      durationMs: 0,
      findings: [
        finding("IN-TOKEN-001", "Synthetic incorrect style", {
          file: "src/ui.css",
        }),
      ],
    },
  ]);
for (const [name, patch] of [
  [
    "lint-only",
    (report: EvidenceBundle) =>
      (report.gates = report.gates.filter((g) => g.name === "static")),
  ],
  [
    "missing review",
    (report: EvidenceBundle) =>
      (report.gates = report.gates.filter((g) => g.name !== "review")),
  ],
  [
    "duplicate gate",
    (report: EvidenceBundle) => report.gates.push(report.gates[0]!),
  ],
  [
    "stale source",
    (report: EvidenceBundle) => (report.sourceHash = "a".repeat(64)),
  ],
  [
    "wrong task",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "task-context")!.taskId = "other"),
  ],
  [
    "no browser execution",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "browser")!.executed = 0),
  ],
  [
    "partial coverage",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "static")!.coverage = 0.5),
  ],
  ["unregistered capture", (report: EvidenceBundle) => (report.artifacts = [])],
  [
    "wrong commit",
    (report: EvidenceBundle) => (report.gitSha = "a".repeat(40)),
  ],
  ["missing source hash", (report: EvidenceBundle) => delete report.sourceHash],
  [
    "observe-only lint",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "static")!.adoption = "observe"),
  ],
  [
    "missing task hash",
    (report: EvidenceBundle) =>
      delete report.gates.find((g) => g.name === "task-context")!.taskHash,
  ],
  [
    "wrong context receipt",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "task-context")!.contextBundleId =
        "context:" + "a".repeat(64)),
  ],
  [
    "capture environment mismatch",
    (report: EvidenceBundle) =>
      (report.gates.find((g) => g.name === "browser")!.environmentFingerprint =
        "b".repeat(64)),
  ],
] as const)
  it("rolls back a green full callback with " + name, () =>
    fixture(async (root, task) => {
      const result = await runRepairController(root, config, initial(), task, {
        propose: async (envelope) => ({
          edits: [
            {
              path: "src/ui.css",
              baseHash: envelope.files[0]!.sha256,
              content: "a { color: var(--in-color-text-primary); }",
            },
          ],
        }),
        validate: async (scope) => {
          const report = await passingRepairEvidence(root, config);
          if (scope === "full") patch(report);
          return rehashRepairEvidence(report);
        },
      });
      expect(result.status).not.toBe("passed");
      expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
        "a { color: red; }",
      );
    }),
  );
it("accepts complete current synthetic repair evidence", () =>
  fixture(async (root, task) => {
    const result = await runRepairController(root, config, initial(), task, {
      propose: async (envelope) => ({
        edits: [
          {
            path: "src/ui.css",
            baseHash: envelope.files[0]!.sha256,
            content: "a { color: var(--in-color-text-primary); }",
          },
        ],
      }),
      validate: async () => passingRepairEvidence(root, config),
    });
    expect(result.status).toBe("passed");
  }));
for (const mode of [
  "missing-state",
  "missing-action",
  "duplicate-capture",
] as const)
  it("refuses incomplete browser coverage: " + mode, () =>
    fixture(async (root, task) => {
      const routes = JSON.parse(
        await readFile(join(root, config.browser.routesFile), "utf8"),
      );
      if (mode === "missing-state")
        routes.routes[0].states.push({ id: "error", actions: [] });
      if (mode === "missing-action")
        routes.routes[0].states[0].actions.push({ type: "screenshot" });
      await writeFile(
        join(root, config.browser.routesFile),
        JSON.stringify(routes),
      );
      const result = await runRepairController(root, config, initial(), task, {
        propose: async (envelope) => ({
          edits: [
            {
              path: "src/ui.css",
              baseHash: envelope.files[0]!.sha256,
              content: "a {}",
            },
          ],
        }),
        validate: async (scope) => {
          const report = await passingRepairEvidence(root, config);
          if (scope === "full" && mode === "duplicate-capture") {
            const gate = report.gates.find((g) => g.name === "browser")!;
            const captures = gate.captures as unknown[];
            captures.push(captures[0]);
            gate.executed = 2;
          }
          return rehashRepairEvidence(report);
        },
      });
      expect(result.status).toBe("blocked");
      expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
        "a { color: red; }",
      );
    }),
  );
it("does not bypass full acceptance when the initial report says passed", () =>
  fixture(async (root, task) => {
    let calls = 0;
    const result = await runRepairController(
      root,
      config,
      bundle(config, [
        { name: "static", status: "passed", durationMs: 0, findings: [] },
      ]),
      task,
      {
        propose: async () => {
          calls++;
          return { edits: [] };
        },
        validate: async () => {
          calls++;
          return passingRepairEvidence(root, config);
        },
      },
    );
    expect(result.status).toBe("blocked");
    expect(calls).toBe(0);
    expect(result.acceptanceFailure).toContain("Incomplete");
  }));
it("rejects changed artifact bytes and rolls back", () =>
  fixture(async (root, task) => {
    const result = await runRepairController(root, config, initial(), task, {
      propose: async (envelope) => ({
        edits: [
          {
            path: "src/ui.css",
            baseHash: envelope.files[0]!.sha256,
            content: "a {}",
          },
        ],
      }),
      validate: async (scope) => {
        const report = await passingRepairEvidence(root, config);
        if (scope === "full")
          await writeFile(join(root, report.artifacts[0]!.path), "altered");
        return report;
      },
    });
    expect(result.status).toBe("blocked");
    expect(result.acceptanceFailure).toContain("artifact bytes");
    expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
      "a { color: red; }",
    );
  }));
it("rechecks required qualitative review instead of trusting a green callback", () =>
  fixture(async (root, task) => {
    const manifest = JSON.parse(
      await readFile(join(root, ".inteiro/task.json"), "utf8"),
    );
    const receipt = await recordTaskContext(root, config, {
      ...manifest,
      reviewRequired: true,
    });
    if (!receipt.context) throw Error("Missing updated task context");
    const result = await runRepairController(
      root,
      config,
      initial(),
      { ...task, contextBundleId: receipt.context.bundleId },
      {
        propose: async (envelope) => ({
          edits: [
            {
              path: "src/ui.css",
              baseHash: envelope.files[0]!.sha256,
              content: "a {}",
            },
          ],
        }),
        validate: async () => passingRepairEvidence(root, config),
      },
    );
    expect(result.status).toBe("blocked");
    expect(result.acceptanceFailure).toContain("Qualitative review");
    expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
      "a { color: red; }",
    );
  }));
for (const kind of [
  "hidden-index",
  "green-gate",
  "duplicate-global-index",
  "conflicting-copy",
] as const)
  it("rejects contradictory validator findings: " + kind, () => {
    const proof = initial();
    if (kind === "hidden-index") proof.findings = [];
    if (kind === "green-gate") {
      proof.gates[0]!.status = "passed";
      proof.status = "passed";
    }
    if (kind === "duplicate-global-index")
      proof.findings.push(proof.findings[0]!);
    if (kind === "conflicting-copy")
      proof.gates.push({
        name: "other",
        status: "failed",
        durationMs: 0,
        findings: [{ ...proof.findings[0]!, severity: "blocker" }],
      });
    expect(() =>
      parseGateOutput(
        JSON.stringify(rehashRepairEvidence(proof)),
        proof.status === "passed" ? 0 : 6,
      ),
    ).toThrow("findings");
  });
