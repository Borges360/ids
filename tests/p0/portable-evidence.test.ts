import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  DEFAULTS,
  bundle,
  writeReport,
  hash,
  readEvidence,
  exportEvidenceArchive,
  extractEvidenceArchive,
  verifyExtractedEvidence,
  reviewSourceHash,
} from "@inteiro/contracts";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "inteiro-portable-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  await writeFile(join(root, ".gitignore"), ".inteiro/reports/\nartifacts/\n");
  await mkdir(join(root, "captures"));
  await writeFile(
    join(root, "captures/example-actual.png"),
    "synthetic-image-for-transport",
  );
  const report = bundle(DEFAULTS, [
    {
      name: "browser",
      status: "passed",
      durationMs: 1,
      findings: [],
      captures: [{ actual: "captures/example-actual.png" }],
    },
  ]);
  await writeReport(root, DEFAULTS, report);
  return {
    root,
    report,
    summary: ".inteiro/reports/" + report.runId + "/summary.json",
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
it("round-trips self-contained evidence to another directory and verifies hashes after extraction", async () => {
  const f = await fixture();
  try {
    expect(f.report.artifacts[0]).toMatchObject({
      path: "captures/example-actual.png",
      relativePath: "captures/example-actual.png",
      mediaType: "image/png",
      privacyClass: "internal",
    });
    const result = await exportEvidenceArchive(
      f.root,
      f.summary,
      "artifacts/evidence.json",
    );
    expect(result.files).toBeGreaterThan(2);
    expect(
      (
        await extractEvidenceArchive(
          f.root,
          "artifacts/evidence.json",
          "artifacts/extracted",
        )
      ).status,
    ).toBe("passed");
    const extracted = await readEvidence(
      join(f.root, "artifacts/extracted"),
      "summary.json",
    );
    expect(extracted.hash).toBe(f.report.hash);
    await expect(
      extractEvidenceArchive(
        f.root,
        "artifacts/evidence.json",
        "artifacts/extracted",
      ),
    ).rejects.toThrow();
    await expect(
      exportEvidenceArchive(f.root, f.summary, "artifacts/evidence.json"),
    ).rejects.toThrow();
    await writeFile(
      join(f.root, "artifacts/extracted/captures/example-actual.png"),
      "tampered",
    );
    await expect(
      verifyExtractedEvidence(join(f.root, "artifacts/extracted")),
    ).rejects.toThrow("bytes changed");
  } finally {
    await f.cleanup();
  }
});
it("rejects malicious archive paths, case collisions and transport tampering before extraction creates output", async () => {
  const f = await fixture();
  try {
    await exportEvidenceArchive(f.root, f.summary, "artifacts/evidence.json");
    const original = JSON.parse(
      await readFile(join(f.root, "artifacts/evidence.json"), "utf8"),
    );
    for (const [i, path] of [
      "../outside.png",
      "/outside.png",
      "C:/outside.png",
      "a\\..\\outside",
      "NUL.txt",
      "manifest.json",
    ].entries()) {
      const archive = structuredClone(original);
      archive.files[1].path = path;
      const { hash: _, ...payload } = archive;
      archive.hash = hash(payload);
      await writeFile(
        join(f.root, "artifacts/malicious.json"),
        JSON.stringify(archive),
      );
      await expect(
        extractEvidenceArchive(
          f.root,
          "artifacts/malicious.json",
          "artifacts/rejected-" + i,
        ),
      ).rejects.toThrow();
      await expect(
        stat(join(f.root, "artifacts/rejected-" + i)),
      ).rejects.toThrow();
    }
    const duplicated = structuredClone(original);
    duplicated.files.push({
      ...duplicated.files[1],
      path: duplicated.files[1].path.toUpperCase(),
    });
    const { hash: _, ...payload } = duplicated;
    duplicated.hash = hash(payload);
    await writeFile(
      join(f.root, "artifacts/malicious.json"),
      JSON.stringify(duplicated),
    );
    await expect(
      extractEvidenceArchive(
        f.root,
        "artifacts/malicious.json",
        "artifacts/rejected-case",
      ),
    ).rejects.toThrow("duplicate");
    original.files[1].data = Buffer.from("tampered").toString("base64");
    await writeFile(
      join(f.root, "artifacts/malicious.json"),
      JSON.stringify(original),
    );
    await expect(
      extractEvidenceArchive(
        f.root,
        "artifacts/malicious.json",
        "artifacts/rejected-bytes",
      ),
    ).rejects.toThrow();
  } finally {
    await f.cleanup();
  }
});
it("reports missing mandatory captures and source drift instead of silently dropping evidence", async () => {
  const f = await fixture();
  try {
    const missing = bundle(DEFAULTS, [
      {
        name: "browser",
        status: "passed",
        durationMs: 0,
        findings: [],
        captures: [{ actual: "captures/missing-actual.png" }],
      },
    ]);
    await writeReport(f.root, DEFAULTS, missing);
    expect(missing.status).toBe("blocked");
    expect(missing.exitCode).toBe(7);
    expect(missing.findings).toContainEqual(
      expect.objectContaining({ ruleId: "REP-ARTIFACT-001" }),
    );
    const drift = bundle(DEFAULTS, [
      { name: "static", status: "passed", durationMs: 0, findings: [] },
    ]);
    drift.sourceHash = await reviewSourceHash(f.root);
    await writeFile(join(f.root, "source.txt"), "new-code-after-gate-start");
    await writeReport(f.root, DEFAULTS, drift);
    expect(drift.status).toBe("error");
    expect(drift.exitCode).toBe(8);
    expect(drift.findings).toContainEqual(
      expect.objectContaining({ ruleId: "REP-SOURCE-001" }),
    );
  } finally {
    await f.cleanup();
  }
});
