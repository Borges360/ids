import { allTokens } from "../catalog/index.ts";
import { setPath } from "../dtcg.ts";
import { resolveAll } from "../resolve.ts";

function nestCssVars(): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const token of allTokens()) {
    if (!token.consumerFacing && token.layer === "primitive" && token.category === "color") continue;
    setPath(root, token.path, { __leaf: `var(${token.cssVar})` } as unknown as Record<string, unknown>);
  }
  return stripLeaves(root) as Record<string, unknown>;
}

function stripLeaves(node: Record<string, unknown>): unknown {
  if ("__leaf" in node && Object.keys(node).length === 1) return node.__leaf;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "__leaf") continue;
    out[key] = typeof value === "object" && value !== null ? stripLeaves(value as Record<string, unknown>) : value;
  }
  if ("__leaf" in node) {
    /* mixed group + leaf shouldn't happen */
  }
  return out;
}

export function emitTypescript(): string {
  const nested = nestCssVars();
  const resolvedDark = Object.fromEntries(
    [...resolveAll("dark").entries()].map(([id, v]) => [id, v.css])
  );
  const resolvedLight = Object.fromEntries(
    [...resolveAll("light").entries()].map(([id, v]) => [id, v.css])
  );
  return `/* INTEIRO tokens — gerado. Não editar. */
export const prefix = "in" as const;
export type InteiroAppearance = "dark" | "light" | "contrast-dark" | "contrast-light" | "auto";
export type InteiroDensity = "calm" | "focus";

export const tokens = ${JSON.stringify(nested, null, 2)} as const;

export type InteiroTokens = typeof tokens;

export const resolved = {
  dark: ${JSON.stringify(resolvedDark, null, 2)},
  light: ${JSON.stringify(resolvedLight, null, 2)}
} as const;

export const cssVars = {
${allTokens()
  .map((t) => `  ${JSON.stringify(t.id)}: ${JSON.stringify(t.cssVar)}`)
  .join(",\n")}
} as const;
`;
}

export function emitJsonResolved(): Record<string, unknown> {
  return {
    dark: Object.fromEntries([...resolveAll("dark").entries()].map(([id, v]) => [id, v.css])),
    light: Object.fromEntries([...resolveAll("light").entries()].map(([id, v]) => [id, v.css])),
    "contrast-dark": Object.fromEntries([...resolveAll("contrast-dark").entries()].map(([id, v]) => [id, v.css])),
    "contrast-light": Object.fromEntries([...resolveAll("contrast-light").entries()].map(([id, v]) => [id, v.css]))
  };
}
