import { defineConfig } from "vitest/config";

// This explicit allowlist contains in-process unit suites. Browser tests,
// local-service tests, subprocess checks, and end-to-end flows stay in the
// controlled Jenkins suite invoked through `npm test`.
export default defineConfig({
  test: {
    include: [
      "tests/contrast/contrast.test.ts",
      "tests/catalog.test.ts",
      "tests/agent-core.test.ts",
      "tests/exports.test.ts",
      "tests/package-dependencies.test.ts",
      "tests/library.test.ts",
      "tests/lint.test.ts",
      "tests/react.test.ts",
      "tests/skills.test.ts",
      "tests/p0/cost-accounting.test.ts",
      "tests/p0/contracts.test.ts",
      "tests/p0/context-integrity.test.ts",
      "tests/p0/composition.test.ts",
      "tests/p0/compatibility.test.ts",
      "tests/p0/governance.test.ts",
      "tests/p0/repair-acceptance.test.ts",
      "tests/p0/impact.test.ts",
      "tests/p0/determinism.test.ts",
      "tests/p0/adoption.test.ts",
      "tests/p0/catalog-language.test.ts",
      "tests/p0/demo-language.test.ts",
      "packages/mcp/src/tools.test.ts",
    ],
    environment: "node",
    reporters: ["default"],
    testTimeout: 30000,
  },
});
