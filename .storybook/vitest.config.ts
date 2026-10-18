import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [
    storybookTest({ configDir: fileURLToPath(new URL(".", import.meta.url)) }),
  ],
  test: {
    name: "stories",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
