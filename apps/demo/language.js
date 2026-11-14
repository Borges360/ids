const LANGUAGE_KEY = "inteiro-docs-language";

const messages = Object.freeze({
  en: Object.freeze({
    documentTitle: "INTEIRO — Documentation",
    description:
      "Interactive INTEIRO documentation for its principles, tokens, CSS recipes and implementation guides.",
    skip: "Skip to content",
    brandTag: "Shape the tension",
    documentation: "Documentation",
    breadcrumb: "Breadcrumb",
    menu: "Menu",
    search: "Search",
    searchTitle: "Search documentation",
    searchTerm: "Search term",
    searchPlaceholder: "costura, commit, token, button",
    theme: "Theme",
    density: "Density",
    language: "Language",
    onThisPage: "On this page",
    adjacentPages: "Adjacent pages",
    previous: "Previous",
    next: "Next",
    status: "Status",
    idsVersion: "IDS version",
    source: "Source",
    contribution: "Contribution",
    copy: "Copy",
    copied: "Copied",
    typeToSearch: "Type to search.",
    noResults: "No results",
    tryTerms: "Try costura, commit or token.",
    resultCount: "results",
    contentLanguageNote:
      "The documentation sections are currently in Brazilian Portuguese. Navigation and controls are in English.",
    publishTitle: "Publish this draft?",
    publishBody:
      "Reviewing would leave this page and, in a real product, become visible. This demo does not contact a remote service.",
    cancel: "Cancel",
    publish: "Publish",
    publishRecorded:
      "The publish action was recorded on this page only. No environment changed.",
    publishCancelled: "Publishing was cancelled.",
  }),
  "pt-BR": Object.freeze({
    documentTitle: "INTEIRO — Documentação",
    description:
      "Documentação interativa do INTEIRO: princípios, tokens, recipes CSS e guias de implementação.",
    skip: "Saltar para o conteúdo",
    brandTag: "dar forma à tensão",
    documentation: "Documentação",
    breadcrumb: "Trilha",
    menu: "Menu",
    search: "Buscar",
    searchTitle: "Buscar na documentação",
    searchTerm: "Termo",
    searchPlaceholder: "costura, commit, token, button",
    theme: "Tema",
    density: "Densidade",
    language: "Idioma",
    onThisPage: "Nesta página",
    adjacentPages: "Páginas adjacentes",
    previous: "Anterior",
    next: "Próximo",
    status: "Status",
    idsVersion: "Versão do IDS",
    source: "Fonte",
    contribution: "Contribuição",
    copy: "Copiar",
    copied: "Copiado",
    typeToSearch: "Digite para buscar.",
    noResults: "Nenhum resultado",
    tryTerms: "Tente costura, commit ou token.",
    resultCount: "resultados",
    contentLanguageNote: "",
    publishTitle: "Publicar o rascunho?",
    publishBody:
      "A revisão deixa esta página e, num produto real, passaria a ser visível. Esta demonstração não acessa um serviço remoto.",
    cancel: "Cancelar",
    publish: "Publicar",
    publishRecorded:
      "Publicação registrada apenas nesta página. Nenhum ambiente foi alterado.",
    publishCancelled: "Publicação cancelada.",
  }),
});

const groupLabels = Object.freeze({
  en: Object.freeze({}),
  "pt-BR": Object.freeze({
    Introduction: "Introdução",
    "Getting Started": "Primeiros passos",
    Foundations: "Fundamentos",
    Components: "Componentes",
    Patterns: "Padrões",
    Identity: "Identidade",
    Accessibility: "Acessibilidade",
    Engineering: "Engenharia",
    Governance: "Governança",
    Resources: "Recursos",
  }),
});

const itemLabels = Object.freeze({
  en: Object.freeze({
    "introduction/overview": "Overview",
    "introduction/principles": "Principles",
    "start/setup": "Installation and use",
    "start/trouble": "Troubleshooting",
    "foundations/color": "Color",
    "foundations/type": "Typography",
    "foundations/space": "Space and grid",
    "foundations/shape": "Shape and elevation",
    "foundations/motion": "Motion and icons",
    "foundations/language": "Language",
    "foundations/tokens": "Tokens",
    "foundations/themes": "Themes",
    "components/catalog": "Catalog",
    "components/library": "React library",
    "components/button": "Button",
    "components/input": "Input",
    "components/card": "Card",
    "components/badge": "Badge",
    "components/specified": "Recipes",
    "patterns/forms": "Forms",
    "patterns/data": "Navigation and data",
    "patterns/feedback": "Feedback",
    "practice/identity": "In practice",
    "a11y/guide": "Requirements",
    "engineering/guide": "Architecture",
    "governance/guide": "Process",
    "resources/guide": "References",
  }),
  "pt-BR": Object.freeze({}),
});

