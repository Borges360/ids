import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import {
  runAction,
  inspectTargetClipping,
  VisualActionAssertionError,
  validateRoutes,
} from "@inteiro/visual";
import { DEFAULTS } from "@inteiro/contracts";

describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "Real browser critical target and keyboard assertions",
  () => {
    let browser: Browser;
    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });
    afterAll(async () => {
      await browser?.close();
    });
    const target = { testId: "control" };
    const style =
      "<style>body{margin:0}button{width:120px;height:48px}</style>";
    const button =
      '<button data-testid="control" onclick="window.clicks=(window.clicks||0)+1">Action</button>';

    it("checks pointer reachability without firing click handlers", async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(style + button);
        expect(
          await runAction(
            page,
            { type: "expectReachable", target },
            { timeoutMs: 500 },
          ),
        ).toMatchObject({ reachable: true });
        expect(await page.evaluate(() => (window as any).clicks ?? 0)).toBe(0);
      } finally {
        await page.close();
      }
    });
    for (const [name, html, ruleId] of [
      [
        "overlay",
        button +
          '<div style="position:fixed;inset:0;background:white;z-index:20"></div>',
        "VIS-LAYOUT-001",
      ],
      [
        "pointer-events",
        '<div style="pointer-events:none">' + button + "</div>",
        "VIS-LAYOUT-001",
      ],
      [
        "disabled",
        '<button data-testid="control" disabled>Disabled</button>',
        "VIS-STATE-001",
      ],
    ])
      it("detects " + name, async () => {
        const page = await browser.newPage();
        try {
          await page.setContent(style + html);
          await expect(
            runAction(
              page,
              { type: "expectReachable", target },
              { timeoutMs: 300 },
            ),
          ).rejects.toMatchObject({ ruleId });
        } finally {
          await page.close();
        }
      });
    it("detects partial container clipping even when the center accepts pointer events", async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(
          style +
            '<div style="width:90px;overflow:hidden">' +
            button +
            "</div>",
        );
        expect(
          (await inspectTargetClipping(page.getByTestId("control"))).clipped,
        ).toBe(true);
        await expect(
          runAction(page, { type: "expectUnclipped", target }),
        ).rejects.toMatchObject({ ruleId: "VIS-LAYOUT-001" });
      } finally {
        await page.close();
      }
    });
    it("detects viewport clipping and permits deliberate scroll containers", async () => {
      const page = await browser.newPage({
        viewport: { width: 375, height: 500 },
      });
      try {
        await page.setContent(
          style + '<div style="position:fixed;left:-30px">' + button + "</div>",
        );
        await expect(
          runAction(page, { type: "expectUnclipped", target }),
        ).rejects.toBeInstanceOf(VisualActionAssertionError);
        await page.setContent(
          style +
            '<div style="height:100px;overflow:auto"><div style="height:500px"></div>' +
            button +
            "</div>",
        );
        expect(
          await runAction(
            page,
            { type: "expectReachable", target },
            { timeoutMs: 500 },
          ),
        ).toMatchObject({ reachable: true });
        expect(
          await runAction(page, { type: "expectUnclipped", target }),
        ).toMatchObject({ clipped: false });
        expect(await page.evaluate(() => (window as any).clicks ?? 0)).toBe(0);
      } finally {
        await page.close();
      }
    });
    it("uses real Tab and Shift+Tab without forcing expected focus", async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(
          style + '<button data-testid="first">First</button>' + button,
        );
        await runAction(page, { type: "keyboard", key: "Tab" });
        expect(
          await runAction(
            page,
            { type: "expectFocused", target: { testId: "first" } },
            { timeoutMs: 300 },
          ),
        ).toMatchObject({ focused: true });
        await expect(
          runAction(
            page,
            { type: "expectFocused", target },
            { timeoutMs: 100 },
          ),
        ).rejects.toMatchObject({ ruleId: "VIS-ACCESS-001" });
        await runAction(page, { type: "keyboard", key: "Tab" });
        await runAction(
          page,
          { type: "expectFocused", target },
          { timeoutMs: 300 },
        );
        await runAction(page, { type: "keyboard", key: "Shift+Tab" });
        await runAction(
          page,
          { type: "expectFocused", target: { testId: "first" } },
          { timeoutMs: 300 },
        );
      } finally {
        await page.close();
      }
    });
    it("accepts managed modal focus and a critical control inside the top layer", async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(
          style +
            '<button id="open">Open</button><dialog>' +
            button +
            '</dialog><script>document.querySelector("#open").onclick=()=>document.querySelector("dialog").showModal()</script>',
        );
        await runAction(page, {
          type: "click",
          target: { role: "button", name: "Open" },
        });
        await runAction(
          page,
          { type: "expectFocused", target },
          { timeoutMs: 300 },
        );
        await runAction(
          page,
          { type: "expectReachable", target },
          { timeoutMs: 500 },
        );
        await runAction(page, { type: "expectUnclipped", target });
      } finally {
        await page.close();
      }
    });
    // Freeze-4 Linux task-05: the submit control is renamed when its request
    // completes, after the click resolved but before geometry was recorded.
    const submit =
      "<form onsubmit=\"event.preventDefault();window.finish=()=>{document.querySelector('button').textContent='Adicionar item'}\"><button type=\"submit\">Salvar alterações</button></form>";
    const save = {
      type: "click",
      target: { role: "button", name: "Salvar alterações" },
    } as const;
    // The request completes right after the runner first resolves the clicked
    // target for geometry evidence, whichever resolution method it uses.
    async function interleaved(complete: string) {
      const page = await browser.newPage();
      page.setDefaultTimeout(500);
      const prototype = Object.getPrototypeOf(page.locator("body"));
      const originals = {
        count: prototype.count,
        elementHandles: prototype.elementHandles,
      };
      let completed = false;
      for (const [method, original] of Object.entries(originals))
        prototype[method] = async function (this: unknown) {
          const value = await original.call(this);
          if (!completed) {
            completed = true;
            await page.evaluate(complete);
          }
          return value;
        };
      try {
        await page.setContent(style + submit);
        const observation = await runAction(page, save, { timeoutMs: 500 });
        return { observation, completed, html: await page.content() };
      } finally {
        Object.assign(prototype, originals);
        await page.close();
      }
    }
    it("records post-action geometry when the action's request renames or removes its target", async () => {
      const renamed = await interleaved("window.finish?.()");
      expect(renamed.completed).toBe(true);
      expect(renamed.html).toContain("Adicionar item");
      expect(renamed.observation?.boundingBox).toMatchObject({
        width: 120,
        height: 48,
      });
      const removed = await interleaved(
        "document.querySelector('button')?.remove()",
      );
      expect(removed.completed).toBe(true);
      expect(removed.html).not.toContain("<button");
      expect(removed.observation).toMatchObject({
        target: save.target,
        boundingBox: null,
      });
    });
    it("keeps post-action geometry for a stable target and rejects ambiguity", async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(style + button);
        const observation = await runAction(page, {
          type: "click",
          target,
        });
        expect(observation?.boundingBox).toMatchObject({
          width: 120,
          height: 48,
        });
        await page.setContent(
          style +
            '<button data-testid="control" onclick="this.after(this.cloneNode(true))">Action</button>',
        );
        await expect(
          runAction(page, { type: "click", target }, { timeoutMs: 300 }),
        ).rejects.toThrow("strict mode violation");
      } finally {
        await page.close();
      }
    });
  },
);

it("rejects keyboard actions that force focus or execute arbitrary key sequences before launch", () => {
  for (const action of [
    { type: "keyboard", key: "Tab", target: { testId: "forced" } },
    { type: "keyboard", key: "Control+Shift+I" },
  ])
    expect(() =>
      validateRoutes(
        [
          {
            id: "test",
            path: "/",
            fixture: "fixture",
            criticality: "high",
            viewports: ["mobile"],
            modes: ["dark-calm"],
            states: [{ id: "default", actions: [action] }],
          },
        ],
        DEFAULTS,
      ),
    ).toThrow("allowlisted");
});
