import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { reviewSourceHash, hash } from "../packages/contracts/src/index.ts";
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw Error("Run through npm run audit:dependencies");
await mkdir("artifacts", { recursive: true });
const report = {
  schemaVersion: "1.0",
  kind: "dependency-security-verification",
  node: process.version,
  platform: process.platform,
  status: "running",
  startedAt: new Date().toISOString(),
  sourceHash: await reviewSourceHash(process.cwd()),
  checks: [],
};
try {
  for (const [name, args] of [
    ["vulnerabilities", ["audit", "--json"]],
    ["sbom", ["sbom", "--sbom-format", "cyclonedx"]],
  ]) {
    const child = spawnSync(process.execPath, [npmCli, ...args], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120000,
      windowsHide: true,
    });
    const path = "artifacts/p0-" + name + ".json";
    const result = JSON.parse(child.stdout || "{}");
    await writeFile(path, child.stdout || "{}");
    report.checks.push({
      name,
      command: "npm " + args.join(" "),
      exitCode: child.status,
      status: child.status === 0 ? "passed" : "failed",
      evidence: { path, sha256: hash(await readFile(path)) },
    });
    if (child.error || child.status !== 0)
      throw Error("Dependency check failed: " + name);
    if (name === "vulnerabilities") {
      if (
        !result.metadata?.vulnerabilities ||
        ["info", "low", "moderate", "high", "critical", "total"].some(
          (key) =>
            !Number.isInteger(result.metadata.vulnerabilities[key]) ||
            result.metadata.vulnerabilities[key] < 0,
        )
      )
        throw Error("Vulnerability counts unavailable");
      report.vulnerabilities = result.metadata.vulnerabilities;
    } else {
      if (
        result.bomFormat !== "CycloneDX" ||
        !Array.isArray(result.components) ||
        !result.components.length
      )
        throw Error("Dependency inventory unavailable");
      report.components = result.components.length;
    }
  }
  report.finishedSourceHash = await reviewSourceHash(process.cwd());
  if (report.finishedSourceHash !== report.sourceHash)
    throw Error("Source changed during security verification");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error);
}
report.finishedAt = new Date().toISOString();
report.finishedSourceHash = await reviewSourceHash(process.cwd());
await writeFile("artifacts/p0-security.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
process.exitCode = report.status === "passed" ? 0 : 1;
