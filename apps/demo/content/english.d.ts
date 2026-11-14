import type { DemoLocale, DemoPage, DemoSection } from "./index.js";

export const englishSections: Readonly<Record<string, DemoSection[]>>;
export function localizedSections(
  page: Pick<DemoPage, "id" | "sections">,
  locale: DemoLocale,
): DemoSection[];
