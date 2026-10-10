import { describe, expect, it } from "vitest";
import { explainToken, getGuidelines, getComponentRecipe, suggestTokens, validateUsage } from "@inteiro/agent-core";

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
  });
});
