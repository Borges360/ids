import { describe, expect, it } from "vitest";
import { contrastPairs, failingContrast } from "@inteiro/tokens";

describe("contraste WCAG 2.2", () => {
  it("calcula pares centrais do contrato", () => {
    const pairs = contrastPairs();
    expect(pairs.length).toBeGreaterThan(10);
    const darkPrimary = pairs.find((p) => p.id === "text.primary/canvas" && p.theme === "dark");
    expect(darkPrimary?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(darkPrimary?.ratio).toBeGreaterThan(16);
  });

  it("botões primary e commit atingem AA no texto", () => {
    const pairs = contrastPairs().filter((p) => p.id.startsWith("button."));
    for (const pair of pairs) {
      expect(pair.ratio, `${pair.theme} ${pair.id}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("documenta pares que não atingem o mínimo como fail", () => {
    const fails = failingContrast();
    for (const fail of fails) {
      expect(fail.ratio).toBeLessThan(fail.minimum);
    }
  });
});
