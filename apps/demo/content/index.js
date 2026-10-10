import { componentPages } from "./components.js";
import { foundationPages } from "./foundations.js";
import { introductionPages } from "./introduction.js";
import { patternPages, practicePages } from "./patterns.js";
import { qualityPages } from "./quality.js";
import { startPages } from "./start.js";

/** @typedef {{ id: string, title: string, lede: string, keywords?: string[], status: string, source: string, sections: { id: string, title: string, html: string }[] }} DocPage */

/** @type {DocPage[]} */
export const pages = [
  ...introductionPages,
  ...startPages,
  ...foundationPages,
  ...componentPages,
  ...patternPages,
  ...practicePages,
  ...qualityPages
];

export const nav = [
  {
    id: "introduction",
    label: "Introduction",
    items: [
      { id: "introduction/overview", label: "O que é" },
      { id: "introduction/principles", label: "Princípios" }
    ]
  },
  {
    id: "start",
    label: "Getting Started",
    items: [
      { id: "start/setup", label: "Instalação" },
      { id: "start/trouble", label: "Troubleshooting" }
    ]
  },
  {
    id: "foundations",
    label: "Foundations",
    items: [
      { id: "foundations/color", label: "Cor" },
      { id: "foundations/type", label: "Tipografia" },
      { id: "foundations/space", label: "Espaço e grid" },
      { id: "foundations/shape", label: "Forma e elevação" },
      { id: "foundations/motion", label: "Movimento e ícones" },
      { id: "foundations/language", label: "Linguagem" },
      { id: "foundations/tokens", label: "Tokens" },
      { id: "foundations/themes", label: "Temas" }
    ]
  },
  {
    id: "components",
    label: "Components",
    items: [
      { id: "components/catalog", label: "Catálogo" },
      { id: "components/button", label: "Button" },
      { id: "components/input", label: "Input" },
      { id: "components/card", label: "Card" },
      { id: "components/badge", label: "Badge" },
      { id: "components/specified", label: "Recipes" }
    ]
  },
  {
    id: "patterns",
    label: "Patterns",
    items: [
      { id: "patterns/forms", label: "Formulários" },
      { id: "patterns/data", label: "Navegação e dados" },
      { id: "patterns/feedback", label: "Feedback" }
    ]
  },
  {
    id: "practice",
    label: "Identity",
    items: [{ id: "practice/identity", label: "Na prática" }]
  },
  {
    id: "a11y",
    label: "Accessibility",
    items: [{ id: "a11y/guide", label: "Requisitos" }]
  },
  {
    id: "engineering",
    label: "Engineering",
    items: [{ id: "engineering/guide", label: "Arquitetura" }]
  },
  {
    id: "governance",
    label: "Governance",
    items: [{ id: "governance/guide", label: "Processo" }]
  },
  {
    id: "resources",
    label: "Resources",
    items: [{ id: "resources/guide", label: "Referências" }]
  }
];

export const pageById = new Map(pages.map((page) => [page.id, page]));

const linkPattern = /#\/[a-z0-9]+(?:\/[a-z0-9-]+){1,2}/g;

/** @returns {string[]} */
export function catalogErrors() {
  const errors = [];
  const ids = new Set();
  for (const page of pages) {
    if (ids.has(page.id)) errors.push(`página duplicada: ${page.id}`);
    ids.add(page.id);
    if (!page.title || !page.lede || !page.sections?.length) errors.push(`página incompleta: ${page.id}`);
    const sectionIds = new Set();
    const markupIds = new Set();
    for (const section of page.sections) {
      if (sectionIds.has(section.id)) errors.push(`seção duplicada: ${page.id}/${section.id}`);
      sectionIds.add(section.id);
      markupIds.add(section.id);
      if (!section.title || !section.html?.trim()) errors.push(`seção vazia: ${page.id}/${section.id}`);
      for (const match of section.html.matchAll(/\sid="([^"]+)"/g)) markupIds.add(match[1]);
    }
    for (const section of page.sections) {
      for (const href of section.html.match(linkPattern) ?? []) {
        const parts = href.slice(2).split("/");
        const target = `${parts[0]}/${parts[1]}`;
        if (!pageById.has(target)) {
          errors.push(`link quebrado ${href} em ${page.id}`);
          continue;
        }
        if (parts[2]) {
          const targetPage = pageById.get(target);
          const known = new Set(targetPage.sections.map((section) => section.id));
          for (const section of targetPage.sections) {
            for (const match of section.html.matchAll(/\sid="([^"]+)"/g)) known.add(match[1]);
          }
          if (!known.has(parts[2])) errors.push(`âncora quebrada ${href} em ${page.id}`);
        }
      }
    }
    void markupIds;
  }
  for (const group of nav) {
    for (const item of group.items) {
      if (!ids.has(item.id)) errors.push(`menu sem página: ${item.id}`);
    }
  }
  for (const page of pages) {
    if (!nav.some((group) => group.items.some((item) => item.id === page.id))) {
      errors.push(`página fora do menu: ${page.id}`);
    }
  }
  return errors;
}
