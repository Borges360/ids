import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DEFAULTS } from "@inteiro/contracts";
const cli = resolve("packages/cli/src/cli.ts");
function invoke(root: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    [cli, "lint", "src", "--cwd", root, ...args, "--json"],
    { encoding: "utf8", timeout: 30000 },
  );
  if (result.error) throw result.error;
  return { code: result.status, data: JSON.parse(result.stdout) };
}
async function fixture(
  run: (root: string) => Promise<void>,
  adoption = "enforce-all",
) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-lint-options-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(
      join(root, "inteiro.config.json"),
      JSON.stringify({ ...DEFAULTS, static: { ...DEFAULTS.static, adoption } }),
    );
    await run(root);
  } finally {
    const actual = await realpath(root);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-lint-options-")
    )
      throw Error("Unsafe cleanup");
    await rm(actual, { recursive: true, force: true });
  }
}
it("promotes active warnings in strict mode, including observe adoption", async () => {
  for (const adoption of ["enforce-all", "observe"])
    await fixture(async (root) => {
      await writeFile(
        join(root, "src/page.html"),
        "<main></main><main></main>",
      );
      const normal = invoke(root, []),
        strict = invoke(root, ["--strict"]);
      expect(normal.code).toBe(adoption === "observe" ? 0 : 7);
      expect(strict.code).toBe(6);
      expect(strict.data.gates[0].strict).toBe(true);
      expect(
        strict.data.findings.find(
          (item: { ruleId: string }) => item.ruleId === "IN-STRUCT-002",
        ),
      ).toMatchObject({ severity: "error", status: "failed" });
    }, adoption);
});
it("keeps fix previews read-only and reports remaining lint failures", async () =>
  fixture(async (root) => {
    const original = ".x { color: #6D5DC7; }\r\n";
    await writeFile(join(root, "src/style.css"), original);
    const before = await readdir(root, { recursive: true });
    const preview = invoke(root, ["--fix-dry-run"]);
    expect(preview.code).toBe(6);
    expect(preview.data.gates[0].autofix).toMatchObject({
      applied: false,
      patches: [],
    });
    expect(await readdir(root, { recursive: true })).toEqual(before);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
    expect(invoke(root, ["--fix"]).code).toBe(6);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
  }));
it("treats fix without an applicable safe mapping as an idempotent lint run", async () =>
  fixture(async (root) => {
    const original = ".x { color: var(--in-color-text-primary); }\n";
    await writeFile(join(root, "src/style.css"), original);
    for (let i = 0; i < 2; i++) expect(invoke(root, ["--fix"]).code).toBe(0);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
  }));
it("applies only a previewed exact scoped policy and remains idempotent", async () =>
  fixture(async (root) => {
    const original =
      "/* preserve #6D5DC7 */\r\n.choose { color: #6D5DC7 !important; }\r\n";
    await writeFile(join(root, "src/style.css"), original);
    await writeFile(
      join(root, "mapping.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        mappings: [
          {
            from: "#6D5DC7",
            tokenId: "color.identity.primary",
            files: ["src/style.css"],
            selectors: [".choose"],
            properties: ["color"],
            owner: "synthetic-test-reviewer",
            reason: "Choice action in this fixture",
            approvalRef: "synthetic-test-policy",
          },
        ],
      }),
    );
    const args = ["--mapping", "mapping.json"];
    const before = await readdir(root, { recursive: true });
    const preview = invoke(root, ["--fix-dry-run", ...args]);
    const plan = preview.data.gates[0].autofix;
    expect(plan.patches).toHaveLength(1);
    expect(plan.patches[0].diff).toContain("var(--in-color-identity-primary)");
    expect(await readdir(root, { recursive: true })).toEqual(before);
    expect(invoke(root, ["--fix", ...args]).code).toBe(7);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
    expect(
      invoke(root, ["--fix", ...args, "--plan-hash", "a".repeat(64)]).code,
    ).toBe(8);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
    const dry = invoke(root, [
      "--fix",
      "--dry-run",
      ...args,
      "--plan-hash",
      plan.planHash,
    ]);
    expect(dry.data.gates[0].autofix.applied).toBe(false);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(original);
    const applied = invoke(root, [
      "--fix",
      ...args,
      "--plan-hash",
      plan.planHash,
    ]);
    expect(applied.code).toBe(0);
    expect(applied.data.gates[0].autofix.applied).toBe(true);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe(
      original.replace(
        "color: #6D5DC7",
        "color: var(--in-color-identity-primary)",
      ),
    );
    expect(applied.data.gates[0].autofix.backups).toHaveLength(1);
    const next = invoke(root, ["--fix", ...args, "--plan-hash", plan.planHash]);
    expect(next.code).toBe(0);
    expect(next.data.gates[0].autofix.applied).toBe(false);
  }));
