import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as tokens from "@inteiro/tokens";
import * as core from "@inteiro/agent-core";
import * as react from "../../packages/react/src/index.ts";
import * as system from "@inteiro/design-system";
import { MCP_TOOLS } from "../../packages/mcp/src/tools.ts";
interface HistoricalContract {
  declaredVersion: string;
  legacyCommit: string;
  tokens: {
    id: string;
    type: string;
    layer: string;
    cssVar: string;
    values: Record<string, string>;
  }[];
  publicExports: Record<string, string[]>;
  mcpTools: string[];
  providerRenders: Record<string, string>;
}
const historical = JSON.parse(
  readFileSync(
    new URL("../fixtures/inteiro-1.1.0-contract.json", import.meta.url),
    "utf8",
  ),
) as HistoricalContract;
it("preserves every historical token contract and resolved theme value", () => {
  expect(historical.declaredVersion).toBe("1.1.0");
  expect(historical.tokens).toHaveLength(316);
  const current = tokens.tokensById();
  for (const previous of historical.tokens) {
    const next = current.get(previous.id);
    expect(next, previous.id).toBeDefined();
    for (const key of ["type", "layer", "cssVar"] as const)
      expect(next![key], previous.id + ":" + key).toBe(previous[key]);
    for (const [theme, value] of Object.entries(previous.values))
      expect(
        tokens.formatCssValue(
          tokens.resolveToken(previous.id, theme as tokens.Appearance).value,
        ),
        previous.id + ":" + theme,
      ).toBe(value);
  }
});
it("preserves historical runtime exports and MCP tool names", () => {
  const modules: Record<string, object> = {
    tokens,
    "agent-core": core,
    react,
    "design-system": system,
  };
  for (const [name, exports] of Object.entries(historical.publicExports))
    for (const key of exports)
      expect(key in modules[name]!, name + ":" + key).toBe(true);
  for (const name of historical.mcpTools)
    expect(
      MCP_TOOLS.some((tool) => tool.name === name),
      name,
    ).toBe(true);
});
it("preserves provider markup, automatic theme inheritance and consumer overrides", () => {
  for (const [appearance, expected] of Object.entries(
    historical.providerRenders,
  )) {
    const markup = renderToStaticMarkup(
      createElement(react.InteiroProvider, {
        ...(appearance === "default"
          ? {}
          : { appearance: appearance as tokens.Appearance | "auto" }),
        density: "focus",
        overrides: { "--consumer-marker": "legacy" },
        children: createElement(
          "button",
          { className: "in-button in-button--primary" },
          "Escolher",
        ),
      }),
    );
    expect(markup, appearance).toBe(expected);
  }
});
it("reports the installed token package version consistently", () => {
  const pkg = JSON.parse(
    readFileSync(
      new URL("../../packages/tokens/package.json", import.meta.url),
      "utf8",
    ),
  ) as { version: string };
  expect(tokens.VERSION).toBe(pkg.version);
});
