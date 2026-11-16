import type {
  CatalogStats,
  TokenDef,
  TokenLayer,
  TokenStatus,
} from "../types.ts";
import catalog from "../../source/catalog.json" with { type: "json" };

export function allTokens(): TokenDef[] {
  const tokens = structuredClone(catalog) as TokenDef[];
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
  const byLayer: Record<TokenLayer, number> = {
    primitive: 0,
    semantic: 0,
    component: 0,
  };
  const byStatus: Record<TokenStatus, number> = {
    source: 0,
    derived: 0,
    extension: 0,
  };
  for (const t of tokens) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    byLayer[t.layer] += 1;
    byStatus[t.status] += 1;
  }
  return { total: tokens.length, byCategory, byLayer, byStatus };
}

export function tokensById(
  tokens: TokenDef[] = allTokens(),
): Map<string, TokenDef> {
  return new Map(tokens.map((t) => [t.id, t]));
}
