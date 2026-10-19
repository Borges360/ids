import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  realpath,
  rm,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import { reviewSourceHash } from "@inteiro/contracts";

async function fixture(
  run: (root: string, git: (...args: string[]) => void) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-source-test-"));
  const git = (...args: string[]) => {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  };
  git("init", "--initial-branch=codex/synthetic-test");
  await writeFile(join(root, "tracked.ts"), "export const value = 1;\n");
  git("add", "tracked.ts");
  try {
    await run(root, git);
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-source-test-")
    )
      throw Error("Unexpected fixture cleanup target");
    await rm(target, { recursive: true, force: true });
  }
}

it("binds new frontend files, mutations and staging without a directory whitelist", async () =>
  fixture(async (root, git) => {
    let previous = await reviewSourceHash(root);
    for (const directory of [
      "src",
      "public",
      "components",
      "lib",
      "app",
      "styles",
      "assets",
      ".storybook",
    ]) {
      await mkdir(join(root, directory));
      const path = join(root, directory, "new.ts");
      await writeFile(path, "export const value = 1;\n");
      const added = await reviewSourceHash(root);
      expect(added, directory).not.toBe(previous);
      await writeFile(path, "export const value = 2;\n");
      const changed = await reviewSourceHash(root);
      expect(changed, directory).not.toBe(added);
      git("add", directory);
      expect(await reviewSourceHash(root), directory).toBe(changed);
      previous = changed;
    }
    await writeFile(join(root, "vite.config.ts"), "export default {};\n");
    expect(await reviewSourceHash(root)).not.toBe(previous);
  }));

it("binds binary public assets as bytes", async () =>
  fixture(async (root) => {
    await mkdir(join(root, "public"));
    await writeFile(join(root, "public/logo.png"), Buffer.from([0, 1, 2, 255]));
    const before = await reviewSourceHash(root);
    await writeFile(join(root, "public/logo.png"), Buffer.from([0, 1, 3, 255]));
    expect(await reviewSourceHash(root)).not.toBe(before);
  }));

it("binds explicitly scoped ignored sources and keeps derived receipt IDs out of the hash", async () =>
  fixture(async (root) => {
    await mkdir(join(root, "src"));
    await mkdir(join(root, ".inteiro"));
    await writeFile(join(root, ".gitignore"), "src/ignored.ts\n");
    await writeFile(join(root, "src/ignored.ts"), "export const value = 1;\n");
    const task = {
      schemaVersion: "1.0",
      scope: { allowedFiles: ["src/ignored.ts"] },
      contextBundleId: "first",
      configHash: "first",
    };
    await writeFile(join(root, ".inteiro/task.json"), JSON.stringify(task));
    const before = await reviewSourceHash(root);
    await writeFile(
      join(root, ".inteiro/task.json"),
      JSON.stringify({
        ...task,
        contextBundleId: "second",
        configHash: "second",
      }),
    );
    expect(await reviewSourceHash(root)).toBe(before);
    await writeFile(join(root, "src/ignored.ts"), "export const value = 2;\n");
    expect(await reviewSourceHash(root)).not.toBe(before);
  }));

it("does not bind operational evidence or untracked local credential files", async () =>
  fixture(async (root) => {
    const before = await reviewSourceHash(root);
    for (const directory of [
      ".inteiro/reports/run-test",
      ".inteiro/contexts",
      ".inteiro/reviews",
      ".inteiro/migration-backups",
      ".codex",
      ".cursor",
      ".pi",
    ]) {
      await mkdir(join(root, directory), { recursive: true });
      await writeFile(join(root, directory, "local.json"), "{}");
    }
    for (const path of [
      ".env.local",
      ".mcp.json",
      ".ai-memory.toml",
      ".inteiro/pi.integrity.json",
      ".inteiro/pi.installed.json",
      "release-evidence.json",
    ])
      await writeFile(join(root, path), "fixture-only");
    expect(await reviewSourceHash(root)).toBe(before);
  }));

it("represents tracked deletion consistently before and after staging", async () =>
  fixture(async (root, git) => {
    const before = await reviewSourceHash(root);
    await unlink(join(root, "tracked.ts"));
    const deleted = await reviewSourceHash(root);
    expect(deleted).not.toBe(before);
    git("add", "-u");
    expect(await reviewSourceHash(root)).toBe(deleted);
  }));
