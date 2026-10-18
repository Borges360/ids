import { describe, it, expect } from "vitest";
import { lintSource } from "@inteiro/lint";
describe("P0 parser-backed static guard", () => {
  const cases: [string, string, string][] = [
    ["IN-TOKEN-001", "bad.css", ".x { color: #6D5DC7; }"],
    [
      "IN-TOKEN-002",
      "bad.css",
      ".x { color: var(--in-ref-color-neutral-050); }",
    ],
    ["IN-TOKEN-003", "bad.css", ".x { color: var(--in-nonexistent); }"],
    ["IN-COMP-001", "bad.tsx", "export function AppShell(){return <main/>}"],
    ["IN-COMP-002", "bad.html", '<div class="in-fabricated"></div>'],
    ["IN-COMP-003", "bad.ts", 'import x from "forbidden-ui";'],
    ["IN-STRUCT-001", "bad.css", ".x { margin: var(--in-space-large); }"],
    ["IN-STRUCT-002", "bad.html", "<main></main><main></main>"],
    [
      "IN-ACTION-001",
      "bad.html",
      '<form><button data-variant="primary">One</button><button data-variant="primary">Two</button></form>',
    ],
    [
      "IN-ACTION-002",
      "bad.html",
      '<button data-variant="commit">Continue</button>',
    ],
    ["IN-A11Y-001", "bad.html", '<div onclick="doSomething()">Click</div>'],
    ["IN-A11Y-002", "bad.tsx", "export const form = <input/>"],
    [
      "IN-STATE-001",
      "bad.html",
      '<div data-in-pattern="data-table" data-in-states="default"></div>',
    ],
    ["IN-EXC-001", "bad.css", "/* inteiro-disable */ .x {}"],
  ];
  for (const [ruleId, file, source] of cases)
    it("detects " + ruleId + " at a source location", async () => {
      const r = await lintSource(file, source, {
        forbiddenImports: ["forbidden-ui"],
        forbiddenTokens: ["--in-space-large"],
      });
      const f = r.findings.find((f) => f.ruleId === ruleId);
      expect(f, JSON.stringify(r)).toBeDefined();
      expect(f!.range!.startLine).toBe(1);
      expect(["failed", "needs_review"]).toContain(r.status);
    });
  const valid: [string, string][] = [
    [
      "good.css",
      ".x {color:var(--in-color-text-primary); background:transparent}",
    ],
    ["good.html", '<label for="name">Nome</label><input id="name">'],
    ["good.tsx", "export const form=<label>Nome<input/></label>"],
    [
      "good.vue",
      '<template><label for="name">Nome</label><input id="name" /></template><script setup lang="ts">const name:string=""</script>',
    ],
    ["good.svelte", '<label for="name">Nome</label><input id="name" />'],
  ];
  for (const [file, source] of valid)
    it("accepts " + file, async () =>
      expect((await lintSource(file, source)).status).toBe("passed"),
    );
  it("does not lint colors inside ordinary strings", async () =>
    expect(
      (await lintSource("text.ts", 'const documentation="#6D5DC7";')).status,
    ).toBe("passed"));
  it("marks syntax errors as infrastructure error", async () =>
    expect((await lintSource("broken.tsx", "const x = <")).status).toBe(
      "error",
    ));
  it("does not pass unsupported syntax", async () =>
    expect((await lintSource("unsupported.scss", "$color: red")).status).toBe(
      "blocked",
    ));
  it("rejects expired exceptions", async () => {
    const r = await lintSource("bad.css", ".x{color:#fff}", {
      exceptions: [
        {
          ruleId: "IN-TOKEN-001",
          reason: "test",
          owner: "maintainer",
          scope: "bad.css",
          createdAt: "2000-01-01",
          expiresAt: "2001-01-01",
          approvalRef: "PR#1",
        },
      ],
    });
    expect(r.findings.some((f) => f.ruleId === "IN-EXC-001")).toBe(true);
  });
  it("keeps valid scoped exceptions auditable", async () => {
    const r = await lintSource("bad.css", ".x{color:#fff}", {
      exceptions: [
        {
          ruleId: "IN-TOKEN-001",
          reason: "external palette",
          owner: "maintainer",
          scope: "bad.css",
          createdAt: "2026-01-01",
          expiresAt: "2099-01-01",
          approvalRef: "PR#1",
        },
      ],
    });
    expect(r.status).toBe("passed");
    expect(r.suppressed).toHaveLength(1);
  });
});
