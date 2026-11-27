import { catalogErrors, nav, pageById, pages } from "./content/index.js";
import { englishSections, localizedSections } from "./content/english.js";
import { IDS_VERSION } from "./version.js";
import {
  demoGroupLabel,
  demoItemLabel,
  demoPageLede,
  demoPageTitle,
  demoText,
  initDemoLanguage,
} from "./language.js";

const errors = catalogErrors();
if (errors.length) console.error(errors);

const root = document.documentElement;
const sidebar = document.querySelector("#sidebar");
const navEl = document.querySelector("#nav");
const article = document.querySelector("#conteudo");
const toc = document.querySelector("#toc");
const crumbs = document.querySelector("#crumbs");
const live = document.querySelector("#live");
const menuButton = document.querySelector("#menu-button");
const scrim = document.querySelector("#scrim");
const themeSelect = document.querySelector("#theme");
const densitySelect = document.querySelector("#density");
const searchDialog = document.querySelector("#search-dialog");
const searchInput = document.querySelector("#search-input");
const searchResults = document.querySelector("#search-results");
const searchStatus = document.querySelector("#search-status");
const openSearchButton = document.querySelector("#open-search");
const versionLabel = document.querySelector("#version");
let activeLocale = "en";
const languageState = initDemoLanguage(document, undefined, (locale) => {
  activeLocale = locale;
  refreshLocaleChrome();
});
activeLocale = languageState?.getLocale() ?? "en";

if (versionLabel) versionLabel.textContent = `v${IDS_VERSION}`;

// Seletor de versão: /versions.json lista a versão atual e as arquivadas (/v/<x.y.z>/).
const versionSelect = document.querySelector("#version-select");
if (versionSelect) {
  fetch("/versions.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data?.versions?.length) return;
      for (const entry of data.versions) {
        const option = document.createElement("option");
        option.value = entry.path;
        const tag = entry.status === "atual" ? " (current)" : entry.status === "arquivada" ? " (archived)" : "";
        option.textContent = `v${entry.version}${tag}`;
        if (entry.version === IDS_VERSION) option.selected = true;
        versionSelect.append(option);
      }
      versionSelect.hidden = false;
      versionSelect.addEventListener("change", () => {
        window.location.assign(versionSelect.value + (window.location.hash || ""));
      });
    })
    .catch(() => {});
}

const flat = nav.flatMap((group) => group.items.map((item) => ({ ...item, group })));
const searchIndex = pages.flatMap((page) => {
  const group = flat.find((item) => item.id === page.id)?.group.label ?? "";
  const entries = [
    {
      page: page.id,
      anchor: "",
      title: page.title,
      group,
      hay: `${page.title} ${page.lede} ${(page.keywords ?? []).join(" ")}`.toLowerCase()
    }
  ];
  for (const section of page.sections) {
    const plain = section.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const english = localizedSections(page, "en").find((item) => item.id === section.id);
    const englishPlain = english?.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") ?? "";
    entries.push({
      page: page.id,
      anchor: section.id,
      title: section.title,
      englishTitle: english?.title ?? section.title,
      group,
      hay: `${section.title} ${plain} ${english?.title ?? ""} ${englishPlain} ${(page.keywords ?? []).join(" ")}`.toLowerCase()
    });
  }
  return entries;
});

let spy = null;
let searchActive = -1;

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const parts = raw.split("/").filter(Boolean);
  // Endereço antigo da página única do Terminal (IDS 1.3.0 a 1.3.1).
  if (parts[0] === "components" && parts[1] === "terminal") return { page: "terminal/components", anchor: parts[2] ?? "" };
  if (parts.length >= 2 && pageById.has(`${parts[0]}/${parts[1]}`)) {
    return { page: `${parts[0]}/${parts[1]}`, anchor: parts[2] ?? "" };
  }
  return { page: "introduction/overview", anchor: "" };
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

function syncSidebar() {
  const mobile = window.matchMedia("(max-width: 1023px)").matches;
  const open = document.body.classList.contains("nav-open");
  if (mobile && !open) {
    sidebar.setAttribute("inert", "");
    sidebar.setAttribute("aria-hidden", "true");
  } else {
    sidebar.removeAttribute("inert");
    sidebar.removeAttribute("aria-hidden");
  }
}

function closeNav() {
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");
  scrim.hidden = true;
  syncSidebar();
}

