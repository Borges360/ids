import { it, expect } from "vitest";
import { writeFile, readFile, readdir, unlink, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { DEFAULTS } from "@inteiro/contracts";
import { calibrateReviews, spearman } from "@inteiro/evaluation/calibration";
import { calibrationFixture } from "../helpers/calibration-fixture.ts";
async function fixture(
  run: (
    context: Awaited<ReturnType<typeof calibrationFixture>>,
  ) => Promise<void>,
) {
  const context = await calibrationFixture();
  try {
    await run(context);
  } finally {
    await context.cleanup();
  }
}
it("records insufficient evidence without requiring invented rubric scores", () =>
  fixture(async ({ root, input, save }) => {
    for (const row of input.observations) {
      row.verdict = "insufficient";
      row.axes = null;
      row.rank = null;
    }
    await save();
    const report = await calibrateReviews(root, "input.json", "out");
    expect(report.groups[0]).toMatchObject({
      deferrals: 4,
      severeDeferrals: 2,
      decisionAgreement: 0,
    });
    for (const axis of report.groups[0]!.axes)
      expect(axis).toMatchObject({
        evaluatedCases: 0,
        unscoredCases: 4,
        exactAgreement: null,
        meanAbsoluteError: null,
        rankCorrelation: null,
      });
  }));
it("requires seven scored axes for an accepting or blocking decision", () =>
  fixture(async ({ root, input, save }) => {
    for (const verdict of ["accept", "block"] as const) {
      input.observations[0]!.verdict = verdict;
      input.observations[0]!.axes = null;
      await save();
      await expect(calibrateReviews(root, "input.json", "out")).rejects.toThrow(
        "schema",
      );
    }
  }));
it("measures false blocks, severe misses, abstentions and unknown costs without certification", () =>
  fixture(async ({ root }) => {
    const report = await calibrateReviews(root, "input.json", "out");
    expect(report).toMatchObject({
      status: "passed",
      referencePurpose: "synthetic",
      humanReferencesAvailable: false,
      certified: false,
    });
    const group = report.groups[0]!;
    expect(group).toMatchObject({
      cases: 4,
      decisionAgreement: 0,
      falseBlocks: {
        count: 1,
        denominator: 2,
        rate: 0.5,
        caseIds: ["synthetic-0"],
      },
      severeMisses: {
        count: 1,
        denominator: 2,
        rate: 0.5,
        caseIds: ["synthetic-2"],
      },
      deferrals: 2,
      severeDeferrals: 1,
      ranking: { pairs: 3, correlation: 0.5 },
      cost: {
        knownReviews: 3,
        unknownReviews: 1,
        total: null,
        perReview: null,
      },
      tokensIn: 400,
      tokensOut: 80,
    });
    expect(group.cost.knownSubtotal).toBeCloseTo(0.6);
    expect(group.durationMs).toEqual({ median: 25, p90: 40 });
    expect(group.axes).toHaveLength(7);
    for (const axis of group.axes) {
      expect(axis.exactAgreement).toBe(0.25);
      expect(axis.meanAbsoluteError).toBe(0.75);
      expect(axis.rankCorrelation).toBeCloseTo(0.948683298);
    }
    expect(
      JSON.parse(await readFile(join(root, "out/calibration.json"), "utf8")),
    ).toEqual(report);
  }));
it("handles tied ranks and undefined correlations explicitly", () => {
  expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1);
  expect(spearman([1, 1, 2], [1, 2, 3])).toBeCloseTo(Math.sqrt(3) / 2);
  expect(spearman([1, 1], [1, 2])).toBeNull();
  expect(spearman([], [])).toBeNull();
  expect(() => spearman([1], [])).toThrow();
  expect(() => spearman([1, Infinity], [1, 2])).toThrow();
});
for (const kind of [
  "duplicate observation",
  "missing observation",
  "unknown case",
  "duplicate axis",
  "unseen evidence",
  "wrong captures",
  "negative cost",
  "fractional tokens",
  "rank out of range",
  "extra confidence",
  "different prompt group",
  "wrong config",
  "different snapshot",
  "unsafe token sum",
  "overflowing cost",
] as const)
  it("rejects " + kind, () =>
    fixture(async (context) => {
      const { root, input, save } = context;
      const row = input.observations[0]!;
      if (kind === "duplicate observation")
        input.observations.push(structuredClone(row));
      if (kind === "missing observation") input.observations.pop();
      if (kind === "unknown case") row.caseId = "unseen";
      if (kind === "duplicate axis") row.axes![1]!.axis = row.axes![0]!.axis;
      if (kind === "unseen evidence") row.axes![0]!.evidenceId = "not-seen";
      if (kind === "wrong captures") row.artifactHashes[0] = "a".repeat(64);
      if (kind === "negative cost") row.cost = -1;
      if (kind === "fractional tokens") row.tokensIn = 0.5;
      if (kind === "rank out of range") row.rank = 5;
      if (kind === "extra confidence") Object.assign(row, { confidence: 0.99 });
      if (kind === "different prompt group") row.promptHash = "e".repeat(64);
      if (kind === "wrong config") input.configHash = "e".repeat(64);
      if (kind === "unsafe token sum")
        for (const item of input.observations)
          item.tokensIn = Number.MAX_SAFE_INTEGER;
      if (kind === "overflowing cost")
        for (const item of input.observations) item.cost = 1e308;
      await save();
      if (kind === "different snapshot") {
        input.reference.sha256 = "e".repeat(64);
        await writeFile(join(root, "input.json"), JSON.stringify(input));
      }
      await expect(
        calibrateReviews(root, "input.json", "out"),
      ).rejects.toThrow();
      expect(await readdir(root)).not.toContain("out");
    }),
  );
