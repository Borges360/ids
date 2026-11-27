const STORAGE_KEY = "inteiro-docs-language";

export const catalogMessages = Object.freeze({
  en: {
    documentTitle: "INTEIRO — P0 patterns",
    description:
      "A framework-agnostic HTML/CSS catalog. States, keyboard behavior and tokens have verifiable local contracts.",
    title: "P0 patterns",
    intro:
      "A framework-agnostic HTML/CSS catalog. States, keyboard behavior and tokens have verifiable local contracts.",
    language: "Interface language",
    pattern: "Pattern",
    example: "Pattern example",
  },
  "pt-BR": {
    documentTitle: "INTEIRO — Padrões P0",
    description:
      "Catálogo HTML/CSS agnóstico. Estados, teclado e tokens têm contratos locais verificáveis.",
    title: "Padrões P0",
    intro:
      "Catálogo HTML/CSS agnóstico. Estados, teclado e tokens têm contratos locais verificáveis.",
    language: "Idioma da interface",
    pattern: "Padrão",
    example: "Exemplo do padrão",
  },
});

const englishPatternLabels = Object.freeze({
  "app-shell": "Application shell",
  "page-header": "Page header",
  "content-container": "Responsive content container",
  sidebar: "Navigation sidebar",
  topbar: "Top bar",
  "mobile-navigation": "Mobile navigation",
  "data-table": "Paginated data table",
  "data-list": "Data list",
  "details-panel": "Details panel",
  "stat-card": "Statistic card",
  "dashboard-grid": "Dashboard grid",
  "filter-bar": "Search filters",
  "form-layout": "Form layout",
  "field-group": "Field label, help and validation",
  select: "Native select",
  checkbox: "Checkbox",
  "radio-group": "Radio group",
  textarea: "Multiline text",
  "form-actions": "Form actions",
  stepper: "Progress steps",
  dialog: "Modal dialog",
  drawer: "Side panel",
  popover: "Non-modal popover",
  "dropdown-menu": "Action menu",
  tooltip: "Accessible tooltip",
  alert: "Alert",
  toast: "Status notification",
  "inline-error": "Inline error",
  success: "Success confirmation",
  "empty-state": "Empty state",
  skeleton: "Skeleton loading",
  spinner: "Loading spinner",
  progress: "Progress",
  tabs: "Tabs",
  breadcrumb: "Breadcrumb navigation",
  pagination: "Pagination",
  "navigation-menu": "Main navigation menu",
  editorial: "Editorial text",
  profile: "Personal profile",
  costura: "Costura identity",
  "action-commit": "Commit action",
});

export function normalizeCatalogLocale(value) {
  return value === "pt-BR" ? "pt-BR" : "en";
}

export function applyCatalogLocale(documentRef, requestedLocale) {
  const locale = normalizeCatalogLocale(requestedLocale);
  const messages = catalogMessages[locale];
  const languageSelect = documentRef.getElementById("interface-language");

  documentRef.documentElement.lang = locale;
  documentRef.title = messages.documentTitle;

  const description = documentRef.querySelector('meta[name="description"]');
  if (description) description.content = messages.description;

  for (const element of documentRef.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (messages[key]) element.textContent = messages[key];
  }

  const options = documentRef.querySelectorAll("#pattern option");
  for (const option of options) {
    option.dataset.labelPt ??= option.textContent;
    option.textContent =
      locale === "en"
        ? (englishPatternLabels[option.value] ?? option.value)
        : option.dataset.labelPt;
  }

  const example = documentRef.getElementById("example");
  if (example) example.title = messages.example;
  if (languageSelect) languageSelect.value = locale;

  return locale;
}

export function initCatalogLanguage(
  documentRef = globalThis.document,
  storage,
) {
  const languageSelect = documentRef?.getElementById("interface-language");
  if (!languageSelect) return null;

  let initialLocale = "en";
  try {
    storage ??= globalThis.localStorage;
    initialLocale = normalizeCatalogLocale(storage?.getItem(STORAGE_KEY));
  } catch {
    // Storage can be disabled by the browser; English remains the default.
  }
  applyCatalogLocale(documentRef, initialLocale);

  languageSelect.addEventListener("change", () => {
    const locale = normalizeCatalogLocale(languageSelect.value);
    try {
      storage?.setItem(STORAGE_KEY, locale);
    } catch {
      // Keep the selected language for this page even if persistence is unavailable.
    }
    applyCatalogLocale(documentRef, locale);
  });

  return { getLocale: () => normalizeCatalogLocale(languageSelect.value) };
}
