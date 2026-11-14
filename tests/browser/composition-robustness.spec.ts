import { test, expect } from "@playwright/test";
import { patterns } from "../../packages/composition/src/index.ts";
import { gradingContext } from "../../packages/evaluation/src/grading-context.ts";

for (const pattern of patterns) {
  test(`empty optional strings, reduced motion and induced clipping: ${pattern.id}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(
      `http://127.0.0.1:4178/packages/composition/examples/${pattern.id}.html`,
    );
    const result = await page.evaluate(() => {
      let cleared = 0;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        // Optional content may be empty; essential accessible names remain required.
        if (
          parent?.closest("p,td,article") &&
          !parent.closest(
            "button,a,label,legend,h1,h2,h3,[aria-label],script,style",
          )
        ) {
          node.textContent = "";
          cleared++;
        }
      }
      return {
        cleared,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        motion: Array.from(
          document.querySelectorAll(".in-composition *"),
        ).filter((element) => {
          const css = getComputedStyle(element);
          return (
            css.animationName !== "none" ||
            css.transitionDuration
              .split(",")
              .some((value) => parseFloat(value) > 0)
          );
        }).length,
      };
    });
    expect(result.overflow).toBe(false);
    expect(result.motion).toBe(0);
    const expectedKeys = await page
      .locator(
        "button,input:not([type=hidden]),select,textarea,a[href],summary,[tabindex]",
      )
      .evaluateAll((elements) => {
        const radioGroups = new Set<string>();
        return elements.flatMap((element, index) => {
          const control = element as HTMLElement;
          const closedDisclosure = control.closest("details:not([open])");
          if (
            closedDisclosure &&
            control !== closedDisclosure.querySelector("summary")
          )
            return [];
          const css = getComputedStyle(control),
            box = control.getBoundingClientRect();
          if (
            control.tabIndex < 0 ||
            control.matches(":disabled") ||
            control.closest("[hidden],[inert]") ||
            css.display === "none" ||
            css.visibility === "hidden" ||
            !box.width ||
            !box.height
          )
            return [];
          if (
            control instanceof HTMLInputElement &&
            control.type === "radio" &&
            control.name
          ) {
            if (radioGroups.has(control.name)) return [];
            const selected = elements.find(
              (other) =>
                other instanceof HTMLInputElement &&
                other.type === "radio" &&
                other.name === control.name &&
                other.checked,
            );
            if (selected && selected !== control) return [];
            radioGroups.add(control.name);
          }
          const key = "control-" + index;
          control.dataset.inKeyboardKey = key;
          return [key];
        });
      });
    const visitedKeys = new Set<string>();
    for (
      let attempt = 0;
      attempt < 64 && visitedKeys.size < expectedKeys.length;
      attempt++
    ) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(
        () =>
          (document.activeElement as HTMLElement | null)?.dataset.inKeyboardKey,
      );
      if (focused) visitedKeys.add(focused);
    }
    expect(expectedKeys.filter((key) => !visitedKeys.has(key))).toEqual([]);
    if (expectedKeys[0]) {
      // Skip links are pointer-visible only while focused. Return using the
      // keyboard before testing hover rather than trying to click a hidden link.
      for (let attempt = 0; attempt < 64; attempt++) {
        const focused = await page.evaluate(
          () =>
            (document.activeElement as HTMLElement | null)?.dataset
              .inKeyboardKey,
        );
        if (focused === expectedKeys[0]) break;
        await page.keyboard.press("Tab");
      }
      await expect(page.locator(":focus")).toHaveAttribute(
        "data-in-keyboard-key",
        expectedKeys[0],
      );
      const first = page.locator(
        '[data-in-keyboard-key="' + expectedKeys[0] + '"]',
      );
      await first.click({ trial: true });
      await first.hover();
      await page.screenshot({
        path: `artifacts/p0-patterns/${pattern.id}-hover.png`,
        fullPage: true,
      });
    }
    await page.screenshot({
      path: `artifacts/p0-patterns/${pattern.id}-empty-content.png`,
      fullPage: true,
    });
    await page
      .locator("[data-in-pattern],.in-composition")
      .first()
      .evaluate((element) => {
        const style = (element as HTMLElement).style;
        style.minInlineSize = "1800px";
        style.maxInlineSize = "none";
        style.inlineSize = "1800px";
      });
    const negative = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      bodyWidth: document.body.getBoundingClientRect().width,
      bodyStyle: document.body.getAttribute("style"),
      bodyClass: document.body.className,
    }));
    expect(negative.documentWidth, JSON.stringify(negative)).toBeGreaterThan(
      negative.viewportWidth + 1,
    );
    await info.attach("robustness.json", {
      body: JSON.stringify({
        patternId: pattern.id,
        emptyOptionalText: result.cleared,
        keyboard: {
          expected: expectedKeys.length,
          visited: [...visitedKeys],
          notApplicableReason: expectedKeys.length
            ? null
            : "Pattern has no enabled controls in its default rendering",
        },
        reducedMotion: "passed",
        negativeOverflow: "detected",
        viewport: 320,
      }),
      contentType: "application/json",
    });
  });

  test(`native browser zoom 200%, RTL and long translation: ${pattern.id}`, async ({
    browser,
  }, info) => {
    const runtime = await gradingContext(
      browser,
      {
        viewport: { width: 640, height: 1624 },
        locale: "pt-BR",
        reducedMotion: "reduce",
      },
      2,
    );
    try {
      const page = await runtime.context.newPage();
      await page.goto(
        `http://127.0.0.1:4178/packages/composition/examples/${pattern.id}.html`,
      );
      await page.evaluate(() => {
        document.documentElement.dir = "rtl";
        document
          .querySelectorAll(
            "p,h1,h2,h3,td,th,caption,label,button,summary,legend,nav a",
          )
          .forEach((element) => {
            element.append(" — Conteúdo traduzido " + "Informação".repeat(20));
          });
      });
      const zoom = await runtime.applyZoom(page, "http://127.0.0.1:4178");
      expect(zoom).toMatchObject({
        method: "native-browser-tab-zoom",
        factor: 2,
      });
      expect(
        await page.evaluate(() => ({
          cssZoom: getComputedStyle(document.body).zoom,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        })),
      ).toEqual({ cssZoom: "1", overflow: false });
      await page.screenshot({
        path: `artifacts/p0-patterns/${pattern.id}-native-200-rtl.png`,
        fullPage: true,
      });
      await info.attach("native-zoom.json", {
        body: JSON.stringify({
          patternId: pattern.id,
          zoom,
          direction: "rtl",
          content: "long-translated",
        }),
        contentType: "application/json",
      });
    } finally {
      await runtime.close();
    }
  });
}
