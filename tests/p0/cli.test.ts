import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readdir, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DEFAULTS } from "@inteiro/contracts";
const cli = resolve("packages/cli/src/cli.ts");
function invoke(args: string[]) {
  try {
    return {
      code: 0,
      stdout: execFileSync(process.execPath, [cli, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (e) {
    const r = e as { status: number; stdout: string };
    return { code: r.status, stdout: String(r.stdout) };
  }
}
describe("P0 command transport", () => {
  it("emits a single JSON document without banners", () => {
    const r = invoke(["contract", "inspect", "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).designContract.hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("does not fabricate unknown patterns", () => {
    const r = invoke(["compose", "show", "nonexistent", "--json"]);
    expect(r.code).toBe(3);
    expect(JSON.parse(r.stdout).status).toBe("blocked");
  });
  it("keeps dry-run visual execution mutation free", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-dry-"));
    try {
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify(DEFAULTS),
      );
      const before = await readdir(root);
      const r = invoke([
        "visual",
        "test",
        "--cwd",
        root,
        "--dry-run",
        "--json",
      ]);
      expect(r.code).toBe(7);
      expect(JSON.parse(r.stdout).status).toBe("not_run");
      expect(await readdir(root)).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("returns quality exit code and valid SARIF", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-sarif-"));
    try {
      await mkdir(join(root, "src"));
      await writeFile(join(root, "src/bad.css"), ".x{color:#6D5DC7}");
      await writeFile(
        join(root, "inteiro.config.json"),
        JSON.stringify(DEFAULTS),
      );
      const r = invoke(["lint", ".", "--cwd", root, "--format", "sarif"]);
      expect(r.code).toBe(6);
      expect(JSON.parse(r.stdout).runs[0].results[0].ruleId).toBe(
        "IN-TOKEN-001",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not accept self-approval without signed artifact decision", () => {
    const r = invoke([
      "visual",
      "baseline",
      "approve",
      "--review-id",
      "agent-said-yes",
      "--json",
    ]);
    expect(r.code).toBe(7);
    expect(JSON.parse(r.stdout).status).toBe("needs_review");
  });
  it("returns typed infrastructure failure for bad config", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-config-"));
    try {
      await writeFile(join(root, "inteiro.config.json"), "{broken");
      const r = invoke(["contract", "inspect", "--cwd", root, "--json"]);
      expect(r.code).toBe(8);
      expect(JSON.parse(r.stdout).status).toBe("error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
