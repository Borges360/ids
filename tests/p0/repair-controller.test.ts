import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bundle,
  DEFAULTS,
  finding,
  hash,
  type GateStatus,
} from "@inteiro/contracts";
import { runRepairController, type RepairConsumer } from "@inteiro/agent-core";
import { parseGateOutput } from "@inteiro/agent-core";
import { createPiValidator } from "../../examples/pi/repair-adapter.ts";

const config = structuredClone(DEFAULTS);
const report = (
  status: GateStatus,
  message = "Bad color",
  prior: GateStatus = "passed",
) =>
  bundle(config, [
    { name: "contracts", status: prior, findings: [], durationMs: 0 },
    {
      name: "static",
      status,
      findings:
        status === "failed"
          ? [finding("IN-TOKEN-001", message, { file: "src/ui.css" })]
          : [],
      durationMs: 0,
    },
  ]);
const task = {
  contextBundleId: "context:" + "a".repeat(64),
  allowedFiles: ["src/ui.css"],
};
it("provides a reference Pi CLI consumer without launching a model", () =>
  expect(typeof createPiValidator).toBe("function"));
it("validates CLI schema, hash, and status/exit agreement", () => {
  const failed = report("failed");
  expect(parseGateOutput(JSON.stringify(failed), 6)).toEqual(failed);
  expect(() => parseGateOutput(JSON.stringify(failed), 0)).toThrow("exit code");
  expect(() =>
    parseGateOutput(JSON.stringify({ ...failed, status: "passed" }), 0),
  ).toThrow("hash");
  expect(() => parseGateOutput("{}", 0)).toThrow("schema");
  expect(() =>
    parseGateOutput("banner\n" + JSON.stringify(failed), 6),
  ).toThrow();
});
async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-repair-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/ui.css"), "a { color: red; }");
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
function consumer(validate: RepairConsumer["validate"]): RepairConsumer {
  return {
    propose: async (envelope) => ({
      edits: [
        {
          path: "src/ui.css",
          baseHash: envelope.files[0]!.sha256,
          content: "a { color: var(--in-color-text-primary); }",
        },
      ],
    }),
    validate,
  };
}

it("validates affected subset then full gate before accepting a bounded patch", async () =>
  fixture(async (root) => {
    const scopes: string[] = [];
    const result = await runRepairController(
      root,
      config,
      report("failed"),
      task,
      consumer(async (scope) => {
        scopes.push(scope);
        return report("passed");
      }),
    );
    expect(result.status).toBe("passed");
    expect(result.attempts).toBe(1);
    expect(scopes).toEqual(["affected", "full"]);
    expect(result.steps.map((s) => s.state)).toEqual([
      "planning",
      "repairable",
      "coding",
      "validating",
      "passed",
    ]);
  }));
it("stops after the same failure signature without proposing a second patch", async () =>
  fixture(async (root) => {
    let proposals = 0;
    const adapter = consumer(async () => report("failed"));
    const propose = adapter.propose;
    adapter.propose = async (e) => {
      proposals++;
      return propose(e);
    };
    const result = await runRepairController(
      root,
      config,
      report("failed"),
      task,
      adapter,
    );
    expect(result.status).toBe("needs_review");
    expect(result.reason).toBe("repeated-failure");
    expect(proposals).toBe(1);
  }));
it("limits two changing failures and records escalation", async () =>
  fixture(async (root) => {
    let calls = 0;
    const adapter = consumer(async () =>
      report("failed", "failure " + ++calls),
    );
    adapter.propose = async (e) => ({
      edits: [
        {
          path: "src/ui.css",
          baseHash: e.files[0]!.sha256,
          content: e.files[0]!.content + "\n/* bounded change */",
        },
      ],
    });
    const result = await runRepairController(
      root,
      config,
      report("failed"),
      task,
      adapter,
    );
    expect(result.attempts).toBe(2);
    expect(result.reason).toBe("attempt-limit");
  }));
for (const path of [
  "inteiro.config.json",
  ".inteiro/baselines/registry.json",
  "src/elsewhere.css",
  "../escape.css",
])
  it("rejects a patch to " + path + " before writing", async () =>
    fixture(async (root) => {
      const adapter = consumer(async () => {
        throw new Error("must not validate");
      });
      adapter.propose = async () => ({
        edits: [{ path, baseHash: hash(Buffer.from("old")), content: "new" }],
      });
      const result = await runRepairController(
        root,
        config,
        report("failed"),
        task,
        adapter,
      );
      expect(["needs_review", "error"]).toContain(result.status);
      expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
        "a { color: red; }",
      );
    }),
  );
it("rolls back when a previously passed check regresses", async () =>
  fixture(async (root) => {
    const result = await runRepairController(
      root,
      config,
      report("failed"),
      task,
      consumer(async (scope) =>
        scope === "affected"
          ? report("passed")
          : report("passed", "", "failed"),
      ),
    );
    expect(result.reason).toBe("previously-passed-check-regressed");
    expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
      "a { color: red; }",
    );
  }));
it("does not invoke the model for infrastructure failure or invalid context", async () =>
  fixture(async (root) => {
    const adapter = consumer(async () => report("passed"));
    adapter.propose = async () => {
      throw new Error("must not propose");
    };
    expect(
      (await runRepairController(root, config, report("error"), task, adapter))
        .status,
    ).toBe("error");
    expect(
      (
        await runRepairController(
          root,
          config,
          report("failed"),
          { ...task, contextBundleId: "forged" },
          adapter,
        )
      ).reason,
    ).toBe("invalid-context-or-report-binding");
  }));
it("rejects oversized and stale patches and rolls back on validation exception", async () =>
  fixture(async (root) => {
    const oversized = consumer(async () => report("passed"));
    oversized.propose = async (e) => ({
      edits: [
        {
          path: "src/ui.css",
          baseHash: e.files[0]!.sha256,
          content: "x\n".repeat(500),
        },
      ],
    });
    expect(
      (
        await runRepairController(
          root,
          config,
          report("failed"),
          task,
          oversized,
        )
      ).reason,
    ).toBe("diff-limit-or-no-change");
    const stale = consumer(async () => report("passed"));
    stale.propose = async () => ({
      edits: [{ path: "src/ui.css", baseHash: "0".repeat(64), content: "new" }],
    });
    expect(
      (await runRepairController(root, config, report("failed"), task, stale))
        .reason,
    ).toBe("stale-patch");
    const failed = await runRepairController(
      root,
      config,
      report("failed"),
      task,
      consumer(async () => {
        throw new Error("validator unavailable");
      }),
    );
    expect(failed.status).toBe("error");
    expect(await readFile(join(root, "src/ui.css"), "utf8")).toBe(
      "a { color: red; }",
    );
  }));
