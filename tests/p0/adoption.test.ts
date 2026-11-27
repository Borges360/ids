import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULTS } from "@inteiro/contracts";
import { lintProject } from "@inteiro/lint";
it("enforces new findings with an explicit expiring diagnostics approval", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-adoption-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/old.css"), ".x{color:#fff}");
    const config = structuredClone(DEFAULTS);
    const original = await lintProject(root, config);
    await writeFile(
      join(root, "legacy.json"),
      JSON.stringify({
        owner: "maintainer",
        approvalRef: "PR#1",
        reason: "Legacy migration window",
        expiresAt: "2099-01-01",
        fingerprints: original.findings.map((f) => f.fingerprint),
      }),
    );
    config.static.adoption = "enforce-new";
    config.static.baseline = "legacy.json";
    expect((await lintProject(root, config)).status).toBe("passed");
    await writeFile(join(root, "src/new.css"), ".new{color:#000}");
    expect((await lintProject(root, config)).status).toBe("failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("refuses enforce-new without a formal diagnostics baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-adoption-"));
  try {
    await mkdir(join(root, "src"));
    const config = structuredClone(DEFAULTS);
    config.static.adoption = "enforce-new";
    await expect(lintProject(root, config)).rejects.toThrow(
      "approved diagnostics baseline",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
