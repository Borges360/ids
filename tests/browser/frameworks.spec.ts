import { test, expect } from "@playwright/test";
import axe from "axe-core";
for (const framework of ["html", "react", "vue", "svelte", "next"])
  test(
    "shared contracts render " + framework + " offline",
    async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", (r) =>
        new URL(r.request().url()).hostname === "127.0.0.1"
          ? r.continue()
          : r.abort(),
      );
      await page.goto(
        "http://127.0.0.1:4178/apps/fixtures/" +
          (framework === "next" ? "next/index.html" : framework + ".html"),
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
      if (["vue", "svelte", "next"].includes(framework)) {
        await page.getByLabel("Nome", { exact: true }).fill("Pessoa Exemplo");
        await page.getByRole("button", { name: "Salvar rascunho" }).click();
        await expect(page.getByRole("status")).toHaveText("Rascunho salvo");
      }
      expect(errors).toEqual([]);
      await page.addScriptTag({ content: axe.source });
      const violations = await page.evaluate(async () => {
        const a = (window as any).axe;
        return (
          await a.run({
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
            },
          })
        ).violations.map((v: any) => v.id);
      });
      expect(violations).toEqual([]);
    },
  );