function openNav() {
  document.body.classList.add("nav-open");
  menuButton.setAttribute("aria-expanded", "true");
  scrim.hidden = false;
  syncSidebar();
  sidebar.querySelector("a")?.focus();
}

function renderNav(activeId) {
  navEl.innerHTML = nav
    .map((group) => {
      const open = group.items.some((item) => item.id === activeId);
      const items = group.items
        .map(
          (item) =>
            `<a class="nav-link" href="#/${item.id}" ${item.id === activeId ? 'aria-current="page"' : ""}>${esc(demoItemLabel(activeLocale, item.id, item.label))}</a>`
        )
        .join("");
      return `<details class="nav-group" ${open ? "open" : ""}><summary>${esc(demoGroupLabel(activeLocale, group.label))}</summary><div class="nav-group__items">${items}</div></details>`;
    })
    .join("");
}

function renderCrumbs(page, group) {
  const first = group.items[0];
  crumbs.innerHTML = `<ol><li><a href="#/${first.id}">${esc(demoGroupLabel(activeLocale, group.label))}</a></li><li aria-current="page">${esc(demoPageTitle(activeLocale, page))}</li></ol>`;
}

function renderPager(pageId) {
  const index = flat.findIndex((item) => item.id === pageId);
  const prev = flat[index - 1];
  const next = flat[index + 1];
  return `<nav class="pager" aria-label="${esc(demoText(activeLocale, "adjacentPages"))}">
    ${prev ? `<a class="pager__link" href="#/${prev.id}"><span class="kicker">${esc(demoText(activeLocale, "previous"))}</span><span>${esc(demoItemLabel(activeLocale, prev.id, prev.label))}</span></a>` : "<span></span>"}
    ${next ? `<a class="pager__link pager__link--next" href="#/${next.id}"><span class="kicker">${esc(demoText(activeLocale, "next"))}</span><span>${esc(demoItemLabel(activeLocale, next.id, next.label))}</span></a>` : "<span></span>"}
  </nav>`;
}

function renderPage(page, group) {
  const title = demoPageTitle(activeLocale, page);
  const lede = demoPageLede(activeLocale, page);
  const translated = activeLocale === "en" && Boolean(englishSections[page.id]);
  const sections = localizedSections(page, activeLocale)
    .map(
      (section) =>
        `<section class="doc-section" aria-labelledby="${esc(section.id)}"><h2 id="${esc(section.id)}">${esc(section.title)}</h2>${section.html}</section>`
    )
    .join("");
  article.innerHTML = `
    <header class="doc-head">
      <p class="kicker">${esc(demoGroupLabel(activeLocale, group.label))}</p>
      <h1 id="titulo" class="doc-title in-voice-signal" tabindex="-1">${esc(title)}</h1>
      <p class="lede">${esc(lede)}</p>
      <p id="content-language-note" class="in-field-help"${activeLocale === "en" && !translated ? "" : " hidden"}>${esc(demoText(activeLocale, "contentLanguageNote"))}</p>
      <dl class="meta">
        <div><dt>${esc(demoText(activeLocale, "status"))}</dt><dd data-page-status>${esc(localizedPageStatus(page.status))}</dd></div>
        <div><dt>${esc(demoText(activeLocale, "idsVersion"))}</dt><dd class="in-voice-machine">${IDS_VERSION}</dd></div>
        <div><dt>${esc(demoText(activeLocale, "source"))}</dt><dd class="in-voice-machine">${esc(page.source)}</dd></div>
      </dl>
    </header>
    <div class="doc-sections" lang="${translated ? "en" : "pt-BR"}">${sections}</div>
    ${renderPager(page.id)}`;
  document.title = `${title} — INTEIRO`;
  live.textContent = title;
}

