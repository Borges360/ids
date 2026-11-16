import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pages } from "../../apps/demo/content/index.js";

// The file owns one fixed-port server, so keep its tests in one worker even
// under the fully parallel release matrix (parallel workers would collide).
test.describe.configure({ mode: "default" });
let server: ChildProcess;
const url = "http://127.0.0.1:43986";
test.beforeAll(async () => {
  server = spawn(process.execPath, ["scripts/serve-demo.mjs"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, HOST: "127.0.0.1", PORT: "43986" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Demo startup timeout")), 15000);
    server.once("error", reject);
    server.once("exit", () => { clearTimeout(timeout); reject(new Error("Demo exited during startup")); });
    server.stdout!.once("data", () => { clearTimeout(timeout); resolve(); });
  });
});
test.afterAll(async () => {
  if (!server || server.exitCode !== null) return;
  await new Promise<void>((resolve) => { server.once("exit", () => resolve()); server.kill(); });
});

for (const width of [320, 375, 768, 1440]) {
  test(`all documentation pages switch language at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const labels: Record<string, string> = { implementado: "implemented", misto: "mixed", especificado: "specified" };
    for (const doc of pages) {
      await page.goto(`${url}/#/${doc.id}`);
      for (const lang of ["en", "pt-BR"]) {
        await page.locator("#language").selectOption(lang);
        await expect(page.locator(".doc-sections")).toHaveAttribute("lang", lang);
        await expect(page.locator("#content-language-note")).toBeHidden();
        await expect(page.locator("[data-page-status]")).toHaveText(lang === "en" ? (labels[doc.status] ?? doc.status) : doc.status);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${doc.id} ${lang}`).toBe(true);
      }
    }
  });
}

test("English section text is searchable with localized results", async ({ page }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto(`${url}/#/introduction/overview`);
  await page.locator("#language").selectOption("en");
  await page.locator("#open-search").click();
  await page.locator("#search-input").fill("native focus containment");
  await expect(page.locator(".search-hit").first()).toBeVisible();
});

test("language switches preserve the form draft and the mobile selector stays visible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto(`${url}/#/patterns/forms`);
  await page.locator("#proj-name").fill("Draft project");
  await page.locator("#proj-email").fill("example@example.test");
  await page.locator("#language").selectOption("pt-BR");
  await expect(page.locator("#proj-name")).toHaveValue("Draft project");
  await expect(page.locator("#proj-email")).toHaveValue("example@example.test");
  const selector = await page.locator("#language").boundingBox();
  expect(selector).not.toBeNull();
  expect(selector!.x).toBeGreaterThanOrEqual(0);
  expect(selector!.x + selector!.width).toBeLessThanOrEqual(320);
  await page.locator("#language").selectOption("en");
  await expect(page.locator("#proj-name")).toHaveValue("Draft project");
  await expect(page.locator("#proj-email")).toHaveValue("example@example.test");
});
