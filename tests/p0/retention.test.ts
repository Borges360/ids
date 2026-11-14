import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, utimes, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULTS, pruneReports } from "@inteiro/contracts";

it("previews retention, preserves referenced evidence and deletes only known expired generated directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-retention-"));
  const expired = "run-00000000-0000-4000-8000-000000000001",
    recent = "run-00000000-0000-4000-8000-000000000002";
  try {
    for (const name of [
      expired,
      recent,
      "captures-123",
      "technical-attestation-123",
      "source-not-a-run",
    ])
      await mkdir(join(root, ".inteiro/reports", name), { recursive: true });
    await mkdir(join(root, DEFAULTS.visual.baselineDir), { recursive: true });
    await writeFile(
      join(root, DEFAULTS.visual.baselineDir, "registry.json"),
      JSON.stringify([{ id: "fixture", state: "approved" }]),
    );
    const evaluation =
      ".inteiro/reports/technical-attestation-123/evaluation.json";
    await writeFile(
      join(root, evaluation),
      JSON.stringify({
        capture: {
          captures: [{ actual: ".inteiro/reports/captures-123/image.png" }],
        },
      }),
    );
    await writeFile(
      join(root, DEFAULTS.visual.baselineDir, "fixture.approval.json"),
      JSON.stringify({ checks: [{ evidence: [{ path: evaluation }] }] }),
    );
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    for (const name of [
      expired,
      "captures-123",
      "technical-attestation-123",
      "source-not-a-run",
    ])
      await utimes(join(root, ".inteiro/reports", name), old, old);
    const preview = await pruneReports(root, DEFAULTS);
    expect(preview.candidates).toEqual([".inteiro/reports/" + expired]);
    expect(preview.deleted).toEqual([]);
    const applied = await pruneReports(root, DEFAULTS, true);
    expect(applied.deleted).toEqual(preview.candidates);
    await expect(
      stat(join(root, ".inteiro/reports", expired)),
    ).rejects.toThrow();
    for (const name of [
      recent,
      "captures-123",
      "technical-attestation-123",
      "source-not-a-run",
    ])
      expect(
        (await stat(join(root, ".inteiro/reports", name))).isDirectory(),
      ).toBe(true);
    const unsafe = structuredClone(DEFAULTS);
    unsafe.reporting.outDir = "src";
    await expect(pruneReports(root, unsafe, true)).rejects.toThrow("dedicated");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
