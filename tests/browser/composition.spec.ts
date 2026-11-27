import { test, expect } from "@playwright/test";
import axe from "axe-core";
import { patterns } from "../../packages/composition/src/index.ts";
import { renderPattern } from "../../packages/composition/src/render.ts";
import { inspectInteractionTargets } from "../../packages/visual/src/targets.ts";
const full = process.env.INTEIRO_FULL_MATRIX === "1";
for (const [i, p] of patterns.entries())
  for (const state of p.states)
    for (const width of full
      ? [320, 375, 768, 1024, 1440]
      : [i % 3 === 0 ? 375 : i % 3 === 1 ? 768 : 1440])
      for (const [theme, density] of full
        ? [
            ["dark", "calm"],
            ["dark", "focus"],
            ["light", "calm"],
            ["light", "focus"],
            ["contrast-dark", "calm"],
            ["contrast-dark", "focus"],
            ["contrast-light", "calm"],
            ["contrast-light", "focus"],
          ]
        : [[i % 2 ? "light" : "dark", i % 2 ? "calm" : "focus"]]) {
        test(`${p.id} ${state} ${width} ${theme} ${density}: semantics, layout and accessibility`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(
            "http://127.0.0.1:4178/packages/composition/examples/" +
              p.id +
              ".html",
          );
          const markup = renderPattern(p.id, state);
          await page.locator("body").evaluate(
            (body, html) => {
              body.innerHTML = html;
            },
            p.id === "app-shell"
              ? markup
              : "<main>" +
                  (markup.includes("<h1>")
                    ? ""
                    : "<h1>" + p.description + "</h1>") +
                  markup +
                  "</main>",
          );
          await page.evaluate(
            ({ i, theme, density }) => {
              document.documentElement.dataset.inTheme = theme;
              document.documentElement.dataset.inDensity = density;
              document.documentElement.dir = i % 3 === 0 ? "rtl" : "ltr";
            },
            { i, theme: theme!, density: density! },
          );
          await page.evaluate(async () => {
            const path = "/packages/composition/src/behavior.js";
            const { enhance } = await import(path);
            enhance(document.body);
          });
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator("h1")).toBeVisible();
          if (state === "readonly") {
            await expect(
              page.locator(
                'input[type="checkbox"]:not(:disabled),input[type="radio"]:not(:disabled),select:not(:disabled)',
              ),
            ).toHaveCount(0);
            await expect(
              page.locator(
                'input:not([type="checkbox"]):not([type="radio"]):not([readonly]),textarea:not([readonly])',
              ),
            ).toHaveCount(0);
          }
          if (state === "invalid") {
            for (const field of await page
              .locator("input,select,textarea")
              .all()) {
              await expect(field).toHaveAttribute("aria-invalid", "true");
              const descriptions =
                (await field.getAttribute("aria-describedby"))?.split(/\s+/) ??
                [];
              expect(descriptions).toContain("pattern-error");
              await expect(page.locator("#pattern-error")).toBeVisible();
              if (p.id === "form-layout" || p.id === "field-group")
                expect(descriptions).toContain("help");
            }
          }
          expect(
            (await inspectInteractionTargets(page)).filter(
              (target) => target.undersized,
            ),
          ).toEqual([]);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          await page.addScriptTag({ content: axe.source });
          const violations = await page.evaluate(async () => {
            const a = (window as any).axe;
            const result = await a.run({
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            });
            return result.violations.map((v: any) => ({
              id: v.id,
              nodes: v.nodes.map((n: any) => n.target),
            }));
          });
          expect(violations).toEqual([]);
          await page.screenshot({
            path: `artifacts/p0-patterns/${p.id}-${state}-${width}-${theme}-${density}.png`,
            fullPage: true,
            animations: "disabled",
          });
        });
      }
for (const id of ["dialog", "drawer"])
  for (const state of ["default", "open"])
    test(`portable ${id} ${state} returns focus and closes on Escape`, async ({
      page,
    }) => {
      await page.goto(
        `http://127.0.0.1:4178/packages/composition/examples/${id}${state === "open" ? "-open" : ""}.html`,
      );
      const trigger = page.getByRole("button", {
        name: id === "dialog" ? "Abrir diálogo" : "Abrir painel",
      });
      if (state === "default") await trigger.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
for (const id of ["dropdown-menu", "mobile-navigation"])
  test(`portable ${id} closes on Escape and restores the summary`, async ({
    page,
  }) => {
    await page.goto(
      `http://127.0.0.1:4178/packages/composition/examples/${id}.html`,
    );
    const summary = page.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("details")).toHaveAttribute("open", "");
    await page.locator("details button,details a").first().focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("details")).not.toHaveAttribute("open");
    await expect(summary).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.locator("details")).toHaveAttribute("open", "");
  });
