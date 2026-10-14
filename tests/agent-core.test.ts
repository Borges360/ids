import { describe, expect, it } from "vitest";
import { explainToken, getGuidelines, getComponentRecipe, getToken, getVisualReviewGuidance, suggestTokens, validateUsage } from "@inteiro/agent-core";

describe("agent-core", () => {
  it("explica identity.commit", () => {
    const exp = explainToken("color.identity.commit");
    expect(exp.intent.toLowerCase()).toContain("real");
    expect(exp.cssVar).toBe("--in-color-identity-commit");
  });

  it("sugere commit para deploy", () => {
    const ids = suggestTokens("fazer deploy para produção").map((t) => t.id);
    expect(ids.some((id) => id.includes("commit"))).toBe(true);
  });

  it("rejeita microcopy e outline:none", () => {
    const a = validateUsage({ code: "Oops! Algo deu errado 😅" });
    const b = validateUsage({ code: "button { outline: none }" });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it("expõe guidelines e recipes", () => {
    expect(getGuidelines().length).toBeGreaterThan(8);
    expect(getComponentRecipe("button-commit")[0]?.id).toBe("button-commit");
    expect(getComponentRecipe("app-shell")[0]?.steps).toContain("Preserve o mesmo shell entre dashboard, formulário, perfil e administração.");
    expect(getComponentRecipe("stepper")[0]?.tokens).toContain("touch.target.min");
  });

  it("documenta revisão visual por captura sem confundir com auditoria estática", () => {
    const guide = getVisualReviewGuidance();
    expect(guide.scope.humanReviewRequired).toBe(true);
    expect(guide.viewports.map(({ width }) => width)).toContain(320);
    expect(guide.checklist.some(({ id }) => id === "alignment")).toBe(true);
    expect(guide.coverage.some((item) => item.includes("Não combine todas"))).toBe(true);
  });

  it("mantém cada token citado por recipes resolvível no catálogo", () => {
    for (const recipe of getComponentRecipe()) {
      for (const token of recipe.tokens) {
        expect(() => getToken(token), `${recipe.id}: ${token}`).not.toThrow();
      }
    }
  });
});
