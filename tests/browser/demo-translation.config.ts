import { defineConfig } from "@playwright/test";
import { join } from "node:path";

const outputDir = process.env.IDS_TRANSLATION_TEST_ROOT
  ? join(process.env.IDS_TRANSLATION_TEST_ROOT, "playwright-results")
  : process.env.IDS_TRANSLATION_TEST_OUTPUT;

export default defineConfig({
  testDir: ".",
  testMatch: "demo-translation.spec.ts",
  workers: 1,
  timeout: 60000,
  reporter: "list",
  ...(outputDir ? { outputDir } : {}),
  use: { browserName: "chromium", headless: true },
});
