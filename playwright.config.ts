import { defineConfig } from "@playwright/test";
import { structuredResultFile } from "./scripts/structured-results.mjs";

const results = structuredResultFile("playwright");
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:6006", browserName: "chromium" },
  webServer: [
    {
      command: "npx http-server storybook-static -p 6006 -a 127.0.0.1",
      url: "http://127.0.0.1:6006",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node scripts/serve-fixtures.mjs",
      url: "http://127.0.0.1:4178/health",
      reuseExistingServer: false,
    },
  ],
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ...(results ? [["json", { outputFile: results }] as ["json", object]] : []),
  ],
});