function refreshLocaleChrome() {
  const route = parseHash();
  const page = pageById.get(route.page);
  const group = flat.find((item) => item.id === route.page)?.group;
  if (!page || !group) return;

  // Only pages with translated content need their body rebuilt. Other pages can
  // contain live form drafts, which must survive a language switch.
  if (englishSections[page.id]) {
    const form = article.querySelector("[data-demo-form]");
    const filter = article.querySelector("[data-filter-input]");
    const filterValue = filter?.value;
    const contrast = article.querySelector("[data-contrast-tool]");
    const contrastState = contrast && { fg: contrast.querySelector('[name="fg"]').value, bg: contrast.querySelector('[name="bg"]').value };
    const checkedRows = [...article.querySelectorAll('.ex-table input[type="checkbox"]')].map((input) => input.checked);
    const feedback = page.id === "patterns/feedback" ? {
      retry: Boolean(article.querySelector('[data-retry-status]')?.textContent),
      created: Boolean(article.querySelector('[data-create-env]')?.disabled),
      confirmation: article.querySelector('[data-confirm-status]')?.dataset.result,
      disclosure: Boolean(article.querySelector('details.disclosure')?.open),
    } : null;
    const motion = article.querySelector("[data-motion]");
    const motionState = motion && {
      duration: motion.querySelector("[data-duration]").value,
      ease: motion.querySelector("[data-ease]").value,
      transform: motion.querySelector("[data-dot]").style.transform,
    };
    renderPage(page, group);
    buildToc();
    if (filterValue !== undefined) {
      article.querySelector("[data-filter-input]").value = filterValue;
      bindFilter();
    }
    if (contrastState) {
      const current = article.querySelector("[data-contrast-tool]");
      current.querySelector('[name="fg"]').value = contrastState.fg;
      current.querySelector('[name="bg"]').value = contrastState.bg;
      bindContrast();
      paintSwatches();
    }
    article.querySelectorAll('.ex-table input[type="checkbox"]').forEach((input, index) => { input.checked = checkedRows[index] ?? false; });
    if (feedback) {
      bindConfirm();
      if (feedback.retry) article.querySelector('[data-retry-status]').textContent = demoFeedbackText('retry');
      if (feedback.created) {
        article.querySelector('[data-create-env]').disabled = true;
        article.querySelector('[data-env-status]').textContent = demoFeedbackText('created');
      }
      if (feedback.confirmation) {
        const status = article.querySelector('[data-confirm-status]');
        status.dataset.result = feedback.confirmation;
        status.textContent = demoFeedbackText(feedback.confirmation);
      }
      article.querySelector('details.disclosure').open = feedback.disclosure;
    }
    if (form) {
      const translatedForm = article.querySelector("[data-demo-form]");
      for (const selector of ['label[for="proj-name"]', 'label[for="proj-email"]', '.in-field__message:not([data-email-msg])', '[type="submit"]', '[data-publish]']) {
        form.querySelector(selector).textContent = translatedForm.querySelector(selector).textContent;
      }
      const email = form.querySelector('#proj-email');
      form.querySelector('[data-email-msg]').textContent = email.getAttribute('aria-invalid') === 'true'
        ? demoFormText('emailError') : demoFormText('emailHelp');
      const status = form.querySelector('[data-form-status]');
      if (status.dataset.result) status.textContent = demoFormText(status.dataset.result);
      translatedForm.replaceWith(form);
    }
    if (motionState) {
      const current = article.querySelector("[data-motion]");
      current.querySelector("[data-duration]").value = motionState.duration;
      current.querySelector("[data-ease]").value = motionState.ease;
      current.querySelector("[data-dot]").style.transform = motionState.transform;
      bindMotion();
    }
  }

  renderNav(page.id);
  renderCrumbs(page, group);
  const title = demoPageTitle(activeLocale, page);
  const titleElement = article.querySelector("#titulo");
  const ledeElement = article.querySelector(".lede");
  const groupElement = article.querySelector(".doc-head .kicker");
  if (titleElement) titleElement.textContent = title;
  if (ledeElement) ledeElement.textContent = demoPageLede(activeLocale, page);
  if (groupElement) groupElement.textContent = demoGroupLabel(activeLocale, group.label);
  document.title = `${title} — INTEIRO`;
  live.textContent = title;
  const pager = article.querySelector(".pager");
  if (pager) {
    const replacement = document.createElement("template");
    replacement.innerHTML = renderPager(page.id);
    pager.replaceWith(replacement.content.firstElementChild);
  }
  const metadata = article.querySelectorAll(".meta dt");
  ["status", "idsVersion", "source"].forEach((key, index) => {
    if (metadata[index]) metadata[index].textContent = demoText(activeLocale, key);
  });
  const pageStatus = article.querySelector("[data-page-status]");
  if (pageStatus) pageStatus.textContent = localizedPageStatus(page.status);
  const contentNote = article.querySelector("#content-language-note");
  if (contentNote) {
    contentNote.textContent = demoText(activeLocale, "contentLanguageNote");
    contentNote.hidden = activeLocale === "pt-BR" || Boolean(englishSections[page.id]);
  }
  const tocSummary = toc.querySelector("summary");
  if (tocSummary) tocSummary.textContent = demoText(activeLocale, "onThisPage");
  const confirmation = document.querySelector("#confirm-publish");
  if (confirmation) {
    confirmation.querySelector("h2").textContent = demoText(activeLocale, "publishTitle");
    confirmation.querySelector("p").textContent = demoText(activeLocale, "publishBody");
    confirmation.querySelector('[value="cancel"]').textContent = demoText(activeLocale, "cancel");
    confirmation.querySelector('[value="confirm"]').textContent = demoText(activeLocale, "publish");
  }
  if (searchInput.value.trim()) runSearch();
}

