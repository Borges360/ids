import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  bundle,
  DEFAULTS,
  hash,
  reviewSourceHash,
  type Config,
} from "@inteiro/contracts";
import { verifyContext, taskContextGate } from "@inteiro/agent-core";

export function initializeRepairGit(root: string) {
  writeFileSync(
    join(root, DEFAULTS.browser.routesFile),
    JSON.stringify({
      schemaVersion: "1.0",
      routes: [
        {
          id: "synthetic",
          path: "/",
          states: [{ id: "default", actions: [] }],
          viewports: ["mobile"],
          modes: ["dark-calm"],
        },
      ],
    }),
  );
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init");
  git("add", "src");
  git(
    "-c",
    "user.name=Synthetic",
    "-c",
    "user.email=synthetic@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Synthetic repair fixture; no agent execution",
  );
}
export async function passingRepairEvidence(root: string, config: Config) {
  const actual = ".inteiro/reports/synthetic-repair.png";
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
    "base64",
  );
  await mkdir(join(root, ".inteiro/reports"), { recursive: true });
  await writeFile(join(root, actual), bytes);
  const task = await taskContextGate(root, config);
  const proof = bundle(config, [
    { name: "contracts", status: "passed", findings: [], durationMs: 0 },
    await verifyContext(root, config),
    task,
    {
      name: "static",
      status: "passed",
      findings: [],
      durationMs: 0,
      adoption: "enforce-all",
      coverage: 1,
      files: 1,
    },
    {
      name: "browser",
      status: "passed",
      findings: [],
      durationMs: 0,
      executed: 1,
      environmentFingerprint: "a".repeat(64),
      captures: [
        {
          route: "/",
          state: "default",
          viewport: "mobile",
          theme: "dark",
          density: "calm",
          environmentFingerprint: "a".repeat(64),
          actual,
          sha256: hash(bytes),
        },
      ],
    },
    {
      name: "review",
      status: "passed",
      findings: [],
      durationMs: 0,
      taskHash: task.taskHash,
    },
  ]);
  proof.sourceHash = await reviewSourceHash(root);
  proof.gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  proof.artifacts = [{ path: actual, sha256: hash(bytes) }];
  return rehashRepairEvidence(proof);
}
export function rehashRepairEvidence<T extends { hash: string }>(proof: T): T {
  const { hash: discarded, ...payload } = proof;
  void discarded;
  return { ...payload, hash: hash(payload) } as T;
}