for (const variant of ["popover", "popover-open"])
  test(`portable ${variant} retains native Escape and focus restoration`, async ({
    page,
  }) => {
    await page.goto(
      `http://127.0.0.1:4178/packages/composition/examples/${variant}.html`,
    );
    const trigger = page.getByRole("button", {
      name: "Mais informações",
      exact: true,
    });
    const popover = page.locator("[popover]");
    if (variant === "popover") {
      await trigger.focus();
      await page.keyboard.press("Enter");
    }
    await expect(popover).toBeVisible();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Space");
    await expect(popover).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
test("Escape closes nested disclosures one at a time without closing siblings", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/dropdown-menu.html",
  );
  await page.locator("main").evaluate((main) => {
    main.innerHTML =
      '<details id="outer" open><summary>Externo</summary><details id="inner" open><summary>Interno</summary><button>Ação interna</button></details></details><details id="sibling" open><summary>Independente</summary><p>Conteúdo</p></details>';
  });
  await page.getByRole("button", { name: "Ação interna" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#inner")).not.toHaveAttribute("open");
  await expect(page.locator("#inner > summary")).toBeFocused();
  await expect(page.locator("#outer")).toHaveAttribute("open", "");
  await expect(page.locator("#sibling")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("#outer")).not.toHaveAttribute("open");
  await expect(page.locator("#outer > summary")).toBeFocused();
  await expect(page.locator("#sibling")).toHaveAttribute("open", "");
});
test("Escape dismisses a tooltip before its containing disclosure", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/tooltip.html",
  );
  await page.locator("main").evaluate((main) => {
    main.innerHTML =
      '<details open><summary>Grupo</summary><span class="in-tooltip-wrap" data-in-tooltip><button aria-describedby="nested-tip">Ajuda interna</button><span class="in-tooltip" role="tooltip" id="nested-tip">Ajuda complementar</span></span></details>';
  });
  await page.evaluate(async () => {
    const path = "/packages/composition/src/behavior.js";
    const { enhance } = await import(path);
    enhance(document.querySelector("main"));
  });
  await page.getByRole("button", { name: "Ajuda interna" }).focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await expect(page.locator("details")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("details")).not.toHaveAttribute("open");
  await expect(page.locator("summary")).toBeFocused();
});
for (const overlay of ["popover", "dialog"])
  test(`Escape closes a native ${overlay} before its containing disclosure`, async ({
    page,
  }) => {
    await page.goto(
      "http://127.0.0.1:4178/packages/composition/examples/dropdown-menu.html",
    );
    await page.locator("main").evaluate((main, kind) => {
      main.innerHTML =
        kind === "popover"
          ? '<details open><summary>Grupo</summary><button popovertarget="nested-overlay">Abrir interno</button><div id="nested-overlay" popover><button>Ação interna</button></div></details>'
          : '<details open><summary>Grupo</summary><button data-in-open="nested-overlay">Abrir interno</button><dialog id="nested-overlay" aria-label="Interno"><button>Ação interna</button></dialog></details>';
    }, overlay);
    const trigger = page.getByRole("button", { name: "Abrir interno" });
    await trigger.click();
    await page.getByRole("button", { name: "Ação interna" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("#nested-overlay")).not.toBeVisible();
    await expect(page.locator("details")).toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("details")).not.toHaveAttribute("open");
  });
for (const overlay of ["popover", "dialog"])
  test(`Escape closes an inner disclosure before its native ${overlay}`, async ({
    page,
  }) => {
    await page.goto(
      "http://127.0.0.1:4178/packages/composition/examples/dropdown-menu.html",
    );
    await page.locator("main").evaluate((main, kind) => {
      const content =
        "<details open><summary>Grupo interno</summary><button>Ação interna</button></details>";
      main.innerHTML =
        kind === "popover"
          ? '<button popovertarget="nested-overlay">Abrir externo</button><div id="nested-overlay" popover>' +
            content +
            "</div>"
          : '<button data-in-open="nested-overlay">Abrir externo</button><dialog id="nested-overlay" aria-label="Externo">' +
            content +
            "</dialog>";
    }, overlay);
    const trigger = page.getByRole("button", { name: "Abrir externo" });
    await trigger.click();
    await page.getByRole("button", { name: "Ação interna" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("details")).not.toHaveAttribute("open");
    await expect(page.locator("summary")).toBeFocused();
    await expect(page.locator("#nested-overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#nested-overlay")).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
test("nested dialogs restore each dialog's own invoker", async ({ page }) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/dialog.html",
  );
  await page.locator("main").evaluate((main) => {
    main.innerHTML =
      '<button data-in-open="outer-dialog">Abrir externo</button><dialog id="outer-dialog" aria-label="Externo"><button data-in-open="inner-dialog">Abrir interno</button><dialog id="inner-dialog" aria-label="Interno"><button>Ação interna</button></dialog></dialog>';
  });
  const outerTrigger = page.getByRole("button", { name: "Abrir externo" });
  await outerTrigger.click();
  const innerTrigger = page.getByRole("button", { name: "Abrir interno" });
  await innerTrigger.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Interno", exact: true }),
  ).not.toBeVisible();
  await expect(innerTrigger).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "Externo", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#outer-dialog")).not.toBeVisible();
  await expect(outerTrigger).toBeFocused();
});
test("portable tabs support arrows and selection", async ({ page }) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/tabs.html",
  );
  const first = page.getByRole("tab", { name: "Resumo" });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Histórico" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveText("Histórico sintético");
});
test("portable data table sorts and paginates with native buttons", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/data-table.html",
  );
  await page.getByRole("button", { name: "Ordenar por nome" }).click();
  await expect(page.locator("tbody tr:not([hidden])").first()).toContainText(
    "Alfa",
  );
  await expect(page.locator("th[aria-sort=ascending]")).toBeVisible();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator("[data-in-page-status]")).toHaveText("2 / 2");
  await expect(page.locator("tbody tr:not([hidden])")).toContainText("Zeta");
});
test("portable tooltip appears on focus and Escape dismisses it", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/tooltip.html",
  );
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await page.getByRole("button", { name: "Ajuda" }).focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
});
for (const pattern of patterns)
  test("robust content and 200% zoom: " + pattern.id, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      "http://127.0.0.1:4178/packages/composition/examples/" +
        pattern.id +
        ".html",
    );
    await page.evaluate(() => {
      document.documentElement.dir = "rtl";
      document.body.style.zoom = "2";
      document
        .querySelectorAll(
          "p,h1,h2,h3,td,th,caption,label,button,summary,legend,nav a",
        )
        .forEach((element) => {
          element.append(
            " — Conteúdo traduzido com palavras extensas: " +
              "Informação".repeat(20),
          );
        });
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
