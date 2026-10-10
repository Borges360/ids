import type { TokenDef, TokenValue } from "./types.ts";
import { DTCG_SPEC, VERSION } from "./types.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function setPath(root: Record<string, unknown>, path: string[], leaf: Record<string, unknown>): void {
  let cursor = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]!;
    const next = cursor[key];
    if (!isPlainObject(next)) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  const last = path[path.length - 1]!;
  cursor[last] = { ...(isPlainObject(cursor[last]) ? cursor[last] : {}), ...leaf };
}

export function toDtcgValue(value: TokenValue | `{${string}}`): unknown {
  return value;
}

export function buildDtcgDocument(tokens: TokenDef[], theme?: string): Record<string, unknown> {
  const root: Record<string, unknown> = {
    $description: theme
      ? `INTEIRO tokens — tema ${theme}`
      : "INTEIRO Identity Design System — fonte DTCG 2025.10"
  };

  for (const token of tokens) {
    const value = theme && token.themes?.[theme as keyof typeof token.themes] !== undefined
      ? token.themes[theme as keyof typeof token.themes]
      : token.value;
    if (value === undefined) continue;
    setPath(root, token.path, {
      $type: token.type,
      $value: toDtcgValue(value),
      $description: token.description,
      ...(token.id === "color.accent"
        ? { $deprecated: "Use {color.identity.commit}. Removal planned for v3." }
        : {}),
      $extensions: {
        "dev.inteiro": {
          id: token.id,
          layer: token.layer,
          status: token.status,
          cssVar: token.cssVar,
          sourceSection: token.sourceSection,
          consumerFacing: token.consumerFacing,
          intent: token.meta.intent,
          spec: DTCG_SPEC,
          version: VERSION
        }
      }
    });
  }
  return root;
}
