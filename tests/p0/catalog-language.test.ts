import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { initCatalogLanguage } from "../../apps/catalog/language.js";

const html = await readFile(
  new URL("../../apps/catalog/index.html", import.meta.url),
  "utf8",
);

function makeDocument() {
  return new JSDOM(html, { url: "https://ids.test/catalog/" });
}

test("catalog defaults to English and localizes its labelled controls", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  initCatalogLanguage(document, dom.window.localStorage);

  expect(document.documentElement.lang).toBe("en");
  expect(document.title).toBe("INTEIRO — P0 patterns");
  expect(document.querySelector("h1").textContent).toBe("P0 patterns");
  expect(document.querySelectorAll("#pattern option").length).toBe(41);
  expect(
    [...document.querySelectorAll("#pattern option")].every(
      (option) =>
        option.textContent.trim() && option.textContent !== option.value,
    ),
  ).toBe(true);
  expect(
    document
      .querySelector('label[for="interface-language"]')
      .textContent.trim(),
  ).toBe("Interface language");
  expect(
    document.querySelector('label[for="pattern"]').textContent.trim(),
  ).toBe("Pattern");
  expect(document.getElementById("example").title).toBe("Pattern example");
  dom.window.close();
});

test("saved pt-BR localizes the catalog and keeps the selected example", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  const storage = dom.window.localStorage;
  storage.setItem("inteiro-docs-language", "pt-BR");
  const pattern = document.getElementById("pattern");
  const example = document.getElementById("example");
  pattern.value = "dialog";
  example.src = "/packages/composition/examples/dialog-open.html";

  const language = initCatalogLanguage(document, storage);

  if (!language) throw new Error("Catalog language selector is missing");
  expect(language.getLocale()).toBe("pt-BR");
  expect(document.documentElement.lang).toBe("pt-BR");
  expect(document.title).toBe("INTEIRO — Padrões P0");
  expect(document.querySelector("h1").textContent).toBe("Padrões P0");
  expect(
    document
      .querySelector('label[for="interface-language"]')
      .textContent.trim(),
  ).toBe("Idioma da interface");
  expect(document.getElementById("example").title).toBe("Exemplo do padrão");
  expect(pattern.value).toBe("dialog");
  expect(pattern.selectedOptions[0].textContent).toMatch(/Diálogo modal/);
  expect(example.getAttribute("src")).toBe(
    "/packages/composition/examples/dialog-open.html",
  );

  const selector = document.getElementById("interface-language");
  selector.value = "en";
  selector.dispatchEvent(new dom.window.Event("change"));
  expect(storage.getItem("inteiro-docs-language")).toBe("en");
  expect(pattern.value).toBe("dialog");
  expect(pattern.selectedOptions[0].textContent).toBe("Modal dialog");
  dom.window.close();
});

test("unknown locale falls back and storage write failures do not break selection", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  const storage = {
    getItem: () => "fr",
    setItem: () => {
      throw new Error("storage disabled");
    },
  };
  initCatalogLanguage(document, storage);
  expect(document.documentElement.lang).toBe("en");

  const selector = document.getElementById("interface-language");
  selector.value = "pt-BR";
  selector.dispatchEvent(new dom.window.Event("change"));
  expect(document.documentElement.lang).toBe("pt-BR");
  expect(document.querySelector("h1").textContent).toBe("Padrões P0");
  dom.window.close();
});

test("storage read failures fall back to English", () => {
  const dom = makeDocument();
  const { document } = dom.window;
  const storage = {
    getItem: () => {
      throw new Error("storage disabled");
    },
  };

  initCatalogLanguage(document, storage);

  expect(document.documentElement.lang).toBe("en");
  expect(document.querySelector("h1").textContent).toBe("P0 patterns");
  dom.window.close();
});
