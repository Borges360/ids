import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gradingContext } from "../../packages/evaluation/src/grading-context.ts";

// The file owns one fixed-port server, so keep its tests in one worker even
// under the fully parallel release matrix (parallel workers would collide).
test.describe.configure({ mode: "default" });
let server: ChildProcess;
const url = "http://127.0.0.1:4192";

test.beforeAll(async () => {
  server = spawn(process.execPath, ["scripts/serve-demo.mjs"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, HOST: "127.0.0.1", PORT: "4192" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Catalog startup timeout")), 15000);
    server.once("error", reject);
    server.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Catalog server exited during startup"));
    });
    server.stdout!.once("data", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (!server || server.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
    server.kill();
  });
});

for (const width of [320, 375, 768, 1440]) {
  for (const locale of ["en", "pt-BR"] as const) {
    test(`catalog language and layout at ${width}px in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(`${url}/apps/catalog/index.html`);
      await page.locator("#pattern").selectOption("dashboard-grid");
      await page.locator("#interface-language").selectOption(locale);
      await page.locator("#interface-language").focus();

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("#pattern")).toHaveValue("dashboard-grid");
      await expect(page.locator("#interface-language")).toBeFocused();

      const result = await page.evaluate(() => {
        const controls = ["#interface-language", "#pattern", "#example"];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          controlsInViewport: controls.every((selector) => {
            const bounds = document.querySelector(selector)!.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= innerWidth;
          }),
          title: document.querySelector("h1")?.textContent?.trim(),
          languageLabel: document.querySelector('label[for="interface-language"]')?.textContent?.trim(),
        };
      });

      expect(result.overflow).toBe(false);
      expect(result.controlsInViewport).toBe(true);
      expect(result.title).toBe(locale === "en" ? "P0 patterns" : "Padrões P0");
      expect(result.languageLabel).toBe(
        locale === "en" ? "Interface language" : "Idioma da interface",
      );
    });
  }
}

test("catalog reflows without overflow at native 200% browser zoom", async ({ browser }) => {
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
    await page.goto(`${url}/apps/catalog/index.html`);
    await page.locator("#interface-language").selectOption("pt-BR");
    const zoom = await runtime.applyZoom(page, url);

    expect(zoom).toMatchObject({ method: "native-browser-tab-zoom", factor: 2 });
    const layout = await page.evaluate(() => {
      const selector = document.querySelector("#interface-language")!.getBoundingClientRect();
      return {
        cssZoom: getComputedStyle(document.body).zoom,
        overflow: document.documentElement.scrollWidth > innerWidth,
        selectorInViewport: selector.left >= 0 && selector.right <= innerWidth,
      };
    });
    expect(layout).toEqual({ cssZoom: "1", overflow: false, selectorInViewport: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  } finally {
    await runtime.close();
  }
});