for (const kind of [
  "tampered signature",
  "expired",
  "future signature",
  "untrusted signer",
  "purpose escalation",
  "missing densities",
  "missing overlays",
  "missing long text",
  "duplicate case",
  "duplicate capture ID",
  "invalid severe verdict",
  "reference duplicate axis",
  "reference unseen evidence",
  "reference rank out of range",
] as const)
  it("rejects reference " + kind, () =>
    fixture(async ({ root, reference, save }) => {
      if (kind === "tampered signature")
        reference.reason = "Changed without approval";
      if (kind === "expired") reference.expiresAt = "2000-01-01T00:00:00Z";
      if (kind === "future signature")
        reference.signedAt = "2099-01-01T00:00:00Z";
      if (kind === "untrusted signer") reference.reviewer = "unknown";
      if (kind === "purpose escalation") reference.purpose = "human-reference";
      if (kind === "missing densities")
        for (const item of reference.cases) item.density = "calm";
      if (kind === "missing overlays")
        for (const item of reference.cases) item.scenarios = ["long-text"];
      if (kind === "missing long text")
        for (const item of reference.cases) item.scenarios = ["overlay"];
      if (kind === "duplicate case")
        reference.cases[1]!.id = reference.cases[0]!.id;
      if (kind === "duplicate capture ID")
        reference.cases[0]!.captures[1]!.id =
          reference.cases[0]!.captures[0]!.id;
      if (kind === "invalid severe verdict") reference.cases[0]!.severe = true;
      if (kind === "reference duplicate axis")
        reference.cases[0]!.axes[0]!.axis = reference.cases[0]!.axes[1]!.axis;
      if (kind === "reference unseen evidence")
        reference.cases[0]!.axes[0]!.evidenceId = "unseen";
      if (kind === "reference rank out of range") reference.cases[0]!.rank = 5;
      await save(kind !== "tampered signature");
      await expect(
        calibrateReviews(root, "input.json", "out"),
      ).rejects.toThrow();
    }),
  );
