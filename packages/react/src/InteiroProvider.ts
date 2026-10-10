import { createElement, createContext, useContext, useMemo, type ReactNode } from "react";
import type { InteiroAppearance, InteiroDensity } from "@inteiro/tokens";
import { inteiroTheme } from "./theme.ts";

export interface InteiroContextValue {
  appearance: InteiroAppearance;
  density: InteiroDensity;
  theme: typeof inteiroTheme;
}

const InteiroContext = createContext<InteiroContextValue | null>(null);

export function InteiroProvider(props: {
  appearance?: InteiroAppearance;
  density?: InteiroDensity;
  overrides?: Record<string, string>;
  children: ReactNode;
}) {
  const appearance = props.appearance ?? "auto";
  const density = props.density ?? "focus";
  const value = useMemo(() => ({ appearance, density, theme: inteiroTheme }), [appearance, density]);
  const themeAttr = appearance === "auto" ? undefined : appearance;
  const style: Record<string, string> = { ...(props.overrides ?? {}) };
  return createElement(
    InteiroContext.Provider,
    { value },
    createElement("div", { className: "in-root", "data-in-theme": themeAttr, "data-in-density": density, style }, props.children)
  );
}

export function useInteiro(): InteiroContextValue {
  const ctx = useContext(InteiroContext);
  if (!ctx) throw new Error("useInteiro deve ser usado dentro de InteiroProvider");
  return ctx;
}
