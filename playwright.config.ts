import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:6006", browserName: "chromium" },
  webServer: {
    command: "npx http-server storybook-static -p 6006 -a 127.0.0.1",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: !process.env.CI,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
