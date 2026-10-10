import { allTokens, tokensById } from "./catalog/index.ts";
import { cssColor } from "./hex.ts";
import type { Appearance, ColorValue, DimensionValue, DurationValue, ShadowValue, TokenDef, TokenValue, TypographyValue } from "./types.ts";

export const THEMES: Appearance[] = ["dark", "light", "contrast-dark", "contrast-light"];

export function isAlias(value: unknown): value is `{${string}}` {
  return typeof value === "string" && value.startsWith("{") && value.endsWith("}");
}

export function aliasId(value: `{${string}}`): string {
  return value.slice(1, -1);
}

export function rawValue(token: TokenDef, theme: Appearance = "dark"): TokenValue | `{${string}}` {
  if (token.themes && token.themes[theme] !== undefined) return token.themes[theme]!;
  if (token.themes?.dark !== undefined) return token.themes.dark;
  if (token.value !== undefined) return token.value;
  if (token.density?.focus !== undefined) return token.density.focus;
  if (token.density?.calm !== undefined) return token.density.calm;
  throw new Error(`Token sem valor: ${token.id}`);
}

export function resolveToken(
  id: string,
  theme: Appearance = "dark",
  stack: string[] = [],
  map = tokensById()
): { token: TokenDef; value: TokenValue; chain: string[] } {
  if (stack.includes(id)) {
    throw new Error(`Ciclo de alias: ${[...stack, id].join(" → ")}`);
  }
  const token = map.get(id);
  if (!token) throw new Error(`Token inexistente: ${id}`);
  const value = rawValue(token, theme);
  if (isAlias(value)) {
    return resolveToken(aliasId(value), theme, [...stack, id], map);
  }
  return { token, value, chain: [...stack, id] };
}

export function formatCssValue(value: TokenValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `cubic-bezier(${value.join(", ")})`;
  if ("hex" in value && "colorSpace" in value) return cssColor(value as ColorValue);
  if ("unit" in value && "value" in value) {
    const dim = value as DimensionValue | DurationValue;
    if (dim.value === 0) return "0";
    return `${dim.value}${dim.unit}`;
  }
  if ("offsetX" in value) {
    const s = value as ShadowValue;
    const color = typeof s.color === "string" ? s.color : cssColor(s.color);
    return `${formatCssValue(s.offsetX)} ${formatCssValue(s.offsetY)} ${formatCssValue(s.blur)} ${formatCssValue(s.spread)} ${color}`;
  }
  if ("fontFamily" in value) {
    const t = value as TypographyValue;
    return `${t.fontWeight} ${formatCssValue(t.fontSize)}/${formatCssValue(t.lineHeight)} ${t.fontFamily}`;
  }
  return String(value);
}

export function resolveAll(theme: Appearance = "dark"): Map<string, { token: TokenDef; css: string; value: TokenValue }> {
  const map = tokensById();
  const out = new Map<string, { token: TokenDef; css: string; value: TokenValue }>();
  for (const token of allTokens()) {
    const resolved = resolveToken(token.id, theme, [], map);
    out.set(token.id, { token, css: formatCssValue(resolved.value), value: resolved.value });
  }
  return out;
}
