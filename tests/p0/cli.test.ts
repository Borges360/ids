import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  readdir,
  rm,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  it("preserves existing integration styles and custom instructions with init --yes", async () => {
    const root = await mkdtemp(join(tmpdir(), "inteiro-legacy-init-"));
    try {
      const css =
        "/* consumer 1.1.0 customization */\n.legacy { color: var(--in-color-text-primary); }\n";
      const instructions =
        "# Consumer instructions\nKeep the business rules.\n";
      const configuration = JSON.stringify({
        ...DEFAULTS,
        project: { ...DEFAULTS.project, id: "legacy-consumer" },
      });
      await writeFile(join(root, "inteiro.css"), css);
      await writeFile(join(root, "AGENTS.md"), instructions);
      await writeFile(join(root, "inteiro.config.json"), configuration);
      expect(invoke(["init", "--cwd", root, "--yes", "--json"]).code).toBe(0);
      expect(await readFile(join(root, "inteiro.css"), "utf8")).toBe(css);
      expect(await readFile(join(root, "inteiro.config.json"), "utf8")).toBe(
        configuration,
      );
      const after = await readFile(join(root, "AGENTS.md"), "utf8");
      expect(after).toContain(instructions.trim());
      expect(after.match(/<!-- inteiro:start -->/g)).toHaveLength(1);
      expect(invoke(["init", "--cwd", root, "--yes", "--json"]).code).toBe(0);
      expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe(after);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not execute when imported by a similarly named consumer script", () => {
    const script =
      "process.argv[1]='consumer-cli.js';await import(" +
      JSON.stringify(pathToFileURL(cli).href) +
      ");console.log('imported');";
    const result = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("imported");
  });
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
