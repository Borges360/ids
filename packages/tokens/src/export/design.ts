import { allTokens } from "../catalog/index.ts";
import { formatCssValue, resolveAll, THEMES } from "../resolve.ts";

/** Formato legado do Tokens Studio: um set independente por tema. */
export function emitTokensStudio(): Record<string, unknown> {
  const sets: Record<string, unknown> = {};
  for (const theme of THEMES) {
    const resolved = resolveAll(theme);
    const root: Record<string, unknown> = {};
    for (const token of allTokens()) {
      const entry = resolved.get(token.id);
      if (!entry) continue;
      const parts = token.id.split(".");
      let cursor = root;
      for (const part of parts.slice(0, -1)) {
        cursor[part] ??= {};
        cursor = cursor[part] as Record<string, unknown>;
      }
      let value: unknown = token.type === "number" ? entry.value : entry.css;
      if (
        typeof entry.value === "object" &&
        entry.value &&
        "fontSize" in entry.value
      ) {
        const text = entry.value;
        value = {
          fontFamily: text.fontFamily,
          fontWeight: String(text.fontWeight),
          fontSize: formatCssValue(text.fontSize),
          lineHeight: formatCssValue(text.lineHeight),
          letterSpacing: formatCssValue(text.letterSpacing),
        };
      }
      if (
        typeof entry.value === "object" &&
        entry.value &&
        "offsetX" in entry.value
      ) {
        const shadow = entry.value;
        value = {
          x: formatCssValue(shadow.offsetX),
          y: formatCssValue(shadow.offsetY),
          blur: formatCssValue(shadow.blur),
          spread: formatCssValue(shadow.spread),
          color: formatCssValue(shadow.color),
          type: "dropShadow",
        };
      }
      cursor[parts.at(-1)!] = {
        value,
        type:
          (
            {
              dimension: "dimension",
              fontFamily: "fontFamilies",
              fontWeight: "fontWeights",
              duration: "duration",
              cubicBezier: "cubicBezier",
              shadow: "boxShadow",
            } as Record<string, string>
          )[token.type] ?? token.type,
        description: token.description,
      };
    }
    sets[theme] = root;
  }
  return {
    ...sets,
    $themes: THEMES.map((theme) => ({
      id: theme,
      name: theme,
      selectedTokenSets: { [theme]: "enabled" },
    })),
    $metadata: { tokenSetOrder: THEMES },
  };
}

/** Importador Figma independente de conta; tipos suportados pela Variables API. */
export function emitFigmaVariables(): Record<string, unknown> {
  return {
    collection: "INTEIRO",
    modes: THEMES,
    variables: allTokens()
      .filter((t) => {
        if (
          ![
            "color",
            "dimension",
            "number",
            "fontFamily",
            "fontWeight",
            "string",
          ].includes(t.type)
        )
          return false;
        if (t.type !== "dimension") return true;
        const value = resolveAllCached("dark").get(t.id)?.value;
        return (
          typeof value === "object" &&
          value &&
          "unit" in value &&
          ["px", "rem"].includes(value.unit)
        );
      })
      .map((t) => ({
        name: t.id.replaceAll(".", "/"),
        description: t.description,
        resolvedType:
          t.type === "color"
            ? "COLOR"
            : ["dimension", "number", "fontWeight"].includes(t.type)
              ? "FLOAT"
              : "STRING",
        valuesByMode: Object.fromEntries(
          THEMES.map((theme) => {
            const entry = resolveAllCached(theme).get(t.id)!;
            const v = entry.value;
            return [
              theme,
              typeof v === "object" && v && "colorSpace" in v
                ? {
                    r: v.components[0],
                    g: v.components[1],
                    b: v.components[2],
                    a: v.alpha ?? 1,
                  }
                : typeof v === "object" && v && "unit" in v
                  ? v.value * (v.unit === "rem" ? 16 : 1)
                  : v,
            ];
          }),
        ),
      })),
  };
}
const resolveAllCached = (() => {
  const cache = new Map<string, ReturnType<typeof resolveAll>>();
  return (theme: (typeof THEMES)[number]) => {
    if (!cache.has(theme)) cache.set(theme, resolveAll(theme));
    return cache.get(theme)!;
  };
})();
