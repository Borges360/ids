import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { DEFAULTS } from "@inteiro/contracts";
import { validateRoutes, comparePng, type Route } from "@inteiro/visual";
import {
  validateResponseFixtures,
  matchesResponse,
} from "../../packages/visual/src/actions.ts";
const require = createRequire(import.meta.url),
  { PNG } = require("pngjs");
describe("P0 deterministic browser contracts", () => {
  it("validates response fixture boundaries, aliases, methods and status", () => {
    const base = "http://127.0.0.1:4173";
    expect(
      validateResponseFixtures(
        [{ url: "/api", method: "POST", alias: "state", body: {} }],
        base,
      ),
    ).toEqual([]);
    for (const value of [
      null,
      {},
      [{ url: "//evil.invalid", body: {} }],
      [{ url: "/\\evil.invalid", body: {} }],
      [{ url: "/api", method: 42 }],
      [{ url: "/api", method: "SHELL" }],
      [{ url: "/api", status: 999 }],
      [{ url: "/api", alias: 42 }],
      [{ url: "/api", alias: null }],
      [{ url: "/api", alias: {} }],
      [
        { url: "/api", alias: "a" },
        { url: "/b", alias: "a" },
      ],
      [{ url: "/api" }, { url: "/api" }],
    ])
      expect(
        validateResponseFixtures(value as never, base).length,
      ).toBeGreaterThan(0);
    const fixture = { url: "/api?q=one", method: "POST", body: {} };
    expect(matchesResponse(base + "/api?q=one", "POST", fixture, base)).toBe(
      true,
    );
    expect(matchesResponse(base + "/api?q=two", "POST", fixture, base)).toBe(
      false,
    );
    expect(matchesResponse(base + "/api?q=one", "GET", fixture, base)).toBe(
      false,
    );
    expect(
      matchesResponse(
        "http://external.invalid/api?q=one",
        "POST",
        fixture,
        base,
      ),
    ).toBe(false);
  });
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
