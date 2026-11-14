import { it, expect } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  realpath,
} from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { reviewSourceHash } from "@inteiro/contracts";
import { pathToFileURL } from "node:url";

it("cannot finalize missing or invented platform qualifications, even when finalization is requested", async () => {
  const root = process.cwd();
  const { auditAutonomousRelease } = await import(
    pathToFileURL(join(root, "scripts/audit-autonomous-release.mjs")).href
  );
  const matrix = await readFile("docs/P0_AUTONOMOUS_MATRIX.json");
  const ledger = await readFile("release-evidence.json");
  await mkdir("artifacts", { recursive: true });
  const directory = await mkdtemp(join(root, "artifacts/audit-self-test-"));
  try {
    const absent = await auditAutonomousRelease({ finalize: true });
    expect(absent).toMatchObject({ status: "blocked", finalized: false });
    expect(absent.errors.map((error: any) => error.name)).toContain("win32");
    const file = join(directory, "invented.json");
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const sourceHash = await reviewSourceHash(root);
    await writeFile(
      file,
      JSON.stringify({
        status: "passed",
        platform: "win32",
        scope: "full-source",
        sourceHash,
        finishedSourceHash: sourceHash,
        sourceCommit,
        finishedCommit: sourceCommit,
        finishedAt: new Date().toISOString(),
        checks: [],
      }),
    );
    const invented = await auditAutonomousRelease({
      finalize: true,
      windows: file,
    });
    expect(invented).toMatchObject({ status: "blocked", finalized: false });
    expect(invented.errors).toContainEqual(
      expect.objectContaining({
        name: "win32",
        message: expect.stringContaining("Missing platform checks"),
      }),
    );
    expect(await readFile("docs/P0_AUTONOMOUS_MATRIX.json")).toEqual(matrix);
    expect(await readFile("release-evidence.json")).toEqual(ledger);
  } finally {
    const actual = await realpath(directory);
    if (
      dirname(actual) !== (await realpath(join(root, "artifacts"))) ||
      !basename(actual).startsWith("audit-self-test-")
    )
      throw Error("Unsafe test cleanup");
    await rm(actual, { recursive: true, force: true });
  }
}, 30000);
