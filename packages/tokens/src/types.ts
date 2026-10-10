export type TokenStatus = "source" | "derived" | "extension";
export type TokenLayer = "primitive" | "semantic" | "component";
export type TokenType =
  | "color"
  | "dimension"
  | "duration"
  | "cubicBezier"
  | "number"
  | "fontFamily"
  | "fontWeight"
  | "shadow"
  | "border"
  | "strokeStyle"
  | "typography"
  | "transition"
  | "string";

export type Appearance = "dark" | "light" | "contrast-dark" | "contrast-light";
export type Density = "calm" | "focus";

export interface ColorValue {
  colorSpace: "srgb";
  components: [number, number, number];
  alpha?: number;
  hex: string;
}

export interface DimensionValue {
  value: number;
  unit: "px" | "rem" | "em" | "ch" | "%";
}

export interface DurationValue {
  value: number;
  unit: "ms" | "s";
}

export interface ShadowValue {
  color: string | ColorValue;
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread: DimensionValue;
}

export interface TypographyValue {
  fontFamily: string;
  fontSize: DimensionValue;
  fontWeight: number;
  lineHeight: DimensionValue;
  letterSpacing: DimensionValue;
  fontVariationSettings?: string;
}

export type TokenValue =
  | ColorValue
  | DimensionValue
  | DurationValue
  | ShadowValue
  | TypographyValue
  | number
  | string
  | number[];

export interface TokenMeta {
  intent: string;
  usage: string[];
  avoid: string[];
  a11y: string;
  examples: { good: string; bad: string };
  aliases?: string[];
  dependencies?: string[];
  states?: string[];
}

export interface TokenDef {
  id: string;
  path: string[];
  type: TokenType;
  layer: TokenLayer;
  category: string;
  subcategory: string;
  description: string;
  sourceSection: string;
  status: TokenStatus;
  consumerFacing: boolean;
  cssVar: string;
  value?: TokenValue | `{${string}}`;
  themes?: Partial<Record<Appearance, TokenValue | `{${string}}`>>;
  density?: Partial<Record<Density, TokenValue | `{${string}}`>>;
  meta: TokenMeta;
}

export interface CatalogStats {
  total: number;
  byCategory: Record<string, number>;
  byLayer: Record<TokenLayer, number>;
  byStatus: Record<TokenStatus, number>;
}

export const PREFIX = "in";
export const VERSION = "1.0.0";
export const DTCG_SPEC = "2025.10";
