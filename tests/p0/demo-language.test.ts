import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { englishSections, localizedSections } from "../../apps/demo/content/english.js";
import { pageById, pages, type DemoPage } from "../../apps/demo/content/index.js";
import {
  applyDemoLocale,
  demoGroupLabel,
  demoPageLede,
  demoPageTitle,
  initDemoLanguage,
} from "../../apps/demo/language.js";

const html = await readFile(
  new URL("../../apps/demo/index.html", import.meta.url),
  "utf8",
);

function getPage(id: string): DemoPage {
  const page = pageById.get(id);
  if (!page) throw new Error(`Missing demo page: ${id}`);
  return page;
}

test("translated overview keeps anchors and falls back to Portuguese for other pages", () => {
  const overview = getPage("introduction/overview");
  const original = overview.sections;
  expect(localizedSections(overview, "en").map((section) => section.id)).toEqual(original.map((section) => section.id));
  expect(localizedSections(overview, "en")[0]?.title).toBe("Definition");
  expect(localizedSections(overview, "pt-BR")).toBe(original);
  const untranslated = { id: "untranslated/fixture", sections: [] };
  expect(englishSections[untranslated.id]).toBeUndefined();
  expect(localizedSections(untranslated, "en")).toBe(untranslated.sections);
  const principles = getPage("introduction/principles");
  expect(localizedSections(principles, "en").map((section) => section.id)).toEqual(principles.sections.map((section) => section.id));
  expect(localizedSections(principles, "en")[0]?.html).toContain('id="estrutura-silenciosa"');
  const trouble = getPage("start/trouble");
  expect(localizedSections(trouble, "en").map((section) => section.id)).toEqual(trouble.sections.map((section) => section.id));
  const setup = getPage("start/setup");
  expect(localizedSections(setup, "en").map((section) => section.id)).toEqual(setup.sections.map((section) => section.id));
  expect(localizedSections(setup, "en").find((section) => section.id === "monorepo")?.html).toContain("npm run build");
  for (const id of ["foundations/language", "foundations/tokens", "foundations/themes", "foundations/shape", "foundations/space", "foundations/motion", "foundations/type", "foundations/color", "a11y/guide", "engineering/guide", "governance/guide", "components/button", "components/card", "components/badge", "components/input", "components/specified", "components/catalog", "components/library", "practice/identity", "patterns/data", "patterns/feedback", "resources/guide"]) {
    const page = getPage(id);
    expect(englishSections[id]).toBeDefined();
    expect(localizedSections(page, "en").map((section) => section.id)).toEqual(page.sections.map((section) => section.id));
  }
});

function makeDocument() {
  return new JSDOM(html, { url: "https://ids.test/" });
}

test("every documented page has an English body with the same section anchors", () => {
  for (const page of pages) {
    const translated = englishSections[page.id];
    if (!translated) throw new Error(`Missing English translation for ${page.id}`);
    expect(translated, page.id).toBeDefined();
    expect(translated.map((section) => section.id), page.id).toEqual(page.sections.map((section) => section.id));
    expect(localizedSections(page, "en"), page.id).toBe(translated);
    expect(localizedSections(page, "pt-BR"), page.id).toBe(page.sections);
  }
});

test("demo defaults to English and provides an accessible locale selector", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  initDemoLanguage(document, dom.window.localStorage);

  expect(document.documentElement.lang).toBe("en");
  expect(document.querySelector('label[for="language"] span').textContent).toBe(
    "Language",
  );
  expect(document.getElementById("nav").getAttribute("aria-label")).toBe(
    "Documentation",
  );
  expect(document.getElementById("menu-button").textContent).toBe("Menu");
  dom.window.close();
});

test("pt-BR preference updates shell labels without changing the route", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  const storage = dom.window.localStorage;
  dom.window.location.hash = "#/patterns/forms";
  storage.setItem("inteiro-docs-language", "pt-BR");
  let changedLocale = "";

  const state = initDemoLanguage(document, storage, (locale) => {
    changedLocale = locale;
  });

  if (!state) throw new Error("Demo language selector is missing");
  expect(state.getLocale()).toBe("pt-BR");
  expect(document.documentElement.lang).toBe("pt-BR");
  expect(document.querySelector('label[for="language"] span').textContent).toBe(
    "Idioma",
  );
  expect(document.getElementById("nav").getAttribute("aria-label")).toBe(
    "Documentação",
  );
  const selector = document.getElementById("language");
  selector.value = "en";
  selector.dispatchEvent(new dom.window.Event("change"));
  expect(changedLocale).toBe("en");
  expect(storage.getItem("inteiro-docs-language")).toBe("en");
  expect(dom.window.location.hash).toBe("#/patterns/forms");
  dom.window.close();
});

test("unknown locale and unavailable storage use English without breaking selection", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  const storage = {
    getItem: () => "fr",
    setItem: () => {
      throw new Error("storage disabled");
    },
  };
  initDemoLanguage(document, storage);
  expect(document.documentElement.lang).toBe("en");

  const selector = document.getElementById("language");
  selector.value = "pt-BR";
  selector.dispatchEvent(new dom.window.Event("change"));
  expect(document.documentElement.lang).toBe("pt-BR");
  expect(document.getElementById("search-title").textContent).toBe(
    "Buscar na documentação",
  );
  dom.window.close();
});

test("demo locale maps localize page headings but preserve the source body language", () => {
  const page = {
    id: "introduction/overview",
    title: "O que é o INTEIRO",
    lede: "Texto original em português.",
  };
  expect(demoPageTitle("en", page)).toBe("What is INTEIRO");
  expect(demoPageLede("en", page)).toContain("personal identity system");
  expect(demoPageTitle("pt-BR", page)).toBe(page.title);
  expect(demoGroupLabel("pt-BR", "Introduction")).toBe("Introdução");

  const dom = makeDocument();
  const note = dom.window.document.createElement("p");
  note.id = "content-language-note";
  dom.window.document.body.append(note);
  applyDemoLocale(dom.window.document, "en");
  expect(note.hidden).toBe(false);
  expect(note.textContent).toContain("Brazilian Portuguese");
  applyDemoLocale(dom.window.document, "pt-BR");
  expect(note.hidden).toBe(true);
  dom.window.close();
});
