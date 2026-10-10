import { allTokens } from "../catalog/index.ts";
import { resolveAll } from "../resolve.ts";
import type { ColorValue } from "../types.ts";

function flutterColor(hex: string, alpha = 1): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0").toUpperCase();
  return `Color(0x${a}${hex.replace("#", "").toUpperCase()})`;
}

export function emitFlutter(): string {
  const dark = resolveAll("dark");
  const light = resolveAll("light");
  const lines = [
    "// INTEIRO tokens — gerado para Flutter/Dart.",
    "// Tokens universais. Widgets precisam de adaptação de plataforma.",
    "import 'package:flutter/material.dart';",
    "",
    "class InteiroColors {",
    "  InteiroColors._();"
  ];
  for (const token of allTokens().filter((t) => t.type === "color" && t.consumerFacing)) {
    const d = dark.get(token.id)?.value as ColorValue;
    const l = light.get(token.id)?.value as ColorValue;
    if (!d?.hex || !l?.hex) continue;
    const name = token.path.join("_");
    lines.push(`  static Color ${name}(Brightness b) => b == Brightness.dark ? ${flutterColor(d.hex, d.alpha ?? 1)} : ${flutterColor(l.hex, l.alpha ?? 1)};`);
  }
  lines.push("}", "", "class InteiroSpace {", "  InteiroSpace._();");
  for (const token of allTokens().filter((t) => t.category === "space")) {
    const v = dark.get(token.id)?.css ?? "0";
    const n = Number.parseFloat(v);
    if (Number.isNaN(n)) continue;
    lines.push(`  static const double ${token.path[1] === "000" ? "zero" : "s" + token.path[1]} = ${n};`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

export function emitSwift(): string {
  const dark = resolveAll("dark");
  const lines = [
    "// INTEIRO tokens — gerado para SwiftUI.",
    "import SwiftUI",
    "",
    "enum InteiroColor {"
  ];
  for (const token of allTokens().filter((t) => t.type === "color" && t.consumerFacing)) {
    const v = dark.get(token.id)?.value as ColorValue;
    if (!v?.hex) continue;
    const [r, g, b] = v.components;
    const name = token.path.join("_");
    lines.push(`  static let ${name} = Color(.sRGB, red: ${r}, green: ${g}, blue: ${b}, opacity: ${v.alpha ?? 1})`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

export function emitTailwind(): string {
  const tokens = allTokens();
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const radius: Record<string, string> = {};
  for (const token of tokens) {
    if (token.type === "color" && token.consumerFacing) {
      colors[token.path.join("-")] = `var(${token.cssVar})`;
    }
    if (token.category === "space") {
      spacing[token.path[1] ?? token.id] = `var(${token.cssVar})`;
    }
    if (token.path[0] === "radius") {
      radius[token.path[1] ?? token.id] = `var(${token.cssVar})`;
    }
  }
  return `/** @type {import('tailwindcss').Config['theme']} */
export const inteiroTailwindTheme = {
  colors: { inteiro: ${JSON.stringify(colors, null, 2)} },
  spacing: ${JSON.stringify(spacing, null, 2)},
  borderRadius: ${JSON.stringify(radius, null, 2)}
};
`;
}

export function emitCssVarsMap(): string {
  return JSON.stringify(
    Object.fromEntries(allTokens().map((t) => [t.id, t.cssVar])),
    null,
    2
  );
}
