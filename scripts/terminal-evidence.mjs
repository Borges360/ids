import { execFileSync } from "node:child_process";
import { reviewSourceHash } from "../packages/contracts/src/index.ts";

/** A base SHA alone does not identify uncommitted source. Bind the actual bytes. */
export async function terminalSource(root = process.cwd()) {
  return {
    sourceCommit: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    sourceHash: await reviewSourceHash(root),
    workingTree: !!execFileSync("git", ["-C", root, "status", "--porcelain"], {
      encoding: "utf8",
    }).trim(),
  };
}
