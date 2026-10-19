import { it, expect } from "vitest";
import {
  mkdtemp,
  writeFile,
  rm,
  realpath,
  readFile,
  readdir,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { importExperiment } from "@inteiro/evaluation/experiments";
import {
  DEFAULTS,
  bundle,
  writeReport,
  hash,
  finding,
  type GateResult,
} from "@inteiro/contracts";
const valid = () => ({
  schemaVersion: "1.0",
  idsCommit: "a".repeat(40),
  datasetHash: "b".repeat(64),
  configHash: "c".repeat(64),
  environmentHash: "d".repeat(64),
  observations: [
    {
      caseId: "fixture",
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
      outcome: "model_failure" as const,
    },
  ],
});
async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-experiment-input-"));
  try {
    await run(root);
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-experiment-input-")
    )
      throw Error("Unsafe cleanup");
    await rm(target, { recursive: true, force: true });
  }
}
for (const [name, patch] of [
  ["string initialAccepted", { initialAccepted: "false" }],
  ["string accepted", { accepted: "false" }],
  ["negative input tokens", { tokensIn: -1 }],
  ["fractional output tokens", { tokensOut: 1.5 }],
  ["unsafe input tokens", { tokensIn: Number.MAX_SAFE_INTEGER + 1 }],
  ["negative human minutes", { humanMinutes: -1 }],
  ["inconsistent first pass", { initialAccepted: true }],
  ["blank case", { caseId: " " }],
  ["nonstring model", { model: 42 }],
  ["missing tokens", { tokensIn: undefined }],
  ["fractional attempts", { attempts: 1.5 }],
] as const)
  it("rejects " + name, () =>
    fixture(async (root) => {
      const input = valid();
      Object.assign(input.observations[0]!, patch);
      await writeFile(join(root, "input.json"), JSON.stringify(input));
      await expect(
        importExperiment(root, "input.json", "out"),
      ).rejects.toThrow();
    }),
  );
it("rejects malformed commit provenance", () =>
  fixture(async (root) => {
    const input = valid();
    input.idsCommit = "not-a-commit";
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    await expect(importExperiment(root, "input.json", "out")).rejects.toThrow();
  }));
it("imports valid failed observations and keeps costs unknown", () =>
  fixture(async (root) => {
    await writeFile(join(root, "input.json"), JSON.stringify(valid()));
    const output = await importExperiment(root, "input.json", "out");
    expect(output.groups[0]!.acceptanceRate).toBe(0);
    expect(output.groups[0]!.totalCost).toBeNull();
  }));
it("keeps existing benchmark output unchanged during dry-run validation", () =>
  fixture(async (root) => {
    await writeFile(join(root, "input.json"), JSON.stringify(valid()));
    await importExperiment(root, "input.json", "out");
    const paths = await readdir(root, { recursive: true });
    const before = await Promise.all(
      ["results.json", "results.csv", "report.html"].map((path) =>
        readFile(join(root, "out", path), "utf8"),
      ),
    );
    const changed = valid();
    changed.observations[0]!.model = "another synthetic label";
    await writeFile(join(root, "input.json"), JSON.stringify(changed));
    expect(
      await importExperiment(root, "input.json", "out", { dryRun: true }),
    ).toMatchObject({ status: "not_run", dryRun: true });
    expect(await readdir(root, { recursive: true })).toEqual(paths);
    expect(
      await Promise.all(
        ["results.json", "results.csv", "report.html"].map((path) =>
          readFile(join(root, "out", path), "utf8"),
        ),
      ),
    ).toEqual(before);
    await expect(
      importExperiment(root, "input.json", "../escape", { dryRun: true }),
    ).rejects.toThrow();
  }));
