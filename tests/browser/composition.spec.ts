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
test("portable dialog returns focus and closes on Escape", async ({ page }) => {
  await page.goto(
    "http://127.0.0.1:4178/packages/composition/examples/dialog.html",
  );
  const trigger = page.getByRole("button", { name: "Abrir diálogo" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
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
      document.querySelectorAll("p,h1,h2,td,th").forEach((element, index) => {
        if (index % 2 === 0)
          element.append(
            " — Conteúdo traduzido com palavras extensas: " +
              "Informação".repeat(12),
          );
      });
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
