import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InteiroProvider } from "../../packages/react/src/index.ts";
for (const theme of ["light", "dark", "contrast-light", "contrast-dark"])
  test(
    "legacy auto provider inherits explicit " + theme + " parent",
    async ({ page }) => {
      await page.goto(
        "http://127.0.0.1:4178/packages/composition/examples/app-shell.html",
      );
      const markup = renderToStaticMarkup(
        createElement(InteiroProvider, {
          appearance: "auto",
          children: createElement("p", null, "Conteúdo legado"),
        }),
      );
      await page.locator("body").evaluate(
        (body, { markup, theme }) => {
          body.innerHTML =
            '<section id="parent" data-in-theme="' +
            theme +
            '">' +
            markup +
            "</section>";
        },
        { markup, theme },
      );
      await expect(page.locator("#parent .in-root")).not.toHaveAttribute(
        "data-in-theme",
      );
      const colors = await page.evaluate(() => {
        const parent = document.querySelector("#parent")!,
          child = parent.querySelector(".in-root")!;
        return [parent, child].map((element) =>
          getComputedStyle(element)
            .getPropertyValue("--in-color-background-canvas")
            .trim(),
        );
      });
      expect(colors[0]).not.toBe("");
      expect(colors[1]).toBe(colors[0]);
    },
  );
