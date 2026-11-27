import { it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULTS, hash, type Config } from "@inteiro/contracts";
import { installHarness } from "../../packages/cli/src/install-agents.ts";
import {
  verifyContext,
  recordContextIntegrity,
} from "../../packages/agent-core/src/context.ts";
async function fixture(run: (root: string, config: Config) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-integrity-"));
  try {
    await installHarness(root, "pi", { dryRun: false, yes: true });
    const config = structuredClone(DEFAULTS);
    config.context.harness = "pi";
    await run(root, config);
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-integrity-")
    )
      throw Error("Unsafe cleanup");
    await rm(target, { recursive: true, force: true });
  }
}
it("emits raw SHA-256 provenance and can verify then upgrade legacy receipts", async () =>
  fixture(async (root, config) => {
    const paths = ["AGENTS.md", ".pi/skills/inteiro/SKILL.md"];
    const legacy = Object.fromEntries(
      await Promise.all(
        paths.map(async (path) => [
          path,
          hash(await readFile(join(root, path), "utf8")),
        ]),
      ),
    );
    await writeFile(
      join(root, ".inteiro/pi.integrity.json"),
      JSON.stringify(legacy),
    );
    const result = await verifyContext(root, config);
    expect(result.status).toBe("passed");
    const provenance = result.provenance as {
      path: string;
      sha256: string;
      integrityFormat: string;
    }[];
    for (const entry of provenance) {
      expect(entry.sha256).toBe(
        createHash("sha256")
          .update(await readFile(join(root, entry.path)))
          .digest("hex"),
      );
      expect(entry.integrityFormat).toBe("legacy-canonical-json");
    }
    await recordContextIntegrity(root, "pi");
    const upgraded = await verifyContext(root, config);
    expect(upgraded.status).toBe("passed");
    expect(
      (upgraded.provenance as { integrityFormat: string }[]).every(
        (entry) => entry.integrityFormat === "raw-bytes",
      ),
    ).toBe(true);
  }));
it("requires integrity coverage for each required file and rejects malformed metadata", async () =>
  fixture(async (root, config) => {
    const path = join(root, ".inteiro/pi.integrity.json");
    const original = await readFile(path, "utf8");
    const partial = JSON.parse(original);
    delete partial[".pi/skills/inteiro/SKILL.md"];
    await writeFile(path, JSON.stringify(partial));
    expect((await verifyContext(root, config)).status).toBe("blocked");
    for (const value of ["null", "[]", '{"AGENTS.md":true}', "not JSON"]) {
      await writeFile(path, value);
      expect((await verifyContext(root, config)).status).toBe("blocked");
    }
    await writeFile(path, original);
    await writeFile(join(root, ".inteiro/pi.installed.json"), "null");
    expect((await verifyContext(root, config)).status).toBe("blocked");
  }));
it("blocks lossy UTF-8 even if its current raw receipt matches", async () =>
  fixture(async (root, config) => {
    await writeFile(
      join(root, "AGENTS.md"),
      Buffer.concat([Buffer.from("# INTEIRO\n"), Buffer.from([255])]),
    );
    await recordContextIntegrity(root, "pi");
    const result = await verifyContext(root, config);
    expect(result.status).toBe("blocked");
    expect(result.findings.some((f) => f.message.includes("UTF-8"))).toBe(true);
  }));
