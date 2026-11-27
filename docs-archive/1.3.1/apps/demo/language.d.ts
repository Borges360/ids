import type { DemoLocale, DemoPage } from "./content/index.js";

export interface DemoStorage {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export function normalizeDemoLocale(value: unknown): DemoLocale;
export function demoText(locale: DemoLocale, key: string): string;
export function demoGroupLabel(locale: DemoLocale, group: string): string;
export function demoItemLabel(locale: DemoLocale, id: string, fallback: string): string;
export function demoPageTitle(
  locale: DemoLocale,
  page: Pick<DemoPage, "id" | "title">,
): string;
export function demoPageLede(
  locale: DemoLocale,
  page: Pick<DemoPage, "id" | "lede">,
): string;
export function applyDemoLocale(documentRef: any, requestedLocale: DemoLocale): DemoLocale;
export function initDemoLanguage(
  documentRef?: any,
  storage?: DemoStorage,
  onChange?: (locale: DemoLocale) => void,
): { getLocale(): DemoLocale } | null;
