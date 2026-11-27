import { it, expect } from "vitest";
import { mkdtemp, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { DEFAULTS, hash } from "@inteiro/contracts";

it("uses the declared visual equivalence policy for replay while rejecting real differences, identity changes and tampered bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-replay-policy-"));
  try {
    const { assessBaselineReplay } = await import(
      pathToFileURL(resolve("scripts/attest-baselines.mjs")).href
    );
    const { PNG } = createRequire(import.meta.url)("pngjs");
    const png = (black: number, width = 100) => {
      const image = new PNG({ width, height: 100 });
      image.data.fill(255);
      for (let index = 0; index < black; index++)
        for (let channel = 0; channel < 3; channel++)
          image.data[index * 4 + channel] = 0;
      return PNG.sync.write(image);
    };
    const expected = png(0);
    expect(
      (await assessBaselineReplay(root, DEFAULTS, [], { captures: [] })).passed,
    ).toBe(false);
    await writeFile(join(root, "expected.png"), expected);
    const candidate = {
      key: "fixture",
      image: "expected.png",
      imageSha256: hash(expected),
      fixtureHash: "fixture-hash",
      environmentFingerprint: "same-environment",
    };
    const replay = async (bytes: Buffer, extra = {}) => {
      await writeFile(join(root, "actual.png"), bytes);
      return assessBaselineReplay(root, DEFAULTS, [candidate], {
        captures: [
          { ...candidate, actual: "actual.png", sha256: hash(bytes), ...extra },
        ],
      });
    };
    const equivalent = await replay(png(1));
    expect(equivalent.passed).toBe(true);
    expect(equivalent.comparisons[0]).toMatchObject({
      bytesIdentical: false,
      passed: true,
    });
    expect(equivalent.policy).toEqual({
      maxDiffPixelRatio: DEFAULTS.visual.maxDiffPixelRatio,
      colorThreshold: DEFAULTS.visual.colorThreshold,
    });
    expect((await replay(png(1000))).passed).toBe(false);
    expect((await replay(png(0, 50))).comparisons[0].reason).toBe(
      "dimension-mismatch",
    );
    expect(
      (
        await replay(expected, {
          environmentFingerprint: "another-environment",
        })
      ).passed,
    ).toBe(false);
    expect(
      (await replay(expected, { fixtureHash: "another-fixture" })).passed,
    ).toBe(false);
    expect(
      (await replay(png(1), { sha256: hash(expected) })).errors,
    ).toContainEqual({ key: "fixture", reason: "image-integrity-mismatch" });
  } finally {
    const actual = await realpath(root);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-replay-policy-")
    )
      throw Error("Unsafe replay fixture cleanup");
    await rm(actual, { recursive: true, force: true });
  }
});
