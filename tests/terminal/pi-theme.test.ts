import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
// @ts-expect-error script .mjs sem tipos
import { themes } from "../../scripts/generate-pi-theme.mjs";
import { PI_THEMES, PI_THEMES_VERSION } from "../../packages/terminal/src/pi-themes.ts";
import pkg from "../../packages/pi-theme/package.json" with { type: "json" };

/** Papéis de cor do schema de tema do Pi 1.6 (`theme-tokens.js`), na ordem do schema. */
const PI_1_6_TOKENS = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim",
  "text", "thinkingText", "scrollbarTrack", "scrollbarThumb", "selectedBg", "searchMatchBg",
  "searchMatchText", "userMessageBg", "userMessageText", "customMessageBg", "customMessageText",
  "customMessageLabel", "toolPendingBg", "toolSuccessBg", "toolErrorBg", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote",
  "mdQuoteBorder", "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext",
  "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable", "syntaxString",
  "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation", "thinkingOff",
  "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh",
  "thinkingMax", "bashMode",
];

type Theme = {
  name: string;
  vars: Record<string, string>;
  colors: Record<string, string>;
  export: Record<string, string>;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("INTEIRO Pi themes", () => {
  it("embeds the same themes and version in the adapter that extensions install", () => {
    expect(PI_THEMES).toEqual(themes);
    expect(PI_THEMES_VERSION).toBe(pkg.version);
  });
  for (const theme of themes as Theme[]) {
    describe(theme.name, () => {
      const color = (role: string) => theme.vars[theme.colors[role]!]!;
      it("matches the committed file (regenerate with npm run generate:pi-theme)", async () => {
        const file = JSON.parse(
          await readFile(`packages/pi-theme/themes/${theme.name}.json`, "utf8"),
        );
        expect(file).toEqual(theme);
      });
      it("covers exactly the Pi 1.6 color roles, through IDS variables", () => {
        expect(Object.keys(theme.colors).sort()).toEqual([...PI_1_6_TOKENS].sort());
        for (const ref of [...Object.values(theme.colors), ...Object.values(theme.export)])
          expect(theme.vars[ref], ref).toMatch(/^#[0-9a-f]{6}$/);
      });
      it("keeps text, choice, effect and status readable (WCAG 4.5:1)", () => {
        const canvas = theme.vars.canvas!;
        for (const role of ["text", "muted", "dim", "accent", "bashMode", "success", "warning", "error", "mdLink"])
          expect(ratio(color(role), canvas), role).toBeGreaterThanOrEqual(4.5);
        expect(ratio(color("accent"), color("selectedBg"))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(color("text"), color("selectedBg"))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(color("text"), color("userMessageBg"))).toBeGreaterThanOrEqual(4.5);
      });
      it("keeps violet for choosing and orange only for real effects", () => {
        expect(theme.colors.accent).toBe("choose");
        expect(theme.colors.bashMode).toBe("commit");
        const orange = Object.entries(theme.colors)
          .filter(([, v]) => v === "commit")
          .map(([k]) => k);
        expect(orange.sort()).toEqual(["bashMode", "thinkingMax"]);
      });
    });
  }
});
