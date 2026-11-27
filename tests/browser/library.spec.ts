import { test, expect } from "@playwright/test";
import axe from "axe-core";
for (const theme of ["dark", "light", "contrast-dark", "contrast-light"])
  for (const width of [320, 1280])
    test(`Dashboard ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=biblioteca-templates--dashboard&viewMode=story&globals=theme:${theme};direction:${width === 320 ? "rtl" : "ltr"}`,
      );
      await expect(
        page.getByRole("heading", { name: "Operação" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const bounds = await page.locator(".in-grid").evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return Array.from(el.children).every((child) => {
          const box = child.getBoundingClientRect();
          return box.left >= rect.left - 1 && box.right <= rect.right + 1;
        });
      });
      expect(bounds).toBe(true);
      await page.addScriptTag({ content: axe.source });
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(
          document.getElementById("storybook-root"),
          { rules: { region: { enabled: false } } },
        );
        return result.violations.map((v: any) => ({
          id: v.id,
          nodes: v.nodes.map((n: any) => n.target),
        }));
      });
      expect(violations).toEqual([]);
      await page.screenshot({
        path: `artifacts/screenshots/dashboard-${theme}-${width}.png`,
        fullPage: true,
      });
    });
test("Dialog contém foco, fecha por Escape e restaura foco", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=biblioteca-templates--modal&viewMode=story");
  const open = page.getByRole("button", { name: "Abrir" });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
});