it("verifies capture bytes and requires a separate trust policy", () =>
  fixture(async ({ root, reference }) => {
    const capture = reference.cases[0]!.captures[0]!;
    const original = await readFile(join(root, capture.path));
    await writeFile(join(root, capture.path), "tampered");
    await expect(calibrateReviews(root, "input.json", "out")).rejects.toThrow(
      "capture bytes",
    );
    await writeFile(join(root, capture.path), original);
    await unlink(join(root, ".inteiro/calibration-reviewers.json"));
    await expect(calibrateReviews(root, "input.json", "out")).rejects.toThrow();
  }));
for (const kind of [
  "locale date",
  "normalized invalid date",
  "nonfinite cost",
  "capture path escape",
] as const)
  it("rejects nonportable or unsafe calibration data: " + kind, () =>
    fixture(async ({ root, reference, save }) => {
      if (kind === "locale date") reference.signedAt = "October 19 2020 12:00";
      if (kind === "normalized invalid date")
        reference.signedAt = "2020-02-30T00:00:00Z";
      if (kind === "capture path escape")
        reference.cases[0]!.captures[0]!.path = "../outside.png";
      await save();
      if (kind === "nonfinite cost") {
        const bytes = await readFile(join(root, "input.json"), "utf8");
        await writeFile(
          join(root, "input.json"),
          bytes.replace('"cost":0.1', '"cost":1e999'),
        );
      }
      await expect(
        calibrateReviews(root, "input.json", "out"),
      ).rejects.toThrow();
    }),
  );
it("keeps dry-run read-only, including existing output bytes", () =>
  fixture(async ({ root }) => {
    await mkdir(join(root, "out"));
    await writeFile(join(root, "out/calibration.json"), "existing");
    const before = await readdir(root);
    expect(
      await calibrateReviews(root, "input.json", "out", { dryRun: true }),
    ).toMatchObject({ status: "not_run", dryRun: true });
    expect(await readFile(join(root, "out/calibration.json"), "utf8")).toBe(
      "existing",
    );
    expect(await readdir(root)).toEqual(before);
    await expect(
      calibrateReviews(root, "input.json", "../outside", { dryRun: true }),
    ).rejects.toThrow();
  }));
it("exports null rates when the reference has no eligible denominator", () =>
  fixture(async ({ root, reference, input, save }) => {
    for (const item of reference.cases) {
      item.verdict = "block";
      item.severe = false;
      item.rank = null;
    }
    for (const item of input.observations) {
      item.tokensIn = null;
      item.rank = null;
    }
    await save();
    const report = await calibrateReviews(root, "input.json", "out");
    expect(report.groups[0]).toMatchObject({
      falseBlocks: { denominator: 0, rate: null },
      severeMisses: { denominator: 0, rate: null },
      ranking: { pairs: 0, correlation: null },
      tokensIn: null,
    });
  }));
it("transports calibration CLI results and refuses incompatible input modes", () =>
  fixture(async ({ root }) => {
    await writeFile(
      join(root, "inteiro.config.json"),
      JSON.stringify(DEFAULTS),
    );
    const cli = resolve("packages/cli/src/cli.ts");
    for (const extra of [["--dry-run"], ["--observations", "unused.json"]]) {
      try {
        execFileSync(
          process.execPath,
          [
            cli,
            "benchmark",
            "run",
            "--calibration",
            "input.json",
            "--cwd",
            root,
            "--json",
            ...extra,
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        );
        throw Error("Expected typed nonzero status");
      } catch (error) {
        const child = error as { status: number; stdout: string };
        expect(child.status).toBe(extra[0] === "--dry-run" ? 7 : 8);
        if (child.status === 7)
          expect(JSON.parse(child.stdout)).toMatchObject({
            status: "not_run",
            humanReferencesAvailable: false,
          });
        else expect(child.stdout).toContain("cannot be combined");
      }
    }
  }));
