import { describe, expect, it } from "vitest";
import { allTokens, catalogStats, resolveToken, tokensById, validateCatalog } from "@inteiro/tokens";

describe("catálogo INTEIRO", () => {
  const tokens = allTokens();
  const stats = catalogStats(tokens);

  it("carrega todos os tokens da fonte sem duplicar ids", () => {
    expect(stats.total).toBeGreaterThan(200);
    expect(new Set(tokens.map((t) => t.id)).size).toBe(tokens.length);
  });

  it("não contém ponto em nomes individuais (DTCG)", () => {
    for (const token of tokens) {
      expect(token.path.some((p) => p.includes("."))).toBe(false);
    }
  });

  it("não possui erros de validação", () => {
    const errors = validateCatalog(tokens).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("resolve aliases sem ciclos nos quatro temas", () => {
    const map = tokensById(tokens);
    for (const theme of ["dark", "light", "contrast-dark", "contrast-light"] as const) {
      for (const token of tokens) {
        expect(() => resolveToken(token.id, theme, [], map)).not.toThrow();
      }
    }
  });

  it("expõe os primitivos cromáticos das 7 famílias × 11 tons", () => {
    const families = ["neutral", "violet", "orange", "mint", "red", "amber", "blue"];
    const shades = ["050", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
    for (const f of families) {
      for (const s of shades) {
        expect(mapHas(`color.${f}.${s}`)).toBe(true);
      }
    }
  });

  it("contém semântica obrigatória da fonte", () => {
    for (const id of [
      "color.background.canvas",
      "color.identity.primary",
      "color.identity.commit",
      "color.status.success",
      "border.seam",
      "font.voice.rational",
      "space.400",
      "radius.md",
      "motion.normal"
    ]) {
      expect(mapHas(id)).toBe(true);
    }
  });

  it("marca primitivos de cor como não consumíveis por componente", () => {
    const prim = tokens.find((t) => t.id === "color.violet.400");
    expect(prim?.consumerFacing).toBe(false);
    expect(prim?.layer).toBe("primitive");
  });
});

function mapHas(id: string): boolean {
  return tokensById().has(id);
}
