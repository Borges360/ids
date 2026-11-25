import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
// @ts-expect-error script .mjs sem tipos
import { themes, previewSvg, specMarkdown } from "../../scripts/generate-pi-theme.mjs";
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
  it("keeps the generated specification in docs/terminal/pi-theme.md", async () => {
    expect(await readFile("docs/terminal/pi-theme.md", "utf8")).toBe(specMarkdown());
  });
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
      it("keeps every text role readable on the canvas (WCAG 4.5:1)", () => {
        const canvas = theme.vars.canvas!;
        const TEXT = [
          "text", "muted", "dim", "accent", "bashMode", "success", "warning", "error", "thinkingText",
          "toolTitle", "toolOutput", "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdQuote",
          "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "customMessageLabel",
          "customMessageText", "userMessageText",
          ...PI_1_6_TOKENS.filter((r) => r.startsWith("syntax")),
        ];
        for (const role of TEXT)
          expect(ratio(color(role), canvas), role).toBeGreaterThanOrEqual(4.5);
      });
      it("keeps text readable on its own box and the focus on the selection background", () => {
        const PAIRS = [
          ["userMessageText", "userMessageBg"], ["customMessageText", "customMessageBg"],
          ["customMessageLabel", "customMessageBg"], ["toolTitle", "toolPendingBg"],
          ["toolOutput", "toolPendingBg"], ["toolOutput", "toolSuccessBg"], ["toolOutput", "toolErrorBg"],
          ["success", "toolSuccessBg"], ["error", "toolErrorBg"], ["accent", "selectedBg"],
          ["text", "selectedBg"], ["searchMatchText", "searchMatchBg"],
        ];
        for (const [fg, bg] of PAIRS)
          expect(ratio(color(fg!), color(bg!)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        // Boxes step away from the canvas; the editor border is a UI component (3:1).
        expect(color("userMessageBg")).not.toBe(theme.vars.canvas);
        expect(color("toolPendingBg")).not.toBe(theme.vars.canvas);
        expect(ratio(color("border"), theme.vars.canvas!)).toBeGreaterThanOrEqual(3);
      });
      it("keeps violet for choosing and orange only for real effects", () => {
        expect(theme.colors.accent).toBe("choose");
        expect(theme.colors.mdLink).toBe("choose");
        expect(theme.colors.mdQuoteBorder).toBe("choose");
        expect(theme.colors.bashMode).toBe("commit");
        const orange = Object.entries(theme.colors)
          .filter(([, v]) => v === "commit" || v === "commitHover")
          .map(([k]) => k);
        expect(orange.sort()).toEqual(["bashMode", "thinkingMax", "thinkingXhigh"]);
      });
      it("paints syntax with the categorical palette or neutrals, never status or orange", () => {
        for (const [role, v] of Object.entries(theme.colors).filter(([r]) => r.startsWith("syntax")))
          expect(v, role).toMatch(/^(cat0[13467]|text|textSecondary|textTertiary)$/);
      });
      it("ships a generated preview of every component", async () => {
        const svg = await readFile(`packages/pi-theme/preview/${theme.name}.svg`, "utf8");
        expect(svg).toBe(previewSvg(theme));
        expect(svg).toContain(`fill="${color("selectedBg")}"`);
      });
    });
  }
});
