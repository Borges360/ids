import { describe, it, expect } from "vitest";
import { access, readFile } from "node:fs/promises";
import {
  patterns,
  validatePattern,
  validateComposition,
} from "@inteiro/composition";
import { validateSchema } from "@inteiro/contracts";
import { renderPattern } from "../../packages/composition/src/render.ts";
import { lintSource } from "@inteiro/lint";
describe("P0 composition catalog", () => {
  for (const p of patterns)
    it(
      "validates manifest, tokens, examples and every state: " + p.id,
      async () => {
        expect(validateSchema("pattern", p).valid).toBe(true);
        expect(validatePattern(p)).toEqual([]);
        for (const example of p.examples)
          await access(
            new URL("../../packages/composition/" + example, import.meta.url),
          );
        for (const state of p.states) {
          const html = renderPattern(p.id, state);
          expect(html).toContain('data-in-state="' + state + '"');
        }
      },
    );
  it("rejects invented components and variants", () => {
    expect(validateComposition({ patternId: "nonexistent" }).status).toBe(
      "blocked",
    );
    expect(
      validateComposition({ patternId: "data-table", variant: "invented" })
        .status,
    ).toBe("failed");
  });
  it("rejects unresolved required states", () =>
    expect(
      validateComposition({ patternId: "data-table", states: ["default"] })
        .status,
    ).toBe("failed"));
  it("has no unknown semantic variables in composition CSS", async () => {
    const css = await readFile(
      new URL(
        "../../packages/composition/src/composition.css",
        import.meta.url,
      ),
      "utf8",
    );
    expect((await lintSource("composition.css", css)).findings).toEqual([]);
  });
});
