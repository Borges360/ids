import type { ColorValue } from "./types.ts";

export function hexToComponents(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "").toUpperCase();
  if (cleaned.length !== 6) {
    throw new Error(`Hex inválido: ${hex}`);
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleaned.slice(4, 6), 16) / 255;
  return [
    Number(r.toFixed(3)),
    Number(g.toFixed(3)),
    Number(b.toFixed(3))
  ];
}

export function colorFromHex(hex: string, alpha = 1): ColorValue {
  const value: ColorValue = {
    colorSpace: "srgb",
    components: hexToComponents(hex),
    hex: hex.toUpperCase()
  };
  if (alpha !== 1) value.alpha = alpha;
  return value;
}

export function parseRgba(input: string): ColorValue {
  const match = input.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/i
  );
  if (!match) throw new Error(`rgba inválido: ${input}`);
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] === undefined ? 1 : Number(match[4]);
  const hex =
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return {
    colorSpace: "srgb",
    components: [Number((r / 255).toFixed(3)), Number((g / 255).toFixed(3)), Number((b / 255).toFixed(3))],
    hex,
    alpha: a
  };
}

export function srgbChannel(c: number): number {
  const v = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return v;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToComponents(hex);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function cssColor(value: ColorValue): string {
  if (value.alpha !== undefined && value.alpha < 1) {
    const [r, g, b] = value.components;
    return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${value.alpha})`;
  }
  return value.hex.toLowerCase();
}