function buildToc() {
  const heads = [...article.querySelectorAll("h2, h3")].filter((head) => head.id);
  if (heads.length < 2) {
    toc.hidden = true;
    toc.innerHTML = "";
    return;
  }
  toc.hidden = false;
  const route = parseHash();
  toc.innerHTML = `<details class="toc-panel" open><summary class="kicker">${esc(demoText(activeLocale, "onThisPage"))}</summary><ol>${heads
    .map(
      (head) =>
        `<li class="${head.tagName === "H3" ? "toc-sub" : ""}"><a href="#/${route.page}/${head.id}">${esc(head.textContent ?? "")}</a></li>`
    )
    .join("")}</ol></details>`;
  spy?.disconnect();
  spy = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      for (const link of toc.querySelectorAll("a")) link.removeAttribute("aria-current");
      const id = visible.target.id;
      toc.querySelector(`a[href$="/${CSS.escape(id)}"]`)?.setAttribute("aria-current", "true");
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
  );
  for (const head of heads) spy.observe(head);
}

function rgbChannels(variable) {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  probe.hidden = true;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  return parts.slice(0, 3).map(Number);
}

function toHex(channels) {
  return `#${channels.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(channels) {
  const lin = channels.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function paintSwatches() {
  for (const chip of article.querySelectorAll("[data-swatch]")) {
    const variable = chip.getAttribute("data-swatch");
    chip.style.background = `var(${variable})`;
    const channels = rgbChannels(variable);
    const code = chip.parentElement?.querySelector(".swatch__value");
    if (channels && code) code.textContent = toHex(channels);
  }
}

function paintContrast() {
  const tool = article.querySelector("[data-contrast-tool]");
  if (!tool) return;
  const fgName = tool.querySelector("[name=fg]").value;
  const bgName = tool.querySelector("[name=bg]").value;
  const fg = rgbChannels(fgName);
  const bg = rgbChannels(bgName);
  const readout = tool.querySelector("[data-contrast-readout]");
  const sample = tool.querySelector("[data-contrast-sample]");
  sample.style.color = `var(${fgName})`;
  sample.style.background = `var(${bgName})`;
  if (!fg || !bg) {
    readout.textContent = activeLocale === "en" ? "Could not read the computed color." : "Não foi possível ler a cor computada.";
    return;
  }
  const ratio = contrastRatio(fg, bg);
  const text = ratio >= 4.5 ? "≥ 4.5:1" : ratio >= 3 ? (activeLocale === "en" ? "between 3:1 and 4.5:1" : "entre 3:1 e 4.5:1") : "< 3:1";
  readout.textContent = `${ratio.toFixed(2)}:1 · ${text} · ${toHex(fg)} ${activeLocale === "en" ? "on" : "sobre"} ${toHex(bg)}`;
}

function buttonClass(data) {
  const classes = ["in-button", `in-button--${data.variant}`];
  if (data.size !== "md") classes.push(`in-button--${data.size}`);
  return classes.join(" ");
}

function syncPlayground(playground) {
  const kind = playground.dataset.playground;
  const data = Object.fromEntries(new FormData(playground.querySelector("form")).entries());
  const preview = playground.querySelector("[data-preview]");
  if (data.width) preview.style.maxInlineSize = data.width;
  else preview.style.maxInlineSize = "";

  if (kind === "button") {
    const subject = playground.querySelector("[data-subject]");
    const known = ["Salvar rascunho", "Publicar", "Revisar mudanças", "Ver histórico", "Detalhes", "Excluir projeto"];
    const defaults = {
      primary: "Salvar rascunho",
      commit: "Publicar",
      secondary: "Revisar mudanças",
      ghost: "Ver histórico",
      quiet: "Detalhes",
      danger: "Excluir projeto"
    };
    const labelInput = playground.querySelector("[name=label]");
    if (!playground.dataset.labelTouched && known.includes(labelInput.value)) {
      labelInput.value = defaults[data.variant];
      data.label = labelInput.value;
    }
    subject.className = buttonClass(data);
    subject.textContent = data.label || "Rótulo";
    subject.disabled = data.disabled === "on";
    const disabled = subject.disabled ? " disabled" : "";
    setLiveCode(playground, "html", `<button class="${subject.className}" type="button"${disabled}>${subject.textContent}</button>`);
  }

  if (kind === "input") {
    const field = playground.querySelector("[data-subject]");
    const label = field.querySelector("label");
    const input = field.querySelector("input");
    const message = field.querySelector("p");
    label.textContent = data.label || "Campo";
    input.value = data.value ?? "";
    input.disabled = data.state === "disabled";
    input.readOnly = data.state === "readonly";
    message.id = "play-email-msg";
    if (data.state === "invalid") {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "play-email-msg");
      message.className = "in-field__message in-field__message--error";
      message.textContent = data.message || "Informe um endereço completo, como nome@dominio.com";
    } else {
      input.removeAttribute("aria-invalid");
      message.className = "in-field__message";
      message.textContent = data.message || "";
    }
    const attrs = [
      'class="in-input"',
      'id="email"',
      'type="email"',
      `value="${data.value ?? ""}"`,
      data.state === "invalid" ? 'aria-invalid="true" aria-describedby="email-err"' : "",
      data.state === "disabled" ? "disabled" : "",
      data.state === "readonly" ? "readonly" : ""
    ]
      .filter(Boolean)
      .join(" ");
    const msgClass = data.state === "invalid" ? "in-field__message in-field__message--error" : "in-field__message";
    setLiveCode(
      playground,
      "html",
      `<div class="in-field">
  <label class="in-field__label" for="email">${data.label || "Campo"}</label>
  <input ${attrs} />
  <p class="${msgClass}" id="email-err">${message.textContent}</p>
</div>`
    );
  }

  if (kind === "card") {
    const card = playground.querySelector("[data-subject]");
    if (data.kind) card.setAttribute("data-kind", data.kind);
    else card.removeAttribute("data-kind");
    card.querySelector("[data-card-title]").textContent = data.title || "Título";
    card.querySelector("[data-card-body]").textContent = data.body || "";
    const kindAttr = data.kind ? ` data-kind="${data.kind}"` : "";
    setLiveCode(
      playground,
      "html",
      `<article class="in-card"${kindAttr}>
  <h2 class="in-title">${data.title || "Título"}</h2>
  <p>${data.body || ""}</p>
</article>`
    );
  }

  if (kind === "badge") {
    const badge = playground.querySelector("[data-subject]");
    badge.className = data.variant ? `in-badge in-badge--${data.variant}` : "in-badge";
    badge.textContent = data.label || "badge";
    setLiveCode(playground, "html", `<span class="${badge.className}">${badge.textContent}</span>`);
  }
}

function setLiveCode(playground, lang, source) {
  let figure = playground.querySelector("[data-live-code]");
  if (!figure) {
    figure = document.createElement("figure");
    figure.className = "code";
    figure.dataset.liveCode = "true";
    figure.innerHTML = `<figcaption><span class="in-voice-machine"></span><button type="button" class="copy" data-copy>${esc(demoText(activeLocale, "copy"))}</button></figcaption><pre tabindex="0"><code></code></pre>`;
    playground.append(figure);
  }
  figure.querySelector(".in-voice-machine").textContent = lang;
  figure.querySelector("code").textContent = source.trim();
}

function bindPlaygrounds() {
  for (const playground of article.querySelectorAll("[data-playground]")) {
    const form = playground.querySelector("form");
    const label = form.querySelector("[name=label]");
    label?.addEventListener("input", () => {
      playground.dataset.labelTouched = "true";
    });
    form.addEventListener("input", () => syncPlayground(playground));
    form.addEventListener("change", () => syncPlayground(playground));
    syncPlayground(playground);
  }
}

function bindMotion() {
  const demo = article.querySelector("[data-motion]");
  if (!demo) return;
  const dot = demo.querySelector("[data-dot]");
  let on = Boolean(dot.style.transform && dot.style.transform !== "translateX(0px)" && dot.style.transform !== "translateX(0)");
  demo.querySelector("[data-run]").addEventListener("click", () => {
    dot.style.transitionProperty = "transform";
    dot.style.transitionDuration = demo.querySelector("[data-duration]").value;
    dot.style.transitionTimingFunction = demo.querySelector("[data-ease]").value;
    on = !on;
    dot.style.transform = on ? "translateX(calc(100cqi - 1.25rem))" : "translateX(0)";
  });
}

function bindContrast() {
  const tool = article.querySelector("[data-contrast-tool]");
  if (!tool) return;
  tool.addEventListener("change", paintContrast);
  paintContrast();
}

function bindFilter() {
  const rootFilter = article.querySelector("[data-filter]");
  if (!rootFilter) return;
  const input = rootFilter.querySelector("[data-filter-input]");
  const items = [...rootFilter.querySelectorAll("[data-filter-item]")];
  const empty = rootFilter.querySelector("[data-filter-empty]");
  const count = rootFilter.querySelector("[data-filter-count]");
  const run = () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      const show = !query || item.textContent.toLowerCase().includes(query);
      item.hidden = !show;
      if (show) visible += 1;
    }
    empty.hidden = visible !== 0;
    count.textContent = activeLocale === "en" ? `${visible} of ${items.length}` : `${visible} de ${items.length}`;
  };
  input.addEventListener("input", run);
  run();
}

function bindForm() {
  const form = article.querySelector("[data-demo-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.querySelector("#proj-name");
    const email = form.querySelector("#proj-email");
    const message = form.querySelector("[data-email-msg]");
    const status = form.querySelector("[data-form-status]");
    let ok = true;
    if (!name.value.trim()) {
      name.setAttribute("aria-invalid", "true");
      ok = false;
    } else name.removeAttribute("aria-invalid");
    const emailOk = email.value.includes("@") && email.value.slice(email.value.indexOf("@") + 1).includes(".");
    if (!emailOk) {
      email.setAttribute("aria-invalid", "true");
      email.setAttribute("aria-describedby", "proj-email-err");
      message.id = "proj-email-err";
      message.className = "in-field__message in-field__message--error";
      message.textContent = demoFormText("emailError");
      ok = false;
    } else {
      email.removeAttribute("aria-invalid");
      message.className = "in-field__message";
      message.textContent = demoFormText("emailHelp");
    }
    status.dataset.result = ok ? "saved" : "invalid";
    status.textContent = demoFormText(status.dataset.result);
  });
  form.querySelector("[data-publish]")?.addEventListener("click", () => {
    const dialog = document.querySelector("#confirm-publish");
    dialog.showModal();
  });
}

function demoFormText(key) {
  const messages = {
    en: { emailError: "Enter a complete address, such as name@example.com", emailHelp: "Used only if publishing fails.", saved: "Draft saved on this page. Nothing was sent to a server.", invalid: "The draft was not saved. Correct the indicated fields." },
    "pt-BR": { emailError: "Informe um endereço completo, como nome@dominio.com", emailHelp: "Usado só se a publicação falhar.", saved: "Rascunho salvo nesta página. Nada foi enviado a um servidor.", invalid: "O rascunho não foi salvo. Corrija os campos indicados." },
  };
  return messages[activeLocale]?.[key] ?? messages.en[key];
}

function bindConfirm() {
  const opener = article.querySelector("[data-open-confirm]");
  const dialog = article.querySelector("#confirm-delete");
  if (opener && dialog) {
    opener.addEventListener("click", () => {
      dialog._return = opener;
      dialog.showModal();
    });
    dialog.addEventListener("close", () => {
      const status = article.querySelector("[data-confirm-status]");
      if (dialog.returnValue === "confirm") {
        status.dataset.result = "confirmed";
      } else {
        status.dataset.result = "cancelled";
      }
      status.textContent = demoFeedbackText(status.dataset.result);
      dialog._return?.focus();
    });
  }
  article.querySelector("[data-retry]")?.addEventListener("click", (event) => {
    const status = event.currentTarget.parentElement.querySelector("[data-retry-status]");
    status.textContent = demoFeedbackText("retry");
  });
  article.querySelector("[data-create-env]")?.addEventListener("click", (event) => {
    const status = article.querySelector("[data-env-status]");
    status.textContent = demoFeedbackText("created");
    event.currentTarget.disabled = true;
  });
}

function demoFeedbackText(key) {
  const messages = {
    en: { confirmed: '“project-x” marked deleted in this demonstration. No files were removed.', cancelled: 'Deletion cancelled.', retry: 'Another attempt was recorded here. There is no remote connection to retry.', created: 'Environment “local” created in this demonstration.' },
    "pt-BR": { confirmed: '“projeto-x” marcado como excluído nesta demonstração. Nenhum arquivo foi removido.', cancelled: 'Exclusão cancelada.', retry: 'Nova tentativa registrada aqui. Não há conexão remota para repetir.', created: 'Ambiente “local” criado nesta demonstração.' },
  };
  return messages[activeLocale]?.[key] ?? messages.en[key];
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function bindCopy(event) {
  const button = event.target.closest("[data-copy], [data-copy-text]");
  if (!button || !article.contains(button)) return;
  const text = button.hasAttribute("data-copy-text")
    ? button.getAttribute("data-copy-text")
    : (button.closest("figure")?.querySelector("code")?.textContent ?? "");
  copyText(text).then(() => {
    const previous = button.textContent;
    button.textContent = demoText(activeLocale, "copied");
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1400);
  });
}

function paintDynamic() {
  paintSwatches();
  paintContrast();
}

function show(route, { focusTitle = false } = {}) {
  const page = pageById.get(route.page);
  const group = flat.find((item) => item.id === page.id).group;
  renderNav(page.id);
  renderCrumbs(page, group);
  renderPage(page, group);
  buildToc();
  bindPlaygrounds();
  bindMotion();
  bindContrast();
  bindFilter();
  bindForm();
  bindConfirm();
  paintDynamic();
  closeNav();
  if (route.anchor) scrollToId(route.anchor);
  else {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (focusTitle) article.querySelector("#titulo")?.focus();
  }
}

function openSearch() {
  if (!searchDialog.open) searchDialog.showModal();
  searchInput.focus();
  searchInput.select();
  runSearch();
}

function localizedPageStatus(status) {
  return activeLocale === "en" ? ({ implementado: "implemented", misto: "mixed", especificado: "specified", "em qualificação": "in qualification" }[status] ?? status) : status;
}

function runSearch() {
  const query = searchInput.value.trim().toLowerCase();
  searchActive = -1;
  if (!query) {
    searchResults.innerHTML = "";
    searchStatus.textContent = demoText(activeLocale, "typeToSearch");
    return;
  }
  const hits = searchIndex
    .map((entry) => {
      const page = pageById.get(entry.page);
      const group = flat.find((item) => item.id === entry.page)?.group;
      const title = entry.anchor ? (activeLocale === "en" ? entry.englishTitle : entry.title) : demoPageTitle(activeLocale, page);
      const localizedText = `${demoPageTitle(activeLocale, page)} ${demoPageLede(activeLocale, page)} ${group ? demoGroupLabel(activeLocale, group.label) : ""}`;
      const pos = `${entry.hay} ${localizedText}`.toLowerCase().indexOf(query);
      return pos === -1
        ? null
        : {
            entry,
            pos,
            title,
            group: group ? demoGroupLabel(activeLocale, group.label) : entry.group,
            titleHit: title.toLowerCase().includes(query),
          };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.titleHit) - Number(a.titleHit) || a.pos - b.pos)
    .slice(0, 12);
  if (!hits.length) {
    const emptyMessage = activeLocale === "en"
      ? `${demoText(activeLocale, "noResults")} for “${searchInput.value.trim()}”. ${demoText(activeLocale, "tryTerms")}`
      : `${demoText(activeLocale, "noResults")} para “${searchInput.value.trim()}”. ${demoText(activeLocale, "tryTerms")}`;
    searchResults.innerHTML = `<p class="search-empty">${esc(emptyMessage)}</p>`;
    searchStatus.textContent = `${demoText(activeLocale, "noResults")}.`;
    return;
  }
  searchResults.innerHTML = hits
    .map(
      (hit, index) =>
        `<button type="button" class="search-hit" data-index="${index}" data-page="${hit.entry.page}" data-anchor="${hit.entry.anchor}"><span class="kicker">${esc(hit.group)}</span><span>${esc(hit.title)}</span></button>`
    )
    .join("");
  searchStatus.textContent = `${hits.length} ${demoText(activeLocale, "resultCount")}.`;
}

function activateHit(button) {
  if (!button) return;
  searchDialog.close();
  location.hash = `#/${button.dataset.page}${button.dataset.anchor ? `/${button.dataset.anchor}` : ""}`;
}

