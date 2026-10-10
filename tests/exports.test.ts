import { describe, expect, it } from "vitest";
import { emitCss, emitJsonResolved, emitTypescript, validateCatalog } from "@inteiro/tokens";

describe("exportações", () => {
  it("CSS contém variáveis semânticas e temas", () => {
    const css = emitCss();
    expect(css).toContain("--in-color-background-canvas");
    expect(css).toContain("[data-in-theme=\"light\"]");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("--in-space-400");
  });

  it("JSON resolvido tem dark e light", () => {
    const json = emitJsonResolved() as { dark: Record<string, string>; light: Record<string, string> };
    expect(json.dark["color.identity.primary"]).toBeTruthy();
    expect(json.light["color.identity.primary"]).toBeTruthy();
    expect(json.dark["color.identity.primary"]).not.toBe(json.light["color.identity.primary"]);
  });

  it("TypeScript gerado exporta tokens", () => {
    const ts = emitTypescript();
    expect(ts).toContain("export const tokens");
    expect(ts).toContain("InteiroAppearance");
  });

  it("validação não reporta ciclo", () => {
    expect(validateCatalog().some((i) => i.code.includes("cycle"))).toBe(false);
  });
});
