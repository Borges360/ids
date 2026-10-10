import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("documentação INTEIRO", () => {
  it("expõe menu, busca, trilha e índice no HTML", () => {
    const html = readFileSync(new URL("../apps/demo/index.html", import.meta.url), "utf8");
    expect(html).toContain('id="sidebar"');
    expect(html).toContain('aria-label="Documentação"');
    expect(html).toContain('id="search-dialog"');
    expect(html).toContain('id="toc"');
    expect(html).toContain('id="crumbs"');
    expect(html).toContain("Saltar para o conteúdo");
    expect(html).toContain('id="theme"');
    expect(html).toContain('id="density"');
  });

  it("mantém menu, páginas e âncoras internas coerentes", async () => {
    const specifier = "../apps/demo/content/index.js";
    const mod = (await import(specifier)) as {
      catalogErrors: () => string[];
      pages: unknown[];
      pageById: Map<string, { sections: { id: string }[] }>;
    };
    expect(mod.catalogErrors()).toEqual([]);
    expect(mod.pages.length).toBeGreaterThan(20);
    for (const id of [
      "introduction/overview",
      "introduction/principles",
      "start/setup",
      "foundations/color",
      "foundations/type",
      "foundations/tokens",
      "foundations/themes",
      "components/catalog",
      "components/button",
      "components/input",
      "components/card",
      "components/badge",
      "patterns/forms",
      "patterns/feedback",
      "practice/identity",
      "a11y/guide",
      "engineering/guide",
      "governance/guide",
      "resources/guide"
    ]) {
      expect(mod.pageById.has(id), id).toBe(true);
    }
    const button = mod.pageById.get("components/button");
    expect(button?.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["playground", "api", "anatomia"])
    );
  });
});
