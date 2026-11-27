import { readdir, readFile, stat, lstat, realpath, rm } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import { safePath, safeRead, isRunId, type Config } from "./index.ts";

/** Bounded housekeeping of known generated runs. Source trees and versioned references are never targets. */
export async function pruneReports(
  root: string,
  config: Config,
  apply = false,
  now = Date.now(),
) {
  const outDir = config.reporting.outDir
    .replaceAll("\\", "/")
    .replace(/\/$/, "");
  if (
    !/^(?:\.inteiro\/reports|artifacts(?:\/[^.][^/]*)*|reports(?:\/[^.][^/]*)*)$/.test(
      outDir,
    )
  )
    throw Error("Retention requires a dedicated supported report directory");
  const directory = safePath(root, outDir),
    pinned = new Set<string>(),
    seen = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string" && value.startsWith(outDir + "/")) {
      const first = value.slice(outDir.length + 1).split("/")[0];
      if (first && first !== "." && first !== "..") pinned.add(first);
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  collect(config.visual.baselineDir);
  let registryLoaded = false;
  try {
    const entries = JSON.parse(
      await safeRead(root, config.visual.baselineDir + "/registry.json"),
    );
    registryLoaded = true;
    for (const entry of entries) {
      if (!["approved", "superseded"].includes(entry.state)) continue;
      const approval = JSON.parse(
        await safeRead(
          root,
          config.visual.baselineDir + "/" + entry.id + ".approval.json",
        ),
      );
      collect(approval);
      for (const check of approval.checks ?? [])
        for (const evidence of check.evidence ?? []) {
          if (
            typeof evidence.path !== "string" ||
            seen.has(evidence.path) ||
            !evidence.path.startsWith(outDir + "/")
          )
            continue;
          seen.add(evidence.path);
          const path = safePath(root, evidence.path);
          if ((await stat(path)).size > 16 * 1024 * 1024)
            throw Error("Pinned evidence exceeds retention scan budget");
          if (evidence.path.endsWith(".json"))
            collect(JSON.parse((await readFile(path)).toString()));
        }
    }
  } catch (error) {
    if (registryLoaded)
      throw Error("Pinned evidence could not be inspected; retention refused");
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    const decision = JSON.parse(
      await safeRead(root, ".inteiro/reviews/decision.json"),
    );
    if (isRunId(decision.runId)) pinned.add(decision.runId);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return {
        status: "passed" as const,
        kind: "artifact-retention",
        applied: apply,
        candidates: [],
        preserved: [],
        deleted: [],
      };
    throw error;
  }
  if (entries.length > 10000)
    throw Error("Retention inventory exceeds entry budget");
  const candidates: string[] = [],
    preserved: string[] = [],
    deleted: string[] = [];
  const realDirectory = await realpath(directory);
  for (const entry of entries) {
    const known =
      isRunId(entry.name) ||
      /^(?:captures|technical-attestation)-[0-9]+$/.test(entry.name);
    if (!entry.isDirectory() || !known) continue;
    if (pinned.has(entry.name)) {
      preserved.push(outDir + "/" + entry.name);
      continue;
    }
    const path = safePath(root, outDir + "/" + entry.name),
      info = await lstat(path);
    if (info.isSymbolicLink()) throw Error("Retention refuses symlink targets");
    const actual = await realpath(path),
      within = relative(realDirectory, actual);
    if (
      !within ||
      within === ".." ||
      within.startsWith("../") ||
      within.startsWith("..\\") ||
      isAbsolute(within)
    )
      throw Error("Retention target escapes report directory");
    const days = entry.name.startsWith("technical-attestation-")
      ? config.reporting.baselineRetentionDays
      : config.reporting.retentionDays;
    if (now - info.mtimeMs < days * 24 * 60 * 60 * 1000) continue;
    candidates.push(outDir + "/" + entry.name);
    if (apply) {
      await rm(actual, { recursive: true, force: false });
      deleted.push(outDir + "/" + entry.name);
    }
  }
  return {
    status: "passed" as const,
    kind: "artifact-retention",
    applied: apply,
    reportDays: config.reporting.retentionDays,
    baselineMetadataDays: config.reporting.baselineRetentionDays,
    candidates,
    preserved,
    deleted,
  };
}
