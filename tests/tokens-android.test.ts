import { describe, expect, it } from "vitest";
import { allTokens, emitFlutter } from "@inteiro/tokens";
import { emitAndroidColors } from "../packages/tokens/src/export/platforms.ts";

const colors = (xml: string) =>
  [...xml.matchAll(/<color name="([^"]+)">([^<]+)<\/color>/g)].map((m) => ({ name: m[1], value: m[2] }));

describe("exportação Android", () => {
  it("emite um recurso por token de cor, na ordem do catálogo, no formato de recursos Android", () => {
    const xml = emitAndroidColors();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n\n<!--\n  Do not edit directly, this file was auto-generated.\n-->\n<resources>\n')).toBe(true);
    expect(xml.endsWith("\n</resources>")).toBe(true);
    const ids = allTokens().filter((t) => t.type === "color").map((t) => t.id);
    const emitted = colors(xml);
    expect(emitted.map((c) => c.name)).toEqual(ids.map((id) => "inteiro_" + id.replace(/[.-]/g, "_")));
    for (const c of emitted) expect(c.value).toMatch(/^#[0-9a-f]{8}$/);
    expect(emitted.find((c) => c.name === "inteiro_color_neutral_050")?.value).toBe("#fffaf8f4");
    expect(emitted.find((c) => c.name === "inteiro_color_identity_primary_hover")?.value).toBe("#ffc5b4ff");
  });

  it("preserva o alfa de cores translúcidas, coerente com a exportação Flutter", () => {
    const scrim = colors(emitAndroidColors()).find((c) => c.name === "inteiro_color_overlay_scrim")?.value;
    expect(scrim).toBe("#b8040508");
    const flutter = /color_overlay_scrim\(Brightness b\) => b == Brightness\.dark \? Color\(0x([0-9A-F]{8})\)/.exec(emitFlutter())?.[1];
    expect(flutter?.toLowerCase()).toBe(scrim?.slice(1));
  });
});
