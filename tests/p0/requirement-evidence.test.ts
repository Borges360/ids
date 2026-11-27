import { it, expect } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { hash } from "@inteiro/contracts";
import {
  buildRequirementIndex,
  verifyRequirementIndex,
} from "../../packages/agent-core/src/requirement-evidence.ts";
import {
  MATRIX,
  qualificationFixture,
  requirementFixtureRoot,
} from "../helpers/requirement-fixture.ts";

type Row = Record<string, unknown>;

async function fixture() {
  const root = await requirementFixtureRoot();
  return { root, prepare: qualificationFixture(root) };
}
const row = (id: string, proof?: Row, applicability = "mandatory") => ({
  id,
  applicability,
  ...(proof ? { proof } : {}),
});
const status = (index: { requirements: { id: string; status: string }[] }) =>
  Object.fromEntries(
    index.requirements.map((value) => [value.id, value.status]),
  );

it("binds every requirement to its own executed cases, checks and gates", async () => {
  const { root, prepare } = await fixture();
  try {
    const { inputs, index } = await prepare(
      [
        row("E00", {
          tests: ["tests/p0/a.test.ts", "tests/browser/page.spec.ts"],
          checks: ["ci", "worker-isolation"],
          gates: ["static"],
        }),
        row("DoD-01", {
          tests: ["tests/p0/a.test.ts"],
          checks: ["ci"],
          requirements: ["E00"],
        }),
      ],
      {
        // Passing on one platform suffices while no platform fails the case.
        win32: { "tests/p0/a.test.ts::works": "passed" },
        linux: { "tests/p0/a.test.ts::works": "skipped" },
      },
    );
    expect(index.status, JSON.stringify(index.requirements)).toBe("passed");
    const e00 = index.requirements.find((value) => value.id === "E00")!;
    expect(
      e00.tests.map(({ file, cases, passed }) => [file, cases, passed]),
    ).toEqual([
      ["tests/p0/a.test.ts", 1, 1],
      ["tests/browser/page.spec.ts", 1, 1],
    ]);
    expect(
      e00.checks
        .find((check) => check.name === "worker-isolation")!
        .platforms.map((value) => [value.platform, value.coverage]),
    ).toEqual([
      ["win32", "executed"],
      ["linux", "external"],
    ]);
    const path = "artifacts/run/index.json";
    const bytes = Buffer.from(JSON.stringify(index));
    await writeFile(join(root, path), bytes);
    expect(
      (await verifyRequirementIndex(root, { path, sha256: hash(bytes) }))
        .status,
    ).toBe("passed");
    // A rewritten index, even with a consistent file hash, must re-derive.
    const forged = structuredClone(index);
    forged.requirements[0]!.tests[0]!.passed = 2;
    const forgedBytes = Buffer.from(JSON.stringify(forged));
    await writeFile(join(root, path), forgedBytes);
    await expect(
      verifyRequirementIndex(root, { path, sha256: hash(forgedBytes) }),
    ).rejects.toThrow("does not match");
    // Changing an executed output after the index was built is rejected.
    await writeFile(join(root, path), bytes);
    await writeFile(
      join(root, "artifacts/run/results/win32-vitest.json"),
      "{}",
    );
    await expect(
      verifyRequirementIndex(root, { path, sha256: hash(bytes) }),
    ).rejects.toThrow("structured result changed");
    await expect(buildRequirementIndex(root, inputs)).rejects.toThrow(
      "structured result changed",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

it("refuses missing proof, insufficient scope, failures, exclusions and unproven aggregates", async () => {
  const { root, prepare } = await fixture();
  try {
    const { index } = await prepare(
      [
        row("E01"),
        row("E02", { tests: ["tests/p0/skipped.test.ts"] }),
        row("E03", { tests: ["tests/p0/failed.test.ts"] }),
        row("E04", { tests: ["tests/p0/absent.test.ts"] }),
        row("E05", { checks: ["ci"] }, "excluded"),
        row("E06", { checks: ["stories"] }),
        row("E07", { gates: ["review"] }),
        // The check passed on both platforms, but no case belongs to this row.
        row("E08", { checks: ["ci"], gates: ["static"] }),
        row("DoD-01", { checks: ["ci"], requirements: ["E02"] }),
      ],
      {
        win32: {
          "tests/p0/skipped.test.ts::only skipped": "skipped",
          "tests/p0/failed.test.ts::fails on Linux": "passed",
        },
        linux: {
          "tests/p0/skipped.test.ts::only skipped": "skipped",
          "tests/p0/failed.test.ts::fails on Linux": "failed",
        },
      },
    );
    expect(index.status).toBe("blocked");
    expect(status(index)).toEqual({
      E01: "blocked",
      E02: "blocked",
      E03: "blocked",
      E04: "blocked",
      E05: "blocked",
      E06: "blocked",
      E07: "blocked",
      E08: "blocked",
      "DoD-01": "blocked",
    });
    const errors = Object.fromEntries(
      index.requirements.map((value) => [value.id, value.errors.join("|")]),
    );
    expect(errors.E01).toContain("No executable proof declared");
    expect(errors.E02).toContain("Case was only skipped");
    expect(errors.E03).toContain("Failed case");
    expect(errors.E04).toContain("Test file was not executed");
    expect(errors.E05).toContain("Excluded or unknown applicability");
    expect(errors.E06).toContain("check not executed: stories");
    expect(errors.E07).toContain("Core gate did not pass: review");
    expect(errors.E08).toBe("No executed case bound to the requirement");
    expect(errors["DoD-01"]).toContain("Required requirement is not proven");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

it("requires the externally covered Linux check to have executed on Windows", async () => {
  const { root, prepare } = await fixture();
  try {
    const { index } = await prepare(
      [
        row("E09", {
          tests: ["tests/browser/page.spec.ts"],
          checks: ["worker-isolation", "public-workers"],
        }),
      ],
      {},
      { linuxChecks: ["ci", "public-workers"] },
    );
    expect(index.requirements[0]?.errors).toEqual([
      "win32 check not executed: public-workers",
    ]);
    // Reports must still be current: a source change invalidates all inputs.
    await writeFile(join(root, "changed.txt"), "drift");
    await expect(
      buildRequirementIndex(root, {
        matrix: MATRIX,
        windows: "artifacts/run/win32.json",
        linux: "artifacts/run/linux.json",
        core: "unused",
      }),
    ).rejects.toThrow("not current");
    expect(
      JSON.parse(await readFile(join(root, MATRIX), "utf8")).requirements,
    ).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

it("blocks a row whose declared pattern coverage has no executed case", async () => {
  const { root, prepare } = await fixture();
  try {
    await mkdir(join(root, "packages/composition"), { recursive: true });
    await writeFile(
      join(root, "packages/composition/story-matrix.json"),
      JSON.stringify([{ patternId: "alert", state: "default" }]),
    );
    await writeFile(
      join(root, "packages/composition/coverage-matrix.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        patterns: [
          {
            patternId: "alert",
            states: ["default"],
            dimensions: {
              themes: ["light"],
              densities: ["calm"],
              viewports: [375],
              content: ["default"],
              direction: ["ltr"],
              motion: [],
              zoom: { method: "native-browser-tab-zoom", factors: [] },
              keyboard: { applicable: false, reason: "No controls." },
            },
            stateApplicability: {
              default: {
                applicable: true,
                test: "tests/browser/page.spec.ts",
              },
            },
            negative: {
              type: "induced-document-overflow",
              test: "tests/browser/page.spec.ts",
            },
          },
        ],
      }),
    );
    await mkdir(join(root, "tests/browser"), { recursive: true });
    await writeFile(join(root, "tests/browser/page.spec.ts"), "// fixture");
    const { index } = await prepare(
      [
        row("E02", {
          tests: ["tests/browser/page.spec.ts"],
          coverage: ["packages/composition/coverage-matrix.json"],
        }),
      ],
      {},
    );
    const [e02] = index.requirements;
    expect(e02?.status).toBe("blocked");
    expect(e02?.errors.join("|")).toContain(
      "Declared coverage without an executed passing case",
    );
    expect(e02?.coverage[0]).toMatchObject({ patterns: 1, passed: 0 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);
