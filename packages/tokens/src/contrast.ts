import { contrastRatio } from "./hex.ts";
import { resolveToken } from "./resolve.ts";
import type { Appearance, ColorValue } from "./types.ts";

export interface ContrastPair {
  id: string;
  theme: "dark" | "light";
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  documented?: number;
  level: "AA" | "fail";
  notes: string;
}

function hexOf(id: string, theme: Appearance): string {
  const resolved = resolveToken(id, theme);
  const value = resolved.value as ColorValue;
  if (!value?.hex) throw new Error(`Sem hex para ${id} (${theme})`);
  return value.hex;
}

export function contrastPairs(): ContrastPair[] {
  const specs: Array<{
    id: string;
    fg: string;
    bg: string;
    min: number;
    darkDoc?: number;
    lightDoc?: number;
    notes: string;
  }> = [
    { id: "text.primary/canvas", fg: "color.text.primary", bg: "color.background.canvas", min: 4.5, darkDoc: 17.21, lightDoc: 16.78, notes: "Texto normal sobre canvas. Gate AA." },
    { id: "text.secondary/canvas", fg: "color.text.secondary", bg: "color.background.canvas", min: 4.5, darkDoc: 9.61, lightDoc: 6.48, notes: "Texto secundário sobre canvas." },
    { id: "identity.primary/canvas", fg: "color.identity.primary", bg: "color.background.canvas", min: 4.5, darkDoc: 7.13, lightDoc: 5.0, notes: "Violeta sobre canvas como texto/ícone." },
    { id: "button.primary", fg: "color.action.primary.foreground", bg: "color.action.primary.background", min: 4.5, darkDoc: 6.89, lightDoc: 5.45, notes: "Botão violet / foreground." },
    { id: "button.commit", fg: "color.action.commit.foreground", bg: "color.action.commit.background", min: 4.5, darkDoc: 8.94, lightDoc: 5.32, notes: "Botão orange / foreground." },
    { id: "text.primary/surface", fg: "color.text.primary", bg: "color.background.surface", min: 4.5, notes: "Texto sobre card." },
    { id: "text.primary/raised", fg: "color.text.primary", bg: "color.background.raised", min: 4.5, notes: "Texto sobre raised." },
    { id: "status.success/canvas", fg: "color.status.success", bg: "color.background.canvas", min: 3, notes: "Status como gráfico; texto usa secondary se < 4.5." },
    { id: "status.warning/canvas", fg: "color.status.warning", bg: "color.background.canvas", min: 3, notes: "Warning gráfico ≥ 3:1; mensagem textual obrigatória." },
    { id: "status.danger/canvas", fg: "color.status.danger", bg: "color.background.canvas", min: 3, notes: "Danger gráfico ≥ 3:1; mensagem textual obrigatória." },
    { id: "status.info/canvas", fg: "color.status.info", bg: "color.background.canvas", min: 3, notes: "Info gráfico ≥ 3:1." },
    { id: "focus.ring/canvas", fg: "color.focus.ring", bg: "color.background.canvas", min: 3, notes: "Aparência de foco, meta ≥ 3:1." },
    { id: "border.interactive/surface", fg: "color.border.interactive", bg: "color.background.surface", min: 3, notes: "Identificação de componente ≥ 3:1." }
  ];

  const pairs: ContrastPair[] = [];
  for (const spec of specs) {
    for (const theme of ["dark", "light"] as const) {
      const foreground = hexOf(spec.fg, theme);
      const background = hexOf(spec.bg, theme);
      const ratio = contrastRatio(foreground, background);
      const documented = theme === "dark" ? spec.darkDoc : spec.lightDoc;
      const pair: ContrastPair = {
        id: spec.id,
        theme,
        foreground,
        background,
        ratio,
        minimum: spec.min,
        level: ratio >= spec.min ? "AA" : "fail",
        notes: spec.notes
      };
      if (documented !== undefined) pair.documented = documented;
      pairs.push(pair);
    }
  }
  return pairs;
}

export function failingContrast(): ContrastPair[] {
  return contrastPairs().filter((p) => p.level === "fail");
}
