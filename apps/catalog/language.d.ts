export type CatalogLocale = "en" | "pt-BR";

export interface CatalogStorage {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export const catalogMessages: Readonly<Record<CatalogLocale, Record<string, string>>>;
export function normalizeCatalogLocale(value: unknown): CatalogLocale;
export function applyCatalogLocale(documentRef: any, requestedLocale: CatalogLocale): CatalogLocale;
export function initCatalogLanguage(
  documentRef?: any,
  storage?: CatalogStorage,
): { getLocale(): CatalogLocale } | null;
