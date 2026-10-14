import { describe, expect, it } from "vitest";
import { callMcpTool, MCP_TOOLS } from "./tools.ts";

describe("MCP tools", () => {
  it("publica o protocolo de revisão visual e recipes de aplicação", () => {
    expect(MCP_TOOLS.some(({ name }) => name === "inteiro_get_visual_review")).toBe(true);
    expect(callMcpTool("inteiro_get_visual_review", {})).toMatchObject({
      scope: { humanReviewRequired: true, screenshotInspection: false },
      viewports: expect.arrayContaining([expect.objectContaining({ width: 320 }), expect.objectContaining({ width: 1280 })])
    });
    expect(MCP_TOOLS.find(({ name }) => name === "inteiro_get_visual_review")?.inputSchema).toMatchObject({
      properties: { routes: { type: "array", maxItems: 100 } }
    });
    expect(callMcpTool("inteiro_get_visual_review", {
      routes: [{ path: "/settings/connections", shell: "app", states: ["initial", "error"] }]
    })).toMatchObject({
      plan: {
        routeCount: 1,
        matrix: [{ path: "/settings/connections", viewports: expect.arrayContaining([expect.objectContaining({ width: 320 })]) }]
      }
    });
    expect(callMcpTool("inteiro_get_component_recipe", { name: "mobile-navigation" })).toMatchObject([
      { id: "mobile-navigation" }
    ]);
  });

  it("mantém auditoria estática compatível e rejeita ferramenta desconhecida", () => {
    expect(callMcpTool("inteiro_audit", { file: "screen.css", source: "button { outline: none; }" })).toMatchObject([
      { kind: "a11y", line: 1 }
    ]);
    expect(callMcpTool("inteiro_audit", { file: "screen.css", source: "h1 { overflow-wrap: anywhere; }" })).toMatchObject([
      { kind: "layout-risk", line: 1 }
    ]);
    expect(() => callMcpTool("missing", {})).toThrow("Ferramenta desconhecida");
    expect(() => callMcpTool("inteiro_get_visual_review", { routes: [] })).toThrow("ao menos uma rota");
  });
});
