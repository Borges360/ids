import { it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { DEFAULTS } from "@inteiro/contracts";
import { cursorActivation } from "../../packages/agent-core/src/cursor-activation.ts";
import {
  verifyContext,
  recordContextIntegrity,
} from "../../packages/agent-core/src/context.ts";
import { installHarness } from "../../packages/cli/src/install-agents.ts";

it.each([
  ["alwaysApply: true\nglobs: []", "automatic"],
  ['alwaysApply: false\nglobs: "src/**/*.{ts,tsx}"', "scoped"],
  ['alwaysApply: false\nglobs: ["src/**/*.ts", "src/**/*.vue"]', "scoped"],
  [
    "alwaysApply: false\nglobs:\n  - 'src/**/*.ts'\n  - 'src/**/*.vue'",
    "scoped",
  ],
  ["alwaysApply: false\nglobs: []", "manual"],
  ['alwaysApply: false\nglobs: ""', "manual"],
  ["alwaysApply: false\nglobs: ''", "manual"],
  ['alwaysApply: false\nglobs: " , "', "manual"],
  ["alwaysApply: false\nglobs:", "manual"],
  [
    "alwaysApply: false\ndescription: INTEIRO components\nglobs: []",
    "agent-requested",
  ],
  ["# only a comment", "manual"],
  ["", "manual"],
  ["alwaysApply: false\n# alwaysApply: true", "manual"],
  ['alwaysApply: "true"', "unresolved"],
  ["alwaysApply: false\nalwaysApply: true", "unresolved"],
  ["globs: [42]", "unresolved"],
  ["globs: {path: src}", "unresolved"],
  ["globs: [\n", "unresolved"],
  ["globs: &shared [src]\ndescription: *shared", "unresolved"],
  ["description: !unknown value", "unresolved"],
])(
  "classifies literal Cursor metadata without treating prose as activation: %s",
  (header, expected) => {
    const rule = `---\n${header}\n---\n# INTEIRO\nCode example: alwaysApply: true\nglobs: src/**\n`;
    expect(cursorActivation(rule).activation).toBe(expected);
  },
);

it("rejects absent or oversized frontmatter without inspecting the Markdown body", () => {
  expect(cursorActivation("# INTEIRO\nalwaysApply: true").activation).toBe(
    "unresolved",
  );
  expect(
    cursorActivation(
      "---\ndescription: " + "x".repeat(17000) + "\n---\nINTEIRO",
    ).activation,
  ).toBe("unresolved");
  expect(
    cursorActivation(
      "\uFEFF---\r\nalwaysApply: false\r\nglobs: []\r\n---\r\nINTEIRO",
    ).activation,
  ).toBe("manual");
});

it("reports empty globs as manual and malformed metadata as blocked in the actual file doctor", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-cursor-mode-"));
  try {
    await installHarness(root, "cursor", { dryRun: false, yes: true });
    const path = join(root, ".cursor/rules/inteiro.mdc");
    const original = await readFile(path, "utf8");
    const config = structuredClone(DEFAULTS);
    config.context.harness = "cursor";
    expect((await verifyContext(root, config)).activation).toBe("scoped");
    await writeFile(
      path,
      original.replace(
        /^---[\s\S]*?---/,
        "---\nalwaysApply: false\nglobs: []\n---",
      ),
    );
    await recordContextIntegrity(root, "cursor");
    const manual = await verifyContext(root, config);
    expect(manual.status).toBe("passed");
    expect(manual.activation).toBe("manual");
    expect(manual.loaded).toBe("unobserved");
    await writeFile(
      path,
      original.replace(
        /^---[\s\S]*?---/,
        "---\nalwaysApply: false\nglobs: [\n---",
      ),
    );
    await recordContextIntegrity(root, "cursor");
    const invalid = await verifyContext(root, config);
    expect(invalid.status).toBe("blocked");
    expect(invalid.activation).toBe("unresolved");
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-cursor-mode-")
    )
      throw Error("Unsafe cleanup");
    await rm(target, { recursive: true, force: true });
  }
});