function bootAppearance() {
  const storedTheme = localStorage.getItem("inteiro-docs-theme");
  const storedDensity = localStorage.getItem("inteiro-docs-density");
  if (storedTheme) themeSelect.value = storedTheme;
  else themeSelect.value = root.getAttribute("data-in-theme") || "dark";
  if (storedDensity) densitySelect.value = storedDensity;
  else densitySelect.value = root.getAttribute("data-in-density") || "focus";
  root.setAttribute("data-in-theme", themeSelect.value);
  root.setAttribute("data-in-density", densitySelect.value);
}

themeSelect.addEventListener("change", () => {
  root.setAttribute("data-in-theme", themeSelect.value);
  localStorage.setItem("inteiro-docs-theme", themeSelect.value);
  paintDynamic();
});
densitySelect.addEventListener("change", () => {
  root.setAttribute("data-in-density", densitySelect.value);
  localStorage.setItem("inteiro-docs-density", densitySelect.value);
});

menuButton.addEventListener("click", () => {
  if (document.body.classList.contains("nav-open")) closeNav();
  else openNav();
});
scrim.addEventListener("click", closeNav);
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
    closeNav();
    menuButton.focus();
  }
});

openSearchButton.addEventListener("click", openSearch);
searchInput.addEventListener("input", runSearch);
searchInput.addEventListener("keydown", (event) => {
  const buttons = [...searchResults.querySelectorAll("button")];
  if (event.key === "ArrowDown") {
    event.preventDefault();
    searchActive = Math.min(searchActive + 1, buttons.length - 1);
    buttons[searchActive]?.focus();
  }
  if (event.key === "ArrowUp" && document.activeElement === searchInput) {
    event.preventDefault();
  }
});
searchResults.addEventListener("keydown", (event) => {
  const buttons = [...searchResults.querySelectorAll("button")];
  const index = buttons.indexOf(document.activeElement);
  if (event.key === "ArrowDown") {
    event.preventDefault();
    buttons[index + 1]?.focus();
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (index <= 0) searchInput.focus();
    else buttons[index - 1]?.focus();
  }
  if (event.key === "Enter") {
    event.preventDefault();
    activateHit(document.activeElement);
  }
});
searchResults.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) activateHit(button);
});

