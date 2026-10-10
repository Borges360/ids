import { allTokens } from "../catalog/index.ts";
import { formatCssValue, rawValue, resolveAll, THEMES } from "../resolve.ts";
import type { Appearance, TokenDef } from "../types.ts";
import { isAlias } from "../resolve.ts";

function selector(theme: Appearance): string {
  if (theme === "dark") return ':root:not([data-in-theme]), [data-in-theme="dark"]';
  if (theme === "light") return '[data-in-theme="light"]';
  if (theme === "contrast-dark") return '[data-in-theme="contrast-dark"]';
  return '[data-in-theme="contrast-light"]';
}

function colorScheme(theme: Appearance): "dark" | "light" {
  return theme === "light" || theme === "contrast-light" ? "light" : "dark";
}

function emitBlock(theme: Appearance, tokens: TokenDef[]): string {
  const resolved = resolveAll(theme);
  const lines: string[] = [`${selector(theme)} {`, `  color-scheme: ${colorScheme(theme)};`];
  for (const token of tokens) {
    const entry = resolved.get(token.id);
    if (!entry) continue;
    if (token.type === "typography" && typeof entry.value === "object" && entry.value && "fontSize" in entry.value) {
      lines.push(`  ${token.cssVar}: ${entry.css};`);
      continue;
    }
    lines.push(`  ${token.cssVar}: ${entry.css};`);
  }
  for (const token of tokens) {
    if (!token.density) continue;
    /* density variables emitted separately */
  }
  lines.push("}");
  return lines.join("\n");
}

export function emitDensityCss(): string {
  const tokens = allTokens().filter((t) => t.density);
  const blocks = (["calm", "focus"] as const).map((density) => {
    const lines = [`[data-in-density="${density}"] {`];
    for (const token of tokens) {
      const value = token.density?.[density];
      if (value === undefined) continue;
      lines.push(`  ${token.cssVar}: ${isAlias(value) ? `var(--in-${value.slice(1, -1).replaceAll(".", "-")})` : formatCssValue(value)};`);
    }
    lines.push("}");
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}

export function emitCss(theme?: Appearance): string {
  const tokens = allTokens();
  const header = `/* INTEIRO tokens — gerado. Não editar. Fonte: packages/tokens/src/catalog */\n`;
  if (theme) return header + emitBlock(theme, tokens) + "\n";
  const themeBlocks = THEMES.map((t) => emitBlock(t, tokens)).join("\n\n");
  const reduced = `@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;
  const auto = `@media (prefers-color-scheme: light) {
  :root:not([data-in-theme]) {
    color-scheme: light;
  }
}`;
  return [header, themeBlocks, emitDensityCss(), reduced, auto].join("\n\n") + "\n";
}

export function emitScss(): string {
  const tokens = allTokens();
  const resolved = resolveAll("dark");
  const lines = ["// INTEIRO tokens — gerado. Não editar.", ""];
  for (const token of tokens) {
    const name = token.cssVar.replace(/^--/, "$");
    const entry = resolved.get(token.id);
    if (!entry) continue;
    lines.push(`${name}: ${entry.css};`);
  }
  return lines.join("\n") + "\n";
}

export { rawValue };
