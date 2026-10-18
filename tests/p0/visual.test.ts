import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { DEFAULTS } from "@inteiro/contracts";
import { validateRoutes, comparePng, type Route } from "@inteiro/visual";
const require = createRequire(import.meta.url),
  { PNG } = require("pngjs");
describe("P0 deterministic browser contracts", () => {
  const route: Route = {
    id: "test",
    path: "/",
    criticality: "high",
    fixture: "synthetic",
    viewports: ["mobile"],
    modes: ["dark-focus"],
    states: [
      {
        id: "default",
        actions: [{ type: "expectVisible", target: { role: "main" } }],
      },
    ],
  };
  it("accepts bounded route action DSL", () =>
    expect(validateRoutes([route], DEFAULTS)).toEqual([]));
  for (const type of ["eval", "shell", "javascript", "navigate"])
    it("rejects arbitrary " + type, () =>
      expect(() =>
        validateRoutes(
          [{ ...route, states: [{ id: "default", actions: [{ type }] }] }],
          DEFAULTS,
        ),
      ).toThrow(),
    );
  for (const path of [
    "//evil.invalid",
    "https://evil.invalid",
    "/\\evil.invalid",
  ])
    it("blocks escaped route " + path, () =>
      expect(() => validateRoutes([{ ...route, path }], DEFAULTS)).toThrow(),
    );
  it("blocks empty coverage", () =>
    expect(validateRoutes([], DEFAULTS)[0]!.status).toBe("blocked"));
  it("blocks critical route without principal flow", () =>
    expect(
      validateRoutes(
        [{ ...route, states: [{ id: "default", actions: [] }] }],
        DEFAULTS,
      ).length,
    ).toBeGreaterThan(0));
  const image = (width: number, value: number) => {
    const png = new PNG({ width, height: 10 });
    png.data.fill(value);
    return PNG.sync.write(png);
  };
  it("compares identical screenshots deterministically", () =>
    expect(comparePng(image(10, 255), image(10, 255), DEFAULTS).passed).toBe(
      true,
    ));
  it("rejects dimensions changed", () =>
    expect(comparePng(image(10, 255), image(20, 255), DEFAULTS).reason).toBe(
      "dimension-mismatch",
    ));
  it("rejects changed pixels over tolerance", () => {
    const a = new PNG({ width: 10, height: 10 });
    for (let i = 0; i < a.data.length; i += 4) {
      a.data[i] = 255;
      a.data[i + 3] = 255;
    }
    expect(comparePng(image(10, 255), PNG.sync.write(a), DEFAULTS).passed).toBe(
      false,
    );
  });
});
