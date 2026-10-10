import type { CatalogStats, TokenDef, TokenLayer, TokenStatus } from "../types.ts";
import { buttonTokens, cardTokens, deprecatedTokens, inputTokens } from "./components.ts";
import { breakpointTokens, densityTokens, layoutTokens, spaceTokens } from "./layout.ts";
import { borderTokens, elevationTokens, iconTokens, motionTokens, opacityTokens, radiusTokens, zIndexTokens } from "./motion.ts";
import { primitiveColors } from "./primitives.ts";
import { semanticColors } from "./semantic.ts";
import { editorialVoiceTokens, fontTokens, typeStyleTokens, voiceTokens, weightTokens } from "./typography.ts";

export function allTokens(): TokenDef[] {
  const tokens = [
    ...primitiveColors(),
    ...semanticColors(),
    ...spaceTokens(),
    ...layoutTokens(),
    ...breakpointTokens(),
    ...densityTokens(),
    ...fontTokens(),
    ...weightTokens(),
    ...voiceTokens(),
    ...typeStyleTokens(),
    ...editorialVoiceTokens(),
    ...radiusTokens(),
    ...borderTokens(),
    ...elevationTokens(),
    ...opacityTokens(),
    ...zIndexTokens(),
    ...motionTokens(),
    ...iconTokens(),
    ...buttonTokens(),
    ...inputTokens(),
    ...cardTokens(),
    ...deprecatedTokens()
  ];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (seen.has(t.id)) {
      throw new Error(`Token duplicado: ${t.id}`);
    }
    seen.add(t.id);
  }
  return tokens;
}

export function catalogStats(tokens: TokenDef[] = allTokens()): CatalogStats {
  const byCategory: Record<string, number> = {};
  const byLayer: Record<TokenLayer, number> = { primitive: 0, semantic: 0, component: 0 };
  const byStatus: Record<TokenStatus, number> = { source: 0, derived: 0, extension: 0 };
  for (const t of tokens) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    byLayer[t.layer] += 1;
    byStatus[t.status] += 1;
  }
  return { total: tokens.length, byCategory, byLayer, byStatus };
}

export function tokensById(tokens: TokenDef[] = allTokens()): Map<string, TokenDef> {
  return new Map(tokens.map((t) => [t.id, t]));
}
