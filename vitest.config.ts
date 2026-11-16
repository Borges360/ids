import { defineConfig } from "vitest/config";
import { structuredResultFile } from "./scripts/structured-results.mjs";

const results = structuredResultFile("vitest");
export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "tests/**/*.test.ts"
    ],
    environment: "node",
    reporters: results
      ? ["default", ["json", { outputFile: results }]]
      : ["default"],
    testTimeout: 30000
  }
});
