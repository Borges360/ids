export type DemoLocale = "en" | "pt-BR";

export interface DemoSection {
  id: string;
  title: string;
  html: string;
}

export interface DemoPage {
  id: string;
  title: string;
  lede: string;
  keywords?: string[];
  status: string;
  source: string;
  sections: DemoSection[];
}

export const pages: DemoPage[];
export const nav: Array<{
  id: string;
  label: string;
  items: Array<{ id: string; label: string }>;
}>;
export const pageById: Map<string, DemoPage>;
export function catalogErrors(): string[];
