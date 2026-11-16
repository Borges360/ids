import { mkdtemp, mkdir, writeFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
/** A fixed evaluator extension invokes the browser's native tab zoom API. */
export async function gradingContext(
  browser: Browser,
  options: BrowserContextOptions,
  zoomFactor?: number,
) {
  if (zoomFactor === undefined) {
    const context = await browser.newContext(options);
    return {
      context,
      close: () => context.close(),
      applyZoom: async (_page: Page, _origin: string) => undefined,
    };
  }
  if (![1, 2].includes(zoomFactor))
    throw Error("Unsupported native zoom factor");
  const root = await mkdtemp(join(tmpdir(), "inteiro-grading-zoom-"));
  const cleanup = async () => {
    const actual = await realpath(root);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-grading-zoom-")
    )
      throw Error("Unsafe zoom fixture cleanup");
    await rm(actual, { recursive: true, force: true });
  };
  try {
    const extension = join(root, "extension");
    await mkdir(extension);
    await writeFile(
      join(extension, "manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        name: "INTEIRO native zoom fixture",
        version: "1.0",
        permissions: ["tabs"],
        background: { service_worker: "worker.js" },
      }),
    );
    await writeFile(
      join(extension, "worker.js"),
      "chrome.runtime.onInstalled.addListener(()=>{});",
    );
    const context = await chromium.launchPersistentContext(
      join(root, "profile"),
      {
        ...options,
        headless: true,
        channel: "chromium",
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
      },
    );
    return {
      context,
      close: async () => {
        try {
          await context.close();
        } finally {
          await cleanup();
        }
      },
      applyZoom: async (page: Page, origin: string) => {
        const worker =
          context.serviceWorkers()[0] ??
          (await context.waitForEvent("serviceworker", { timeout: 10000 }));
        const before = await page.evaluate(() => ({
          cssWidth: innerWidth,
          dpr: devicePixelRatio,
        }));
        const actual = await worker.evaluate(
          async ({ origin, factor }) => {
            const tabs = (
              globalThis as unknown as {
                chrome: {
                  tabs: {
                    query(options: { url: string }): Promise<{ id?: number }[]>;
                    setZoomSettings(
                      id: number,
                      settings: { mode: string; scope: string },
                    ): Promise<void>;
                    setZoom(id: number, factor: number): Promise<void>;
                    getZoom(id: number): Promise<number>;
                  };
                };
              }
            ).chrome.tabs;
            const matches = await tabs.query({ url: origin + "/*" });
            if (matches.length !== 1 || matches[0]?.id === undefined)
              throw Error("Ambiguous native zoom target");
            const id = matches[0].id;
            await tabs.setZoomSettings(id, {
              mode: "automatic",
              scope: "per-tab",
            });
            await tabs.setZoom(id, factor);
            return tabs.getZoom(id);
          },
          { origin, factor: zoomFactor },
        );
        const after = await page.evaluate(() => ({
          cssWidth: innerWidth,
          dpr: devicePixelRatio,
        }));
        if (
          actual !== zoomFactor ||
          Math.abs(after.cssWidth * actual - before.cssWidth) > 2 ||
          Math.abs(after.dpr - before.dpr * actual) > 0.01
        )
          throw Error(
            "Native zoom did not produce the expected viewport reflow",
          );
        return {
          method: "native-browser-tab-zoom" as const,
          factor: actual,
          before,
          after,
        };
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
