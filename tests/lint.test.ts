import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
describe("Governança de cores", () => {
  it("rejeita cor literal em componente e permite token", async () => {
    const eslint = new ESLint();
    const bad = await eslint.lintText('const style = { color: "#fff" };', {
      filePath: "packages/react/src/example.ts",
    });
    expect(bad[0]?.messages[0]?.ruleId).toBe("inteiro/prefer-tokens");
    const good = await eslint.lintText(
      'const style = { color: "var(--in-color-text-primary)" };',
      { filePath: "packages/react/src/example.ts" },
    );
    expect(good[0]?.errorCount).toBe(0);
  });
});
