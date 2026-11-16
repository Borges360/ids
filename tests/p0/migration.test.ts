import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash } from "@inteiro/contracts";
import { allTokens } from "@inteiro/tokens";
import {
  planMigration,
  applyMigration,
  validateMigrationPolicy,
  type MigrationPolicy,
} from "@inteiro/lint";
const policy: MigrationPolicy = {
  schemaVersion: "1.0",
  mappings: [
    {
      from: "#6D5DC7",
      tokenId: "color.identity.primary",
      files: ["src/legacy.css"],
      selectors: [".choose"],
      properties: ["color"],
      owner: "fixture-reviewer",
      reason: "Choice action in this selector",
      approvalRef: "synthetic-policy",
    },
  ],
};
async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-migrate-"));
  try {
    await mkdir(join(root, "src"));
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
it("previews exact declaration edits and preserves unrelated values and formatting", async () =>
  fixture(async (root) => {
    const original =
      "/* retain #6D5DC7 */\n.choose { color: #6D5DC7 !important; background-color: #6D5DC7; }\n.other { color: #6D5DC7; }\n";
    await writeFile(join(root, "src/legacy.css"), original);
    const plan = await planMigration(root, "src", policy);
    expect(plan.patches).toHaveLength(1);
    expect(plan.patches[0]!.beforeHash).toBe(hash(Buffer.from(original)));
    expect(plan.patches[0]!.diff).toContain(
      "var(--in-color-identity-primary) !important",
    );
    expect(await readFile(join(root, "src/legacy.css"), "utf8")).toBe(original);
    expect(await readdir(root)).toEqual(["src"]);
    const applied = await applyMigration(root, "src", policy, plan.planHash);
    expect(applied.applied).toBe(true);
    expect(applied.status).toBe("needs_review");
    expect(await readFile(join(root, "src/legacy.css"), "utf8")).toBe(
      "/* retain #6D5DC7 */\n.choose { color: var(--in-color-identity-primary) !important; background-color: #6D5DC7; }\n.other { color: #6D5DC7; }\n",
    );
    expect(applied.backups).toHaveLength(1);
    const backup = applied.backups[0]!;
    expect(await readFile(join(root, backup.path), "utf8")).toBe(original);
    expect(hash(await readFile(join(root, backup.path)))).toBe(backup.sha256);
    const next = await planMigration(root, "src", policy);
    expect(next.patches).toEqual([]);
    expect(
      (await applyMigration(root, "src", policy, next.planHash)).applied,
    ).toBe(false);
  }));
it("replaces an explicitly scoped legacy font family without altering comments or modifiers", async () =>
  fixture(async (root) => {
    const original = ".title { font-family: Inter, sans-serif !important; }\n";
    await writeFile(join(root, "src/legacy.css"), original);
    const fonts: MigrationPolicy = {
      schemaVersion: "1.0",
      mappings: [
        {
          ...policy.mappings[0]!,
          from: "Inter, sans-serif",
          tokenId: "font.family.sans",
          selectors: [".title"],
          properties: ["font-family"],
        },
      ],
    };
    const plan = await planMigration(root, "src", fonts);
    expect(plan.status).toBe("passed");
    await applyMigration(root, "src", fonts, plan.planHash);
    expect(await readFile(join(root, "src/legacy.css"), "utf8")).toBe(
      ".title { font-family: var(--in-font-family-sans) !important; }\n",
    );
  }));
it("rejects stale plans before changing source or creating backups", async () =>
  fixture(async (root) => {
    await writeFile(
      join(root, "src/legacy.css"),
      ".choose { color: #6D5DC7; }",
    );
    const plan = await planMigration(root, "src", policy);
    await writeFile(join(root, "src/legacy.css"), ".choose { color: #fff; }");
    await expect(
      applyMigration(root, "src", policy, plan.planHash),
    ).rejects.toThrow("changed");
    expect(await readdir(root)).toEqual(["src"]);
    expect(await readFile(join(root, "src/legacy.css"), "utf8")).toContain(
      "#fff",
    );
  }));
it("does not infer semantic meaning or silently transform framework source", async () =>
  fixture(async (root) => {
    await writeFile(
      join(root, "src/legacy.css"),
      ".choose { color: rgb(10,20,30); }",
    );
    await writeFile(
      join(root, "src/app.tsx"),
      'export const App=()=> <button style={{color:"#6D5DC7"}}>Choice</button>',
    );
    const plan = await planMigration(root, "src");
    expect(plan.status).toBe("needs_review");
    expect(plan.patches).toEqual([]);
    expect(
      plan.diagnostics.some((item) => item.kind === "unsupported-syntax"),
    ).toBe(true);
    expect(plan.diagnostics.some((item) => item.kind === "hardcoded-hex")).toBe(
      true,
    );
  }));
it("rejects missing, incompatible, primitive and ambiguous mappings", async () =>
  fixture(async (root) => {
    const primitive = allTokens().find(
      (token) => token.type === "color" && token.layer === "primitive",
    )!;
    expect(() =>
      validateMigrationPolicy(root, {
        schemaVersion: "1.0",
        mappings: [{ ...policy.mappings[0]!, tokenId: primitive.id }],
      }),
    ).toThrow();
    for (const mapping of [
      { ...policy.mappings[0]!, tokenId: "nonexistent" },
      { ...policy.mappings[0]!, tokenId: "font.family.sans" },
      { ...policy.mappings[0]!, tokenId: "color.primitive.violet.500" },
      { ...policy.mappings[0]!, files: ["../outside.css"] },
      { ...policy.mappings[0]!, selectors: [] },
      { ...policy.mappings[0]!, approvalRef: "" },
    ])
      expect(() =>
        validateMigrationPolicy(root, {
          schemaVersion: "1.0",
          mappings: [mapping],
        }),
      ).toThrow();
    expect(() =>
      validateMigrationPolicy(root, {
        schemaVersion: "1.0",
        mappings: [policy.mappings[0]!, { ...policy.mappings[0]! }],
      }),
    ).toThrow("Ambiguous");
  }));
it("blocks malformed CSS and never edits a partial parse", async () =>
  fixture(async (root) => {
    const original = ".choose { color: #6D5DC7;";
    await writeFile(join(root, "src/legacy.css"), original);
    const plan = await planMigration(root, "src", policy);
    expect(plan.status).toBe("blocked");
    expect(
      (await applyMigration(root, "src", policy, plan.planHash)).applied,
    ).toBe(false);
    expect(await readFile(join(root, "src/legacy.css"), "utf8")).toBe(original);
  }));
it("redacts preview data while keeping original file checksums and local backup bytes", async () =>
  fixture(async (root) => {
    const original =
      "/* person@example.invalid */\n.choose { color: #6D5DC7; }";
    await writeFile(join(root, "src/legacy.css"), original);
    const plan = await planMigration(root, "src", policy);
    expect(plan.patches[0]!.diff).not.toContain("person@example.invalid");
    expect(plan.patches[0]!.diff).toContain("[EMAIL]");
    expect(plan.patches[0]!.beforeHash).toBe(hash(Buffer.from(original)));
  }));
it("preserves CRLF and refuses lossy source decoding", async () =>
  fixture(async (root) => {
    const path = join(root, "src/legacy.css"),
      original = ".choose {\r\n\tcolor: #6D5DC7;\r\n}\r\n";
    await writeFile(path, original);
    let plan = await planMigration(root, "src", policy);
    await applyMigration(root, "src", policy, plan.planHash);
    expect(await readFile(path, "utf8")).toBe(
      ".choose {\r\n\tcolor: var(--in-color-identity-primary);\r\n}\r\n",
    );
    const invalid = Buffer.from([0xff, 0xfe, 0x61]);
    await writeFile(path, invalid);
    plan = await planMigration(root, "src", policy);
    expect(plan.status).toBe("blocked");
    expect(plan.patches).toEqual([]);
    expect((await readFile(path)).equals(invalid)).toBe(true);
  }));