async function acceptedFixture(
  root: string,
  mutate?: (gates: GateResult[]) => void,
) {
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  git(["init"]);
  const html = "<main><h1>Synthetic acceptance fixture</h1></main>";
  await writeFile(join(root, "fixture.html"), html);
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=",
    "base64",
  );
  await writeFile(join(root, "capture.png"), pixel);
  git(["add", "fixture.html", "capture.png"]);
  git([
    "-c",
    "core.hooksPath=" + join(root, "disabled-hooks"),
    "-c",
    "user.name=Synthetic fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "Synthetic acceptance fixture",
  ]);
  const env = "e".repeat(64);
  const gate = (
    name: string,
    metadata: Record<string, unknown> = {},
  ): GateResult => ({
    name,
    status: "passed",
    findings: [],
    durationMs: 0,
    ...metadata,
  });
  const gates = [
    gate("context", {
      discoverable: true,
      provenance: [
        { path: "fixture.html", sha256: hash(html), required: true },
      ],
    }),
    gate("task-context", { taskId: "fixture", taskHash: "f".repeat(64) }),
    gate("static", { files: 1, coverage: 1, adoption: "enforce-all" }),
    gate("browser", {
      executed: 1,
      environmentFingerprint: env,
      captures: [
        {
          actual: "capture.png",
          sha256: hash(pixel),
          environmentFingerprint: env,
          fixtureHash: "b".repeat(64),
          route: "/",
          state: "default",
          viewport: "mobile",
          theme: "dark",
          density: "calm",
        },
      ],
    }),
    gate("review"),
  ];
  mutate?.(gates);
  const evidence = bundle(DEFAULTS, gates);
  await writeReport(root, DEFAULTS, evidence);
  const input = {
    ...valid(),
    configHash: hash(DEFAULTS),
    observations: [
      {
        ...valid().observations[0]!,
        accepted: true,
        initialAccepted: true,
        outcome: "accepted",
        evidencePath:
          DEFAULTS.reporting.outDir + "/" + evidence.runId + "/summary.json",
        evidenceHash: evidence.hash,
      },
    ],
  };
  await writeFile(join(root, "input.json"), JSON.stringify(input));
  return input;
}
it("imports a complete synthetic accepted task without implying a real model run", () =>
  fixture(async (root) => {
    await acceptedFixture(root);
    const result = await importExperiment(root, "input.json", "out");
    expect(result.groups[0]!.acceptanceRate).toBe(1);
    expect(result.groups[0]!.firstPassRate).toBe(1);
    expect(result.groups[0]!.totalCost).toBeNull();
  }));
for (const [name, mutate] of [
  [
    "lint-only",
    (g: GateResult[]) =>
      g.splice(
        0,
        g.length,
        g.find((x) => x.name === "static")!,
      ),
  ],
  ["duplicate gate", (g: GateResult[]) => g.push({ ...g[0]! })],
  [
    "no browser execution",
    (g: GateResult[]) => {
      g.find((x) => x.name === "browser")!.executed = 0;
    },
  ],
  [
    "missing captures",
    (g: GateResult[]) => {
      g.find((x) => x.name === "browser")!.captures = [];
    },
  ],
  [
    "partial static coverage",
    (g: GateResult[]) => {
      g.find((x) => x.name === "static")!.coverage = 0.5;
    },
  ],
  [
    "observe-only static enforcement",
    (g: GateResult[]) => {
      g.find((x) => x.name === "static")!.adoption = "observe";
    },
  ],
  [
    "wrong task identity",
    (g: GateResult[]) => {
      g.find((x) => x.name === "task-context")!.taskId = "another-task";
    },
  ],
  [
    "undiscoverable context",
    (g: GateResult[]) => {
      g[0]!.discoverable = false;
    },
  ],
  [
    "hidden failing finding",
    (g: GateResult[]) => {
      g.find((x) => x.name === "static")!.findings.push(
        finding("IN-TEST-001", "Synthetic failure"),
      );
    },
  ],
  [
    "environment mismatch",
    (g: GateResult[]) => {
      g.find((x) => x.name === "browser")!.environmentFingerprint = "a".repeat(
        64,
      );
    },
  ],
  [
    "unregistered capture",
    (g: GateResult[]) => {
      (
        g.find((x) => x.name === "browser")!.captures as Record<
          string,
          unknown
        >[]
      )[0]!.sha256 = "a".repeat(64);
    },
  ],
] as const)
  it("rejects acceptance backed by " + name, () =>
    fixture(async (root) => {
      await acceptedFixture(root, mutate);
      await expect(
        importExperiment(root, "input.json", "out"),
      ).rejects.toThrow();
    }),
  );
it("rejects capture bytes changed after evidence publication", () =>
  fixture(async (root) => {
    await acceptedFixture(root);
    await writeFile(join(root, "capture.png"), "changed");
    await expect(importExperiment(root, "input.json", "out")).rejects.toThrow(
      "artifact hash",
    );
  }));
it("rejects duplicate samples but permits delimiter characters in distinct identities", () =>
  fixture(async (root) => {
    const input = valid();
    input.observations.push({ ...input.observations[0]! });
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    await expect(importExperiment(root, "input.json", "out")).rejects.toThrow(
      "Duplicate",
    );
    input.observations[0]!.model = "a|context";
    input.observations[0]!.caseId = "c";
    input.observations[1]!.model = "a";
    input.observations[1]!.caseId = "context|c";
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    const result = await importExperiment(root, "input.json", "out");
    expect(result.groups).toHaveLength(2);
    const csv = await readFile(join(root, "out/results.csv"), "utf8");
    expect(csv).toContain('"a|context"');
    expect(csv).toContain('"context|c"');
  }));
