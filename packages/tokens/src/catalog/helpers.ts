import type { TokenDef, TokenMeta, TokenType, TokenLayer, TokenStatus } from "../types.ts";
import { PREFIX } from "../types.ts";

export function cssVarFor(path: string[], layer: TokenLayer): string {
  if (layer === "primitive" && path[0] === "color") {
    return `--${PREFIX}-ref-${path.join("-")}`;
  }
  return `--${PREFIX}-${path.join("-")}`;
}

export function token(input: {
  path: string[];
  type: TokenType;
  layer: TokenLayer;
  category: string;
  subcategory: string;
  description: string;
  sourceSection: string;
  status?: TokenStatus;
  consumerFacing?: boolean;
  value?: TokenDef["value"];
  themes?: TokenDef["themes"];
  density?: TokenDef["density"];
  meta: TokenMeta;
}): TokenDef {
  const id = input.path.join(".");
  const def: TokenDef = {
    id,
    path: input.path,
    type: input.type,
    layer: input.layer,
    category: input.category,
    subcategory: input.subcategory,
    description: input.description,
    sourceSection: input.sourceSection,
    status: input.status ?? "source",
    consumerFacing: input.consumerFacing ?? input.layer !== "primitive",
    cssVar: cssVarFor(input.path, input.layer),
    meta: input.meta
  };
  if (input.value !== undefined) def.value = input.value;
  if (input.themes !== undefined) def.themes = input.themes;
  if (input.density !== undefined) def.density = input.density;
  return def;
}

export function dim(value: number, unit: "px" | "rem" | "em" | "ch" | "%" = "px") {
  return { value, unit };
}

export function dur(value: number, unit: "ms" | "s" = "ms") {
  return { value, unit };
}
