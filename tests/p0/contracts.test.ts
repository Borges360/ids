import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULTS,
  STATES,
  aggregate,
  hash,
  resolveConfig,
  safePath,
  validateSchema,
  redact,
  bundle,
  reportFormats,
} from "@inteiro/contracts";
describe("P0 contracts and fail-closed state machine", () => {
  for (const status of STATES)
    it("aggregates " + status + " without inventing success", () => {
      const gate = { name: "test", status, findings: [], durationMs: 0 };
      expect(aggregate([gate])).toBe(status === "waived" ? "blocked" : status);
    });
  it("does not pass empty evidence", () =>
    expect(aggregate([])).toBe("blocked"));
  it("accepts only valid waivers", () => {
    const g = {
      name: "test",
      status: "waived" as const,
      findings: [],
      durationMs: 0,
      waiver: {
        owner: "reviewer",
        approvalRef: "PR#1",
        expiresAt: "2099-01-01",
      },
    };
    expect(aggregate([g])).toBe("passed");
    expect(
      aggregate([{ ...g, waiver: { ...g.waiver, expiresAt: "2000-01-01" } }]),
    ).toBe("blocked");
  });
  it("canonical hash ignores object key order", () => {
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 }));
    expect(hash({ a: 2 })).not.toBe(hash({ a: 1 }));
  });
  it("validates defaults and rejects unknown blocks", () => {
    expect(validateSchema("config", DEFAULTS).valid).toBe(true);
    expect(validateSchema("config", { ...DEFAULTS, unsafe: true }).valid).toBe(
      false,
    );
  });
  it("resolves precedence while enforcing organization security", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-"));
    try {
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          project: { id: "project" },
          visual: { maxDiffPixelRatio: 0.01 },
        }),
      );
      const { config } = await resolveConfig(
        root,
        {
          visual: { maxDiffPixelRatio: 0.5 },
          review: { allowExternalProvider: true },
        },
        {
          visual: { ...DEFAULTS.visual, maxDiffPixelRatio: 0.001 },
          review: { ...DEFAULTS.review, allowExternalProvider: false },
        },
      );
      expect(config.visual.maxDiffPixelRatio).toBe(0.001);
      expect(config.review.allowExternalProvider).toBe(false);
      expect(config.project.id).toBe("project");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("rejects traversal and external symlinks", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-"));
    const other = await mkdtemp(join(tmpdir(), "inteiro-other-"));
    try {
      expect(() => safePath(root, "../secret")).toThrow();
      await symlink(
        other,
        join(root, "link"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() => safePath(root, "link/secret")).toThrow(/Symlink/);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(other, { recursive: true, force: true });
    }
  });
  it("redacts secrets and escapes report markup", () => {
    expect(
      redact("Bearer abc.def secret=super-secret test@example.invalid"),
    ).not.toContain("super-secret");
    const report = bundle(DEFAULTS, [
      { name: "<script>", status: "error", durationMs: 0, findings: [] },
    ]);
    const formats = reportFormats(report);
    expect(formats.html).not.toContain("<script>");
    expect(formats.junit).toContain("<error");
    expect(JSON.parse(formats.sarif).version).toBe("2.1.0");
  });
});
