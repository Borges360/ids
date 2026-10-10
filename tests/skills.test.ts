import { describe, expect, it } from "vitest";
import { allTokens } from "@inteiro/tokens";
import { skillIndex, skillNameFor, tokenSkill, topLevelSkills } from "../packages/cli/src/skills-gen.ts";

describe("skills", () => {
  it("gera uma skill endereçável por token canônico", () => {
    const tokens = allTokens();
    const names = new Set(tokens.map(skillNameFor));
    expect(names.size).toBe(tokens.length);
    expect(skillIndex().length).toBe(tokens.length);
  });

  it("frontmatter das skills de token contém name e description", () => {
    const skill = tokenSkill(allTokens()[0]!);
    expect(skill.name.length).toBeGreaterThan(0);
    expect(skill.name.length).toBeLessThanOrEqual(64);
    expect(skill.description.length).toBeGreaterThan(0);
    expect(skill.body).toContain("Quando usar");
  });

  it("possui skills de nível superior", () => {
    const names = topLevelSkills().map((s) => s.name);
    for (const required of [
      "inteiro",
      "inteiro-interface",
      "inteiro-audit",
      "inteiro-migrate",
      "inteiro-choose-token",
      "inteiro-identity",
      "inteiro-a11y",
      "inteiro-voice",
      "inteiro-components",
      "inteiro-validate"
    ]) {
      expect(names).toContain(required);
    }
  });
});