const englishPages = Object.freeze({
  "introduction/overview": [
    "What is INTEIRO",
    "A personal identity system that gives tension a form instead of erasing it. A reference for language, tokens and implementation recipes.",
  ],
  "introduction/principles": [
    "Principles",
    "Five laws approved in the master document. Each has a consequence, example and counterexample. The documentation brief's tensions are a proposed reading, not a replacement.",
  ],
  "start/setup": [
    "Installation and use",
    "The monorepo requires Node.js 22.14 or later. No package published to npm is assumed here.",
  ],
  "start/trouble": [
    "Troubleshooting",
    "Common problems when starting the monorepo, CSS and themes. Each item says what to check and what not to invent as a fix.",
  ],
  "foundations/color": [
    "Color",
    "Violet chooses. Orange crosses the boundary. Warm neutrals provide support. No color is decoration.",
  ],
  "foundations/type": [
    "Typography",
    "One family, four voices. Recursive spans interface, editorial and code through MONO and CASL. There is no second family to make it feel “human”.",
  ],
  "foundations/space": [
    "Space, grid and breakpoints",
    "A 4 px micro-grid with a 2 px optical step. Breakpoints describe spatial capacity, not a device.",
  ],
  "foundations/shape": [
    "Border, radius and elevation",
    "The default card does not float. Costura is the only border that means more than structure.",
  ],
  "foundations/motion": [
    "Motion and icons",
    "Motion explains cause. Bounce is not a language. Icons follow a grid and a stroke; there is no published icon library.",
  ],
  "foundations/language": [
    "Language",
    "Direct, precise, reflective, technical when needed, honest about uncertainty, confident about decisions and human.",
  ],
  "foundations/tokens": [
    "Tokens",
    "338 tokens in version 1.1.0. Primitive, semantic and component levels. DTCG 2025.10 exchange. CSS prefix --in-.",
  ],
  "foundations/themes": [
    "Themes and density",
    "Dark is the primary atmosphere. Light is the source theme. Contrast is implemented as an extension. Density changes rhythm, not personality.",
  ],
  "components/catalog": [
    "Catalog",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/button": [
    "Button",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/input": [
    "Forms",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/card": [
    "Cards and panels",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/badge": [
    "Badges and identity",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/specified": [
    "Composition and interaction",
    "Library implemented in @inteiro/react 1.2.0, with shared CSS and a typed API.",
  ],
  "components/library": [
    "React library",
    "55 implemented components and templates, with examples, imports and accessibility notes.",
  ],
  "patterns/forms": [
    "Forms",
    "One primary choice, complete messages, and commit only when submission crosses a boundary.",
  ],
  "patterns/data": [
    "Navigation and data",
    "Active navigation is violet, not orange. Tables are dense and square. Filters show what was left out.",
  ],
  "patterns/feedback": [
    "Feedback, failure and disclosure",
    "Errors, empty states, waiting and destructive actions have text. The interface does not celebrate or hide consequences.",
  ],
  "practice/identity": [
    "Identity in practice",
    "Approved laws applied to different surfaces. These are local examples using real tokens and classes, not separate products.",
  ],
  "a11y/guide": [
    "Accessibility",
    "WCAG 2.2 AA is the requirement in the master document and docs/ACCESSIBILITY.md. This page does not certify the site; it records the contract and what was exercised.",
  ],
  "engineering/guide": [
    "Engineering",
    "One-way dependencies: identity, primitive, semantic, component, platforms. Implemented code is separated from architecture that is still pending.",
  ],
  "governance/guide": [
    "Governance",
    "The identity owner decides whether a change remains INTEIRO. “It looks nice” is not a core criterion.",
  ],
  "resources/guide": [
    "Resources",
    "Where the code lives, what names mean, what remains pending and what this session verified.",
  ],
});

export function normalizeDemoLocale(value) {
  return value === "pt-BR" ? "pt-BR" : "en";
}

export function demoText(locale, key) {
  return messages[normalizeDemoLocale(locale)][key] ?? key;
}

export function demoGroupLabel(locale, group) {
  return groupLabels[normalizeDemoLocale(locale)][group] ?? group;
}

export function demoItemLabel(locale, id, fallback) {
  return itemLabels[normalizeDemoLocale(locale)][id] ?? fallback;
}

export function demoPageTitle(locale, page) {
  return normalizeDemoLocale(locale) === "en"
    ? (englishPages[page.id]?.[0] ?? page.title)
    : page.title;
}

export function demoPageLede(locale, page) {
  return normalizeDemoLocale(locale) === "en"
    ? (englishPages[page.id]?.[1] ?? page.lede)
    : page.lede;
}

export function applyDemoLocale(documentRef, requestedLocale) {
  const locale = normalizeDemoLocale(requestedLocale);
  const languageSelect = documentRef.getElementById("language");
  documentRef.documentElement.lang = locale;

  const description = documentRef.querySelector('meta[name="description"]');
  if (description) description.content = demoText(locale, "description");

  for (const element of documentRef.querySelectorAll("[data-i18n]")) {
    element.textContent = demoText(locale, element.dataset.i18n);
  }
  for (const element of documentRef.querySelectorAll("[data-i18n-aria]")) {
    element.setAttribute(
      "aria-label",
      demoText(locale, element.dataset.i18nAria),
    );
  }
  for (const element of documentRef.querySelectorAll(
    "[data-i18n-placeholder]",
  )) {
    element.setAttribute(
      "placeholder",
      demoText(locale, element.dataset.i18nPlaceholder),
    );
  }

  const contentNote = documentRef.getElementById("content-language-note");
  if (contentNote) {
    contentNote.textContent = demoText(locale, "contentLanguageNote");
    contentNote.hidden = locale === "pt-BR";
  }
  if (languageSelect) languageSelect.value = locale;
  return locale;
}

export function initDemoLanguage(
  documentRef = globalThis.document,
  storage,
  onChange = () => {},
) {
  const languageSelect = documentRef?.getElementById("language");
  if (!languageSelect) return null;

  try {
    storage ??= globalThis.localStorage;
  } catch {
    // Storage can be disabled; the selected locale still works for this page.
  }

  let locale = "en";
  try {
    locale = normalizeDemoLocale(storage?.getItem(LANGUAGE_KEY));
  } catch {
    // English remains the default when a stored preference cannot be read.
  }
  applyDemoLocale(documentRef, locale);

  languageSelect.addEventListener("change", () => {
    locale = normalizeDemoLocale(languageSelect.value);
    try {
      storage?.setItem(LANGUAGE_KEY, locale);
    } catch {
      // Keep the new locale active for this page if persistence is unavailable.
    }
    applyDemoLocale(documentRef, locale);
    onChange(locale);
  });

  return { getLocale: () => locale };
}
