import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULTS,
  STATES,
  aggregate,
  hash,
  canonical,
  resolveConfig,
  safePath,
  validateSchema,
  redact,
  bundle,
  reportFormats,
  isRunId,
  writeReport,
} from "@inteiro/contracts";
describe("P0 contracts and fail-closed state machine", () => {
  it("validates run identifiers before report filesystem writes", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-report-id-"));
    try {
      const report = bundle(DEFAULTS, [
        { name: "fixture", status: "passed", findings: [], durationMs: 0 },
      ]);
      expect(isRunId(report.runId)).toBe(true);
      for (const id of [
        "run-../../escape",
        "run-anything",
        "run-20261018-0001",
      ]) {
        expect(isRunId(id)).toBe(false);
        await expect(
          writeReport(root, DEFAULTS, { ...report, runId: id }),
        ).rejects.toThrow("identifier");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
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
  it("canonicalizes Unicode keys without locale-sensitive comparisons", () => {
    const object = { ä: 1, z: 2, A: 3, a: 4, "😀": 5, å: 6 };
    expect(canonical(object)).toBe('{"A":3,"a":4,"z":2,"ä":1,"å":6,"😀":5}');
    expect(hash(object)).toBe(
      hash(Object.fromEntries(Object.entries(object).reverse())),
    );
  });
  it("resolves the documented design contract and rejects unsupported contracts", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-contract-"));
    try {
      const { config } = await resolveConfig(root, {
        design: { contract: "@inteiro/design-system" },
      });
      expect(config.design.contract).toBe("@inteiro/design-system");
      await expect(
        resolveConfig(root, { design: { contract: "unknown-package" } }),
      ).rejects.toThrow("Invalid configuration");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("redacts structured and truncated JSON without leaking multiword or escaped secrets", () => {
    const publicJSON =
      '{\n  "description": "public text",\n  "items": [1, 2]\n}\n';
    expect(redact(publicJSON)).toBe(publicJSON);
    const secret = 'fixture-only value "quoted" with spaces';
    const data = {
      password: secret,
      nested: [
        {
          api_key: secret,
          accessToken: secret,
          refresh_token: secret,
          clientSecret: secret,
          authorization: { bearer: secret },
        },
      ],
      message: "safe text",
      count: 3,
    };
    const clean = JSON.parse(redact(JSON.stringify(data)));
    expect(clean.password).toBe("[REDACTED]");
    expect(Object.values(clean.nested[0])).toEqual(Array(5).fill("[REDACTED]"));
    expect(clean.message).toBe("safe text");
    expect(clean.count).toBe(3);
    expect(
      redact('log: "password": "fixture only secret", unfinished'),
    ).not.toContain("fixture only secret");
    expect(redact("password='fixture only secret' next=public")).toContain(
      "next=public",
    );
    const report = bundle(DEFAULTS, [
      {
        name: "fixture",
        status: "error",
        durationMs: 0,
        findings: [
          {
            id: "fixture",
            fingerprint: "fixture",
            ruleId: "fixture",
            category: "test",
            severity: "error",
            status: "error",
            message: JSON.stringify(data),
            evidenceRefs: [],
          },
        ],
      },
    ]);
    const formats = reportFormats(report);
    for (const output of Object.values(formats)) {
      expect(output).not.toContain("fixture-only");
    }
    expect(formats.json).toContain("REDACTED");
    expect(formats.html).toContain("REDACTED");
    expect(formats.sarif).toContain("REDACTED");
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
          visual: { maxDiffPixelRatio: 0.001 },
          review: { allowExternalProvider: false },
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
