import {
  mkdir,
  readFile,
  writeFile,
  lstat,
  unlink,
  realpath,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  reviewSourceHash,
  safePath,
  hash,
} from "../packages/contracts/src/index.ts";

// Local, credential-free reproduction of the working sources. It never changes
// the original checkout's index, refs, files or operational credentials.
export async function prepareSourceSnapshot(root = process.cwd()) {
  root = await realpath(root);
  const sourceHash = await reviewSourceHash(root);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const sourceCommit = git("rev-parse", "HEAD");
  const directory = safePath(root, "artifacts/source-snapshot-" + randomUUID());
  execFileSync(
    "git",
    [
      "clone",
      "--no-local",
      "--no-hardlinks",
      "--no-checkout",
      "--",
      root,
      directory,
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  const snapshotGit = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }).trim();
  snapshotGit(
    "-c",
    "core.autocrlf=false",
    "checkout",
    "--detach",
    sourceCommit,
  );
  const sourcePaths = ["--", ".", ":(exclude)tests/visual/__snapshots__/**"];
  const tracked = git("ls-files", "-z", ...sourcePaths)
    .split("\0")
    .filter(Boolean);
  const untracked = git(
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    ...sourcePaths,
  )
    .split("\0")
    .filter(Boolean);
  const task = JSON.parse(
    await readFile(safePath(root, ".inteiro/task.json"), "utf8"),
  );
  const candidates = [
    ...new Set([...tracked, ...untracked, ...(task.scope?.allowedFiles ?? [])]),
  ];
  const excluded = (path) =>
    /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.mcp\.json|\.ai-memory\.toml|[^/]+\.(?:pem|key|pfx))$/i.test(
      path,
    ) ||
    /^(?:\.git|\.codex|\.cursor|\.pi)\//.test(path) ||
    /^\.inteiro\/(?:reports|contexts|reviews|migration-backups)\//.test(path) ||
    /^\.inteiro\/[^/]+\.(?:installed|integrity)\.json$/.test(path) ||
    path.startsWith("tests/visual/__snapshots__/");
  const files = [];
  for (const path of candidates.filter((path) => !excluded(path)).sort()) {
    const from = safePath(root, path),
      to = safePath(directory, path);
    let bytes;
    try {
      if (!(await lstat(from)).isFile())
        throw Error("Snapshot sources must be regular files: " + path);
      bytes = await readFile(from);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await unlink(to).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
      continue;
    }
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, bytes);
    files.push({ path, sha256: hash(bytes) });
  }
  for (const path of tracked.filter(excluded)) {
    await unlink(safePath(directory, path)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  snapshotGit("add", "--all");
  snapshotGit(
    "-c",
    "user.name=Technical qualification",
    "-c",
    "user.email=qualification@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--allow-empty",
    "-m",
    "Isolated qualification snapshot of " + sourceCommit,
  );
  const snapshotHash = await reviewSourceHash(directory);
  if (
    snapshotHash !== sourceHash ||
    (await reviewSourceHash(root)) !== sourceHash ||
    snapshotGit("status", "--porcelain")
  )
    throw Error(
      "Snapshot is dirty or differs from the source; evidence retained at " +
        directory,
    );
  const result = {
    schemaVersion: "1.0",
    kind: "clean-source-snapshot",
    status: "passed",
    sourceCommit,
    snapshotCommit: snapshotGit("rev-parse", "HEAD"),
    sourceHash,
    snapshotHash,
    directory,
    files,
  };
  await writeFile(
    join(
      dirname(directory),
      "source-snapshot-" + result.snapshotCommit + ".json",
    ),
    JSON.stringify(result, null, 2),
  );
  return result;
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const result = await prepareSourceSnapshot();
    console.log(JSON.stringify({ ...result, files: result.files.length }));
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "error",
        kind: "clean-source-snapshot",
        message: String(error),
      }),
    );
    process.exitCode = 8;
  }
}
