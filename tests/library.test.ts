import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as react from "../packages/react/src/index.ts";
import { COMPONENTS } from "../packages/agent-core/src/library.ts";
import { callMcpTool } from "../packages/mcp/src/tools.ts";
import { allTokens } from "../packages/tokens/src/index.ts";
import {
  emitTokensStudio,
  emitFigmaVariables,
} from "../packages/tokens/src/export/design.ts";
describe("Contrato publicado", () => {
  it("todo componente documentado existe na API", () => {
    for (const c of COMPONENTS) {
      expect(react).toHaveProperty(c.name);
      expect(c.example).toContain(c.name);
    }
  });
  it("MCP entrega componentes implementados e rejeita nomes inexistentes", () => {
    expect(
      callMcpTool("inteiro_get_component", { name: "DataTable" }),
    ).toMatchObject({ name: "DataTable", category: "data" });
    expect(() =>
      callMcpTool("inteiro_get_component", { name: "missing" }),
    ).toThrow();
  });
  it("nenhuma variável CSS da biblioteca está órfã", () => {
    const css = readFileSync(
      "packages/design-system/src/components.css",
      "utf8",
    );
    const vars = new Set(allTokens().map((t) => t.cssVar));
    expect(
      [...css.matchAll(/var\((--in-[\w-]+)/g)]
        .map((m) => m[1]!)
        .filter((v) => !vars.has(v)),
    ).toEqual([]);
  });
  it("exporta quatro modos para Figma e Tokens Studio", () => {
    expect(emitFigmaVariables()).toMatchObject({
      modes: ["dark", "light", "contrast-dark", "contrast-light"],
    });
    expect(emitTokensStudio()).toHaveProperty("contrast-light");
    expect(emitTokensStudio()).toHaveProperty("dark.color.text.primary");
  });
});