article.addEventListener("click", bindCopy);
navEl.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNav();
});

const kbd = document.querySelector("#search-kbd");
if (/Mac/i.test(navigator.userAgent)) kbd.textContent = "⌘K";

if (!document.querySelector("#confirm-publish")) {
  const dialog = document.createElement("dialog");
  dialog.id = "confirm-publish";
  dialog.className = "confirm";
  dialog.innerHTML = `<form method="dialog" class="in-stack">
    <h2 class="in-title">${esc(demoText(activeLocale, "publishTitle"))}</h2>
    <p>${esc(demoText(activeLocale, "publishBody"))}</p>
    <div class="in-row">
      <button class="in-button in-button--quiet" value="cancel">${esc(demoText(activeLocale, "cancel"))}</button>
      <button class="in-button in-button--commit" value="confirm">${esc(demoText(activeLocale, "publish"))}</button>
    </div>
  </form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => {
    const status = document.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent =
      dialog.returnValue === "confirm"
        ? demoText(activeLocale, "publishRecorded")
        : demoText(activeLocale, "publishCancelled");
  });
}

bootAppearance();
syncSidebar();
window.addEventListener("resize", syncSidebar);
if (!location.hash) history.replaceState(null, "", "#/introduction/overview");
show(parseHash());
window.addEventListener("hashchange", () => show(parseHash(), { focusTitle: true }));
